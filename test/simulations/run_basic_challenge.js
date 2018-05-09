/* eslint-env mocha */
/* global assert contract artifacts */
const Registry = artifacts.require('Registry.sol')
const OwnableChallengeFactory = artifacts.require('OwnableChallengeFactory.sol')
const Token = artifacts.require('EIP20.sol')

const utils = require('../utils.js')

contract('simulate TCR with an ownable challenge mechanism', (accounts) => {
  describe('do it...', () => {
    const [_, applicant, challenger, challengeOwner] = accounts

    it('...', async () => {
      console.log('')

      console.log('*** deploy contracts')
      const token = Token.new()
      const ownableChallengeFactory = OwnableChallengeFactory.new()
      const registry = Registry.new()


    })
  })
})
