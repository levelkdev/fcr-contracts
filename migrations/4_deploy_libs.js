/* global artifacts */

module.exports = (deployer, network) => {
  if (network !== 'unit_testing') {
    const DLL = artifacts.require('dll/DLL.sol');
    const AttributeStore = artifacts.require('attrstore/AttributeStore.sol');

    // deploy libraries
    deployer.deploy(DLL);
    return deployer.deploy(AttributeStore);
  }
}
