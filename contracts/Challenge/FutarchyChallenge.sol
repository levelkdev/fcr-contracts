pragma solidity ^0.4.24;
import {FutarchyOracle, FutarchyOracleFactory, ERC20 as AltERC20} from '@gnosis.pm/gnosis-core-contracts/contracts/Oracles/FutarchyOracleFactory.sol';
import {LMSRMarketMaker} from '@gnosis.pm/gnosis-core-contracts/contracts/MarketMakers/LMSRMarketMaker.sol';
import '../Registry.sol';
import "./Oracles/ScalarPriceOracle.sol";
import "./ChallengeInterface.sol";

contract FutarchyChallenge is ChallengeInterface {

  event _InitiatedFutarchy(address challenger, uint stakeAmount, address futarchyOracleAddress);

  // ============
  // STATE:
  // ============
  // GLOBAL VARIABLES

  address public challenger;         // the address of the challenger
  address public listingOwner;       // the address of the listingOwner
  bool public marketsAreClosed;      // true if futarchy markets are closed
  uint public stakeAmount;           // number of tokens to stake for either party during challenge
  uint public tradingPeriod;         // duration for open trading before futarchy decision resolution
  int public upperBound;
  int public lowerBound;

  FutarchyOracle public futarchyOracle;                   // Futarchy Oracle to resolve challenge
  FutarchyOracleFactory public futarchyOracleFactory;     // Factory to create FutarchyOracle
  ScalarPriceOracle public scalarPriceOracle;             // Oracle to resolve scalar prediction markets
  LMSRMarketMaker public lmsrMarketMaker;                 // MarketMaker for scalar prediction markets
  Registry public registry;                               // Address of TCR
  uint public winningMarketIndex;                         // Index of scalar prediction market with greatest average price for long token
  uint public rewardBalance;                              // Amount of tokens to be rewarded to challenge winner contingent on leftover initial funding liquidity


  // ------------
  // CONSTRUCTOR:
  // ------------
  /// @dev Constructor                  Sets up majority of the FutarchyChallenge global state variables
  /// @param _registry                  Address of the registry
  /// @param _challenger                Address of the challenger
  /// @param _listingOwner              Address of the listing owner
  /// @param _stakeAmount               Number of tokens to stake for either party during challenge
  /// @param _tradingPeriod             Duration for open trading on scalar prediction markets
  /// @param _futarchyOracleFactory     Factory to create futarchyOracle
  /// @param _scalarPriceOracle         Factory to create scalarPriceOracle for scalar prediction markets
  /// @param _lmsrMarketMaker           LMSR Market Maker for scalar prediction markets
  function FutarchyChallenge(
    Registry _registry,
    address _challenger,
    address _listingOwner,
    uint _stakeAmount,
    uint _tradingPeriod,
    int _upperBound,
    int _lowerBound,
    FutarchyOracleFactory _futarchyOracleFactory,
    ScalarPriceOracle _scalarPriceOracle,
    LMSRMarketMaker _lmsrMarketMaker
  ) public {
    require(_tradingPeriod > 0);
    require(_upperBound > _lowerBound);

    registry = _registry;
    challenger = _challenger;
    listingOwner = _listingOwner;
    stakeAmount = _stakeAmount;
    tradingPeriod = _tradingPeriod;
    upperBound = _upperBound;
    lowerBound = _lowerBound;
    futarchyOracleFactory = _futarchyOracleFactory;
    scalarPriceOracle = _scalarPriceOracle;
    lmsrMarketMaker = _lmsrMarketMaker;
  }

  // ------------
  // Challenge Interface:
  // ------------
  /// @dev initiateFutarchyOracle   Creates and funds FutarchyOracle. Futarchy Oracle will spin up
  ///                               corresponding prediction markets which will open for trade starting now

  function initiateFutarchy() public {
    require(futarchyOracle == address(0));
    uint _startDate = now;

    futarchyOracle = futarchyOracleFactory.createFutarchyOracle(
      AltERC20(registry.token()),
      scalarPriceOracle,
      2,
      lowerBound,
      upperBound,
      lmsrMarketMaker,
      0,
      tradingPeriod,
      _startDate
    );

    require(registry.token().approve(futarchyOracle, stakeAmount));
    futarchyOracle.fund(stakeAmount);
    emit _InitiatedFutarchy(msg.sender, stakeAmount, address(futarchyOracle));
  }

  /// @dev ended  returns whether Challenge has ended
  function ended() public view returns (bool) {
    return futarchyOracle.isOutcomeSet();
  }

  /// @dev passed  returns whether Challenge has passed
  function passed() public view returns (bool) {
    require(ended());

    // marketIndex 1 == deniedScalar
    // if proposal is denied, the challenge has passed.
    return futarchyOracle.getOutcome() == 1;
  }

  function winnerRewardAmount() public view returns (uint256) {
    require(marketsAreClosed);
    return rewardBalance;
  }

  function close() public {
    require(!marketsAreClosed);
    futarchyOracle.close(); // transfers remaining futarchyOracle liquidity back to this contract
    marketsAreClosed = true;
    rewardBalance = registry.token().balanceOf(this);
    require(registry.token().approve(registry, rewardBalance));
  }
}
