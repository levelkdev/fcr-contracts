/* global artifacts */

module.exports = (deployer, network) => {
  if (network !== 'unit_testing') {
    const Math = artifacts.require('@gnosis.pm/util-contracts/contracts/Math')
    const EtherToken = artifacts.require('@gnosis.pm/util-contracts/contracts/EtherToken')
    const CategoricalEvent = artifacts.require('CategoricalEvent')
    const ScalarEvent = artifacts.require('ScalarEvent')
    const OutcomeToken = artifacts.require('OutcomeToken')
    const StandardMarket = artifacts.require('StandardMarket')
    const StandardMarketWithPriceLogger = artifacts.require('StandardMarketWithPriceLogger')
    const StandardMarketFactory = artifacts.require('StandardMarketFactory')
    const StandardMarketWithPriceLoggerFactory = artifacts.require('StandardMarketWithPriceLoggerFactory')
    const FutarchyChallengeFactory = artifacts.require('FutarchyChallengeFactory')
    const FutarchyOracleFactory = artifacts.require('FutarchyOracleFactory')
    const FutarchyOracle = artifacts.require('FutarchyOracle')
    const ScalarPriceOracleFactory = artifacts.require('ScalarPriceOracleFactory')
    const EventFactory = artifacts.require('EventFactory')
    const LMSRMarketMaker = artifacts.require('LMSRMarketMaker')
    const Token = artifacts.require('tokens/eip20/EIP20.sol');
    const DutchExchangeProxy = artifacts.require('DutchExchangeProxy')

    const config = require('../conf/config.json')
    const paramConfig = config.paramDefaults

    const tradingPeriod = 60 * 60 * 24 * 7 // 1 week
    const timeToPriceResolution = 60 * 60 * 24 * 7 * 2 // 2 weeks
    const futarchyFundingAmount = paramConfig.minDeposit * 10 ** 18

    return deployer.then(async () => {
      await deployer.deploy(Math)
      deployer.link(Math, [StandardMarketFactory, StandardMarketWithPriceLoggerFactory, FutarchyChallengeFactory, EventFactory, LMSRMarketMaker, CategoricalEvent, ScalarEvent, OutcomeToken])
      await deployer.deploy([CategoricalEvent, ScalarEvent, OutcomeToken,])
      await deployer.deploy(EventFactory, CategoricalEvent.address, ScalarEvent.address, OutcomeToken.address)

      deployer.link(Math, [StandardMarket, StandardMarketWithPriceLogger])
      await deployer.deploy([StandardMarket, StandardMarketWithPriceLogger])
      await deployer.deploy(StandardMarketFactory, StandardMarket.address)
      await deployer.deploy(StandardMarketWithPriceLoggerFactory, StandardMarketWithPriceLogger.address)

      await deployer.deploy(
        ScalarPriceOracleFactory,
        Token.address,
        EtherToken.address,
        DutchExchangeProxy.address
      )
      await deployer.deploy(LMSRMarketMaker)
      await deployer.deploy(FutarchyOracle)
      await deployer.deploy(FutarchyOracleFactory, FutarchyOracle.address, EventFactory.address, StandardMarketWithPriceLoggerFactory.address)

      await deployer.deploy(
        FutarchyChallengeFactory,
        EtherToken.address,
        futarchyFundingAmount,
        tradingPeriod,
        timeToPriceResolution,
        FutarchyOracleFactory.address,
        ScalarPriceOracleFactory.address,
        LMSRMarketMaker.address,
        network == 'rinkeby' ? '0x4e69969D9270fF55fc7c5043B074d4e45F795587' : DutchExchangeProxy.address
      )

    }).catch((err) => { throw err })
  }
};
