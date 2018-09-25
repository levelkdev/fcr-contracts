import approveTokenForDx from './approveTokenForDx'
import depositTokenToDx from './depositTokenToDx'

export default async ({
  account,
  dutchExchange,
  fcrToken,
  fcrTokenAmount,
  etherToken,
  etherTokenAmount
}) => {
  const initialClosingPriceNum = 1
  const initialClosingPriceDen = 800

  await approveTokenForDx({
    tokenName: 'fcrToken',
    token: fcrToken,
    amount: fcrTokenAmount,
    dutchExchange,
    account
  })
  await approveTokenForDx({
    tokenName: 'etherToken',
    token: etherToken,
    amount: etherTokenAmount,
    dutchExchange,
    account
  })
  await depositTokenToDx({
    tokenName: 'fcrToken',
    token: fcrToken,
    amount: fcrTokenAmount,
    dutchExchange,
    account
  })
  await depositTokenToDx({
    tokenName: 'etherToken',
    token: etherToken,
    amount: etherTokenAmount,
    dutchExchange,
    account
  })
  console.log('')

  const tx = await dutchExchange.addTokenPair(
    fcrToken.address,
    etherToken.address,
    fcrTokenAmount,
    etherTokenAmount,
    initialClosingPriceNum,
    initialClosingPriceDen
  )
  console.log(`token pair added:`)
  console.log(`  fcrToken:<${fcrToken.address} / etherToken:<${etherToken.address}>`)
  console.log(`  fcrToken funding: ${fcrTokenAmount/10**18}`)
  console.log(`  etherToken funding: ${etherTokenAmount/10**18}`)
  console.log(`  initialClosingPrice: ${initialClosingPriceNum}/${initialClosingPriceDen}`)
  console.log('')

  return tx
}
