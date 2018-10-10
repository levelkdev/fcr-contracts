import numeral from 'numeral'

export async function getFcrBalances({
  Token,
  applicantAddress,
  challengerAddress,
  buyerLongAcceptedAddress,
  buyerLongDeniedAddress,
  registryContractAddress,
  challengeContractAddress,
  fcrTokenAddress,
  etherTokenAddress,
  acceptedTokenAddress,
  deniedTokenAddress,
  longAcceptedTokenAddress,
  longDeniedTokenAddress,
  shortAcceptedTokenAddress,
  shortDeniedTokenAddress
}) {
  const fcrBalances = await getBalances({
    Token,
    balanceHolders: [
      ['applicant', 'Applicant', applicantAddress],
      ['challenger', 'Challenger', challengerAddress],
      ['buyerLongAccepted', 'Buyer of LONG_ACCEPTED', buyerLongAcceptedAddress],
      ['buyerLongDenied', 'Buyer of LONG_DENIED', buyerLongDeniedAddress],
      ['registryContract', 'Registry Contract', registryContractAddress],
      ['challengeContract', 'Challenge Contract', challengeContractAddress],
    ].map((balanceHolder) => {
      return {
        key: balanceHolder[0],
        name: balanceHolder[1],
        address: balanceHolder[2]
      }
    }),
    tokens: await Promise.all([
      ['FCR', fcrTokenAddress],
      ['ETH', etherTokenAddress],
      ['ACCEPTED', acceptedTokenAddress],
      ['DENIED', deniedTokenAddress],
      ['LONG_ACCEPTED', longAcceptedTokenAddress],
      ['LONG_DENIED', longDeniedTokenAddress],
      ['SHORT_ACCEPTED', shortAcceptedTokenAddress],
      ['SHORT_DENIED', shortDeniedTokenAddress]
    ].map(async (token) => {
      return {
        name: token[0],
        contract: token[1] ? await Token.at(token[1]) : null
      }
    }))
  })
  return fcrBalances
}

export async function getBalances({
  Token,
  balanceHolders,
  tokens
}) {
  let balances = []
  for (let i in balanceHolders) {
    let balanceHolder = balanceHolders[i]
    balances[i] = {
      balanceHolder,
      tokenBalances: null
    }
    if (balanceHolder.address) {
      balances[i].tokenBalances = {}
      for (let j in tokens) {
        let token = tokens[j]
        const balance = token.contract ?
          (await token.contract.balanceOf(balanceHolder.address)) : null
        balances[i].tokenBalances[token.name] = balance
      }
    }
  }
  return balances
}

export function logBalances(balanceRecords) {
  console.log('Balances:')
  for (let i in balanceRecords) {
    const balanceRecord = balanceRecords[i]
    const { balanceHolder, tokenBalances } = balanceRecord
    if (tokenBalances) {
      console.log(`  ${balanceHolder.name}:<${balanceHolder.address}>`)
      for (let tokenName in tokenBalances) {
        let bal = tokenBalances[tokenName]
        console.log(`    ${tokenName}: ${bal ? formatNumber(bal.toNumber()) : 'NULL' }`)
      }
    } else {
      console.log(`  ${balanceHolder.name}:<NULL>`)
    }
    console.log('')
  }
}

function formatNumber(num) {
  return numeral(num/10**18).format('0,0.00')
}
