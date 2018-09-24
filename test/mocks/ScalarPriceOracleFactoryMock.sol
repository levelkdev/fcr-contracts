pragma solidity ^0.4.24;

import "./ScalarPriceOracleMock.sol";

contract ScalarPriceOracleFactoryMock {

  function createScalarPriceOracle(uint resolutionDate) external returns(address) {
    return new ScalarPriceOracleMock(); // mock address
  }
}
