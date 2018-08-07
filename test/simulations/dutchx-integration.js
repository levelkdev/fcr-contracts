const Parameterizer = artifacts.require('./Parameterizer.sol')
const Registry = artifacts.require('Registry.sol')
const Token = artifacts.require('EIP20.sol')
const OutcomeToken = artifacts.require('OutcomeToken')
const FutarchyChallengeFactory = artifacts.require('FutarchyChallengeFactory')
const EtherToken = artifacts.require('EtherToken')
const Event = artifacts.require('Event')
const EventFactory = artifacts.require('EventFactory')
const CategoricalEvent = artifacts.require('CategoricalEvent')
const ScalarEvent = artifacts.require('ScalarEvent')
const StandardMarket = artifacts.require('StandardMarket')
const StandardMarketFactory = artifacts.require('StandardMarketFactory')
const StandardMarketWithPriceLogger = artifacts.require('StandardMarketWithPriceLogger')
const StandardMarketWithPriceLoggerFactory = artifacts.require('StandardMarketWithPriceLoggerFactory')
const LMSRMarketMaker = artifacts.require('LMSRMarketMaker')
const FutarchyOracleFactory = artifacts.require('FutarchyOracleFactory')
const ScalarPriceOracleFactory = artifacts.require('ScalarPriceOracleFactory')
const ScalarPriceOracle = artifacts.require('ScalarPriceOracle')
const FutarchyChallenge = artifacts.require('FutarchyChallenge')
const FutarchyOracle = artifacts.require('FutarchyOracle')
const DutchExchange = artifacts.require('DutchExchangeMock')
const fs = require('fs')
const BN = require('bignumber.js')

const config = JSON.parse(fs.readFileSync('./conf/config.json'))
const paramConfig = config.paramDefaults

const { increaseTime } = lkTestHelpers(web3)

const utils = require('../utils.js')

contract('simulate TCR apply/futarchyChallenge/resolve', (accounts) => {

    it.only('...', async () => {

        const [creator, applicant, challenger, voterFor, voterAgainst, buyer1, buyer2] = accounts


        // const registry = await Registry.at('0x862d398f7ea1ec388659d2514ab07fafe51ed762')
        // const challengeFactory = await FutarchyChallengeFactory.at(0x001460556aa90b0be72442c228d6248cfc9078bc)
        // console.log("hey!")
        // console.log(Registry.name())







        const registry = Registry.at("0x862d398f7ea1ec388659d2514ab07fafe51ed762")
        const token = registry.token()
        registry.apply("0x416e6f74686572204c697374696e67", 11,"asdf", {from: web3.eth.accounts[2]})
      })
  })
