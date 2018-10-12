# fcr-contracts

Smart contracts for futarchy curated registry.

## Overview

Futarchy curated registries are similar to [token curated registries](https://medium.com/@ilovebagels/token-curated-registries-1-0-61a232f8dac7). Token curated registries decide what to add/remove based on token weighted voting, while futarchy curated registries make these decisions using [futarchy](http://mason.gmu.edu/~rhanson/futarchy.html). 

In this project, futarchy markets are created using [CategoricalEvent](https://github.com/levelkdev/pm-contracts/blob/78ba5acb928381d3335b6cff851d16f7d61e8afd/contracts/Events/CategoricalEvent.sol) and [ScalarEvent](https://github.com/levelkdev/pm-contracts/blob/78ba5acb928381d3335b6cff851d16f7d61e8afd/contracts/Events/ScalarEvent.sol) smart contracts from the [Gnosis](https://github.com/gnosis) platform. They are set up according to the model described [here](https://ethresear.ch/t/possible-futarchy-setups/1820) under `Futarchy Market Setups` #1.

Since futarchy markets are driven by future price predicion, we use the [Gnosis DutchX](https://blog.gnosis.pm/introducing-the-gnosis-dutch-exchange-53bd3d51f9b2) as an oracle to resolve the price of the "FCR Token".

## Setup

`npm install`

`npm run compile` to compile truffle artifacts to `build/contracts`

## Smart Contracts

### Registry.sol

Contains core registry functionality, and stores the state of registry listings. Adapted from [skmgoldin/tcr/contracts/Registry.sol](https://github.com/skmgoldin/tcr/blob/4853e4dd8d6080d95e51955c81c1052017b1d3ec/contracts/Registry.sol).

### RegistryFactory.sol

Factory contract for creation of Registry instances.

### Parameterizer.sol

From [skmgoldin/tcr/contracts/Parameterizer](https://github.com/skmgoldin/tcr/blob/4853e4dd8d6080d95e51955c81c1052017b1d3ec/contracts/Parameterizer.sol). Used to set parameters for registries and challenges, such as `minDeposit`. New parameters values can be proposed with a token weighted vote. The voting process is implemented with [PLCRVoting](https://github.com/ConsenSys/PLCRVoting/blob/2e63c1f5190a9a1166b4b72f86e325ed61460b24/contracts/PLCRVoting.sol).

### ParameterizerFactory.sol

Factory contract for creation of Parameterizer instances.

### IDutchExchange.sol

Interface for [DutchExchange](https://github.com/gnosis/dx-contracts/blob/9c56c471df86587473c12aa057b87e44c34dd702/contracts/DutchExchange.sol) contract. Provides the functions that are needed for the FCR implementation, so that dutch exchange can be mocked for testing.

### Imports.sol

Used to force compilation of all contracts for testing. Not intended to be deployed to testnet/mainnet.

### Challenge/FutarchyChallenge.sol

The futarchy based challenge implementation. For each new challenge issued via Registry, there will be one instance of FutarchyChallenge deployed.

The `initiateFutarchy()` function is used to create an instance of [FutarchyOracle](https://github.com/levelkdev/pm-contracts/blob/78ba5acb928381d3335b6cff851d16f7d61e8afd/contracts/Oracles/FutarchyOracle.sol), which creates all events and markets for the futarchy based challenge decision.

### Challenge/FutarchyChallengeFactory.sol

Factory contract for creation of FutarchyChallenge instances.

### Challenge/ChallengeInterface.sol

Interface for a challenge instance. Implemented by FutarchyChallenge and used by FutarchyChallengeFactory.

### Challenge/ChallengeFactoryInterface.sol

Interface for a challenge factory instance. Implemented by FutarchyChallengeFactory and used by Registry.

### Challenge/Oracles/CentralizedTimedOracle.sol

Allows an owner to resolve the outcome after a period of time has elapsed.

### Challenge/Oracles/CentralizedTimedOracleFactory.sol

Factory contract for creation of CentralizedTimedOracle instances.

### Challenge/Oracles/DutchExchangeMock.sol

Mock contract for testing with DutchX.

### ScalarPriceOracle.sol

Allows an outcome to be set based on the average price of a given token trading pair on DutchX. Takes the average of the last 5 auctions for the token pair.

### ScalarPriceOracleFactory.sol

Factory contract for creation of ScalarPriceOracle instances.

### TimedOracle.sol

Allows a resolution date to be set, and provides a modifier `resolutionDatePassed()` to require that the resolution date has passed.

## Testing

The `test` dir contains unit tests and integration tests. Unit tests run against individual contract instances. Integration tests run a series of transactions against multiple deployed contracts, and assert that certain conditions are met.

### Run Unit Tests

`npm run test`

### Run Integration Tests

`npm run ganache` to start ganache-cli
`npm run migrate-reset` to run truffle migrations
`npm run integration-test <testName>`

## Compile With solc (debugging only)

The `npm run solc-compile` script is an optimization that allows you to compile contracts quickly with `solc`, rather than `truffle compile` which adds a lot of additional overhead.

First, run these prerequisite steps:

* Install latest solc CLI [install solidity](https://solidity.readthedocs.io/en/v0.4.24/installing-solidity.html).
* Compile all contracts: `npm run compile`
* Run the flattener: `npm run flattener`

Then follow these steps to make contract changes for debugging:

1. Make a change in `./contracts_flattened/<ContractName>.sol`
2. Run `npm run solc-compile <ContractName>` (don't include `.sol`)
3. If there are no errors, run `npm run migrate-reset` to deploy everything including your change.

Keep in mind that the truffle build data in `build/contracts/` will be modified in ways that are likely not compatible with the truffle suite. Delete the entire `build` dir (`rm -rf ./build`) and `npm run compile` to go return to a stable state.
