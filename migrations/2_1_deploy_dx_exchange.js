/* eslint no-multi-spaces: 0, no-console: 0 */

const dxMigrateDependencies = require('@gnosis.pm/dx-contracts/src/migrations/2_migrate_dependencies')
const dxDeployPriceFeed = require('@gnosis.pm/dx-contracts/src/migrations/3_deploy_price_feed')
const deployFrt = require('@gnosis.pm/dx-contracts/src/migrations/4_deploy_FRT')
const deployDx = require('@gnosis.pm/dx-contracts/src/migrations/5_deploy_DX')
const setupDx = require('@gnosis.pm/dx-contracts/src/migrations/6_setup_DX')
const setDxAsFrtMinter = require('@gnosis.pm/dx-contracts/src/migrations/7_set_DX_as_FRT_minter')

module.exports = (deployer, network, accounts) => {
  if (network == 'testing' || network == 'development') {
    return deployer.then(() => {
      logDxContractMigration('2_migrate_dependencies')
      return dxMigrateDependencies({
        artifacts,
        deployer,
        network,
        accounts,
        web3
      })
    })
    .then(() => {
      logDxContractMigration('3_deploy_price_feed')
      return dxDeployPriceFeed({
        artifacts,
        deployer,
        network,
        accounts,
        web3,
        ethUsdPrice: process.env.ETH_USD_PRICE,
        feedExpirePeriodDays: process.env.FEED_EXPIRE_PERIOD_DAYS
      })
    })
    .then(() => {
      logDxContractMigration('4_deploy_FRT')
      return deployFrt({
        artifacts,
        deployer,
        network,
        accounts
      })
    })
    .then(() => {
      logDxContractMigration('5_deploy_DX')
      return deployDx({
        artifacts,
        deployer,
        network,
        accounts
      })
    })
    .then(() => {
      logDxContractMigration('6_setup_DX')
      return setupDx({
        artifacts,
        deployer,
        network,
        accounts,
        thresholdNewTokenPairUsd: process.env.THRESHOLD_NEW_TOKEN_PAIR_USD,
        thresholdAuctionStartUsd: process.env.THRESHOLD_AUCTION_START_USD
      })
    })
    .then(() => {
      logDxContractMigration('7_set_DX_as_FRT_minter')
      return setDxAsFrtMinter({
        artifacts,
        deployer,
        network,
        accounts
      })
    })
  }
}

function logDxContractMigration (msg) {
  console.log(`Running dx-contract migration: ${msg}`)
}
