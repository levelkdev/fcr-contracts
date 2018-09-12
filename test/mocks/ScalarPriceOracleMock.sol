pragma solidity ^0.4.24;

contract ScalarPriceOracleMock {
  int public mock_outcome;

  function mock_setOutcome(int outcome) public {
    mock_outcome = outcome;
  }

  function getOutcome() public view returns (int) {
    return mock_outcome;
  }
}
