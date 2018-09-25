import approveTokenForDx from './approveTokenForDx'
import depositTokenToDx from './depositTokenToDx'
import getAuctionSellVolumes from './getAuctionSellVolumes'

export default async ({
  auctionIndex,
  clearingTime,
  increaseTime,
  traderAccount,
  dutchExchange,
  fcrToken,
  etherToken
}) => {
  await increaseTime(60 * 60 * 6) // to auction start (6 hours from now)
  console.log(`Auction_${auctionIndex} time increased to start (6 hours)`)
  await increaseTime(clearingTime) // increase time to 
  console.log(`Auction_${auctionIndex} time increased by ${clearingTime / (60 * 60)} hours`)
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

  async function buyFcrWithEth(etherTokenAmount) {
    await approveTokenForDx({
      tokenName: 'etherToken',
      token: etherToken,
      amount: etherTokenAmount,
      dutchExchange,
      account: traderAccount
    })
    await depositTokenToDx({
      tokenName: 'etherToken',
      token: etherToken,
      amount: etherTokenAmount,
      dutchExchange,
      account: traderAccount
    })
    const buyOrderTx = await dutchExchange.postBuyOrder(
      fcrToken.address,
      etherToken.address,
      1,
      etherTokenAmount,
      { from: traderAccount }
    )
    console.log(`<${traderAccount}> buy ${etherTokenAmount/10**18} ETH worth of FCR`)
    return buyOrderTx
  }

  async function buyEthWithFcr(fcrTokenAmount) {
    await approveTokenForDx({
      tokenName: 'fcrToken',
      token: fcrToken,
      amount: fcrTokenAmount,
      dutchExchange,
      account: traderAccount
    })
    await depositTokenToDx({
      tokenName: 'fcrToken',
      token: fcrToken,
      amount: fcrTokenAmount,
      dutchExchange,
      account: traderAccount
    })
    const buyOrderTx = await dutchExchange.postBuyOrder(
      etherToken.address,
      fcrToken.address,
      1,
      fcrTokenAmount,
      { from: traderAccount }
    )
    console.log(`<${traderAccount}> buy ${fcrTokenAmount/10**18} FCR worth of ETH`)
    return buyOrderTx
  }

}
