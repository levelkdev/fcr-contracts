import lkTestHelpers from 'lk-test-helpers'
const fs = require('fs');
const { expectRevert, expectEvent, increaseTime, latestTime } = lkTestHelpers(web3)
const BigNumber = require('bignumber.js');
const moment = require('moment')
const config = JSON.parse(fs.readFileSync('./conf/config.json'));
const params = config.paramDefaults;

const Registry = artifacts.require('RegistryInternalFunctionsMock')
const FutarchyChallengeFactory = artifacts.require('FutarchyChallengeFactoryMock')
const FutarchyChallenge = artifacts.require('FutarchyChallengeMock')
const Parameterizer = artifacts.require('ParameterizerMock')
const Token = artifacts.require('EIP20')

const mockAddresses = [
  '0x4e0100882b427b3be1191c5a7c7e79171b8a24dd',
  '0x6512df5964f1578a8164ce93a3238f2b11485d1c',
  '0x687355ca7a320e5420a3db5ae59ef662e4146786'
]
const zeroAddr = '0x0000000000000000000000000000000000000000'

let PARAMETERIZER, TOKEN, FUTARCHY_CHALLENGE_FACTORY // async "const's"
const NAME = 'Futarchy Curated Registry'
const STAKE_AMOUNT = params.minDeposit * 10 ** 18

