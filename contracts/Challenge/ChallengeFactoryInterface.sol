pragma solidity ^0.4.8;

import "./ChallengeInterface.sol";

contract ChallengeFactoryInterface {
  function createChallenge(address _challenger, address _listingOwner, address _registry) external returns (ChallengeInterface);
}
