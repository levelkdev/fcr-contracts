pragma solidity ^0.4.8;

import "../Parameterizer.sol";
import "./ChallengeFactoryInterface.sol";
import "./PLCRVotingChallenge.sol";
import "plcrvoting/PLCRVoting.sol";

contract PLCRVotingChallengeFactory is ChallengeFactoryInterface {

  // ============
  // STATE:
  // ============
  // GLOBAL VARIABLES
  address public token;                // Address of the TCR's intrinsic ERC20 token
  Parameterizer public parameterizer;  // Address of the TCR's associeted Parameterizer contract
  PLCRVoting public voting;            // Address of PLCRVoting Contract

  // ------------
  // CONSTRUCTOR:
  // ------------
  /// @dev Contructor                  Sets the global state for the factory
  /// @param _tokenAddr                Address of the TCR's intrinsic ERC20 token
  /// @param _parameterizer            Address of the TCR's associeted Parameterizer contract
  /// @param _plcrVoting               Address of PLCRVoting contract
  function PLCRVotingChallengeFactory(address _tokenAddr, address _parameterizer, PLCRVoting _plcrVoting) public {
    token = _tokenAddr;
    parameterizer = Parameterizer(_parameterizer);
    voting = _plcrVoting;
  }

  // --------------------
  // FACTORY INTERFACE:
  // --------------------
  /// @dev createChallenge           Creates challenge associated to a Registry listing
  /// @param _challenger             Address of the challenger
  /// @param _listingOwner           Address of the listing owner
  /// @return ChallengeInterface    Newly created Challenge
  function createChallenge(address _challenger, address _listingOwner, address _registry) external returns (ChallengeInterface) {
    return new PLCRVotingChallenge(
      _challenger,
      _listingOwner,
      _registry,
      token,
      voting,
      parameterizer
    );
  }

}
