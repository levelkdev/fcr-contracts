const amount = 100 * 10 ** 18

export default async (accounts, token) => {
  let receipts = []
  let i = 0;
  for(i = 0; i < accounts.length; i++) {
    if (i == 0) continue
    const account = accounts[i]
    console.log(`token.transfer: accounts[0] -> ${amount / 10 ** 18} -> accounts[${i}]`)
    const receipt = await token.transfer(account, amount)
    receipts.push(receipts)
  }
  return receipts
}
