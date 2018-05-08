pragma solidity ^0.4.8;

import "../ChallengeFactoryInterface.sol";
import "./OwnableChallenge.sol";

contract OwnableChallengeFactory is ChallengeFactoryInterface {

  address public token;
  address public challengeOwner;

  function OwnableChallengeFactory(address _token, address _challengeOwner) public {
    challengeOwner = _challengeOwner;
    token = _token;
  }

  function createChallenge(address challenger, address listingOwner) external returns (ChallengeInterface) {
    OwnableChallenge ownableChallenge = new OwnableChallenge(
      challenger,
      listingOwner,
      token
    );
    ownableChallenge.transferOwnership(challengeOwner);
    return ChallengeInterface(ownableChallenge);
  }

}
