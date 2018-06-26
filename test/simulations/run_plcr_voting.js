// /* eslint-env mocha */
// /* global assert contract artifacts */
// const Parameterizer = artifacts.require('./Parameterizer.sol')
// const Registry = artifacts.require('Registry.sol')
// const Token = artifacts.require('EIP20.sol')
// const PLCRVoting = artifacts.require('PLCRVoting')

// const fs = require('fs')
// const BN = require('bignumber.js')

// const config = JSON.parse(fs.readFileSync('./conf/config.json'))
// const paramConfig = config.paramDefaults

// const utils = require('../utils.js')

// contract('simulate TCR apply/challenge/resolve', (accounts) => {
//   describe('do it...', () => {
//     const [_, applicant, challenger, voterFor, voterAgainst] = accounts

//     it.only('...', async () => {
//       console.log('')

//       /* change this to make the challenge pass or fail */
//       const makeChallengePass = true

//       let numVotesFor, numVotesAgainst

//       if (makeChallengePass) {
//         /* votes against proposal exceed votes for: challenge passes */
//         numVotesFor = 10 * 10**18
//         numVotesAgainst = 20 * 10**18
//       } else {
//         /* votes for proposal exceed votes against: challenge fails */
//         numVotesFor = 20 * 10**18
//         numVotesAgainst = 10 * 10**18
//       }

//       const registry = await Registry.deployed()

//       const token = Token.at(await registry.token.call());
//       const listingHash = utils.getListingHash('nochallenge.net')
//       const voting = await PLCRVoting.deployed()
//       await logBalances(accounts, token)

//       console.log(`---------------- APPLY listingHash=${listingHash} ----------------`)
//       console.log('')
//       await utils.as(applicant, registry.apply, listingHash, paramConfig.minDeposit, '')
//       const listingResult = await registry.listings.call(listingHash)
//       await logBalances(accounts, token)

//       const receipt = await utils.as(challenger, registry.createChallenge, listingHash, '')
//       const { challengeID } = receipt.logs[0].args
//       const plcrChallenge = await utils.getPLCRChallenge(challengeID)
//       const pollID = await plcrChallenge.pollID()
//       console.log(`---------------- CHALLENGE #${challengeID} CREATED/STARTED ----------------`)
//       console.log('')

//       await logBalances(accounts, token, plcrChallenge)

//       await logListingInfo(listingHash)

//       console.log('---------------- COMMIT VOTES ----------------')
//       console.log('')
//       await utils.commitVote(pollID, 1, numVotesFor, 420, voterFor)
//       await utils.commitVote(pollID, 0, numVotesAgainst, 420, voterAgainst)
//       await utils.increaseTime(paramConfig.commitStageLength + 1)

//       console.log('---------------- REVEAL VOTES ----------------')
//       console.log('')
//       await voting.revealVote(pollID, 1, 420, { from: voterFor })
//       await voting.revealVote(pollID, 0, 420, { from: voterAgainst })
//       await utils.increaseTime(paramConfig.revealStageLength)
//       await logBalances(accounts, token, plcrChallenge)
//       await logChallengeReward(challengeID)

//       await logListingInfo(listingHash)

//       console.log('---------------- UPDATE STATUS (update application status based on challenge result) ----------------')
//       console.log('')
//       await registry.updateStatus(listingHash)
//       await logListingInfo(listingHash)
//       await logBalances(accounts, token, plcrChallenge)
//       await logChallengeInfo(challengeID)
//       await logVoterRewardInfo(challengeID, voterFor, voterAgainst)

//       console.log('---------------- CLAIM REWARD ----------------')
//       console.log('')
//       const bla = await plcrChallenge.voterReward.call(voterAgainst, 420)
//       console.log('voterReward = ', bla.toNumber())
//       console.log('')
//       await plcrChallenge.claimVoterReward(420, {from: voterAgainst})

//       await logBalances(accounts, token, plcrChallenge)

