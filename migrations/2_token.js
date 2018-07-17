/* global artifacts */

const FaucetToken = artifacts.require('FaucetToken.sol');

const fs = require('fs');
const config = JSON.parse(fs.readFileSync('../conf/config.json'));

module.exports = (deployer, network) => {
  // deploy faucet token for the workshop
  deployer.deploy(
    FaucetToken,
    config.token.supply,
    config.token.name,
    config.token.decimals,
    config.token.symbol
  )
};
