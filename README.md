# Futarchy Curated Registry

## Run solc-compile (debugging only)

This scripts allows you to make changes to a contract and recompile without the added overhead of `truffle compile`.

To compile a single contract and it's imports:

* Make sure you have the latest solc CLI [install solidity](https://solidity.readthedocs.io/en/v0.4.24/installing-solidity.html).
* Compile all contracts: `npm run compile`
* Run the flattener: `npm run flattener`

Then follow these steps to make contract changes for debugging:

1. Make a change in `./contracts_flattened/<ContractName>.sol`
2. Run `npm run solc-compile <ContractName>` (don't include `.sol`)
3. If there are no errors, run `npm run migrate-reset` to deploy everything including your change.

Keep in mind that the truffle build data in `build/contracts/` will be modified in ways that are likely not compatible with the truffle suite. Delete the entire `build` dir (`rm -rf ./build`) and `npm run compile` to go return to a stable state.
