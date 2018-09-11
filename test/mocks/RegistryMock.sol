pragma solidity ^0.4.24;

contract RegistryMock {
  address public token;

  constructor(address _token) public {
    token = _token;
  }
}