let currentEVMTime // current time on blockchain
let registry, listingHash
contract('Registry', (accounts) => {

  before(async () => {
    currentEVMTime = (await latestTime()).unix()
    let listingHash = web3.fromAscii('domain.com')
    let token = await Token.new(1000 * 10**18, "FCR Token", 18, 'CT')
    TOKEN = token

    PARAMETERIZER = await Parameterizer.new()
    let parameters = [
      params.minDeposit * 10 **18,
      params.pMinDeposit * 10 **18,
      params.applyStageLength,
      params.pApplyStageLength,
      params.commitStageLength,
      params.pCommitStageLength,
      params.revealStageLength,
      params.pRevealStageLength,
      params.dispensationPct,
      params.pDispensationPct,
      params.voteQuorum,
      params.pVoteQuorum
    ]
    await PARAMETERIZER.init(token.address, mockAddresses[0], parameters)
    FUTARCHY_CHALLENGE_FACTORY = await FutarchyChallengeFactory.new()
  })

  describe('when initialized with valid parameters', ()=> {
    before(async () => {
      registry = await initializeRegistry()
    })

    it('sets the correct token address', async () => {
      expect(await registry.token()).to.equal(TOKEN.address)
    })

    it('sets the correct parameterizer address', async () => {
      expect(await registry.parameterizer()).to.equal(PARAMETERIZER.address)
    })

    it('sets the correct challengeFactory address', async () => {
      expect(await registry.challengeFactory()).to.equal(FUTARCHY_CHALLENGE_FACTORY.address)
    })

    it('sets the correct name', async () => {
      expect(await registry.name()).to.equal(NAME)
    })

    it('sets the correct INITIAL_CHALLENGE_NONCE', async () => {
      expect((await registry.challengeNonce()).toNumber()).to.equal((await registry.INITIAL_CHALLENGE_NONCE()).toNumber())
    })
  })

  describe('when initialized with invalid parameters', () => {
    it('reverts with a 0x address for token', async () => {
      await expectRevert(initializeRegistry({token: zeroAddr}))
    })

    it('reverts with a 0 for token', async () => {
      await expectRevert(initializeRegistry({token: 0}))
    })

    it('reverts with a 0x address for parameterizer', async () => {
      await expectRevert(initializeRegistry({parameterizer: zeroAddr}))
    })

    it('reverts with a 0 for parameterizer', async () => {
      await expectRevert(initializeRegistry({token: 0}))
    })
  })

  describe('apply()', () => {

    before(async () => {
      listingHash = web3.fromAscii('domain.com')
    })

    describe('when called with invalid parameters', () => {
      beforeEach(async () => {
        registry = await initializeRegistry()
      })

      it('reverts when called with duplicate listing hash', async () => {
        await TOKEN.approve(registry.address, 10 * 10 ** 18)
        await registry.apply(listingHash, 10 * 10 ** 18, '')
        await expectRevert(registry.apply(listingHash, 10 * 10 ** 18, ''))
      })

      it('reverts if called with an amount less than the minimum deposit', async () => {
        await TOKEN.approve(registry.address, 9 * 10 ** 18)
        await expectRevert(registry.apply(listingHash, 9 * 10 ** 18, ''))
      })
    })

    describe('when called with valid parameters', () => {
      describe('when storing the new listing', () => {
        let listingData, applicationPeriod

        before(async () => {
          registry = await initializeRegistry()
          applicationPeriod = (await PARAMETERIZER.get('applyStageLen')).toNumber()
          await TOKEN.approve(registry.address, STAKE_AMOUNT, {from: accounts[0]})
          await registry.apply(listingHash, STAKE_AMOUNT, '', {from: accounts[0]})
          listingData = await registry.listings(listingHash)
        })

        it('assigns the correct applicationExpiry', async () => {
          expect(listingData[0].toNumber()).to.be.within(currentEVMTime + applicationPeriod - 60, currentEVMTime + applicationPeriod + 60)
        })

        it('assigns the correct whitelisted attr', async () => {
          expect(listingData[1]).to.equal(false)
        })

        it('assigns the correct owner', async () => {
          expect(listingData[2]).to.equal(accounts[0])
        })

        it('assigns the correct unstakedDeposit', async () => {
          expect(listingData[3].toNumber()).to.equal(10 * 10 ** 18)
        })

        it('assings challengeID to 0', async () => {
          expect(listingData[4].toNumber()).to.equal(0)
        })
      })

      it('transfers token amount from sender to registry contract', async () => {
        registry = await initializeRegistry();

        const previousApplicantBalance = (await TOKEN.balanceOf(accounts[0])).toNumber()
        const previousRegistryBalance  = (await TOKEN.balanceOf(registry.address)).toNumber()

        await TOKEN.approve(registry.address, STAKE_AMOUNT, {from: accounts[0]})
        await registry.apply(listingHash, STAKE_AMOUNT, '')

        const currentApplicantBalance = (await TOKEN.balanceOf(accounts[0])).toNumber()
        const currentRegistryBalance  = (await TOKEN.balanceOf(registry.address)).toNumber()

        expect(currentApplicantBalance).to.equal(previousApplicantBalance - STAKE_AMOUNT)
        expect(currentRegistryBalance).to.equal(previousRegistryBalance + STAKE_AMOUNT)
      })

      it('emits an _Application event', async () => {
        registry = await initializeRegistry();
        await TOKEN.approve(registry.address, STAKE_AMOUNT, {from: accounts[0]})
        await expectEvent('_Application', registry.apply(listingHash, STAKE_AMOUNT, ''))
      })
    })
  })

  describe('deposit()', () => {

    before(async () => {
      listingHash = web3.fromAscii('domain.com')
    })

    describe('when called with invalid parameters', () => {
      it('reverts if listing owner is not the sender address', async () => {
        registry = await initializeRegistry()
        await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
        TOKEN.approve(registry.address, STAKE_AMOUNT)
        await expectRevert(registry.deposit(listingHash, STAKE_AMOUNT, {from: accounts[1]}))
      })
    })

    describe('when called with valid parameters', async () => {
      let previousUnstakedDepositAmount, previousApplicantBalance, previousRegistryBalance, depositAmount

      before(async () => {
        registry = await initializeRegistry()
        await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
        TOKEN.approve(registry.address, STAKE_AMOUNT)
        previousUnstakedDepositAmount = (await registry.listings(listingHash))[3].toNumber()
        previousApplicantBalance = (await TOKEN.balanceOf(accounts[0])).toNumber()
        previousRegistryBalance = (await TOKEN.balanceOf(registry.address)).toNumber()
        depositAmount = 5 * 10 ** 18
        await registry.deposit(listingHash, depositAmount)
      })

      it('updates listing.unstakedDeposit to the correct amount', async () => {
        const newUnstakedDepositAmount = (await registry.listings(listingHash))[3].toNumber()
        expect(newUnstakedDepositAmount).to.equal(previousUnstakedDepositAmount + depositAmount)
      })

      it('transfers the correct token amount from the sender to the registry contract', async () => {
        const currentApplicantBalance = (await TOKEN.balanceOf(accounts[0])).toNumber()
        const currentRegistryBalance = (await TOKEN.balanceOf(registry.address)).toNumber()

        expect(currentApplicantBalance).to.equal(previousApplicantBalance - depositAmount)
        expect(currentRegistryBalance).to.equal(previousRegistryBalance + depositAmount)
      })

      it('emits a _Deposit event', async () => {
        await TOKEN.approve(registry.address, depositAmount)
        expectEvent('_Deposit', registry.deposit(listingHash, depositAmount))
      })
    })
  })

  describe('withdraw()', () => {
    beforeEach(async () => {
      registry = await initializeRegistry()
      listingHash = web3.fromAscii('domain.com')
      await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
      await depositToListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
    })

    describe('when called with invalid parameters', () => {
      it('reverts if withdrawing to an amount lower than the minimum deposit', async () => {
        const greaterThanStake = new BigNumber(STAKE_AMOUNT).mul(1.5)
        await expectRevert(registry.withdraw(listingHash, greaterThanStake))
      })
    })

    describe('when called with valid parameters', () => {
      it('updates listing.unstakedDeposit to the correct amount', async () => {
        expect((await registry.listings(listingHash))[3].toNumber()).to.equal(STAKE_AMOUNT * 2)
        await registry.withdraw(listingHash, STAKE_AMOUNT)
        expect((await registry.listings(listingHash))[3].toNumber()).to.equal(STAKE_AMOUNT)
      })

      it('transfers withdrawn tokens back to the listing owner', async () => {
        const currentListingOwnerBalance = (await TOKEN.balanceOf(accounts[0])).toNumber()
        await registry.withdraw(listingHash, STAKE_AMOUNT)
        expect((await TOKEN.balanceOf(accounts[0])).toNumber()).to.equal(currentListingOwnerBalance + STAKE_AMOUNT)
      })

      it('emits _Withdrawal event', async () => {
        await expectEvent('_Withdrawal', registry.withdraw(listingHash, STAKE_AMOUNT))
      })
    })
  })

  describe('exit()', () => {
    beforeEach(async ()  => {
      registry = await initializeRegistry()
      listingHash = web3.fromAscii('domain.com')
      await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)

    })

    describe('when called with invalid parameters', () => {
      it('reverts if called by address other than listing owner', async () => {
        await whitelistListing(listingHash)
        await expectRevert(registry.exit(listingHash, {from: accounts[1]}))
      })

      it('reverts if listing is not yet whitelisted', async () => {
        await expectRevert(registry.exit(listingHash))
      })

      it('reverts if listing is currently being challenged', async () => {
        await whitelistListing(listingHash)
        await initiateChallenge(listingHash, accounts[1], TOKEN, STAKE_AMOUNT)
        await expectRevert(registry.exit(listingHash))
      })
    })

    describe('when called with valid parameters', () => {
      beforeEach(async () => {
        await whitelistListing(listingHash)
      })

      it('deletes the listingHash from the registry', async () => {
        expect((await registry.listings(listingHash))[0].toNumber()).to.be.above(0)
        await registry.exit(listingHash)
        expect((await registry.listings(listingHash))[0].toNumber()).to.equal(0)
      })

      it('tranfers all unstaked tokens back to listing owner', async () => {
        const previousAccountBalance = (await TOKEN.balanceOf(accounts[0])).toNumber()
        const unstakedDeposit = (await registry.listings(listingHash))[3].toNumber()
        await registry.exit(listingHash)
        expect((await TOKEN.balanceOf(accounts[0])).toNumber()).to.equal(previousAccountBalance + unstakedDeposit)
      })

      it('emits _ListingRemoved event', async () => {
        await expectEvent('_ListingRemoved', registry.exit(listingHash))
      })
    })
  })

  describe('createChallenge()', () => {
    describe('when deployed with invalid parameters', () => {
      beforeEach(async () => {
        registry = await initializeRegistry()
        listingHash = web3.fromAscii('domain.com')
        await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
      })

      it('reverts if listing does not exist', async () => {
        let undefinedListingHash = web3.fromAscii('undefined.com')
        TOKEN.approve(registry.address, STAKE_AMOUNT, {from: accounts[0]})
        await expectRevert(registry.createChallenge(undefinedListingHash, ''))
      })

      it('reverts if listing is locked in a challenge', async () => {
        await initiateChallenge(listingHash, accounts[1], TOKEN, STAKE_AMOUNT)
        TOKEN.approve(registry.address, STAKE_AMOUNT, {from: accounts[2]})
        await expectRevert(registry.createChallenge(listingHash, '', {from: accounts[2]}))
      })
    })

    describe('when deployed with valid parameters', () => {
      describe('when unstakedDeposit is less than minDeposit', () => {
        beforeEach(async () => {
          registry = await initializeRegistry()
          listingHash = web3.fromAscii('domain.com')
          await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
          await PARAMETERIZER.setMockParam('minDeposit', new BigNumber(STAKE_AMOUNT).mul(1.5))
        })

        afterEach(async () => {
          await PARAMETERIZER.setMockParam('minDeposit', new BigNumber(STAKE_AMOUNT))
        })

        it('automatically removes listing', async () => {
          expect((await registry.listings(listingHash))[0]).to.be.above(0)
          await initiateChallenge(listingHash, accounts[1], TOKEN, STAKE_AMOUNT)
          expect((await registry.listings(listingHash))[0].toNumber()).to.equal(0)
        })

        it('emits a _TouchAndRemoved event', async () => {
          TOKEN.approve(registry.address, STAKE_AMOUNT)
          await expectEvent('_TouchAndRemoved', registry.createChallenge(listingHash, ''))
        })

        it('transfers remaining unstakedDeposit back to listing.owner', async () => {
          const previousAccountBalance  = (await TOKEN.balanceOf(accounts[0])).toNumber()
          const previousRegistryBalance = (await TOKEN.balanceOf(registry.address)).toNumber()

          await initiateChallenge(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)

          const currentAccountBalance  = (await TOKEN.balanceOf(accounts[0])).toNumber()
          const currentRegistryBalance = (await TOKEN.balanceOf(registry.address)).toNumber()

          expect(currentAccountBalance).to.equal(previousAccountBalance + STAKE_AMOUNT)
          expect(currentRegistryBalance).to.equal(previousRegistryBalance - STAKE_AMOUNT)
        })

        it('returns 0', async () => {
          TOKEN.approve(registry.address, STAKE_AMOUNT)
          expect((await registry.createChallenge.call(listingHash, '')).toNumber()).to.equal(0)
        })
      })

      describe('when listing is qualified to be challenged', () => {
        beforeEach(async () => {
          registry = await initializeRegistry()
          listingHash = web3.fromAscii('domain.com')
          await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
        })

        it('returns the correct challenge nonce', async () => {
          TOKEN.approve(registry.address, STAKE_AMOUNT)
          const nonce = (await registry.challengeNonce()).toNumber()
          const createChallengeReturnValue = (await registry.createChallenge.call(listingHash, '')).toNumber()
          expect(createChallengeReturnValue).to.equal(nonce + 1)
        })

        it('updates the listing challengeID', async () => {
          expect((await registry.listings(listingHash))[4].toNumber()).to.equal(0)
          await initiateChallenge(listingHash, accounts[1], TOKEN, STAKE_AMOUNT);
          expect((await registry.listings(listingHash))[4].toNumber()).to.equal(1)
        })

        it('assigns the correct challengeAddress', async () => {
          TOKEN.approve(registry.address, STAKE_AMOUNT)
          const challengeAddress = await getEventParameter('_Challenge', 'challengeAddress', registry.createChallenge(listingHash, ''))
          const structChallengeAddress = (await registry.challenges(1))[0]
          expect(structChallengeAddress).to.equal(challengeAddress)
        })

        it('assigns the correct challenger', async () => {
          const challenger = accounts[1]
          await initiateChallenge(listingHash, challenger, TOKEN, STAKE_AMOUNT);
          const challengeNonce = (await registry.listings(listingHash))[4].toNumber()
          expect((await registry.challenges(challengeNonce))[2]).to.equal(challenger)

        })

        it('assigns the correct challenge deposit', async () => {
          await initiateChallenge(listingHash, accounts[1], TOKEN, STAKE_AMOUNT);
          const challengeNonce = (await registry.listings(listingHash))[4].toNumber()
          expect((await registry.challenges(challengeNonce))[3].toNumber()).to.equal((await PARAMETERIZER.get('minDeposit')).toNumber())
        })

        it('assigns the correct listingHash to the challenge mapping', async () => {
          await initiateChallenge(listingHash, accounts[1], TOKEN, STAKE_AMOUNT);
          const challengeNonce = (await registry.listings(listingHash))[4].toNumber()
          expect((await registry.challenges(challengeNonce))[1]).to.include(listingHash)
        })

        it('emits a _Challenge event', async () => {
          TOKEN.approve(registry.address, STAKE_AMOUNT)
          await expectEvent('_Challenge', registry.createChallenge(listingHash, ''))
        })
      })
    })
  })

  describe('updateStatus()', async () => {
    describe('when the applicationExpiry time has passed', async () => {
      beforeEach(async () => {
        registry = await initializeRegistry()
        listingHash = web3.fromAscii('domain.com')
        await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
        const applicationExpiry = (await registry.listings(listingHash))[0].toNumber()
        const increaseTimeSeconds = applicationExpiry - currentEVMTime + 100
        await increaseEVMTime(increaseTimeSeconds)
      })

      it('calls whitelistApplication() if listing is not whitelisted and has no active challenge', async () => {
        expect((await registry.listings(listingHash))[1]).to.equal(false)
        await registry.updateStatus(listingHash)
        expect((await registry.listings(listingHash))[1]).to.equal(true)
      })

      it('calls resolveChallenge() if challenge is not whitelisted but has a challenge ready for resolution', async () => {
        let challengeAddr = await initiateChallenge(listingHash, accounts[1], TOKEN, STAKE_AMOUNT)
        let challengeID = (await registry.listings(listingHash))[4]
        let challenge = await FutarchyChallenge.at(challengeAddr)
        await challenge.mock_setEnded(true)
        await challenge.mock_setPassed(false)
        expect((await registry.challenges(challengeID))[4]).to.equal(false)
        await registry.updateStatus(listingHash)
        expect((await registry.challenges(challengeID))[4]).to.equal(true)
      })

      it('reverts if listing is not whitelisted but has an active challenge that has not ended', async () => {
        let challengeAddr = await initiateChallenge(listingHash, accounts[1], TOKEN, STAKE_AMOUNT)
        let challengeID = (await registry.listings(listingHash)[4])
        let challenge = await FutarchyChallenge.at(challengeAddr)
        await challenge.mock_setEnded(false)
        await expectRevert(registry.updateStatus(listingHash))
      })

      it('reverts if listing is already whitelisted with no active challenge', async () => {
        await registry.updateStatus(listingHash)
        expect((await registry.listings(listingHash))[1]).to.equal(true)
        await expectRevert(registry.updateStatus(listingHash))
      })

      it('reverts if called with a whitelisted listing with an active challenge', async () => {
        await registry.updateStatus(listingHash)
        expect((await registry.listings(listingHash))[1]).to.equal(true)
        await initiateChallenge(listingHash, accounts[1], TOKEN, STAKE_AMOUNT)
        await expectRevert(registry.updateStatus(listingHash))
      })
    })

    describe('when the applicationExpiry time has not yet passed', async () => {
      beforeEach(async () => {
        registry = await initializeRegistry()
        listingHash = web3.fromAscii('domain.com')
        await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
      })

      it('calls resolveChallenge() if challenge is ended and unresolved', async () => {
        let challengeAddr = await initiateChallenge(listingHash, accounts[1], TOKEN, STAKE_AMOUNT)
        let challengeID = (await registry.listings(listingHash))[4]
        let challenge = await FutarchyChallenge.at(challengeAddr)
        await challenge.mock_setEnded(true)
        expect((await registry.challenges(challengeID))[4]).to.equal(false)
        await registry.updateStatus(listingHash)
        expect((await registry.challenges(challengeID))[4]).to.equal(true)
      })

      it('reverts if there is no challenge', async () => {
        await expectRevert(registry.updateStatus(listingHash))
      })

      it('reverts when called with a whitelisted listing with an active challenge', async () => {
        let challengeAddr = await initiateChallenge(listingHash, accounts[1], TOKEN, STAKE_AMOUNT)
        let challengeID = (await registry.listings(listingHash))[4]
        let challenge = await FutarchyChallenge.at(challengeAddr)
        await challenge.mock_setEnded(false)
        await expectRevert(registry.updateStatus(listingHash))
      })
    })
  })

  describe('updatedStatuses()', async () => {
    it('calls updateStatus for each listingHash provided', async () => {
      registry = await initializeRegistry()
      let listingHash1 = web3.fromAscii('domain1.com')
      let listingHash2 = web3.fromAscii('domain2.com')
      await applyListing(listingHash1, accounts[0], TOKEN, STAKE_AMOUNT)
      await applyListing(listingHash2, accounts[0], TOKEN, STAKE_AMOUNT)

      const applicationExpiry = (await registry.listings(listingHash1))[0].toNumber()
      const increaseTimeSeconds = applicationExpiry - currentEVMTime + 100
      await increaseEVMTime(increaseTimeSeconds)

      expect((await registry.listings(listingHash1))[1]).to.equal(false)
      expect((await registry.listings(listingHash2))[1]).to.equal(false)
      await registry.updateStatuses([listingHash1, listingHash2])
      expect((await registry.listings(listingHash1))[1]).to.equal(true)
      expect((await registry.listings(listingHash2))[1]).to.equal(true)
    })
  })

  describe('resolveChallenge()', async () => {
    let challengeID, challenger
    describe('when a challenge has failed', async () => {
      beforeEach(async () => {
        registry = await initializeRegistry()
        listingHash = web3.fromAscii('domain.com')
        challenger = accounts[1]
        await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
        let challengeAddr = await initiateChallenge(listingHash, challenger, TOKEN, STAKE_AMOUNT)
        challengeID = (await registry.listings(listingHash))[4].toNumber()
        let challenge = await FutarchyChallenge.at(challengeAddr)
        await challenge.mock_setEnded(true)
        await challenge.mock_setPassed(false)
      })

      it('emits a _ChallengeFailed event', async () => {
        expectEvent('_ChallengeFailed', registry.execute_resolveChallenge(listingHash))
      })

      it('increases listing.unstakedDeposit by challenge deposit amount', async () => {
        let previousUnstakedDeposit = (await registry.listings(listingHash))[3].toNumber()
        await registry.execute_resolveChallenge(listingHash)
        let currentUnstakedDeposit = (await registry.listings(listingHash))[3].toNumber()
        expect(currentUnstakedDeposit).to.equal(previousUnstakedDeposit + STAKE_AMOUNT)
      })

      it('sets challenges[challengeID] to resolved', async () => {
        expect((await registry.challenges(challengeID))[4]).to.equal(false)
        await registry.execute_resolveChallenge(listingHash)
        expect((await registry.challenges(challengeID))[4]).to.equal(true)
      })

      describe('when minDeposit has increased since the challenge was initiated', async () => {
        it('increases unstakedDeposit by the previous minDeposit at time of the challenge intiation', async () => {
          let previousUnstakedDeposit = (await registry.listings(listingHash))[3].toNumber()
          await PARAMETERIZER.setMockParam('minDeposit', new BigNumber(STAKE_AMOUNT).mul(1.5))
          await registry.execute_resolveChallenge(listingHash)
          let currentUnstakedDeposit = (await registry.listings(listingHash))[3].toNumber()
          expect(currentUnstakedDeposit).to.equal(previousUnstakedDeposit + STAKE_AMOUNT)
          await PARAMETERIZER.setMockParam('minDeposit', new BigNumber(STAKE_AMOUNT))
        })
      })

      describe('when the listing is in application phase', async () => {
        it('whitelists the application', async () => {
          expect((await registry.listings(listingHash))[1]).to.equal(false)
          await registry.execute_resolveChallenge(listingHash)
          expect((await registry.listings(listingHash))[1]).to.equal(true)
        })
      })
    })

    describe('when challenge has passed', async () => {
      beforeEach(async () => {
        registry = await initializeRegistry()
        listingHash = web3.fromAscii('domain.com')
        challenger = accounts[1]
        await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
        let challengeAddr = await initiateChallenge(listingHash, challenger, TOKEN, STAKE_AMOUNT)
        challengeID = (await registry.listings(listingHash))[4].toNumber()
        let challenge = await FutarchyChallenge.at(challengeAddr)
        await challenge.mock_setEnded(true)
        await challenge.mock_setPassed(true)
      })

      it('resets the listing', async () => {
        expect(await registry.appWasMade.call(listingHash)).to.equal(true)
        await registry.execute_resolveChallenge(listingHash)
        expect(await registry.appWasMade.call(listingHash)).to.equal(false)
      })

      it('transfers minDeposit amount of tokens to challenger', async () => {
        let previousChallengerBalance = (await TOKEN.balanceOf(challenger)).toNumber()
        await registry.execute_resolveChallenge(listingHash)
        let currentChallengerBalance = (await TOKEN.balanceOf(challenger)).toNumber()
        expect(currentChallengerBalance).to.equal(previousChallengerBalance + STAKE_AMOUNT)
      })

      it('emits a _ChallengeSucceeded event', async () => {
        expectEvent('_ChallengeSucceeded', registry.execute_resolveChallenge(listingHash))
      })

      describe('when minDeposit has increased since the challenge was initiated', async () => {
        it('transfers back to the challenger the previous minDeposit amount at the time the challenge was initiated', async () => {
          let previousChallengerBalance = (await TOKEN.balanceOf(challenger)).toNumber()
          await PARAMETERIZER.setMockParam('minDeposit', new BigNumber(STAKE_AMOUNT).mul(1.5))
          await registry.execute_resolveChallenge(listingHash)
          let currentChallengerBalance = (await TOKEN.balanceOf(challenger)).toNumber()
          expect(currentChallengerBalance).to.equal(previousChallengerBalance + STAKE_AMOUNT)
          await PARAMETERIZER.setMockParam('minDeposit', new BigNumber(STAKE_AMOUNT))
        })
      })
    })
  })

  describe('allocateWinnerReward()', async () => {
    let challengeID, challenger
    beforeEach(async () => {
      registry = await initializeRegistry()
      listingHash = web3.fromAscii('domain.com')
      challenger = accounts[1]
      await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
      let challengeAddr = await initiateChallenge(listingHash, challenger, TOKEN, STAKE_AMOUNT)
      challengeID = (await registry.listings(listingHash))[4].toNumber()
      let challenge = await FutarchyChallenge.at(challengeAddr)
      await challenge.mock_setEnded(true)
      await challenge.mock_setPassed(true)
    })

    it('reverts if the challenge is not resolved', async () => {
      await expectRevert(registry.allocateWinnerReward(challengeID))
    })

    it('reverts if reward was already allocated', async () => {

    })

    describe('when called with a challengeID linked to a challenge ready to distribute reward', async () => {
      describe('if the challenge had failed', async () => {
        it('transfers reward from the challenge to the registry contract')
        it('increases listing.unstakedDeposit by the reward amount')
      })
      describe('if the challenge had passed', async () => {
        it('transfers tokens from the challenge contract')
        it('transfers tokens to the challenger address')
      })
    })
  })

  describe('canBeWhitelisted()', async () => {
    beforeEach(async () => {
      registry = await initializeRegistry()
      listingHash = web3.fromAscii('domain.com')
      await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
    })

    it('returns false if listing does not exist', async () => {
      let nonExistentLising = web3.fromAscii('domain00.com')
      expect(await registry.canBeWhitelisted.call(nonExistentLising)).to.equal(false)
    })

    it('returns false if application time period is not over', async () => {
      expect(await registry.canBeWhitelisted.call(listingHash)).to.equal(false)
    })

    it('returns false if the listing is already whitelisted', async () => {
      const applicationExpiry = (await registry.listings(listingHash))[0].toNumber()
      const increaseTimeSeconds = applicationExpiry - currentEVMTime + 100
      await increaseEVMTime(increaseTimeSeconds)
      await registry.updateStatus(listingHash)
      expect(await registry.canBeWhitelisted.call(listingHash)).to.equal(false)
    })

    it('returns false if listing has an active and unresolved challenge', async () => {
      await initiateChallenge(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
      const applicationExpiry = (await registry.listings(listingHash))[0].toNumber()
      const increaseTimeSeconds = applicationExpiry - currentEVMTime + 100
      await increaseEVMTime(increaseTimeSeconds)
      expect(await registry.canBeWhitelisted.call(listingHash)).to.equal(false)
    })

    it('returns true given listing exists, the application period is over, is not whitelisted, and has no active challenge', async () => {
      const applicationExpiry = (await registry.listings(listingHash))[0].toNumber()
      const increaseTimeSeconds = applicationExpiry - currentEVMTime + 100

      await increaseEVMTime(increaseTimeSeconds)
      expect(await registry.canBeWhitelisted.call(listingHash)).to.equal(true)
    })
  })

  describe('isWhitelisted()', async () => {
    beforeEach(async () => {
      registry = await initializeRegistry()
      listingHash = web3.fromAscii('domain.com')
      await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
    })

    it('returns true if listings[listingHash].whitelisted returns true', async () => {
      const applicationExpiry = (await registry.listings(listingHash))[0].toNumber()
      const increaseTimeSeconds = applicationExpiry - currentEVMTime + 100
      await increaseEVMTime(increaseTimeSeconds)
      await registry.updateStatus(listingHash)
      expect(await registry.isWhitelisted.call(listingHash)).to.equal(true)
    })

    it('returns false if listings[listingHash].whitelisted returns false', async () => {
      expect(await registry.isWhitelisted.call(listingHash)).to.equal(false)
    })
  })

  describe('appWasMade()', async () => {
    beforeEach(async () => {
      registry = await initializeRegistry()
      listingHash = web3.fromAscii('domain.com')
      await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
    })

    it('returns true if listingHash application submitted but not yet whitelisted', async () => {
      expect(await registry.appWasMade.call(listingHash)).to.equal(true)
    })

    it('returns true if listingHash has been whitelisted', async () => {
      const applicationExpiry = (await registry.listings(listingHash))[0].toNumber()
      const increaseTimeSeconds = applicationExpiry - currentEVMTime + 100
      await increaseEVMTime(increaseTimeSeconds)
      await registry.updateStatus(listingHash)

      expect(await registry.appWasMade.call(listingHash)).to.equal(true)
    })

    it('returns false if no application for a listing was ever submitted', async () => {
      let nonExistentLising = web3.fromAscii('domain00.com')
      expect(await registry.appWasMade.call(nonExistentLising)).to.equal(false)
    })

    it('returns false if a once existing listingHash has since been removed from the registry', async () => {
      let challenger = accounts[0]
      let challengeAddr = await initiateChallenge(listingHash, challenger, TOKEN, STAKE_AMOUNT)
      let challengeID = (await registry.listings(listingHash))[4].toNumber()
      let challenge = await FutarchyChallenge.at(challengeAddr)
      await challenge.mock_setEnded(true)
      await challenge.mock_setPassed(true)
      await registry.updateStatus(listingHash)
      expect(await registry.appWasMade.call(listingHash)).to.equal(false)
    })
  })

  describe('challengeExists', async () => {
    beforeEach(async () => {
      registry = await initializeRegistry()
      listingHash = web3.fromAscii('domain.com')
      await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
    })

    it('returns false if listing[listingHash].challengeID is 0 signifying no challenge has existed yet for this listing', async () => {
      expect(await registry.challengeExists.call(listingHash)).to.equal(false)
    })

    it('returns false if challengeID is greater than 0 and challenge has been resolved', async () => {
      let challenger = accounts[0]
      let challengeAddr = await initiateChallenge(listingHash, challenger, TOKEN, STAKE_AMOUNT)
      let challengeID = (await registry.listings(listingHash))[4].toNumber()
      let challenge = await FutarchyChallenge.at(challengeAddr)
      await challenge.mock_setEnded(true)
      await challenge.mock_setPassed(true)
      await registry.updateStatus(listingHash)
      expect(await registry.challengeExists.call(listingHash)).to.equal(false)
    })

    it('returns true if challengeID is greater than 0, but the challenge is still unresolved', async () => {
      let challenger = accounts[0]
      let challengeAddr = await initiateChallenge(listingHash, challenger, TOKEN, STAKE_AMOUNT)
      let challengeID = (await registry.listings(listingHash))[4].toNumber()
      let challenge = await FutarchyChallenge.at(challengeAddr)
      await challenge.mock_setEnded(true)
      await challenge.mock_setPassed(true)
      expect(await registry.challengeExists.call(listingHash)).to.equal(true)
    })
  })

  describe('challengeCanBeResolved()', async () => {
    beforeEach(async () => {
      registry = await initializeRegistry()
      listingHash = web3.fromAscii('domain.com')
      await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
    })

    it('reverts if no challenge exists', async () => {
      await expectRevert(registry.challengeCanBeResolved(listingHash))
    })

    it('reverts if last active challenge has already been resolved', async () => {
      let challenger = accounts[0]
      let challengeAddr = await initiateChallenge(listingHash, challenger, TOKEN, STAKE_AMOUNT)
      let challengeID = (await registry.listings(listingHash))[4].toNumber()
      let challenge = await FutarchyChallenge.at(challengeAddr)
      await challenge.mock_setEnded(true)
      await challenge.mock_setPassed(true)
      await registry.updateStatus(listingHash)
      await expectRevert(registry.challengeCanBeResolved(listingHash))
    })

    it('returns true if challenge has ended', async () => {
      let challenger = accounts[0]
      let challengeAddr = await initiateChallenge(listingHash, challenger, TOKEN, STAKE_AMOUNT)
      let challengeID = (await registry.listings(listingHash))[4].toNumber()
      let challenge = await FutarchyChallenge.at(challengeAddr)
      await challenge.mock_setEnded(true)
      await challenge.mock_setPassed(true)
      expect(await registry.challengeCanBeResolved.call(listingHash)).to.equal(true)
    })

    it('returns if false if active challenge has not ended yet', async () => {
      let challenger = accounts[0]
      let challengeAddr = await initiateChallenge(listingHash, challenger, TOKEN, STAKE_AMOUNT)
      let challengeID = (await registry.listings(listingHash))[4].toNumber()
      let challenge = await FutarchyChallenge.at(challengeAddr)
      await challenge.mock_setEnded(false)
      expect(await registry.challengeCanBeResolved.call(listingHash)).to.equal(false)
    })
  })

  describe('challengeAddr()', async () => {
    beforeEach(async () => {
      registry = await initializeRegistry()
      listingHash = web3.fromAscii('domain.com')
      await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
    })

    it('returns a 0 address if no challenge has ever existed for listingHash', async () => {
      expect(await registry.challengeAddr.call(listingHash)).to.equal(zeroAddr)
    })

    it('returns the active challengeAddress for the given listingHash,', async () => {
      let challenger = accounts[0]
      let challengeAddr = await initiateChallenge(listingHash, challenger, TOKEN, STAKE_AMOUNT)
      expect(await registry.challengeAddr.call(listingHash)).to.equal(challengeAddr)
    })

    it('returns the most recent challengeAddress if there is currently no active challenge', async () => {
      let challenger = accounts[0]
      let challengeAddr = await initiateChallenge(listingHash, challenger, TOKEN, STAKE_AMOUNT)
      let challengeID = (await registry.listings(listingHash))[4].toNumber()
      let challenge = await FutarchyChallenge.at(challengeAddr)
      await challenge.mock_setEnded(true)
      await challenge.mock_setPassed(false)
      await registry.updateStatus(listingHash)

      expect(await registry.challengeAddr.call(listingHash)).to.equal(challengeAddr)
    })
  })


  async function initializeRegistry(customParams = {}) {
    const {
      token                    = TOKEN.address,
      parameterizer            = PARAMETERIZER.address,
      futarchyChallengeFactory = FUTARCHY_CHALLENGE_FACTORY.address,
      name                     = NAME,
    } = customParams

    let registry = await Registry.new()
    await registry.init(
      token, parameterizer, futarchyChallengeFactory, name
    )
    return registry
  }

  async function applyListing(listingHash, account, token, stakeAmount) {
    await token.approve(registry.address, stakeAmount, {from: account})
    await registry.apply(listingHash, stakeAmount, '')
  }

  async function getEventParameter(eventName, parameter, asyncFn) {
    const { logs } = await asyncFn
    const logEvent = logs.find(e => e.event === eventName)
    const param = logEvent['args'][parameter]
    return param
  }

  async function whitelistListing(listingHash) {
    const applicationExpiry = (await registry.listings(listingHash))[0].toNumber()
    const increaseTimeSeconds = applicationExpiry - currentEVMTime + 100
    await increaseTime(increaseTimeSeconds)
    await registry.updateStatus(listingHash)
  }

  async function initiateChallenge(listingHash, account, token, stakeAmount) {
    await token.transfer(account, stakeAmount)
    await token.approve(registry.address, stakeAmount, {from: account})
    await registry.createChallenge(listingHash, '', {from: account})
    return await registry.challengeAddr.call(listingHash)
  }

  async function depositToListing(listingHash, account, token, stakeAmount) {
    await token.approve(registry.address, stakeAmount, {from: account})
    await registry.deposit(listingHash, stakeAmount)
  }

  async function increaseEVMTime(seconds)  {
    await increaseTime(seconds)
    currentEVMTime = (await latestTime()).unix()
    return currentEVMTime
  }
})
