/* eslint no-multi-spaces: 0, no-console: 0 */

const dxMigrateDependencies = require('@gnosis.pm/dx-contracts/src/migrations/2_migrate_dependencies')
const dxDeployPriceFeed = require('@gnosis.pm/dx-contracts/src/migrations/3_deploy_price_feed')
const deployFrt = require('@gnosis.pm/dx-contracts/src/migrations/4_deploy_FRT')
const deployDx = require('@gnosis.pm/dx-contracts/src/migrations/5_deploy_DX')
const setupDx = require('@gnosis.pm/dx-contracts/src/migrations/6_setup_DX')
const setDxAsFrtMinter = require('@gnosis.pm/dx-contracts/src/migrations/7_set_DX_as_FRT_minter')

module.exports = async function deploy(deployer, network, accounts) {

  if (network == 'testing' || network == 'development') {

    await dxMigrateDependencies({
      artifacts,
      deployer,
      network,
      accounts,
      web3
    })

    await dxDeployPriceFeed({
      artifacts,
      deployer,
      network,
      accounts,
      web3,
      ethUsdPrice: process.env.ETH_USD_PRICE,
      feedExpirePeriodDays: process.env.FEED_EXPIRE_PERIOD_DAYS
    })

    await deployFrt({
      artifacts,
      deployer,
      network,
      accounts
    })

    await deployDx({
      artifacts,
      deployer,
      network,
      accounts
    })

    await setupDx({
      artifacts,
      deployer,
      network,
      accounts,
      thresholdNewTokenPairUsd: process.env.THRESHOLD_NEW_TOKEN_PAIR_USD,
      thresholdAuctionStartUsd: process.env.THRESHOLD_AUCTION_START_USD
    })

    await setDxAsFrtMinter({
      artifacts,
      deployer,
      network,
      accounts
    })

  }
}
