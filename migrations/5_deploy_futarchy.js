/* global artifacts */

const Token = artifacts.require('tokens/eip20/EIP20.sol');
const Math = artifacts.require('@gnosis.pm/gnosis-core-contracts/Math')
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
const EtherToken = artifacts.require('EtherToken')
const DutchExchange = artifacts.require('DutchExchangeMock')

const fs = require('fs')
const config = JSON.parse(fs.readFileSync('../conf/config.json'))
const paramConfig = config.paramDefaults

const tradingPeriod = 60 * 60
const timeToPriceResolution = 60 * 60 * 24 * 7 // a week
const futarchyFundingAmount = paramConfig.minDeposit * 10 ** 18

module.exports = (deployer, network) => {
  return deployer.then(async () => {
    const dutchExchangeAddress = await determineDutchExchangeAddr(network)
    await deployer.deploy(Math)
    deployer.link(Math, [EtherToken, StandardMarketFactory, StandardMarketWithPriceLoggerFactory, FutarchyChallengeFactory, EventFactory, LMSRMarketMaker, CategoricalEvent, ScalarEvent, OutcomeToken])
    await deployer.deploy([CategoricalEvent, ScalarEvent, OutcomeToken,])
    await deployer.deploy(EventFactory, CategoricalEvent.address, ScalarEvent.address, OutcomeToken.address)

    deployer.link(Math, [StandardMarket, StandardMarketWithPriceLogger])
    await deployer.deploy([StandardMarket, StandardMarketWithPriceLogger])
    await deployer.deploy(StandardMarketFactory, StandardMarket.address)
    await deployer.deploy(StandardMarketWithPriceLoggerFactory, StandardMarketWithPriceLogger.address)
    await deployer.deploy(EtherToken)

    console.log('ETHER TOKEN: ', EtherToken.address)

    await deployer.deploy(
      ScalarPriceOracleFactory,
      Token.address,
      EtherToken.address,
      dutchExchangeAddress
    )
    await deployer.deploy(LMSRMarketMaker)

    await deployer.deploy(FutarchyOracle)
    await deployer.deploy(FutarchyOracleFactory, FutarchyOracle.address, EventFactory.address, StandardMarketWithPriceLoggerFactory.address)
    await deployer.deploy(
      FutarchyChallengeFactory,
      Token.address,
      EtherToken.address,
      futarchyFundingAmount,
      tradingPeriod,
      timeToPriceResolution,
      FutarchyOracleFactory.address,
      ScalarPriceOracleFactory.address,
      LMSRMarketMaker.address,
      dutchExchangeAddress
    )

  }).catch((err) => { throw err })

};

async function determineDutchExchangeAddr(network) {
  if (network == 'rinkeby') {
    return '0x4e69969D9270fF55fc7c5043B074d4e45F795587'
  } else {
    let dutchX = await DutchExchange.deployed()
    return dutchX.address
  }
}
