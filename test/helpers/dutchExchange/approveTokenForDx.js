export default async ({
  tokenName,
  dutchExchange,
  token,
  amount,
  account
}) => {
  const tx = await token.approve(dutchExchange.address, amount, { from: account })
  console.log(
    `<${account}> approved ${amount/10**18} ${tokenName}:<${token.address}> for dutchExchange:<${dutchExchange.address}>`
  )
}
