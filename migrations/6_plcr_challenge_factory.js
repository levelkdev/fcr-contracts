/* global artifacts */

const DLL = artifacts.require('dll/DLL.sol');
const AttributeStore = artifacts.require('attrstore/AttributeStore.sol');
const PLCRVotingChallengeFactory = artifacts.require('PLCRVotingChallengeFactory.sol');
const Parameterizer = artifacts.require('Parameterizer.sol');
const PLCRVoting = artifacts.require('PLCRVoting.sol');

const fs = require('fs');

module.exports = (deployer) => {
  deployer.link(DLL, PLCRVotingChallengeFactory);
  deployer.link(AttributeStore, PLCRVotingChallengeFactory);

  return deployer.then(async () => {
    return deployer.deploy(
      PLCRVotingChallengeFactory,
      Parameterizer.address,
      PLCRVoting.address,
    );
  });
};
