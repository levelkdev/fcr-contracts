/* eslint-env mocha */
/* global artifacts */

import fcr_js from 'fcr-js'
const Eth = require('ethjs');
const HttpProvider = require('ethjs-provider-http');
const EthRPC = require('ethjs-rpc');
const abi = require('ethereumjs-abi');
const fs = require('fs');
const Web3_beta = require('web3')
const BigNumber = require('bignumber.js');

const fcrJsConfig = JSON.parse(fs.readFileSync('./test/fcrJsConfig.json'))
const web3_beta = new Web3_beta(new Web3_beta.providers.HttpProvider(fcrJsConfig.local.web3Url))


const ethRPC = new EthRPC(new HttpProvider('http://localhost:8545'));
const ethQuery = new Eth(new HttpProvider('http://localhost:8545'));

const PLCRVoting = artifacts.require('PLCRVoting.sol');
const FutarchyChallenge = artifacts.require('FutarchyChallenge.sol');
const FutarchyChallengeFactory = artifacts.require('FutarchyChallengeFactory.sol');
const FutarchyOracleFactory = artifacts.require('FutarchyOracleFactory')
const FutarchyOracle = artifacts.require('FutarchyOracle')
const CentralizedTimedOracleFactory = artifacts.require('CentralizedTimedOracleFactory')
const StandardMarket = artifacts.require('StandardMarket')
const DutchExchange = artifacts.require('DutchExchangeMock')
const LMSRMarketMaker = artifacts.require('LMSRMarketMaker')
const Parameterizer = artifacts.require('Parameterizer.sol');
const Registry = artifacts.require('Registry.sol');
const Token = artifacts.require('EIP20.sol');
const EtherToken = artifacts.require('EtherToken.sol')

const RegistryFactory = artifacts.require('RegistryFactory.sol');

const config = JSON.parse(fs.readFileSync('./conf/config.json'));
const paramConfig = config.paramDefaults;

const BN = small => new Eth.BN(small.toString(10), 10);
const toWei = number => new BN(number * 10 ** 18)

