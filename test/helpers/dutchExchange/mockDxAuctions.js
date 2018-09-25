import setupDxPriceFeed from './setupDxPriceFeed'
import addDxTokenPair from './addDxTokenPair'
import clearAuction from './clearAuction'

const fcrTokenFundingAmount = 1000 * 10 ** 18
const etherTokenFundingAmount = 20 * 10 ** 18

export default async ({
  dutchExchange,
  PriceOracleInterface,
  increaseTime,
  accounts,
  fcrToken,
  etherToken
}) => {
  await setupDxPriceFeed(PriceOracleInterface, dutchExchange)
  await addDxTokenPair({
    account: accounts[0],
    dutchExchange,
    fcrToken,
    fcrTokenAmount: fcrTokenFundingAmount,
    etherToken: etherToken,
    etherTokenAmount: etherTokenFundingAmount
  })
  await clearAuction({
    auctionIndex: 1,
    startingTime: 60 * 60 * 6, // 6 hours for new token pair
    clearingTime: 60 * 60 * 9,
    increaseTime,
    traderAccount: accounts[1],
    funderAccount: accounts[2],
    dutchExchange,
    fcrToken,
    etherToken: etherToken
  })
  await clearAuction({
    auctionIndex: 2,
    startingTime: 60 * 10, // 10 minutes for next auction
    clearingTime: 60 * 60 * 9,
    increaseTime,
    traderAccount: accounts[2],
    funderAccount: accounts[3],
    dutchExchange,
    fcrToken,
    etherToken: etherToken
  })
  await clearAuction({
    auctionIndex: 3,
    startingTime: 60 * 10, // 10 minutes for next auction
    clearingTime: 60 * 60 * 9,
    increaseTime,
    traderAccount: accounts[3],
    funderAccount: accounts[4],
    dutchExchange,
    fcrToken,
    etherToken: etherToken
  })
  await clearAuction({
    auctionIndex: 4,
    startingTime: 60 * 10, // 10 minutes for next auction
    clearingTime: 60 * 60 * 9,
    increaseTime,
    traderAccount: accounts[4],
    funderAccount: accounts[5],
    dutchExchange,
    fcrToken,
    etherToken: etherToken
  })
  await clearAuction({
    auctionIndex: 5,
    startingTime: 60 * 10, // 10 minutes for next auction
    clearingTime: 60 * 60 * 9,
    increaseTime,
    traderAccount: accounts[5],
    funderAccount: accounts[6],
    dutchExchange,
    fcrToken,
    etherToken: etherToken
  })
}
