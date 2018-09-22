import Web3 from 'web3'
import fcrJS from '../helpers/fcrJS'
import distributeEtherToken from '../helpers/distributeEtherToken'
import setupDxPriceFeed from '../helpers/dutchExchange/setupDxPriceFeed'
import addDxPriceData from '../helpers/dutchExchange/addDxPriceData'
import newRegistry from '../helpers/newRegistry'

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
  const BN = Web3.utils.BN
  const { accounts } = web3.eth

  const Registry = artifacts.require('Registry.sol')
  const OutcomeToken = artifacts.require('OutcomeToken')

  const FutarchyChallengeFactory = artifacts.require('FutarchyChallengeFactory')
  const futarchyChallengeFactory = await FutarchyChallengeFactory.deployed()

  const RegistryFactory = artifacts.require('RegistryFactory')
  const registryFactory = await RegistryFactory.deployed()

  const Token = artifacts.require('EIP20.sol')
  const token = await Token.deployed()

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

  const [creator, applicant, challenger, voterFor, voterAgainst, buyer1, buyer2] = accounts

  const fcrTokenFundingAmount = 1000 * 10 ** 18
  const etherTokenFundingAmount = 20 * 10 ** 18
  const etherTokenDistributionAmount = 50 * 10 ** 18

  const listingTitle = 'listing001'

  // const tradingPeriod = 60 * 60

  await distributeEtherToken(accounts, etherToken, etherTokenDistributionAmount)

  await setupDxPriceFeed(artifacts.require('PriceOracleInterface'), dutchExchange)
  await addDxPriceData({
    dutchExchange,
    fcrToken: token,
    fcrTokenAmount: fcrTokenFundingAmount,
    etherToken: etherToken,
    etherTokenAmount: etherTokenFundingAmount
  })

  // const outcomeToken          = await OutcomeToken.deployed()
  // const scalarPriceOracleFactory = await ScalarPriceOracleFactory.new(token.address, etherToken.address, dutchExchange.address)
  // const futarchyOracleFactory = await FutarchyOracleFactory.deployed()
  // const timeToPriceResolution = 60 * 60 * 24 * 7 // a week

  // deploy registry contract
  const { registryAddress } = await newRegistry(
    'Example Futarchy Curated Registry',
    token,
    registryFactory,
    futarchyChallengeFactory
  )
  const registry = await Registry.at(registryAddress)
  console.log(`registry created: ${registryAddress}`)

  const fcr = fcrJS(
    registry.address,
    token.address,
    futarchyChallengeFactory.address
  )

  await token.approve(
    registry.address,
    fcrTokenFundingAmount,
    { from: applicant }
  )
  const registryTx = await fcr.registry.apply(
    applicant,
    listingTitle,
    fcrTokenFundingAmount.toString(16),
    ''
  )
  const listingHash = registryTx[0].receipt.events._Application.returnValues.listingHash
  console.log(`application created: listingHash=${listingHash}`)

  // const tx = await fcr.registry.createChallenge(
  //   challenger,
  //   listingTitle,
  //   ''
  // )
  // console.log('TX: ', tx)

  // const auctionIndex = await dutchExchange.getAuctionIndex(token.address, etherToken.address)
  // console.log('AUCTION INDEX: ', auctionIndex)


  // console.log('----------------------- SUBMITTING CHALLENGE -----------------------')
  // const listingHash = web3_beta.utils.fromAscii('nochallenge.net')
  // const receipt = await utils.as(challenger, registry.createChallenge, listingHash, '')
  // const { challengeID } = receipt.logs[0].args
  // const challenge = await getFutarchyChallenge(challengeID, registry)
  // await logTCRBalances(accounts, token, registry, challenge)





  // console.log('----------------------- STARTING CHALLENGE -----------------------')
  // await token.approve(challenge.address, futarchyFundingAmount, {from: challenger})
  // await challenge.start({from: challenger})
  // const futarchyAddress = await challenge.futarchyOracle();
  // const futarchyOracle = await FutarchyOracle.at(futarchyAddress)
  // const marketForAccepted = StandardMarketWithPriceLogger.at(await futarchyOracle.markets(0))
  // const marketForDenied = StandardMarketWithPriceLogger.at(await futarchyOracle.markets(1))
  // const categoricalEvent = CategoricalEvent.at(await futarchyOracle.categoricalEvent())
  // const acceptedLongShortEvent = ScalarEvent.at(await marketForAccepted.eventContract())
  // const deniedLongShortEvent = ScalarEvent.at(await marketForDenied.eventContract())
  // await logTCRBalances(accounts, token, registry, challenge, categoricalEvent, acceptedLongShortEvent, deniedLongShortEvent)

  // const acceptedToken = await OutcomeToken.at(await acceptedLongShortEvent.collateralToken())
  // const acceptedLongToken = await OutcomeToken.at(await acceptedLongShortEvent.outcomeTokens(1))



  // console.log('----------------------- FUNDING CHALLENGE -----------------------')
  // await token.approve(challenge.address, futarchyFundingAmount, {from: challenger})
  // await challenge.fund({from: challenger})
  // await logTCRBalances(accounts, token, registry, challenge, futarchyOracle, categoricalEvent, acceptedLongShortEvent, deniedLongShortEvent)
  // await logTokenBalance('Accepted Token', acceptedToken, [buyer1, buyer2])
  // await logTokenBalance('Accepted Long Token', acceptedLongToken, [buyer1, buyer2])






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







  async function marketBuy (market, outcomeTokenIndex, arrayGuy, from) {
    const evtContract = Event.at(await market.eventContract())
    const collateralToken = Token.at(await evtContract.collateralToken())
    const cost = await getOutcomeTokenCost(market.address, arrayGuy)
    const fee = await getMarketFee(market, cost)
    const maxCost = cost + fee + 1000

    await collateralToken.approve(market.address, maxCost, { from })
    await market.trade(arrayGuy, maxCost, { from })
  }

  async function fundMarket (market, collateralToken, fundingAmount, from) {
    await collateralToken.approve(market.address, fundingAmount, { from })
    await market.fund(fundingAmount, { from })
  }

  async function logBalances () {
    await logTokenHolderBalances()
    await logEventContractBalances()
    await logMarketContractBalances()
  }

  async function logTokenHolderBalances () {
    console.log('  Token Holders')
    console.log('  -------------')
    console.log('    Market Creator')
    console.log('    --------------')
    await logTokenBalances(creator)
    console.log('   ')

    console.log('    Buyer: LONG_ACCEPTED')
    console.log('    --------------------')
    await logTokenBalances(buyer1)
    console.log('   ')
  }

  async function logEventContractBalances () {
    console.log('  Event Contracts')
    console.log('  ---------------')

    console.log('    ACCEPTED/DENIED : ETH')
    console.log('    ---------------------')
    await logTokenBalances(categoricalEvent.address)
    console.log('   ')

    console.log('    LONG/SHORT : ACCEPTED')
    console.log('    ---------------------')
    await logTokenBalances(acceptedLongShortEvent.address)
    console.log('   ')

    console.log('    LONG/SHORT : DENIED')
    console.log('    -------------------')
    await logTokenBalances(deniedLongShortEvent.address)
    console.log('')
  }

  async function logMarketContractBalances () {
    console.log('  Market Contracts')
    console.log('  ----------------')

    console.log('    ACCEPTED | DENIED')
    console.log('    ------------------------------')
    await logTokenBalances(categoricalMarket.address)
    console.log('   ')

    console.log('    LONG_ACCEPTED | SHORT_ACCEPTED')
    console.log('    ------------------------------')
    await logTokenBalances(marketForAccepted.address)
    console.log('   ')

    console.log('    LONG_DENIED | SHORT_DENIED')
    console.log('    --------------------------')
    await logTokenBalances(marketForDenied.address)
    console.log('   ')
  }

  async function logTokenBalances (account) {
    await logTokenBalance('Accepted', acceptedToken, account)
    await logTokenBalance('Denied', deniedToken, account)
    await logTokenBalance('ShortAccepted', acceptedShortToken, account)
    await logTokenBalance('LongAccepted', acceptedLongToken, account)
    await logTokenBalance('ShortDenied', deniedShortToken, account)
    await logTokenBalance('LongDenied', deniedLongToken, account)
  }

  async function logTokenBalance (tokenName, token, accountArray) {
    console.log(`   ${tokenName} balances:`)
    for (let account of accountArray) {
      const bal = (await token.balanceOf(account)).toNumber()
        console.log(`          ${await accountName(account)}: ${bal / 10 ** 18}`)
    }
  }

  async function accountName(accountAddr) {
    const accountNames = ["creator", "applicant", "challenger", "voterFor", "voterAgainst", "buyer1", "buyer2"]
    let i = 0
    for(let account of accounts) {
      if(account == accountAddr) {return accountNames[i] }
      i++
    }
  }

  async function logOutcomeTokenCosts () {
    const acceptedCost = await getOutcomeTokenCost(categoricalMarket.address, [1e15, 0])
    const deniedCost = await getOutcomeTokenCost(categoricalMarket.address, [0, 1e15])
    const longAcceptedCost = await getOutcomeTokenCost(marketForAccepted.address, [0, 1e15])
    const shortAcceptedCost = await getOutcomeTokenCost(marketForAccepted.address, [1e15, 0])
    const longDeniedCost = await getOutcomeTokenCost(marketForDenied.address, [0, 1e15])
    const shortDeniedCost = await getOutcomeTokenCost(marketForDenied.address, [1e15, 0])
    console.log('  Outcome Token Prices')
    console.log('  --------------------')
    console.log('  ACCEPTED:       ', acceptedCost / 10 ** 15)
    console.log('  DENIED:         ', deniedCost / 10 ** 15)
    console.log('  SHORT_ACCEPTED: ', shortAcceptedCost / 10 ** 15)
    console.log('  LONG_ACCEPTED:  ', longAcceptedCost / 10 ** 15)
    console.log('  SHORT_DENIED:   ', shortDeniedCost / 10 ** 15)
    console.log('  LONG_DENIED:    ', longDeniedCost / 10 ** 15)
    console.log('')
  }

  async function getOutcomeTokenCost (marketAddr, arrayGuy) {
    const cost = await lmsrMarketMaker.calcNetCost(marketAddr, arrayGuy)
    return cost.toNumber()
  }

  async function getMarketFee (market, tokenCost) {
    const fee = await market.calcMarketFee.call(tokenCost)
    return fee.toNumber()
  }

  async function logTCRBalances(
    accounts,
    token,
    registry,
    challenge = null,
    futarchyOracle = null,
    catEvent = null,
    aScal = null,
    dScal = null
  ) {
    const [_, applicant, challenger, voterFor, voterAgainst, buyer1, buyer2] = accounts
    const applicantBalance = (await token.balanceOf.call(applicant)).toNumber()/10**18
    const challengerBalance = (await token.balanceOf.call(challenger)).toNumber()/10**18
    const voterForBalance = (await token.balanceOf.call(voterFor)).toNumber()/10**18
    const voterAgainstBalance = (await token.balanceOf.call(voterAgainst)).toNumber()/10**18
    const registryBalance = (await token.balanceOf.call(registry.address)).toNumber()/10**18
    const buyer1Balance = (await token.balanceOf.call(buyer1)).toNumber()/10**18
    const buyer2Balance = (await token.balanceOf.call(buyer2)).toNumber()/10**18
    console.log('')
    console.log('')
    console.log('')
    console.log('balances:')
    console.log(`  applicant:  ${applicantBalance}`)
    console.log(`  challenger: ${challengerBalance}`)
    console.log(`  buyer1:     ${buyer1Balance}`)
    console.log(`  buyer2:     ${buyer2Balance}`)
    console.log(`  Registry Contract: ${registryBalance}`)
    if(challenge) {
      const challengeBalance = (await token.balanceOf.call(challenge.address)).toNumber()/10**18
      console.log(`  Challenge Contract: ${challengeBalance}`)
    } else {
      console.log('  Challenge Contract: NULL')
    }
    if(futarchyOracle) {
      const futarchyBalance = (await token.balanceOf.call(futarchyOracle.address)).toNumber()/10**18
      console.log(`  Futarchy Oracle Contract: ${futarchyBalance}`)
    } else {
      console.log('  Futarchy Oracle Contract: NULL')
    }
    if(catEvent) {
      const catEventBalance = (await token.balanceOf.call(catEvent.address)).toNumber()/10**18
      console.log(`  Categorical Event: ${catEventBalance}`)
    } else {
      console.log('   Categorical Event: NULL')
    }
    if(aScal) {
      const acceptedToken = await OutcomeToken.at(await aScal.collateralToken())
      const aScalBalance = (await acceptedToken.balanceOf.call(aScal.address)).toNumber()/10**18
      console.log(`  Scalar Accepted Event: ${aScalBalance}`)
    } else {
      console.log('   Scalar Accepted Event: NULL')
    }
    if(dScal) {
      const acceptedToken = await OutcomeToken.at(await dScal.collateralToken())
      const dScalBalance = (await acceptedToken.balanceOf.call(dScal.address)).toNumber()/10**18
      console.log(`  Denied Accepted Event: ${dScalBalance}`)
    } else {
      console.log('   Denied Accepted Event: NULL')
    }
    console.log('')
    console.log('')
    console.log('')
  }
  
  async function logRegistryStatus(registry) {
    console.log('----------')
    console.log('REGISTRY STATUS')
    console.log('----------')
  }
  
  async function getFutarchyChallenge(challengeID, registry) {
    const challenge = (await registry.challenges(challengeID))[0]
    return FutarchyChallenge.at(challenge)
  }
}


