pragma solidity ^0.4.15;
import "./ScalarPriceOracle.sol";

contract ScalarPriceOracleFactory {

    /*
     *  Events
     */
    event ScalarPriceOracleCreation(ScalarPriceOracle scalarPriceOracle, uint resolutionDate);

    address token;
    address comparatorToken;
    address dutchExchange;

    function ScalarPriceOracleFactory(
        address _token,
        address _comparatorToken,
        address _dutchExchange
    ) public {
        token = _token;
        comparatorToken = _comparatorToken;
        dutchExchange = _dutchExchange;
    }

    /*
     *  Public functions
     */
    /// @dev Creates a new centralized oracle contract
    /// @param _resolutionDate             date of price resolution
    /// @return Oracle contract
    function createScalarPriceOracle(uint _resolutionDate)
        external
        returns (ScalarPriceOracle scalarPriceOracle)
    {
        scalarPriceOracle = new ScalarPriceOracle(_resolutionDate, dutchExchange, token, comparatorToken);
        ScalarPriceOracleCreation(scalarPriceOracle, _resolutionDate);
    }
}
