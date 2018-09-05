/* global artifacts */

module.exports = (deployer, network) => {
  if (network !== 'unit_testing') {
    const ParameterizerFactory = artifacts.require('./ParameterizerFactory.sol');
    const DLL = artifacts.require('dll/DLL.sol');
    const AttributeStore = artifacts.require('attrstore/AttributeStore.sol');
    const PLCRFactory = artifacts.require('plcr-revival/PLCRFactory.sol');

    // link libraries
    deployer.link(DLL, ParameterizerFactory);
    deployer.link(AttributeStore, ParameterizerFactory);

    return deployer.deploy(ParameterizerFactory, PLCRFactory.address);
  }
}
