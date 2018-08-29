
async function runDutchExchangeAuction(web3, dutchExchange, token1, token2) {
  const { accounts } = web3.eth
  const [ auctionCreator, auctionBuyer ] = accounts

  // TODO: implement dutch exchange auction setup and trading

  const b = await token2.balanceOf(auctionBuyer)
  return b
}

export default runDutchExchangeAuction
