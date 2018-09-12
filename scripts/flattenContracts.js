const fs = require('fs')
const rimraf = require('rimraf');
const truffleFlattener = require('truffle-flattener')

const flattenedFileDir = './contracts_flattened'
rimraf.sync(flattenedFileDir)
fs.mkdirSync(flattenedFileDir)

const contracts = [
  ['./contracts', 'Parameterizer'],
  ['./contracts', 'ParameterizerFactory'],
  ['./contracts', 'Registry'],
  ['./contracts', 'RegistryFactory'],
  ['./contracts/Challenge/Oracles', 'CentralizedTimedOracle'],
  ['./contracts/Challenge/Oracles', 'CentralizedTimedOracleFactory'],
  ['./contracts/Challenge/Oracles', 'DutchExchangeMock'],
  ['./contracts/Challenge/Oracles', 'ScalarPriceOracle'],
  ['./contracts/Challenge/Oracles', 'ScalarPriceOracleFactory'],
  ['./node_modules/@gnosis.pm/dx-contracts/contracts', 'DutchExchange'],
  ['./node_modules/@gnosis.pm/gnosis-core-contracts/contracts/Events', 'CategoricalEvent'],
  ['./node_modules/@gnosis.pm/gnosis-core-contracts/contracts/Events', 'EventFactory'],
  ['./node_modules/@gnosis.pm/gnosis-core-contracts/contracts/Events', 'ScalarEvent']
]

contracts.forEach((contract) => {
  const contractLocation = contract[0]
  const contractName = contract[1]
  const contractPath = `${contractLocation}/${contractName}.sol`
  truffleFlattener([contractPath]).then((flattenedContract) => {
    const flatFilePath = `./contracts_flattened/${contractName}.sol`
    fs.writeFileSync(flatFilePath, flattenedContract)
    console.log(`flattened ${flatFilePath}`)
  }, (err) => {
    console.error(err)
  }).catch((err) => {
    console.error(err)
  })
})

