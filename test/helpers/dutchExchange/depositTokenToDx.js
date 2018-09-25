export default async ({
  tokenName,
  dutchExchange,
  token,
  amount,
  account
}) => {
  const tx = await dutchExchange.deposit(token.address, amount, { from: account })
  console.log(
    `<${account}> deposited ${amount/10**18} ${tokenName}:<${token.address}> to dutchExchange:<${dutchExchange.address}>`
  )
}
