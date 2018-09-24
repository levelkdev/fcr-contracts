pragma solidity ^0.4.24;

import "./FutarchyChallengeMock.sol";

contract FutarchyCHallengeFactoryMock {

    function createChallenge(
      address registry,
      address challenger,
      address listingOwner
    )
        public
        returns (FutarchyChallengeMock futarchyChallenge)
    {
        futarchyChallenge = new FutarchyChallengeMock();
    }
}
