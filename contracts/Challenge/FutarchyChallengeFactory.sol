pragma solidity ^0.4.24;
import {FutarchyOracleFactory} from '@gnosis.pm/gnosis-core-contracts/contracts/Oracles/FutarchyOracleFactory.sol';
import './Oracles/ScalarPriceOracleFactory.sol';
import "./ChallengeFactoryInterface.sol";
import "./FutarchyChallenge.sol";
import "../IDutchExchange.sol";

contract FutarchyChallengeFactory is ChallengeFactoryInterface {
  // ------
  // EVENTS
  // ------
  event SetUpperAndLowerBound(int upperBound, int lowerBound);
  event ChallengeCreated(address challengeFactory, address challenge, address registry, address challenger, address listingOwner);

  // -------
  // STATE:
  // -------
  // GLOBAL VARIABLES
  address public comparatorToken;       // Address of token to which TCR's intrinsic token will be compared
  uint public stakeAmount;              // Amount that must be staked to initiate a Challenge
  uint public tradingPeriod;            // Duration for open trading before futarchy decision resolution
  uint public timeToPriceResolution;    // Duration from start of prediction markets until date of final scalar price resolution

  FutarchyOracleFactory public futarchyOracleFactory;             // Factory for creating Futarchy Oracles
  ScalarPriceOracleFactory public scalarPriceOracleFactory;       // Factory for creating Oracles to resolve Futarchy's scalar prediction markets
  LMSRMarketMaker public lmsrMarketMaker;                         // LMSR Market Maker for futarchy's prediction markets
  IDutchExchange public dutchExchange;                            // Dutch Exchange contract to retrive token prices

  uint public NUM_PRICE_POINTS = 5;  // number of past price points to reference for price average when determining TCR token value

  // ------------
  // CONSTRUCTOR:
  // ------------
  /// @dev Constructor                 Sets the global state of the factory
  /// @param _comparatorToken          Address of token to which TCR's intrinsic token value will be compared
  /// @param _stakeAmount              Amount that must be staked to initiate a Challenge
  /// @param _tradingPeriod            Duration for open trading on futarchy prediction markets before futarchy resolution
  /// @param _timeToPriceResolution    Duration from start of prediction markets until date of final price resolution
  /// @param _futarchyOracleFactory    Factory for creating Futarchy Oracles
  /// @param _scalarPriceOracleFactory Factory for creating Oracles to resolve Futarchy's scalar prediction markets
  /// @param _lmsrMarketMaker          LMSR Market Maker for futarchy's prediction markets
  function FutarchyChallengeFactory(
    address _comparatorToken,
    uint _stakeAmount,
    uint _tradingPeriod,
    uint _timeToPriceResolution,
    FutarchyOracleFactory _futarchyOracleFactory,
    ScalarPriceOracleFactory _scalarPriceOracleFactory,
    LMSRMarketMaker _lmsrMarketMaker,
    address _dutchExchange
  ) public {
    require(_tradingPeriod > 0);
    require(_timeToPriceResolution > _tradingPeriod);

    comparatorToken       = _comparatorToken;
    stakeAmount           = _stakeAmount;
    tradingPeriod         = _tradingPeriod;
    timeToPriceResolution = _timeToPriceResolution;

    futarchyOracleFactory         = _futarchyOracleFactory;
    scalarPriceOracleFactory      = _scalarPriceOracleFactory;
    lmsrMarketMaker               = _lmsrMarketMaker;
    dutchExchange                 = IDutchExchange(_dutchExchange);
  }

  // --------------------
  // FACTORY INTERFACE:
  // --------------------
  /// @dev createChallenge        Creates challenge associated to a Registry listing
  /// @param _challenger          Address of the challenger
  /// @param _listingOwner        Address of the listing owner
  /// @return ChallengeInterface Newly created Challenge
  function createChallenge(address _registry, address _challenger, address _listingOwner) external returns (ChallengeInterface challenge) {

    int upperBound;
    int lowerBound;
    (upperBound, lowerBound) = determinePriceBounds(Registry(_registry).token());

    uint resolutionDate = now + timeToPriceResolution;
    ScalarPriceOracle scalarPriceOracle = scalarPriceOracleFactory.createScalarPriceOracle(
      resolutionDate
    );

    challenge = new FutarchyChallenge(
      Registry(_registry),
      _challenger,
      _listingOwner,
      stakeAmount,
      tradingPeriod,
      upperBound,
      lowerBound,
      futarchyOracleFactory,
      scalarPriceOracle,
      lmsrMarketMaker
    );

    emit ChallengeCreated(this, challenge, _registry, _challenger, _listingOwner);
  }

  function determinePriceBounds(ERC20 _token) internal returns (int upperBound, int lowerBound) {
    uint currentAuctionIndex = dutchExchange.getAuctionIndex(_token, comparatorToken);
    require(currentAuctionIndex > NUM_PRICE_POINTS, "Not enough historical price data for token pair");

    uint firstReferencedIndex = currentAuctionIndex - NUM_PRICE_POINTS;

    uint i = 0;
    uint num;
    uint den;
    uint avgPrice;
    while(i < NUM_PRICE_POINTS) {
      (num, den) = dutchExchange.getPriceInPastAuction(_token, comparatorToken, firstReferencedIndex + i);

      avgPrice += (num * 10**18)/uint(den);
      i++;
    }
    avgPrice = avgPrice/uint(NUM_PRICE_POINTS);

    upperBound = int(avgPrice) * 2;
    lowerBound = 0;

    SetUpperAndLowerBound(upperBound, lowerBound);
  }
}