//       console.log('---------------- WITHDRAW VOTING RIGHTS ----------------')
//       await voting.withdrawVotingRights(numVotesFor, { from: voterFor })
//       await voting.withdrawVotingRights(numVotesAgainst, { from: voterAgainst })
//       await logBalances(accounts, token, plcrChallenge)

//       console.log('*** try to exit listing (works if challenge was not successful)')
//       console.log()
//       try { await registry.exit(listingHash, { from: applicant }) } catch (err) { }
//       await logBalances(accounts, token, plcrChallenge)
//       await logListingInfo(listingHash)

//     })
//   })
// })

// async function logBalances(accounts, token, plcrChallenge) {
//   const registry = await Registry.deployed()
//   const [_, applicant, challenger, voterFor, voterAgainst] = accounts
//   const applicantBalance = (await token.balanceOf.call(applicant)).toNumber()
//   const challengerBalance = (await token.balanceOf.call(challenger)).toNumber()
//   const voterForBalance = (await token.balanceOf.call(voterFor)).toNumber()
//   const voterAgainstBalance = (await token.balanceOf.call(voterAgainst)).toNumber()
//   const registryBalance = (await token.balanceOf.call(registry.address)).toNumber()
//   console.log('balances:')
//   console.log(`  applicant: ${applicantBalance}`)
//   console.log(`  challenger: ${challengerBalance}`)
//   console.log(`  voterFor: ${voterForBalance}`)
//   console.log(`  voterAgainst: ${voterAgainstBalance}`)
//   console.log(`  Registry Contract: ${registryBalance}`)
//   if (plcrChallenge) {
//     const plcrChallengeBalance = (await token.balanceOf.call(plcrChallenge.address)).toNumber()
//     console.log(`  PLCRChallenge Contract: ${plcrChallengeBalance}`)
//   }
//   console.log('')
// }

// async function logListingInfo(listingHash) {
//   const registry = await Registry.deployed()
//   const listing = await registry.listings(listingHash)
//   console.log(`listing: ${listingHash}`)
//   try {
//     console.log(`  challengeCanBeResolved: ${await registry.challengeCanBeResolved(listingHash)}`)
//   } catch (err) {
//     console.log(`  challengeCanBeResolved: `)
//   }
//   console.log(`  canBeWhitelisted: ${await registry.canBeWhitelisted(listingHash)}`)
//   console.log(`  isWhitelisted: ${await registry.isWhitelisted(listingHash)}`)
//   console.log(`  unstakedDeposit: ${listing[3].toNumber()}`)
//   console.log('')
// }

// async function logChallengeInfo(challengeID) {
//   const registry = await Registry.deployed()
//   const plcrChallenge = await utils.getPLCRChallenge(challengeID)
//   console.log(`challenge: #${challengeID}`)
//   console.log(`   ended(): ${await plcrChallenge.ended()}`)
//   console.log(`   passed(): ${await plcrChallenge.passed()}`)
//   console.log(`   stake(): ${await plcrChallenge.stake()}`)
//   console.log(`   tokenRewardAmount(): ${await plcrChallenge.tokenRewardAmount()}`)
//   console.log('')
// }

// async function logChallengeReward(challengeID) {
//   const plcrChallenge = await utils.getPLCRChallenge(challengeID)
//   console.log(`Challenge #${challengeID} reward: ${await plcrChallenge.tokenRewardAmount()}`)
//   console.log('')
// }

// async function logVoterRewardInfo(pollID, voterFor, voterAgainst) {
//   const registry = await Registry.deployed()

//   let voterForReward, voterAgainstReward
//   try {
//     voterForReward = await registry.voterReward(voterFor, pollID, 420)
//   } catch (err) {
//     voterForReward = ''
//   }

//   try {
//     voterAgainstReward = await registry.voterReward(voterAgainst, pollID, 420)
//   } catch (err) {
//     voterAgainstReward = ''
//   }

//   console.log(`voterFor reward: ${voterForReward}`)
//   console.log(`voterAgainst reward: ${voterAgainstReward}`)
//   console.log('')
// }
