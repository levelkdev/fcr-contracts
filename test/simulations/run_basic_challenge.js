/* eslint-env mocha */
/* global assert contract artifacts */
const Registry = artifacts.require('Registry.sol')
const Token = artifacts.require('EIP20.sol')

const utils = require('../utils.js')

contract('simulate TCR with basic challenge mechanism', (accounts) => {
  describe.only('do it...', () => {
    const [_, applicant, challenger, voterFor, voterAgainst] = accounts

    it('...', async () => {
      console.log('')

    })
  })
})
