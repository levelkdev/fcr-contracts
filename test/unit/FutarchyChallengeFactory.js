import lkTestHelpers from 'lk-test-helpers'
const { expectRevert, expectEvent } = lkTestHelpers(web3)

const FutarchyChallengeFactory = artifacts.require('FutarchyChallengeFactory')
const FutarchyChallenge = artifacts.require('FutarchyChallenge')
const FutarchyOracleMock = artifacts.require('FutarchyOracleMock')
const RegistryMock = artifacts.require('RegistryMock')
const ScalarPriceOracleFactoryMock = artifacts.require('ScalarPriceOracleFactoryMock')
const DutchExchangeMock = artifacts.require('DutchExchangeMock')
const Token = artifacts.require('EIP20')
const BigNumber = require('bignumber.js');

const mockAddresses = [
  '0x4e0100882b427b3be1191c5a7c7e79171b8a24dd',
  '0x6512df5964f1578a8164ce93a3238f2b11485d1c',
  '0x687355ca7a320e5420a3db5ae59ef662e4146786'
]

let COMPARATOR_TOKEN, SCALAR_PRICE_ORACLE_FACTORY, DUTCH_EXCHANGE // async "const's"
const STAKE_AMOUNT                = 10 * 10 **18
const TRADING_PERIOD              = 60 * 60 * 24
const TIME_TO_PRICE_RESOLUTION    = TRADING_PERIOD * 2
const FUTARCHY_ORACLE_FACTORY     = mockAddresses[0]
const LMSR_MARKET_MAKER           = mockAddresses[1]

contract('FutarchyChallengeFactory', (accounts) => {
  let futarchyChallengeFactory

  before(async () => {
    COMPARATOR_TOKEN            = await Token.new(1000 * 10**18, "Comparator Token", 18, 'CT')
    SCALAR_PRICE_ORACLE_FACTORY = await ScalarPriceOracleFactoryMock.new()
    DUTCH_EXCHANGE              = await DutchExchangeMock.new()
  })

  describe('when deployed with valid parameters', () => {
    before(async () => {
      futarchyChallengeFactory = await deployChallengeFactory()
    })

    it('sets the correct comparatorToken', async () => {
      expect(await futarchyChallengeFactory.comparatorToken()).to.equal(COMPARATOR_TOKEN.address)
    })

    it('sets the correct stakeAmount', async () => {
      expect((await futarchyChallengeFactory.stakeAmount()).toNumber()).to.equal(STAKE_AMOUNT)
    })
    it('sets the correct tradingPeriod', async () => {
      expect((await futarchyChallengeFactory.tradingPeriod()).toNumber()).to.equal(TRADING_PERIOD)
    })

    it('sets the correct timeToPriceResolution', async () => {
      expect((await futarchyChallengeFactory.timeToPriceResolution()).toNumber()).to.equal(TIME_TO_PRICE_RESOLUTION)
    })

    it('sets the correct futarchyOracleFactory', async () => {
      expect(await futarchyChallengeFactory.futarchyOracleFactory()).to.equal(FUTARCHY_ORACLE_FACTORY)
    })

    it('sets the correct scalarPriceOracleFactory', async () => {
      expect(await futarchyChallengeFactory.scalarPriceOracleFactory()).to.equal(SCALAR_PRICE_ORACLE_FACTORY.address)
    })

    it('sets the correct lmsrMarketMaker', async () => {
      expect(await futarchyChallengeFactory.lmsrMarketMaker()).to.equal(LMSR_MARKET_MAKER)
    })

    it('sets the correct dutchExchange', async () => {
      expect(await futarchyChallengeFactory.dutchExchange()).to.equal(DUTCH_EXCHANGE.address)
    })
  })

  describe('when deployed with invalid parameters', () => {
    it('reverts if tradingPeriod < 0', async () => {
      await expectRevert(deployChallengeFactory({tradingPeriod: 0}))
    })

    it('reverts if tradingPeriod > timeToPriceResolution', async () => {
      await expectRevert(deployChallengeFactory({timeToPriceResolution: TRADING_PERIOD - 1}))
    })
  })

  describe('createChallenge()', () => {
    let registry, challenger, listingOwner

    beforeEach(async () => {
      futarchyChallengeFactory = await deployChallengeFactory()
      registry = await RegistryMock.new(COMPARATOR_TOKEN.address)
      challenger = accounts[1]
      listingOwner = accounts[2]
    })

    it('creates a FutarchyChallenge with the correct parameters', async () => {
      const { logs } = await futarchyChallengeFactory.createChallenge(registry.address, challenger, listingOwner)
      const event = logs.find(e => e.event === 'ChallengeCreated')
      const challengeAddress = event.args.challenge

      let challenge = FutarchyChallenge.at(challengeAddress)
      expect(await challenge.registry()).to.equal(registry.address)
      expect(await challenge.challenger()).to.equal(challenger)
      expect(await challenge.listingOwner()).to.equal(listingOwner)
      expect((await challenge.stakeAmount()).toNumber()).to.equal(STAKE_AMOUNT)
      expect((await challenge.tradingPeriod()).toNumber()).to.equal(TRADING_PERIOD)
      expect(await challenge.futarchyOracleFactory()).to.equal(FUTARCHY_ORACLE_FACTORY)
      expect(await challenge.lmsrMarketMaker()).to.equal(LMSR_MARKET_MAKER)
    })

    it('emits a ChallengeCreated event', async () => {
      await expectEvent('ChallengeCreated', futarchyChallengeFactory.createChallenge(registry.address, challenger, listingOwner))
    })
  })

  async function deployChallengeFactory(customParams = {}) {
    const {
      comparatorToken          = COMPARATOR_TOKEN.address,
      stakeAmount              = STAKE_AMOUNT,
      tradingPeriod            = TRADING_PERIOD,
      timeToPriceResolution    = TIME_TO_PRICE_RESOLUTION,
      futarchyOracleFactory    = FUTARCHY_ORACLE_FACTORY,
      scalarPriceOracleFactory = SCALAR_PRICE_ORACLE_FACTORY.address,
      lmsrMarketMaker          = LMSR_MARKET_MAKER,
      dutchExchange            = DUTCH_EXCHANGE.address,
    } = customParams

    const challengeFactory = await FutarchyChallengeFactory.new(
      comparatorToken,
      stakeAmount,
      tradingPeriod,
      timeToPriceResolution,
      futarchyOracleFactory,
      scalarPriceOracleFactory,
      lmsrMarketMaker,
      dutchExchange,
    )

    return challengeFactory
  }
})
