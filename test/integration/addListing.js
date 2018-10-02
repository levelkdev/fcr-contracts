import _ from 'lodash'
import assert from 'assert'
import Web3 from 'web3'
import lkTestHelpers from 'lk-test-helpers'
import fcrJS from '../helpers/fcrJS'
import distributeEtherToken from '../helpers/distributeEtherToken'
import mockDxAuctions from '../helpers/dutchExchange/mockDxAuctions'
import newRegistry from '../helpers/newRegistry'
import { getFcrBalances, logBalances } from '../helpers/balances'

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
  const { increaseTime } = lkTestHelpers(web3)
  const { accounts } = web3.eth

  const Registry = artifacts.require('Registry.sol')
  const OutcomeToken = artifacts.require('OutcomeToken')

  const FutarchyChallengeFactory = artifacts.require('FutarchyChallengeFactory')
  const futarchyChallengeFactory = await FutarchyChallengeFactory.deployed()

  const RegistryFactory = artifacts.require('RegistryFactory')
  const registryFactory = await RegistryFactory.deployed()

  const Token = artifacts.require('EIP20.sol')
  const fcrToken = await Token.deployed()

  const EtherToken = artifacts.require('EtherToken')
  const etherToken = await EtherToken.deployed()

  const LMSRMarketMaker = artifacts.require('LMSRMarketMaker')
  const lmsrMarketMaker = await LMSRMarketMaker.deployed()

  const DutchExchange = artifacts.require('DutchExchange')
  const DutchExchangeProxy = artifacts.require('DutchExchangeProxy')
  const dutchExchange = DutchExchange.at((await DutchExchangeProxy.deployed()).address)

  const FutarchyOracleFactory = artifacts.require('FutarchyOracleFactory')
  const ScalarPriceOracleFactory = artifacts.require('ScalarPriceOracleFactory')
  const FutarchyChallenge = artifacts.require('FutarchyChallenge')

  const [
    creatorAddress,
    applicantAddress,
    challengerAddress,
    buyerLongAcceptedAddress,
    buyerLongDeniedAddress
  ] = accounts

  const fcrTokenStakeAmount = 10 * 10 ** 18
  const etherTokenDistributionAmount = 50 * 10 ** 18

  const listingTitle = 'listing001'

  await distributeEtherToken(accounts, etherToken, etherTokenDistributionAmount)

  await mockDxAuctions({
    dutchExchange,
    PriceOracleInterface: artifacts.require('PriceOracleInterface'),
    increaseTime,
    accounts,
    fcrToken: fcrToken,
    etherToken
  })

  // deploy registry contract
  const { registryAddress } = await newRegistry(
    'Example Futarchy Curated Registry',
    fcrToken,
    registryFactory,
    futarchyChallengeFactory
  )
  const registry = await Registry.at(registryAddress)
  console.log(`Registry created: ${registryAddress}`)
  console.log('')

  const fcr = fcrJS(
    registry.address,
    fcrToken.address,
    futarchyChallengeFactory.address
  )

  const applicantBalancePreApply = await applicantBalance() / 10 ** 18

  await fcrToken.approve(
    registry.address,
    fcrTokenStakeAmount,
    { from: applicantAddress }
  )
  const registryTx = await fcr.registry.apply(
    applicantAddress,
    listingTitle,
    fcrTokenStakeAmount.toString(16),
    ''
  )
  const listingHash = registryTx[0].receipt.events._Application.returnValues.listingHash
  console.log(`Application created: listingHash=${listingHash}`)
  console.log('')

  const applicantBalancePostApply = await applicantBalance() / 10 ** 18
  const expectedApplyFee = 10
  const actualApplicantBalanceDiff = applicantBalancePreApply - applicantBalancePostApply
  assert.equal(
    actualApplicantBalanceDiff,
    expectedApplyFee,
    `expected applicant balance to be reduced by ${expectedApplyFee} FCR, ` +
    `but was reduced by ${actualApplicantBalanceDiff}`
  )

  await fcr.registry.createChallenge(
    challengerAddress,
    listingTitle,
    ''
  )
  const challengeNonce = 1

  console.log(`Challenge_${challengeNonce} created`)
  console.log('')

  const challenge = await fcr.registry.getChallenge(1)

  // start a challenge
  await challenge.start(challengerAddress)
  const startedEvent = _.find((await challenge.events()).Challenge, { event: '_Started' })
  console.log(`Challenge_${challengeNonce} started: `, startedEvent.returnValues)
  console.log('')

  // fund the challenge
  await fcrToken.approve(
    registry.address,
    fcrTokenStakeAmount,
    { from: challengerAddress }
  )
  await challenge.fund(challengerAddress)
  const fundedEvent = _.find((await challenge.events()).Challenge, { event: '_Funded' })
  console.log(`Challenge_${challengeNonce} funded: `, fundedEvent.returnValues)
  console.log('')

  const longAcceptedBuyAmount = 8 * 10 ** 18
  const longDeniedBuyAmount = 4 * 10 ** 18
  await challenge.buyOutcome(
    buyerLongAcceptedAddress,
    'LONG_ACCEPTED',
    longAcceptedBuyAmount
  )
  await challenge.buyOutcome(
    buyerLongDeniedAddress,
    'LONG_DENIED',
    longDeniedBuyAmount
  )

  async function getAllBalances () {
    const allBalances = await getFcrBalances({
      Token,
      applicantAddress,
      challengerAddress,
      buyerLongAcceptedAddress,
      buyerLongDeniedAddress,
      registryContractAddress: registry ? registry.address : null,
      challengeContractAddress: challenge ? challenge.address : null,
      fcrTokenAddress: fcrToken.address,
      etherTokenAddress: etherToken.address,
      acceptedTokenAddress: challenge ?
        (await challenge.getDecisionToken('ACCEPTED')).address : null,
      deniedTokenAddress: challenge ?
        (await challenge.getDecisionToken('DENIED')).address : null,
      longAcceptedTokenAddress: challenge ?
        (await challenge.getOutcomeToken('LONG_ACCEPTED')).address : null,
      longDeniedTokenAddress: challenge ?
        (await challenge.getOutcomeToken('LONG_DENIED')).address : null,
      shortAcceptedTokenAddress: challenge ?
        (await challenge.getOutcomeToken('SHORT_ACCEPTED')).address : null,
      shortDeniedTokenAddress: challenge ?
        (await challenge.getOutcomeToken('SHORT_DENIED')).address : null
    })
    return allBalances
  }

  async function applicantBalance () {
    const bal = (await fcrToken.balanceOf(applicantAddress)).toNumber()
    return bal
  }



  // console.log('----------------------- Buy ACCEPTED -----------------------')
  // const buyAmt1 = 8 * 10 ** 18
  // const buyAmt2 = 4 * 10 **18
  // await token.approve(categoricalEvent.address, buyAmt1 , {from: buyer1});
  // await categoricalEvent.buyAllOutcomes(buyAmt1, {from: buyer1})
  // await token.approve(categoricalEvent.address, buyAmt2, {from: buyer2});
  // await categoricalEvent.buyAllOutcomes(buyAmt2, {from: buyer2})
  // await logTokenBalance('Accepted Token', acceptedToken, [buyer1, buyer2])
  // await logTokenBalance('Accepted Long Token', acceptedLongToken, [buyer1, buyer2])
  // await logTCRBalances(accounts, token, registry, challenge, futarchyOracle, categoricalEvent, acceptedLongShortEvent, deniedLongShortEvent)





  // console.log('----------------------- Buy LONG_ACCEPTED/SHORT_ACCEPTED -----------------------')
  // await marketBuy(marketForAccepted, 0, [buyAmt1 * 1.5, 0], buyer1)
  // await marketBuy(marketForAccepted, 1, [0, buyAmt2 * 1.5], buyer2)
  // await logTokenBalance('Accepted Token', acceptedToken, [buyer1, buyer2])
  // await logTokenBalance('Accepted Long Token', acceptedLongToken, [buyer1, buyer2])
  // await logTCRBalances(accounts, token, registry, challenge, futarchyOracle, categoricalEvent, acceptedLongShortEvent, deniedLongShortEvent)
  // console.log('')






  // console.log('----------------------- Execute setOutcome -----------------------')
  // increaseTime(tradingPeriod + 1000)
  // await console.log('---------futarchy oracle')
  // await futarchyOracle.setOutcome()
  // await console.log('--------categorical oracle')
  // await categoricalEvent.setOutcome()

  // console.log('')

  // const challengePassed = await challenge.passed()
  // console.log('  Challenge.passed(): ', challengePassed)
  // console.log('')
  // await logTokenBalance('Accepted Token', acceptedToken, [buyer1, buyer2])
  // await logTokenBalance('Accepted Long Token', acceptedLongToken, [buyer1, buyer2])
  // await logTCRBalances(accounts, token, registry, challenge, futarchyOracle, categoricalEvent, acceptedLongShortEvent, deniedLongShortEvent)





  // console.log('  ----------------------- Update Registry -----------------------')
  // await registry.updateStatus(listingHash)
  // console.log('')
  // await logTokenBalance('Accepted Token', acceptedToken, [buyer1, buyer2])
  // await logTokenBalance('Accepted Long Token', acceptedLongToken, [buyer1, buyer2])
  // console.log('  Listing isWhitelisted(): ', await registry.isWhitelisted(listingHash))
  // console.log('')
  // await logTCRBalances(accounts, token, registry, challenge, futarchyOracle, categoricalEvent, acceptedLongShortEvent, deniedLongShortEvent)





  // console.log('----------------------- Resolve Scalar Markets -----------------------')
  // console.log('')
  // console.log(' -- increase time to resolution date')
  // await utils.increaseTime(timeToPriceResolution + 1)

  // const scalarAcceptedEventAddr = await marketForAccepted.eventContract()
  // const scalarAcceptedEvent = await ScalarEvent.at(scalarAcceptedEventAddr)
  // console.log('scalarAccepted')

  // const scalarDeniedEventAddr = await marketForDenied.eventContract()
  // const scalarDeniedEvent = await ScalarEvent.at(scalarDeniedEventAddr)
  // console.log('scalarDenied')

  // const scalarOracleAddr = await scalarAcceptedEvent.oracle()
  // const scalarOracle = await ScalarPriceOracle.at(scalarOracleAddr)

  // const outcomePrice = (lowerBound + (upperBound - lowerBound) * 0.75) * 10 ** 18

  // await challenge.setScalarOutcome()
  // await scalarAcceptedEvent.setOutcome()
  // await scalarDeniedEvent.setOutcome()
  // await logTokenBalance('Accepted Token', acceptedToken, [buyer1, buyer2])
  // await logTokenBalance('Accepted Long Token', acceptedLongToken, [buyer1, buyer2])
  // await logTCRBalances(accounts, token, registry, challenge, futarchyOracle, categoricalEvent, acceptedLongShortEvent, deniedLongShortEvent)





  // console.log('----------------------- Redeem Winnings -----------------------')
  // await scalarAcceptedEvent.redeemWinnings({from: buyer1 })
  // await scalarAcceptedEvent.redeemWinnings({from: buyer2 })
  // await logTokenBalance('Accepted Token', acceptedToken, [buyer1, buyer2])
  // await logTokenBalance('Accepted Long Token', acceptedLongToken, [buyer1, buyer2])
  // await categoricalEvent.redeemWinnings({from: buyer1 })
  // await categoricalEvent.redeemWinnings({from: buyer2 })
  // console.log('')
  // console.log('----redeeming categorical... -------')
  // console.log('')
  // await logTokenBalance('Accepted Token', acceptedToken, [buyer1, buyer2])
  // await logTokenBalance('Accepted Long Token', acceptedLongToken, [buyer1, buyer2])
  // await logTCRBalances(accounts, token, registry, challenge, futarchyOracle, categoricalEvent, acceptedLongShortEvent, deniedLongShortEvent)






  // console.log('----------------------- Close Futarchy Markets -----------------------')
  // await challenge.close()
  // await logTCRBalances(accounts, token, registry, challenge, futarchyOracle, categoricalEvent, acceptedLongShortEvent, deniedLongShortEvent)
  // console.log("reward amount: ", (await challenge.winnerRewardAmount()).toNumber())
  // console.log('')
  // console.log('')





  // console.log('----------------------- Redeem Winner Reward -----------------------')
  // await registry.allocateWinnerReward(challengeID)
  // await logTCRBalances(accounts, token, registry, challenge, futarchyOracle, categoricalEvent, acceptedLongShortEvent, deniedLongShortEvent)







  // async function marketBuy (market, outcomeTokenIndex, arrayGuy, from) {
  //   const evtContract = Event.at(await market.eventContract())
  //   const collateralToken = Token.at(await evtContract.collateralToken())
  //   const cost = await getOutcomeTokenCost(market.address, arrayGuy)
  //   const fee = await getMarketFee(market, cost)
  //   const maxCost = cost + fee + 1000

  //   await collateralToken.approve(market.address, maxCost, { from })
  //   await market.trade(arrayGuy, maxCost, { from })
  // }

  // async function fundMarket (market, collateralToken, fundingAmount, from) {
  //   await collateralToken.approve(market.address, fundingAmount, { from })
  //   await market.fund(fundingAmount, { from })
  // }

  // async function logBalances () {
  //   await logTokenHolderBalances()
  //   await logEventContractBalances()
  //   await logMarketContractBalances()
  // }

  // async function logTokenHolderBalances () {
  //   console.log('  Token Holders')
  //   console.log('  -------------')
  //   console.log('    Market Creator')
  //   console.log('    --------------')
  //   await logTokenBalances(creator)
  //   console.log('   ')

  //   console.log('    Buyer: LONG_ACCEPTED')
  //   console.log('    --------------------')
  //   await logTokenBalances(buyer1)
  //   console.log('   ')
  // }

  // async function logEventContractBalances () {
  //   console.log('  Event Contracts')
  //   console.log('  ---------------')

  //   console.log('    ACCEPTED/DENIED : ETH')
  //   console.log('    ---------------------')
  //   await logTokenBalances(categoricalEvent.address)
  //   console.log('   ')

  //   console.log('    LONG/SHORT : ACCEPTED')
  //   console.log('    ---------------------')
  //   await logTokenBalances(acceptedLongShortEvent.address)
  //   console.log('   ')

  //   console.log('    LONG/SHORT : DENIED')
  //   console.log('    -------------------')
  //   await logTokenBalances(deniedLongShortEvent.address)
  //   console.log('')
  // }

  // async function logMarketContractBalances () {
  //   console.log('  Market Contracts')
  //   console.log('  ----------------')

  //   console.log('    ACCEPTED | DENIED')
  //   console.log('    ------------------------------')
  //   await logTokenBalances(categoricalMarket.address)
  //   console.log('   ')

  //   console.log('    LONG_ACCEPTED | SHORT_ACCEPTED')
  //   console.log('    ------------------------------')
  //   await logTokenBalances(marketForAccepted.address)
  //   console.log('   ')

  //   console.log('    LONG_DENIED | SHORT_DENIED')
  //   console.log('    --------------------------')
  //   await logTokenBalances(marketForDenied.address)
  //   console.log('   ')
  // }

  // async function logTokenBalances (account) {
  //   await logTokenBalance('Accepted', acceptedToken, account)
  //   await logTokenBalance('Denied', deniedToken, account)
  //   await logTokenBalance('ShortAccepted', acceptedShortToken, account)
  //   await logTokenBalance('LongAccepted', acceptedLongToken, account)
  //   await logTokenBalance('ShortDenied', deniedShortToken, account)
  //   await logTokenBalance('LongDenied', deniedLongToken, account)
  // }

  // async function logTokenBalance (tokenName, token, accountArray) {
  //   console.log(`   ${tokenName} balances:`)
  //   for (let account of accountArray) {
  //     const bal = (await token.balanceOf(account)).toNumber()
  //       console.log(`          ${await accountName(account)}: ${bal / 10 ** 18}`)
  //   }
  // }

  // async function accountName(accountAddr) {
  //   const accountNames = ["creator", "applicant", "challenger", "voterFor", "voterAgainst", "buyer1", "buyer2"]
  //   let i = 0
  //   for(let account of accounts) {
  //     if(account == accountAddr) {return accountNames[i] }
  //     i++
  //   }
  // }

  // async function logOutcomeTokenCosts () {
  //   const acceptedCost = await getOutcomeTokenCost(categoricalMarket.address, [1e15, 0])
  //   const deniedCost = await getOutcomeTokenCost(categoricalMarket.address, [0, 1e15])
  //   const longAcceptedCost = await getOutcomeTokenCost(marketForAccepted.address, [0, 1e15])
  //   const shortAcceptedCost = await getOutcomeTokenCost(marketForAccepted.address, [1e15, 0])
  //   const longDeniedCost = await getOutcomeTokenCost(marketForDenied.address, [0, 1e15])
  //   const shortDeniedCost = await getOutcomeTokenCost(marketForDenied.address, [1e15, 0])
  //   console.log('  Outcome Token Prices')
  //   console.log('  --------------------')
  //   console.log('  ACCEPTED:       ', acceptedCost / 10 ** 15)
  //   console.log('  DENIED:         ', deniedCost / 10 ** 15)
  //   console.log('  SHORT_ACCEPTED: ', shortAcceptedCost / 10 ** 15)
  //   console.log('  LONG_ACCEPTED:  ', longAcceptedCost / 10 ** 15)
  //   console.log('  SHORT_DENIED:   ', shortDeniedCost / 10 ** 15)
  //   console.log('  LONG_DENIED:    ', longDeniedCost / 10 ** 15)
  //   console.log('')
  // }

  // async function getOutcomeTokenCost (marketAddr, arrayGuy) {
  //   const cost = await lmsrMarketMaker.calcNetCost(marketAddr, arrayGuy)
  //   return cost.toNumber()
  // }

  // async function getMarketFee (market, tokenCost) {
  //   const fee = await market.calcMarketFee.call(tokenCost)
  //   return fee.toNumber()
  // }
}


