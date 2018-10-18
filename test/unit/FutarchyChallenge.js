import lkTestHelpers from 'lk-test-helpers'
const { expectRevert, expectEvent } = lkTestHelpers(web3)

const RegistryMock = artifacts.require('RegistryMock')
const FutarchyOracleFactoryMock = artifacts.require('FutarchyOracleFactoryMock')
const FutarchyOracleMock = artifacts.require('FutarchyOracleMock')
const FutarchyChallenge = artifacts.require('FutarchyChallenge')
const Token = artifacts.require('EIP20')
const BigNumber = require('bignumber.js');

contract('FutarchyChallenge', (accounts) => {

  const mockAddresses = [
    '0x4e0100882b427b3be1191c5a7c7e79171b8a24dd',
    '0x6512df5964f1578a8164ce93a3238f2b11485d1c',
    '0x687355ca7a320e5420a3db5ae59ef662e4146786'
  ]

  const CHALLENGER                = accounts[0]
  const LISTING_OWNER             = accounts[1]
  const STAKE_AMOUNT              = 10 * 10 ** 18
  const TRADING_PERIOD            = 60 * 60 * 24
  const LOWER_BOUND               = 0
  const UPPER_BOUND               = 100
  const LMSR_ADDR                 = mockAddresses[1]
  const SCALAR_PRICE_ORACLE_ADDR  = mockAddresses [2]

  let token, registryMock, challenge, futarchyOracleMock, futarchyOracleFactoryMock

  describe('when deployed correctly', () => {
    before(async () => {
      token = await Token.new(1000 * 10 ** 18, "FCR Token", 18, 'FCR')
      registryMock = await RegistryMock.new(token.address)
      futarchyOracleFactoryMock = await FutarchyOracleFactoryMock.new()
      challenge = await deployChallenge({token, registry: registryMock, futarchyOracleFactory: futarchyOracleFactoryMock})
    })

    it('sets the correct listing owner', async () => {
      expect(await challenge.listingOwner()).to.equal(LISTING_OWNER)
    })

    it('sets the correct registry address', async () => {
      expect(await challenge.registry()).to.equal(registryMock.address)
    })

    it('sets the correct challenger', async () => {
      expect(await challenge.challenger()).to.equal(CHALLENGER)
    })

    it('sets the correct stake amount', async () => {
      expect((await challenge.stakeAmount()).toNumber()).to.equal(STAKE_AMOUNT)
    })

    it('sets the correct trading period', async () => {
      expect((await challenge.tradingPeriod()).toNumber()).to.equal(TRADING_PERIOD)
    })

    it('sets the correct upperBound', async () => {
      expect((await challenge.upperBound()).toNumber()).to.equal(UPPER_BOUND)
    })

    it('sets the correct lowerBound', async () => {
      expect((await challenge.lowerBound()).toNumber()).to.equal(LOWER_BOUND)
    })

    it('sets the correct futarchyOracleFactory', async () => {
      expect(await challenge.futarchyOracleFactory()).to.equal(futarchyOracleFactoryMock.address)
    })

    it('sets the correct scalarPriceOracle', async () => {
      expect(await challenge.scalarPriceOracle()).to.equal(SCALAR_PRICE_ORACLE_ADDR)
    })

    it('sets the correct lmsrMarketMaker', async () => {
      expect(await challenge.lmsrMarketMaker()).to.equal(LMSR_ADDR)
    })
  })

  describe('when deployed with incorrect parameters, ', () => {
    it('throws if tradingPeriod < 1', async () => {
      let tradingPeriod = 0
      await expectRevert(deployChallenge({tradingPeriod}))
    })

    it('throws if upperBound < lowerBound', async () => {
      let upperBound = 1
      let lowerBound = 2
      await expectRevert(deployChallenge({upperBound, lowerBound}))
    })
  })

  describe('initiateFutarchy()', async () => {
    beforeEach(async () => {
      token = await Token.new(1000 * 10 ** 18, "FCR Token", 18, 'FCR')
      challenge = await deployChallenge({token})

     // normally registry responsible for transferring funds to new challenge
      await token.transfer(challenge.address, STAKE_AMOUNT)
    })

    describe('if futarchyOracle is already set', async () => {
      it('reverts if futarchyOracle is already set', async () => {
        await challenge.initiateFutarchy()
        await expectRevert(challenge.initiateFutarchy())
      })
    })

    describe('if futarchyOracle has not been set', async () => {
      it('sets futarchyOracle', async () => {
        expect(await challenge.futarchyOracle()).to.equal('0x0000000000000000000000000000000000000000')
        const { logs } = await challenge.initiateFutarchy()
        const futarchyOracleAddress = logs[0].args.futarchyOracleAddress
        expect(await challenge.futarchyOracle()).to.equal(futarchyOracleAddress)
      })

      it('successfully approves funds to the futarchyOracle', async () => {
        const { logs } = await challenge.initiateFutarchy()
        const futarchyOracleAddress = logs[0].args.futarchyOracleAddress
        expect((await token.allowance(challenge.address, futarchyOracleAddress)).toNumber()).to.equal(STAKE_AMOUNT)
      })

      it('emits _InitiatedFutarchy event', async () => {
        await expectEvent('_InitiatedFutarchy', challenge.initiateFutarchy())
      })
    })
  })

  describe('ended()', async () => {
    beforeEach(async () => {
      challenge = await deployChallenge()
      await challenge.initiateFutarchy()
      futarchyOracleMock = await FutarchyOracleMock.at(await challenge.futarchyOracle())
    })

    it('returns true if FutarchyOracle outcome is set', async () => {
      await futarchyOracleMock.mock_setIsSet(true)
      expect(await challenge.ended()).to.equal(true)
    })

    it('returns false if FutarchyOracle outcome is not set', async () => {
      await futarchyOracleMock.mock_setIsSet(false)
      expect(await challenge.ended()).to.equal(false)
    })
  })

  describe('passed()', async () => {
    beforeEach(async () => {
      challenge = await deployChallenge()
      await challenge.initiateFutarchy()
      futarchyOracleMock = await FutarchyOracleMock.at(await challenge.futarchyOracle())
    })

    it('reverts if ended() returns false', async () => {
      await futarchyOracleMock.mock_setIsSet(false)
      await expectRevert(challenge.passed())
    })

    it('returns true if futarchyOracle outcome equals 1', async () => {
      // winningIndex 1 = scalarDenied, meaning listing is denied and FutarchyChallenge passes
      await futarchyOracleMock.mock_setIsSet(true)
      await futarchyOracleMock.mock_setWinningMarketIndex(1)
      expect(await challenge.passed()).to.equal(true)
    })

    it('returns false if futarchyOracle outcome equals 0', async () => {
      // winningIndex 0 = scalarAccepted, meaning listing is accepted and FutarchyChallenge fails
      await futarchyOracleMock.mock_setIsSet(true)
      await futarchyOracleMock.mock_setWinningMarketIndex(0)
      expect(await challenge.passed()).to.equal(false)
    })
  })

  describe('winnerRewardAmount()', async () => {
    let winnerRewardAmount;

    beforeEach(async () => {
      token = await Token.new(1000 * 10 ** 18, "FCR Token", 18, 'FCR')
      challenge = await deployChallenge({token})
      await challenge.initiateFutarchy()
      winnerRewardAmount = 2 * 10 ** 18
      await token.transfer(challenge.address, winnerRewardAmount)
    })

    it('reverts if marketsAreClosed is false', async () => {
      expectRevert(challenge.winnerRewardAmount());
    })

    it('returns the value of winnerRewardAmount', async () => {
      await challenge.close()
      expect((await challenge.winnerRewardAmount()).toNumber()).to.equal(winnerRewardAmount)
    })

    it('returns contract balance at the time close() is invoked even if the contract token balance since increased', async () => {
      // makes sure winnerRewardAmount remains at the amount approved to the Registry in close()
      await challenge.close()
      await token.transfer(challenge.address, winnerRewardAmount)
      expect((await token.balanceOf(challenge.address)).toNumber()).to.equal(winnerRewardAmount * 2)
      expect((await challenge.winnerRewardAmount()).toNumber()).to.equal(winnerRewardAmount)
    })
  })

  describe('close()', async () => {
    let winnerRewardAmount
    beforeEach(async () => {
      token = await Token.new(1000 * 10 ** 18, "FCR Token", 18, 'FCR')
      winnerRewardAmount = 2 * 10 ** 18
      challenge = await deployChallenge({token})
      await challenge.initiateFutarchy()
    })

    it('reverts if called more than once', async () => {
      await challenge.close();
      await expectRevert(challenge.close());
    })

    it('sets marketsAreClosed to true', async () => {
      expect(await challenge.marketsAreClosed()).to.equal(false)
      await challenge.close()
      expect(await challenge.marketsAreClosed()).to.equal(true)
    })

    it('sets rewardBalance to the current token balance of the challlenge contract', async () => {
      token.transfer(challenge.address, winnerRewardAmount)
      expect((await challenge.rewardBalance()).toNumber()).to.equal(0)
      await challenge.close();
      expect((await challenge.rewardBalance()).toNumber()).to.equal(winnerRewardAmount)
    })

    it('approves the rewardBalance to the registry contract', async () => {
      let allowance
      token.transfer(challenge.address, winnerRewardAmount)
      const registry = await challenge.registry()

      allowance = await token.allowance(challenge.address, registry)
      expect(allowance.toNumber()).to.equal(0)

      await challenge.close()
      allowance = await token.allowance(challenge.address, registry)
      expect(allowance.toNumber()).to.equal(winnerRewardAmount)
    })
  })

  async function deployChallenge(customParams = {}) {
    const token = customParams.token || await Token.new(1000 * 10 ** 18, "FCR Token", 18, 'FCR')
    const futarchyOracleFactory = customParams.futarchyOracleFactory || await FutarchyOracleFactoryMock.new()
    const registry = customParams.registry || await RegistryMock.new(token.address)

    const {
      registryAddr          = registry.address,
      challenger            = CHALLENGER,
      listingOwner          = LISTING_OWNER,
      stakeAmount           = STAKE_AMOUNT,
      tradingPeriod         = TRADING_PERIOD,
      lowerBound            = LOWER_BOUND,
      upperBound            = UPPER_BOUND,
      scalarPriceOracleAddr = SCALAR_PRICE_ORACLE_ADDR,
      lmsrAddr              = LMSR_ADDR,
    } = customParams

    const challenge = await FutarchyChallenge.new(
      registryAddr,
      challenger,
      listingOwner,
      stakeAmount,
      tradingPeriod,
      upperBound,
      lowerBound,
      futarchyOracleFactory.address,
      scalarPriceOracleAddr,
      lmsrAddr
    )

    return challenge
  }
})
