pragma solidity ^0.4.8;
import "../Parameterizer.sol";
import "tokens/eip20/EIP20Interface.sol";
import "dll/DLL.sol";
import "attrstore/AttributeStore.sol";
import "zeppelin/math/SafeMath.sol";
import "plcrvoting/PLCRVoting.sol";
import "./ChallengeInterface.sol";
/**
@title Partial-Lock-Commit-Reveal Voting scheme with ERC20 tokens
@author Team: Aspyn Palatnick, Cem Ozer, Yorke Rhodes
*/
contract PLCRVotingChallenge is ChallengeInterface {

    // ============
    // EVENTS:
    // ============

    event _VoteCommitted(bytes32 UUID, address voterAddress, uint numTokens);
    event _VoteRevealed(address voterAddress, uint numTokens, uint votesFor, uint votesAgainst);
    event _PollCreated(uint voteQuorum, uint commitEndDate, uint revealEndDate, uint pollID);
    event _VotingRightsGranted(uint numTokens);
    event _VotingRightsWithdrawn(uint numTokens);
    event _RewardClaimed(uint reward, address indexed voter);

    // ============
    // DATA STRUCTURES:
    // ============

    using AttributeStore for AttributeStore.Data;
    using DLL for DLL.Data;
    using SafeMath for uint;

    // ============
    // GLOBAL VARIABLES:
    // ============

    address public challenger;     /// the address of the challenger
    address public listingOwner;   /// the address of the listingOwner
    PLCRVoting public voting;      /// address of PLCRVoting Contract
    uint public pollID;            /// pollID of PLCRVoting
    bool public isStarted;         /// true if challenger has executed start()
    bool challengeResolved;        /// true is challenge has officially been resolved to passed or failed
    uint public commitEndDate;     /// expiration date of commit period for poll
    uint public revealEndDate;     /// expiration date of reveal period for poll
    uint public voteQuorum;	       /// number of votes required for a proposal to pass
    uint public rewardPool;        /// pool of tokens to be distributed to winning voters
    uint public stake;             /// number of tokens at stake for either party during challenge
    uint public votesFor;		       /// tally of votes supporting proposal
    uint public votesAgainst;      /// tally of votes countering proposal

    bool public winnerRewardTransferred;
    uint public voterTokensClaimed;
    uint public voterRewardsClaimed;

    uint public commitStageLen;
    uint public revealStageLen;

    mapping(address => bool) public didCommit;     /// indicates whether an address committed a vote for this poll
    mapping(address => bool) public didReveal;     /// indicates whether an address revealed a vote for this poll

    mapping(address => uint) public voteTokenBalance; // maps user's address to voteToken balance
    mapping(address => bool) public tokenClaims;   // Indicates whether a voter has claimed a reward yet

    AttributeStore.Data store;

    EIP20Interface public token;

    // ============
    // MODIFIERS:
    // ============

    modifier onlyChallenger() {
        require(msg.sender == challenger);
        _;
    }

    // ============
    // CONSTRUCTOR:
    // ============

    /**
    @dev Initializes voteQuorum, commitDuration, revealDuration, and pollNonce in addition to token contract and trusted mapping
    @param _tokenAddr The address where the ERC20 token contract is deployed
    */
    function PLCRVotingChallenge(address _challenger, address _listingOwner, address _tokenAddr, PLCRVoting _voting, Parameterizer _parameterizer) public {
        challenger = _challenger;
        listingOwner = _listingOwner;

        token = EIP20Interface(_tokenAddr);
        voting = _voting;

        commitStageLen = _parameterizer.get("commitStageLen");
        revealStageLen = _parameterizer.get("revealStageLen");
        voteQuorum     = _parameterizer.get("voteQuorum");
        stake          = _parameterizer.get("minDeposit");
        rewardPool     = ((100 - _parameterizer.get("dispensationPct")) * stake) / 100;
        pollID = voting.startPoll(
                   voteQuorum,
                   commitStageLen,
                   revealStageLen
                 );
    }

    // ================
    // TOKEN INTERFACE:
    // ================
    function start() public onlyChallenger {
        require(token.transferFrom(challenger, this, stake));

        commitEndDate = block.timestamp.add(commitStageLen);
        revealEndDate = commitEndDate.add(revealStageLen);

        isStarted = true;
    }

    // =================
    // VOTING INTERFACE:
    // =================

    /**
    @dev                Called by a voter to claim their reward for each completed vote
    @param _salt        The salt of a voter's commit hash
    */
    function claimVoterReward(uint _salt) public {
        // Ensures the voter has not already claimed tokens
        require(tokenClaims[msg.sender] == false);

        uint voterTokens = voting.getNumPassingTokens(msg.sender, pollID, _salt);
        uint reward = voterReward(msg.sender, _salt);

        voterTokensClaimed += voterTokens;
        voterRewardsClaimed += reward;

        // Ensures a voter cannot claim tokens again
        tokenClaims[msg.sender] = true;

        require(token.transfer(msg.sender, reward));

        _RewardClaimed(reward, msg.sender);
    }

    function transferWinnerReward() public {
        require(ended() && !winnerRewardTransferred);

        address winner = passed() ? challenger : listingOwner;
        uint voterRewards = getTotalNumberOfTokensForWinningOption() == 0 ? 0 : rewardPool;

        require(token.transfer(winner, stake - rewardPool));

        winnerRewardTransferred = true;


        // TODO event
    }

    // ==================
    // CHALLENGE INTERFACE:
    // ==================

    /**
    @notice Signal from Registry that Challenge has Passed
    @dev Signals that challenge has officially been resolved on the registry
    */
    function resolveChallenge() public {
      challengeResolved = true;
    }



    /**
    @notice Determines if the challenge has passed
    @dev Check if votesAgainst out of totalVotes exceeds votesQuorum (requires ended)
    */
    function passed() public view returns (bool) {
        require(ended());
        return (100 * votesAgainst) > (voteQuorum * (votesFor + votesAgainst));
    }

    /**
    @dev                Calculates the provided voter's token reward.
    @param _voter       The address of the voter whose reward balance is to be returned
    @param _salt        The salt of the voter's commit hash in the given poll
    @return             The uint indicating the voter's reward
    */
    function voterReward(address _voter, uint _salt)
    public view returns (uint) {
        uint voterTokens = voting.getNumPassingTokens(_voter, pollID, _salt);
        uint remainingRewardPool = rewardPool - voterRewardsClaimed;
        uint remainingTotalTokens = getTotalNumberOfTokensForWinningOption() - voterTokensClaimed;
        return (voterTokens * remainingRewardPool) / remainingTotalTokens;
    }

    /**
    @dev Determines the number of tokens awarded to the winning party
    */
    function tokenRewardAmount() public view returns (uint) {
        require(ended());

        // Edge case, nobody voted, give all tokens to the challenger.
        if (getTotalNumberOfTokensForWinningOption() == 0) {
            return 2 * stake;
        }

        return (2 * stake) - rewardPool;
    }

    function started() public view returns (bool) {
        return isStarted;
    }

    // ----------------
    // CHALLENGE HELPERS:
    // ----------------

    /**
    @dev Gets the total winning votes for reward distribution purposes
    @return Total number of votes committed to the winning option
    */
    function getTotalNumberOfTokensForWinningOption() constant public returns (uint numTokens) {
        require(ended());

        if (!passed()) {
            return votesFor;
        } else {
            return votesAgainst;
        }
    }

    /**
    @notice Checks if a challenge is ended
    @dev Checks pollEnded for the pollID
    @return Boolean indication if challenge is ended
    */
    function ended() view public returns (bool) {
      return voting.pollEnded(pollID);
    }


    /**
    @notice Checks if a challenge is resolved
    @dev Checks whether challenge outome has been resolved to either passed or failed
    @return Boolean indication if challenge is resolved
    */
    function resolved() view public returns (bool) {
      return challengeResolved;
    }
}
