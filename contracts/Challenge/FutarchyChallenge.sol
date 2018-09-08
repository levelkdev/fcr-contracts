pragma solidity ^0.4.24;
import '@gnosis.pm/gnosis-core-contracts/contracts/Oracles/FutarchyOracleFactory.sol';
import '@gnosis.pm/gnosis-core-contracts/contracts/MarketMakers/LMSRMarketMaker.sol';
import '../Registry.sol';
import "./Oracles/ScalarPriceOracle.sol";
import "./ChallengeInterface.sol";

contract  FutarchyChallenge is ChallengeInterface {

  event _Started(address challenger, uint stakeAmount, address futarchyOracleAddress);
  event _Funded(address challenger, uint stakeAmount, address futarchyOracleAddress);

  // ============
  // STATE:
  // ============
  // GLOBAL VARIABLES

  address public challenger;         // the address of the challenger
  address public listingOwner;       // the address of the listingOwner
  bool public isStarted;             // true if challenger has executed start()
  bool public marketsAreClosed;      // true if futarchy markets are closed
  uint public stakeAmount;           // number of tokens to stake for either party during challenge
  uint public tradingPeriod;         // duration for open trading before futarchy decision resolution
  int public upperBound;
  int public lowerBound;
  bool public isFunded;

  FutarchyOracle public futarchyOracle;                      // Futarchy Oracle to resolve challenge
  FutarchyOracleFactory public futarchyOracleFactory;        // Factory to create FutarchyOracle
  ScalarPriceOracle public scalarPriceOracle;                // Oracle to resolve scalar prediction markets
  LMSRMarketMaker public lmsrMarketMaker;                    // MarketMaker for scalar prediction markets
  Registry public registry;                                  // Address of TCR
  uint public winningMarketIndex;                            // Index of scalar prediction market with greatest average price for long token


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
  /// @dev start          Creates and funds FutarchyOracle. Futarchy Oracle will spin up
  ///                     corresponding prediction markets which will open for trade within
  ///                     60 seconds of this function invocation

  function start() public {
    require(!isStarted);

    uint _startDate = now;

    futarchyOracle = futarchyOracleFactory.createFutarchyOracle(
      registry.token(),
      scalarPriceOracle,
      2,
      lowerBound,
      upperBound,
      lmsrMarketMaker,
      0,
      tradingPeriod,
      _startDate
    );

    isStarted = true;

    _Started(msg.sender, stakeAmount, address(futarchyOracle));
  }

  function fund() public {
    require(isStarted && !isFunded);
    require(registry.token().transferFrom(msg.sender, this, stakeAmount));
    require(registry.token().approve(futarchyOracle, stakeAmount));
    futarchyOracle.fund(stakeAmount);
    isFunded = true;

    _Funded(msg.sender, stakeAmount, address(futarchyOracle));
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
    return registry.token().balanceOf(this);
  }

  function close() public {
    futarchyOracle.close();
    marketsAreClosed = true;
    require(registry.token().approve(registry, registry.token().balanceOf(this)));
  }

  function setScalarOutcome() public {
    scalarPriceOracle.setOutcome();
  }
}
