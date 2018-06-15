pragma solidity ^0.4.8;

import "./ChallengeInterface.sol";

contract ChallengeFactoryInterface {
  function createChallenge(address challenger, address listingOwner, address Registry) external returns (ChallengeInterface);
}
