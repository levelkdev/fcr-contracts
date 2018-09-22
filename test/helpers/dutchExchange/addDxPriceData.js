export default async ({
  dutchExchange,
  fcrToken,
  fcrTokenAmount,
  etherToken,
  etherTokenAmount
}) => {
  // dutchExchange.Debug().watch((err, result) => {
  //   if (err) {
  //     console.error('dutchExchange.Debug event error: ', err)
  //   } else {
  //     console.log('dutchExchange.Debug event: ', result)
  //   }
  // })

  const initialClosingPriceNum = 2
  const initialClosingPriceDen = 1

  await approveTokenForDx('fcrToken', dutchExchange, fcrToken, fcrTokenAmount)
  await approveTokenForDx('etherToken', dutchExchange, etherToken, etherTokenAmount)
  await depositTokenToDx('fcrToken', dutchExchange, fcrToken, fcrTokenAmount)
  await depositTokenToDx('etherToken', dutchExchange, etherToken, etherTokenAmount)
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

export async function approveTokenForDx (tokenName, dutchExchange, token, amt) {
  const tx = await token.approve(dutchExchange.address, amt)
  console.log(
    `approved ${amt/10**18} ${tokenName}:<${token.address}> for dutchExchange:<${dutchExchange.address}>`
  )
}

export async function depositTokenToDx (tokenName, dutchExchange, token, amt) {
  const tx = await dutchExchange.deposit(token.address, amt)
  console.log(
    `deposited ${amt/10**18} ${tokenName}:<${token.address}> to dutchExchange:<${dutchExchange.address}>`
  )
}
