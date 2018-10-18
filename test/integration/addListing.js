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

  const Registry = artifacts.require('Registry')
  const OutcomeToken = artifacts.require('OutcomeToken')

  const FutarchyChallengeFactory = artifacts.require('FutarchyChallengeFactory')
  const futarchyChallengeFactory = await FutarchyChallengeFactory.deployed()

  const RegistryFactory = artifacts.require('RegistryFactory')
  const registryFactory = await RegistryFactory.deployed()

  const Token = artifacts.require('EIP20')
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
    _deployer,
    creatorAddress,
    applicantAddress,
    challengerAddress,
    buyerLongAcceptedAddress,
    buyerLongDeniedAddress,
    publicSenderAddress
  ] = accounts

  const tradingPeriod = 60 * 60 * 24 * 7
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
  console.log(`buyerLongAccepted:<${buyerLongAcceptedAddress}> bought ${longAcceptedBuyAmount} LONG_ACCEPTED outcome tokens`)
  console.log('')

  await challenge.buyOutcome(
    buyerLongDeniedAddress,
    'LONG_DENIED',
    longDeniedBuyAmount
  )
  console.log(`buyerLongDenied:<${buyerLongDeniedAddress}> bought ${longDeniedBuyAmount} LONG_DENIED outcome tokens`)
  console.log('')

  increaseTime(tradingPeriod + (60 * 5))
  console.log(`block time increased by ${tradingPeriod + (60 * 5)}`)
  console.log('')

  console.log('resolving futarchy decision')
  console.log('')
  const resolveFutarchyTx = await challenge.resolveFutarchyDecision(publicSenderAddress)
  const updateStatusEvents = resolveFutarchyTx[2].receipt.events
  if (updateStatusEvents._ChallengeSucceeded) {
    console.log('challenge succeeded')
  } else if (updateStatusEvents._ChallengeFailed) {
    console.log('challenge failed')
  } else {
    throw new Error('Challenge resolution event not fired after futarchy decision resolution')
  }
  console.log('')

  const listingData = await fcr.registry.getListing(listingTitle)
  assert(
    listingData.whitelisted,
    true,
    `Expected listing '${listingTitle}' to be whitelisted, but it was not`
  )
  console.log(`listing '${listingTitle}' is whitelisted`)
  console.log('')

  const priceOracle = await challenge.getPriceOracle()
  const resolutionDate = await priceOracle.methods.resolutionDate().call()
  const latestBlockTime = (await web3.eth.getBlock('latest')).timestamp

  const timeToPriceResolution = (resolutionDate - latestBlockTime) + 60
  increaseTime(timeToPriceResolution)
  console.log(`block time increased by ${timeToPriceResolution}`)
  console.log('')

  console.log('resolving futarchy markets')
  console.log('')
  await challenge.resolveFutarchyMarkets(publicSenderAddress)

  console.log(`redeem all winnings for buyerLongAccepted<${buyerLongAcceptedAddress}>`)
  await challenge.redeemAllWinnings(buyerLongAcceptedAddress)
  console.log(`redeem all winnings for buyerLongDenied<${buyerLongDeniedAddress}>`)
  await challenge.redeemAllWinnings(buyerLongDeniedAddress)
  console.log('')

  console.log('finalize futarchy challenge')
  console.log('')
  await challenge.finalize(publicSenderAddress)

  console.log(`exit listing and redeem stake for applicant:<${applicantAddress}>`)
  console.log('')
  await fcr.registry.exit(applicantAddress, listingTitle)

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
}
