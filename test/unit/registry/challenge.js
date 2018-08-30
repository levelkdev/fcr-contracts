/* eslint-env mocha */
/* global assert contract */
const fs = require('fs');
const BN = require('bignumber.js');

const config = JSON.parse(fs.readFileSync('./conf/config.json'));
const paramConfig = config.paramDefaults;

const utils = require('../../utils.js')(artifacts);

const toWei = number => new BN(number * 10 ** 18);

contract('Registry', (accounts) => {
  describe('Function: createChallenge', () => {
    const [applicant, challenger, voter, proposer] = accounts;

    let token;
    let parameterizer;
    let registry;
    let fcr;
    let minDeposit;

    before(async () => {
      const {
        paramProxy, registryProxy, tokenInstance, fcrjs
      } = await utils.getProxies();
      parameterizer = paramProxy;
      registry = registryProxy;
      token = tokenInstance;
      fcr = fcrjs;
      minDeposit = toWei(paramConfig.minDeposit)

      await utils.approveProxies(accounts, token, false, parameterizer, registry);
    });

    it('should successfully challenge an application', async () => {
      const listingTitle = 'failure.net'
      const listingHash  = fcr.registry.getListingHash(listingTitle)

      await fcr.registry.apply(applicant, listingTitle, minDeposit, '')
      const appWasMade = await registry.appWasMade.call(listingHash);
      assert.strictEqual(appWasMade, true, 'An application should have been submitted')

      await utils.createAndStartChallenge(fcr, listingTitle, challenger);
      const isWhitelisted = await registry.isWhitelisted.call(listingHash);
      assert.strictEqual(isWhitelisted, false, 'An application which should have failed succeeded');
    });

    it('should successfully challenge a listing', async () => {
      const listingTitle = 'failure.net'
      const listingHash  = fcr.registry.getListingHash(listingTitle)

      const challengerStartingBalance = await token.balanceOf.call(challenger);

      await utils.addToWhitelist(listing, paramConfig.minDeposit, applicant, registry);

      await utils.challengeAndGetPollID(listing, challenger, registry);
      await utils.increaseTime(paramConfig.commitStageLength + paramConfig.revealStageLength + 1);
      await registry.updateStatus(listing);

      const isWhitelisted = await registry.isWhitelisted.call(listing);
      assert.strictEqual(isWhitelisted, false, 'An application which should have failed succeeded');

      const challengerFinalBalance = await token.balanceOf.call(challenger);
      // Note edge case: no voters, so challenger gets entire stake
      const expectedFinalBalance =
        challengerStartingBalance.add(new BN(paramConfig.minDeposit, 10));
      assert.strictEqual(
        challengerFinalBalance.toString(10), expectedFinalBalance.toString(10),
        'Reward not properly disbursed to challenger',
      );
    });

    it('should unsuccessfully challenge an application', async () => {
      const listing = utils.getListingHash('winner.net');

      await utils.as(applicant, registry.apply, listing, minDeposit, '');
      const pollID = await utils.challengeAndGetPollID(listing, challenger, registry);
      await utils.commitVote(pollID, 1, 10, 420, voter, voting);
      await utils.increaseTime(paramConfig.commitStageLength + 1);
      await utils.as(voter, voting.revealVote, pollID, 1, 420);
      await utils.increaseTime(paramConfig.revealStageLength + 1);
      await registry.updateStatus(listing);

      const isWhitelisted = await registry.isWhitelisted.call(listing);
      assert.strictEqual(
        isWhitelisted, true,
        'An application which should have succeeded failed',
      );

      const unstakedDeposit = await utils.getUnstakedDeposit(listing, registry);
      const expectedUnstakedDeposit =
        minDeposit.add(minDeposit.mul(bigTen(paramConfig.dispensationPct).div(bigTen(100))));

      assert.strictEqual(
        unstakedDeposit.toString(10), expectedUnstakedDeposit.toString(10),
        'The challenge winner was not properly disbursed their tokens',
      );
    });

    it('should unsuccessfully challenge a listing', async () => {
      const listing = utils.getListingHash('winner2.net');

      await utils.addToWhitelist(listing, minDeposit, applicant, registry);

      const pollID = await utils.challengeAndGetPollID(listing, challenger, registry);
      await utils.commitVote(pollID, 1, 10, 420, voter, voting);
      await utils.increaseTime(paramConfig.commitStageLength + 1);
      await utils.as(voter, voting.revealVote, pollID, 1, 420);
      await utils.increaseTime(paramConfig.revealStageLength + 1);
      await registry.updateStatus(listing);

      const isWhitelisted = await registry.isWhitelisted.call(listing);
      assert.strictEqual(isWhitelisted, true, 'An application which should have succeeded failed');

      const unstakedDeposit = await utils.getUnstakedDeposit(listing, registry);
      const expectedUnstakedDeposit = minDeposit.add(minDeposit.mul(new BN(paramConfig.dispensationPct, 10).div(new BN('100', 10))));
      assert.strictEqual(
        unstakedDeposit.toString(10), expectedUnstakedDeposit.toString(10),
        'The challenge winner was not properly disbursed their tokens',
      );
    });

    it('should touch-and-remove a listing with a depost below the current minimum', async () => {
      const listing = utils.getListingHash('touchandremove.net');
      const newMinDeposit = minDeposit.add(new BN('1', 10));

      const applicantStartingBal = await token.balanceOf.call(applicant);

      await utils.addToWhitelist(listing, minDeposit, applicant, registry);

      const receipt = await utils.as(
        proposer, parameterizer.proposeReparameterization,
        'minDeposit', newMinDeposit,
      );
      const propID = utils.getReceiptValue(receipt, 'propID');

      await utils.increaseTime(paramConfig.pApplyStageLength + 1);

      await parameterizer.processProposal(propID);

      const challengerStartingBal = await token.balanceOf.call(challenger);
      utils.as(challenger, registry.challenge, listing, '');
      const challengerFinalBal = await token.balanceOf.call(challenger);

      assert(
        challengerStartingBal.eq(challengerFinalBal),
        'Tokens were not returned to challenger',
      );

      const applicantFinalBal = await token.balanceOf.call(applicant);

      assert(
        applicantStartingBal.eq(applicantFinalBal),
        'Tokens were not returned to applicant',
      );

      assert(!await registry.isWhitelisted.call(listing), 'Listing was not removed');
    });

    it('should not be able to challenge a listing hash that doesn\'t exist', async () => {
      const listing = utils.getListingHash('doesNotExist.net');

      try {
        await utils.challengeAndGetPollID(listing, challenger, registry);
      } catch (err) {
        assert(utils.isEVMException(err), err.toString());
        return;
      }
      assert(false, 'challenge succeeded when listing does not exist');
    });

    it('should revert if challenge occurs on a listing with an open challenge', async () => {
      const listing = utils.getListingHash('doubleChallenge.net');

      await utils.addToWhitelist(listing, minDeposit.toString(), applicant, registry);

      await utils.challengeAndGetPollID(listing, challenger, registry);

      try {
        await utils.as(challenger, registry.challenge, listing, '');
      } catch (err) {
        assert(utils.isEVMException(err), err.toString());
        return;
      }
      assert(false, 'challenge succeeded when challenge is already open');
    });

    it('should revert if token transfer from user fails', async () => {
      const listing = utils.getListingHash('challengerNeedsTokens.net');

      await utils.as(applicant, registry.apply, listing, minDeposit, '');

      // Approve the contract to transfer 0 tokens from account so the transfer will fail
      await token.approve(registry.address, '0', { from: challenger });

      try {
        await utils.as(challenger, registry.challenge, listing, '');
      } catch (err) {
        assert(utils.isEVMException(err), err.toString());
        return;
      }
      assert(false, 'allowed challenge with not enough tokens');
    });
  });
});
