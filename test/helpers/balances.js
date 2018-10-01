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
      { name: 'Applicant', address: applicantAddress},
      { name: 'Challenger', address: challengerAddress},
      { name: 'Buyer of LONG_ACCEPTED', address: buyerLongAcceptedAddress},
      { name: 'Buyer of LONG_DENIED', address: buyerLongDeniedAddress},
      { name: 'Registry Contract', address: registryContractAddress},
      { name: 'Challenge Contract', address: challengeContractAddress}
    ],
    tokens: [
      { name: 'FCR', contract: await Token.at(fcrTokenAddress) },
      { name: 'ETH', contract: await Token.at(etherTokenAddress) },
      { name: 'ACCEPTED', contract: await Token.at(acceptedTokenAddress) },
      { name: 'DENIED', contract: await Token.at(deniedTokenAddress) },
      { name: 'LONG_ACCEPTED', contract: await Token.at(longAcceptedTokenAddress) },
      { name: 'LONG_DENIED', contract: await Token.at(longDeniedTokenAddress) },
      { name: 'SHORT_ACCEPTED', contract: await Token.at(shortAcceptedTokenAddress) },
      { name: 'SHORT_DENIED', contract: await Token.at(shortDeniedTokenAddress) },
    ]
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
        const balance = (await token.contract.balanceOf(balanceHolder.address))
        balances[i].tokenBalances[token.name] = balance
      }
    }
  }
  return balances

  // const [creator, applicant, challenger, voterFor, voterAgainst, buyer1, buyer2] = balanceHolders

  // const applicantBalance = (await fcrToken.balanceOf.call(applicant)).toNumber()/10**18
  // const challengerBalance = (await fcrToken.balanceOf.call(challenger)).toNumber()/10**18
  // const registryBalance = (await fcrToken.balanceOf.call(registry.address)).toNumber()/10**18
  // const buyer1Balance = (await fcrToken.balanceOf.call(buyer1)).toNumber()/10**18
  // const buyer2Balance = (await fcrToken.balanceOf.call(buyer2)).toNumber()/10**18
  // console.log('')
  // console.log('')
  // console.log('')
  // console.log('balances:')
  // console.log(`  applicant:  ${applicantBalance}`)
  // console.log(`  challenger: ${challengerBalance}`)
  // console.log(`  buyer1:     ${buyer1Balance}`)
  // console.log(`  buyer2:     ${buyer2Balance}`)
  // console.log(`  Registry Contract: ${registryBalance}`)
  // if(challengeAddress) {
  //   const challengeBalance = (await fcrToken.balanceOf.call(challengeAddress)).toNumber()/10**18
  //   console.log(`  Challenge Contract: ${challengeBalance}`)
  // } else {
  //   console.log('  Challenge Contract: NULL')
  // }
  // if(futarchyOracleAddress) {
  //   const futarchyBalance =
  //     (await fcrToken.balanceOf.call(futarchyOracleAddress)).toNumber() / 10**18
  //   console.log(`  Futarchy Oracle Contract: ${futarchyBalance}`)
  // } else {
  //   console.log('  Futarchy Oracle Contract: NULL')
  // }
  // if(categoricalEventAddress) {
  //   const categoricalEventBalance = 
  //     (await fcrToken.balanceOf.call(categoricalEventAddress)).toNumber() / 10**18
  //   console.log(`  Categorical Event: ${categoricalEventBalance}`)
  // } else {
  //   console.log('   Categorical Event: NULL')
  // }
  // if(acceptedScalar) {
  //   const acceptedToken = await OutcomeToken.at(await acceptedScalar.collateralToken())
  //   const acceptedScalarBalance = (await acceptedToken.balanceOf.call(acceptedScalar.address)).toNumber()/10**18
  //   console.log(`  Scalar Accepted Event: ${acceptedScalarBalance}`)
  // } else {
  //   console.log('   Scalar Accepted Event: NULL')
  // }
  // if(dScal) {
  //   const acceptedToken = await OutcomeToken.at(await dScal.collateralToken())
  //   const dScalBalance = (await acceptedToken.balanceOf.call(dScal.address)).toNumber()/10**18
  //   console.log(`  Denied Accepted Event: ${dScalBalance}`)
  // } else {
  //   console.log('   Denied Accepted Event: NULL')
  // }
  // console.log('')
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
        console.log(`    ${tokenName}: ${formatNumber(bal.toNumber())}`)
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
