/* eslint-env mocha */
/* global assert contract */
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./conf/config.json'));
const paramConfig = config.paramDefaults;

const utils = require('../utils.js');

contract('PLCRVotingChallenge', (accounts) => {
  describe('Function: tokenRewardAmount', () => {
    const [applicant, challenger] = accounts;
    let registry;

    before(async () => {
      const { registryProxy } = await utils.getProxies();
      registry = registryProxy;

      await utils.approveProxies(accounts, false, false, false, registry);
    });

    it('should revert if the poll has not ended yet', async () => {
      const listing = utils.getListingHash('failure.net');

      // Apply
      await utils.as(applicant, registry.apply, listing, paramConfig.minDeposit, '');
      // Challenge
      await utils.challengeAndGetPollID(listing, challenger);
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

