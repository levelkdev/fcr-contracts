export default async (accounts, etherToken, amount) => {
  for (let account of accounts) {
    const balance = (await etherToken.balanceOf(account)).toNumber()
    if (balance == 0) {
      await etherToken.deposit({ value: amount, from: account })
      console.log(`account:<${account}> bought ${amount/10**18} etherToken:<${etherToken.address}>`)
    }
  }
  console.log('')
}
