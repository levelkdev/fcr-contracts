import approveTokenForDx from './approveTokenForDx'
import depositTokenToDx from './depositTokenToDx'
import getAuctionSellVolumes from './getAuctionSellVolumes'

export default async ({
  auctionIndex,
  startingTime,
  clearingTime,
  increaseTime,
  traderAccount,
  funderAccount,
  dutchExchange,
  fcrToken,
  etherToken
}) => {
  console.log(`Clearing Auction_${auctionIndex}`)
  console.log('')

  await increaseTime(startingTime) // to auction start
  console.log(`Auction_${auctionIndex} time increased to start (${startingTime / (60 * 60)} hours)`)
  await increaseTime(clearingTime) // increase time to 
  console.log(`Auction_${auctionIndex} time increased by ${clearingTime / (60 * 60)} hours`)
  console.log('')

  // // execute sell orders for next auction (auctionIndex + 1)
  await sellFcr(200 * 10 ** 18)
  console.log(`<${funderAccount}> sell 200 FCR in Auction_${auctionIndex + 1}`)
  console.log('')

  await sellEth(12 * 10 ** 18)
  console.log(`<${funderAccount}> sell 12 ETH in Auction_${auctionIndex + 1}`)
  console.log('')

  const p = await getAuctionPrice(auctionIndex)

  const { fcrSellVolume, ethSellVolume } = await getAuctionSellVolumes({
    dutchExchange,
    fcrToken,
    etherToken
  })

  // amount of ETH needed to clear the FCR for sale at current price
  const ethClearingAmount = (fcrSellVolume.toNumber() * p) + (10000)

  // amount of FCR needed to clear the ETH for sale at current price
  const fcrClearingAmount = (ethSellVolume.toNumber() / p) + (10000)

  console.log(`${ethClearingAmount/10**18} ETH needed to clear ${fcrSellVolume.toNumber()/10**18} FCR at price ${p}`)
  console.log(`${fcrClearingAmount/10**18} FCR needed to clear ${ethSellVolume.toNumber()/10**18} ETH at price ${p}`)
  console.log('')

  // clear the FCR side of the auction
  await buyFcrWithEth(ethClearingAmount)
  console.log('')

  // clear the ETH side of the auction
  await buyEthWithFcr(fcrClearingAmount)
  console.log('')

  // log the current auction index (should be auctionIndex + 1)
  const latestAuction = await dutchExchange.latestAuctionIndices(
    fcrToken.address,
    etherToken.address
  )

  if (latestAuction - 1 !== auctionIndex) {
    throw new Error(`Error: Auction ${auctionIndex} was not cleared`)
  } else {
    console.log(`Auction_${auctionIndex} cleared`)
    console.log('')
  }

  // log the price of the cleared auction
  const auctionPrice = await dutchExchange.getPriceInPastAuction(
    fcrToken.address,
    etherToken.address,
    auctionIndex
  )
  console.log(`Auction_${auctionIndex} FCR/ETH average price: ${auctionPrice[0].toNumber() / auctionPrice[1].toNumber()}`)
  console.log('')

  // helper functions

  async function getAuctionPrice(auctionIndex) {
    const price = await dutchExchange.getCurrentAuctionPrice(
      fcrToken.address,
      etherToken.address,
      auctionIndex
    )
    const fcrToEthPrice = price[0].toNumber() / price[1].toNumber()
    return fcrToEthPrice
  }

  async function sellFcr (amount) {
    await approveAndDeposit('fcrToken', fcrToken, amount, funderAccount)
    const tx = await dutchExchange.postSellOrder(
      fcrToken.address,
      etherToken.address,
      auctionIndex + 1,
      amount,
      { from: funderAccount }
    )
  }

  async function sellEth (amount) {
    await approveAndDeposit('etherToken', etherToken, amount, funderAccount)
    const tx = await dutchExchange.postSellOrder(
      etherToken.address,
      fcrToken.address,
      auctionIndex + 1,
      amount,
      { from: funderAccount }
    )
  }

  async function buyFcrWithEth (etherTokenAmount) {
    await approveAndDeposit('etherToken', etherToken, etherTokenAmount, traderAccount)
    const buyOrderTx = await dutchExchange.postBuyOrder(
      fcrToken.address,
      etherToken.address,
      auctionIndex,
      etherTokenAmount,
      { from: traderAccount }
    )
    console.log(`<${traderAccount}> buy ${etherTokenAmount/10**18} ETH worth of FCR`)
    return buyOrderTx
  }

  async function buyEthWithFcr (fcrTokenAmount) {
    await approveAndDeposit('fcrToken', fcrToken, fcrTokenAmount, traderAccount)
    const buyOrderTx = await dutchExchange.postBuyOrder(
      etherToken.address,
      fcrToken.address,
      auctionIndex,
      fcrTokenAmount,
      { from: traderAccount }
    )
    console.log(`<${traderAccount}> buy ${fcrTokenAmount/10**18} FCR worth of ETH`)
    return buyOrderTx
  }

  async function approveAndDeposit (tokenName, token, amount, account) {
    await approveTokenForDx({
      tokenName,
      token,
      amount,
      dutchExchange,
      account
    })
    await depositTokenToDx({
      tokenName,
      token,
      amount,
      dutchExchange,
      account
    })
  }

}
