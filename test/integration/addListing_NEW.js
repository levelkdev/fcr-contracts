// import _ from 'lodash'
// import fcrjs from 'fcr-js'
// import Web3_beta from 'web3'

/*
 * Add Listing
 * -----------
 * 
 * This script applies a listing and immediately creates a challenge
 * for the listing. Trading on LMSR markets cause the challenge to
 * fail, thus adding the listing to the registry. After the listing
 * is added, the ScalarEvent contracts are resolved by a ScalarPriceOracle
 * which gets the price from the average trading price of the FCR/ETH
 * token pair on DutchExchange.
 * 
 */

module.exports = async (artifacts, web3) => {
  const { accounts } = web3.eth

    // TODO: create integration testing config, remove hardcoded config
    const paramConfig = {
      minDeposit: 10
    }
  
    const Parameterizer = artifacts.require('Parameterizer.sol')
    const Registry = artifacts.require('Registry.sol')
    const Token = artifacts.require('EIP20.sol')
    const OutcomeToken = artifacts.require('OutcomeToken')
    const FutarchyChallengeFactory = artifacts.require('FutarchyChallengeFactory')
    const EtherToken = artifacts.require('EtherToken')
    const Event = artifacts.require('Event')
    const LMSRMarketMaker = artifacts.require('LMSRMarketMaker')
    const FutarchyOracleFactory = artifacts.require('FutarchyOracleFactory')
    const ScalarPriceOracleFactory = artifacts.require('ScalarPriceOracleFactory')
    const FutarchyChallenge = artifacts.require('FutarchyChallenge')
    const DutchExchange = artifacts.require('DutchExchange')
  
    const [applicant] = accounts
    const tradingPeriod = 60 * 60
    const futarchyFundingAmount = paramConfig.minDeposit * 10 ** 18
    const approvalAmount = 20 * 10 ** 18
  
    const token = await Token.deployed()
    const etherToken = await EtherToken.deployed()
  
    // TODO: distribute tokens without utils.js
    // await utils.distributeToken(accounts, token)
    // await utils.distributeEtherToken(accounts, etherToken)
  
    const dutchExchange         = await DutchExchange.deployed()
    const scalarPriceOracleFactory = await ScalarPriceOracleFactory.new(token.address, etherToken.address, dutchExchange.address)
    const futarchyOracleFactory = await FutarchyOracleFactory.deployed()
    const lmsrMarketMaker = await LMSRMarketMaker.new()
    const timeToPriceResolution = 60 * 60 * 24 * 7 // a week
  
    // TODO: implement dutch exchange auction and trading
    // await runDutchExchangeAuction(web3, dutchExchange, token, etherToken)
  
    const futarchyChallengeFactory = await FutarchyChallengeFactory.new(
      etherToken.address,
      futarchyFundingAmount,
      tradingPeriod,
      timeToPriceResolution,
      futarchyOracleFactory.address,
      scalarPriceOracleFactory.address,
      lmsrMarketMaker.address,
      dutchExchange.address
    )
  
    console.log('futarchyChallengeFactory: ', futarchyChallengeFactory.address)
    console.log('')

  await token.approve(registry.address, approvalAmount, {from: applicant})
  await fcr.registry.apply(applicant, 'nochallenge.net', futarchyFundingAmount, '')
  await logTCRBalances(accounts, token, registry)
}