module.exports = (artifacts, config) => {
  const utils = {
    getProxies: async () => {
      const registryFactory = await RegistryFactory.deployed();
      const token = await Token.new(config.token.supply, config.token.name, config.token.decimals, config.token.symbol);
      const lmsrMarketMaker = await LMSRMarketMaker.deployed()
      const challengeFactory = await FutarchyChallengeFactory.new(
        token.address,
        EtherToken.address,
        toWei(config.challengeFactory.stakeAmount),
        config.challengeFactory.tradingPeriod,
        config.challengeFactory.timeToPriceResolution,
        FutarchyOracleFactory.address,
        CentralizedTimedOracleFactory.address,
        LMSRMarketMaker.address,
        DutchExchange.address
      )
      const registryReceipt = await registryFactory.newRegistryBYOToken(
        token.address,
        [
          toWei(paramConfig.minDeposit),
          toWei(paramConfig.pMinDeposit),
          paramConfig.applyStageLength,
          paramConfig.pApplyStageLength,
          paramConfig.commitStageLength,
          paramConfig.pCommitStageLength,
          paramConfig.revealStageLength,
          paramConfig.pRevealStageLength,
          paramConfig.dispensationPct,
          paramConfig.pDispensationPct,
          paramConfig.voteQuorum,
          paramConfig.pVoteQuorum,
        ],
        'Futarchy Curated Registry',
        challengeFactory.address
      );

      const {
        parameterizer,
        registry,
      } = registryReceipt.logs[0].args;

      const tokenInstance = token;
      const paramProxy = await Parameterizer.at(parameterizer);
      const registryProxy = await Registry.at(registry);
      const plcr = await paramProxy.voting.call();
      const votingProxy = PLCRVoting.at(plcr);

      const fcrjs = fcr_js(web3_beta, _.merge(fcrJsConfig.local, {
        registryAddress: registry,
        tokenAddress: token.address,
        LMSRMarketMakerAddress: lmsrMarketMaker.address,
      }))

      const proxies = {
        tokenInstance,
        votingProxy,
        paramProxy,
        registryProxy,
        fcrjs,
      };
      return proxies;
    },

    getProxiesBYO: async (token) => {
      const registryFactory = await RegistryFactory.deployed();
      const challengeFactory = await FutarchyChallengeFactory.deployed();
      const registryReceipt = await registryFactory.newRegistryBYOToken(
        token.address,
        [
          paramConfig.minDeposit,
          paramConfig.pMinDeposit,
          paramConfig.applyStageLength,
          paramConfig.pApplyStageLength,
          paramConfig.commitStageLength,
          paramConfig.pCommitStageLength,
          paramConfig.revealStageLength,
          paramConfig.pRevealStageLength,
          paramConfig.dispensationPct,
          paramConfig.pDispensationPct,
          paramConfig.voteQuorum,
          paramConfig.pVoteQuorum,
        ],
        'Futarchy Curated Registry',
        challengeFactory.address
      );

      const {
        parameterizer,
        registry
      } = registryReceipt.logs[0].args;

      const paramProxy = Parameterizer.at(parameterizer);
      const registryProxy = Registry.at(registry);
      const plcr = await paramProxy.voting.call();
      const votingProxy = PLCRVoting.at(plcr);

      const proxies = {
        votingProxy,
        paramProxy,
        registryProxy,
      };
      return proxies;
    },

    approveProxies: async (accounts, token, plcr, parameterizer, registry) => (
      Promise.all(accounts.map(async (user) => {
        await token.transfer(user, 10000000000000000000);
        if (plcr) {
          await token.approve(plcr.address, 10000000000000000000, { from: user });
        }
        if (parameterizer) {
          await token.approve(parameterizer.address, 10000000000000000000, { from: user });
        }
        if (registry) {
          await token.approve(registry.address, 10000000000000000000, { from: user });
        }
      }))
    ),

    tradeOnChallenge: async (challenge) => {

    },

    getVoting: async () => {
      const plcrVotingChallengeFactory = await PLCRVotingChallengeFactory.deployed();
      const votingAddr = await plcrVotingChallengeFactory.voting.call();
      return PLCRVoting.at(votingAddr);
    },

    increaseTime: async seconds => {
      if (typeof(seconds) == 'string') {
        seconds = parseInt(seconds)
      }
      new Promise((resolve, reject) => ethRPC.sendAsync({
        method: 'evm_increaseTime',
        params: [seconds],
      }, (err) => {
        if (err) {console.log('err!! ', err); reject(err)};
        resolve();
      }))
        .then(() =>
          new Promise((resolve, reject) => ethRPC.sendAsync({
          method: 'evm_mine',
          params: [],
        }, (err) => {
          resolve();
        })))
      },

    getVoteSaltHash: (vote, salt) => (
      `0x${abi.soliditySHA3(['uint', 'uint'], [vote, salt]).toString('hex')}`
    ),

    getListingHash: domain => (
      // web3.utils.fromAscii(domain)
      `0x${abi.soliditySHA3(['string'], [domain]).toString('hex')}`
    ),

    approvePLCR: async (address, adtAmount) => {
      const registry = await Registry.deployed();
      const plcrAddr = await registry.voting.call();
      const token = await Token.deployed();
      await token.approve(plcrAddr, adtAmount, { from: address });
    },

    addToWhitelist: async (domain, deposit, actor, registry) => {
      await utils.as(actor, registry.apply, domain, deposit, '');
      await utils.increaseTime(paramConfig.applyStageLength + 1);
      await utils.as(actor, registry.updateStatus, domain);
    },

    createAndStartChallenge: async (fcr, listingTitle, challenger) => {
      const minDeposit = toWei(paramConfig.minDeposit);
      await fcr.registry.createChallenge(challenger, listingTitle, '')
      const listing   = await fcr.registry.getListing(listingTitle);
      const challenge = await fcr.registry.getChallenge(listing.challengeID);
      await challenge.start(challenger);
      await fcr.token.contract.methods.transfer(challenger, minDeposit).call()
      await fcr.token.contract.methods.approve(challenge.address, minDeposit).call({from: challenger})
      await challenge.fund(challenger);
      return challenge;
    },

    makeChallengeFail: async (fcr, listingTitle, trader) => {
      const listing        = await fcr.registry.getListing(listingTitle);
      const challenge      = await fcr.registry.getChallenge(listing.challengeID);
      const tradingPeriod  = await challenge.contract.methods.tradingPeriod().call();
      const futAddr        = await challenge.contract.methods.futarchyOracle().call()
      const futarchyOracle = await FutarchyOracle.at(futAddr);
      const marketAddr     = await futarchyOracle.markets(0)
      const market         = await StandardMarket.at(marketAddr)
      await challenge.buyOutcome(trader, 'LONG_DENIED', new BigNumber(1 * 10 **18))
      await utils.increaseTime(parseInt(tradingPeriod) + 1);
      await challenge.setOutcome(trader);
      await fcr.registry.updateStatus(trader, listingTitle)
    },

    as: async (actor, fn, ...args) => {
      function detectSendObject(potentialSendObj) {
        function hasOwnProperty(obj, prop) {
          const proto = obj.constructor.prototype;
          return (prop in obj) &&
            (!(prop in proto) || proto[prop] !== obj[prop]);
        }

        if (typeof potentialSendObj !== 'object') { return undefined; }
        if (
          hasOwnProperty(potentialSendObj, 'from') ||
          hasOwnProperty(potentialSendObj, 'to') ||
          hasOwnProperty(potentialSendObj, 'gas') ||
          hasOwnProperty(potentialSendObj, 'gasPrice') ||
          hasOwnProperty(potentialSendObj, 'value')
        ) {
          throw new Error('It is unsafe to use "as" with custom send objects');
        }

        return undefined;
      }
      detectSendObject(args[args.length - 1]);
      const sendObject = { from: actor };
      let receipt = await fn(...args, sendObject);
      return receipt;
    },

    isEVMException: err => (
      err.toString().includes('revert')
    ),

    // returns block timestamp
    getBlockTimestamp: () => ethQuery.blockNumber()
      .then(num => ethQuery.getBlockByNumber(num, true))
      .then(block => block.timestamp.toString(10)),

    getUnstakedDeposit: async (domain, registry) => {
      // get the struct in the mapping
      const listing = await registry.listings.call(domain);
      // get the unstaked deposit amount from the listing struct
      const unstakedDeposit = await listing[3];
      return unstakedDeposit.toString();
    },

    challengeAndGetPollID: async (domain, actor, registry) => {
      const receipt = await utils.as(actor, registry.challenge, domain, '');
      return receipt.logs[0].args.challengeID;
    },

    getChallengeID: async (domain, registry) => {
      const listing = await registry.listings.call(domain);
      const challengeID = listing[4];
      return challengeID;
    },


    getReceiptValue: (receipt, arg) => receipt.logs[0].args[arg],

    proposeReparamAndGetPropID: async (reParam, value, actor, parameterizer) => {
      const receipt = await utils.as(actor, parameterizer.proposeReparameterization, reParam, value);
      return receipt.logs[0].args.propID;
    },

    challengeReparamAndGetChallengeID: async (propID, actor, parameterizer) => {
      const receipt = await utils.as(actor, parameterizer.challengeReparameterization, propID);
      return receipt.logs[0].args.challengeID;
    },

    divideAndGetWei: (numerator, denominator) => {
      const weiNumerator = Eth.toWei(BN(numerator), 'gwei');
      return weiNumerator.div(BN(denominator));
    },

    multiplyFromWei: (x, weiBN) => {
      if (!Eth.BN.isBN(weiBN)) {
        return false;
      }
      const weiProduct = BN(x).mul(weiBN);
      return BN(Eth.fromWei(weiProduct, 'gwei'));
    },

    multiplyByPercentage: (x, y, z = 100) => {
      const weiQuotient = utils.divideAndGetWei(y, z);
      return utils.multiplyFromWei(x, weiQuotient);
    },
  };

  return utils
}
