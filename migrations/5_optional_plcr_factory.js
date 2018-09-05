/* global artifacts */

module.exports = (deployer, network) => {
  if (network !== 'unit_testing') {
    const PLCRFactory = artifacts.require('plcr-revival/PLCRFactory.sol');
    const DLL = artifacts.require('dll/DLL.sol');
    const AttributeStore = artifacts.require('attrstore/AttributeStore.sol');

    // link libraries
    deployer.link(DLL, PLCRFactory);
    deployer.link(AttributeStore, PLCRFactory);

    return deployer.deploy(PLCRFactory);
  }
}
