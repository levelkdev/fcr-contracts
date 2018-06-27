/* eslint-env mocha */
/* global assert contract artifacts */
const Registry = artifacts.require('Registry.sol');
const PLCRVotingChallenge = artifacts.require('PLCRVotingChallenge.sol');

const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./conf/config.json'));
const paramConfig = config.paramDefaults;

const utils = require('../utils.js');

contract('PLCRVotingChallenge', (accounts) => {
  describe('Function: tokenRewardAmount', () => {
    const [applicant, challenger] = accounts;
    it('should revert if the poll has not ended yet', async () => {
      const registry = await Registry.deployed();
      const listing = utils.getListingHash('failure.net');

      // Apply
      await utils.as(applicant, registry.apply, listing, paramConfig.minDeposit, '');
      // Challenge
      await utils.challengeAndGetPollID(listing, challenger);
      const challengeID = await utils.getChallengeID(listing);
      const plcrVotingChallenge = await utils.getPLCRVotingChallenge(listing);

      try {
        await utils.as(challenger, plcrVotingChallenge.tokenRewardAmount);
      } catch (err) {
        assert(utils.isEVMException(err), err.toString());
        return;
      }
      assert(false, 'determined reward before poll has ended');
    });
  });
});

