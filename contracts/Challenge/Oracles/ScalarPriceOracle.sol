pragma solidity ^0.4.24;

import '@gnosis.pm/gnosis-core-contracts/contracts/Oracles/Oracle.sol';
import "../../IDutchExchange.sol";

contract ScalarPriceOracle is Oracle {

  event OutcomeAssignment(int outcome);

  bool public isSet;
  int public outcome;
  uint public resolutionDate;
  address public token;
  address public comparatorToken;
  IDutchExchange public dutchExchange;
  uint public NUM_PRICE_POINTS = 5;

  function ScalarPriceOracle(
    uint _resolutionDate,
    address _dutchExchange,
    address _token,
    address _comparatorToken
  ) public
  {
    resolutionDate = _resolutionDate;
    dutchExchange = IDutchExchange(_dutchExchange);
    token = _token;
    comparatorToken = _comparatorToken;

  }

  /// @dev Sets event outcome
  function setOutcome()
      public
  {
      require(resolutionDate <= now);
      require(!isSet);

      outcome = calculateAveragePrice();
      isSet = true;
      OutcomeAssignment(outcome);
  }

  /// @dev Returns if winning outcome is set
  /// @return Is outcome set?
  function isOutcomeSet()
      public
      view
      returns (bool)
  {
      return isSet;
  }

  /// @dev Returns outcome
  /// @return Outcome
  function getOutcome()
      public
      view
      returns (int)
  {
      return outcome;
  }

  function calculateAveragePrice() private returns(int avgPrice) {
    uint currentAuctionIndex = dutchExchange.getAuctionIndex(token, comparatorToken);
    require(currentAuctionIndex > NUM_PRICE_POINTS, "Not enough historical price data for token pair");

    uint firstReferencedIndex = currentAuctionIndex - NUM_PRICE_POINTS;

    uint i = 0;
    uint num;
    uint den;
    uint avgPriceUint;
    while(i < NUM_PRICE_POINTS) {
      (num, den) = dutchExchange.getPriceInPastAuction(token, comparatorToken, firstReferencedIndex + i);

      avgPriceUint += (num * 10**18)/den;
      i++;
    }
    avgPrice = int(avgPriceUint/NUM_PRICE_POINTS);
  }
}
