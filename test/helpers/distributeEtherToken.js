export default async (accounts, etherToken, amount) => {
  let account
  for (var i in accounts) {
    account = accounts[i]
    const balance = (await etherToken.balanceOf(accounts[i])).toNumber()
    if (balance == 0) {
      await etherToken.deposit({ value: amount, from: account })
      console.log(`account:<${i}>:<${account}> bought ${amount/10**18} etherToken:<${etherToken.address}>`)
    }
  }
  console.log('')
}
