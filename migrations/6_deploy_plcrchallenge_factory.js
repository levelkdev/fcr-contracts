/* global artifacts */

const Token = artifacts.require('EIP20.sol');
const DLL = artifacts.require('dll/DLL.sol');
const AttributeStore = artifacts.require('attrstore/AttributeStore.sol');
const PLCRVotingChallengeFactory = artifacts.require('PLCRVotingChallengeFactory.sol');
const Parameterizer = artifacts.require('Parameterizer.sol');
const PLCRVoting = artifacts.require('PLCRVoting.sol');

const fs = require('fs');

module.exports = (deployer, network, accounts) => {
  deployer.link(DLL, PLCRVotingChallengeFactory);
  deployer.link(AttributeStore, PLCRVotingChallengeFactory);

  return deployer.then(async () => {
    const config = JSON.parse(fs.readFileSync('./conf/config.json'));
    let tokenAddress = config.token.address;

    if (config.token.deployToken) {
      tokenAddress = Token.address;
    }

    return deployer.deploy(
      PLCRVotingChallengeFactory,
      tokenAddress,
      Parameterizer.address,
      PLCRVoting.address
    )
  })
};
