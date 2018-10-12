pragma solidity ^0.4.24;

import '../../contracts/Registry.sol';

contract RegistryInternalFunctionsMock is Registry {

  function execute_resolveChallenge(bytes32 listingHash) public {
    resolveChallenge(listingHash);
  }

}
