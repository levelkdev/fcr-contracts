require('babel-register')
require('babel-polyfill')

const config = require('../conf/config.json')
const fcrJsConfig = require('./fcrJsConfig.json')

module.exports = (callback) => {
  const testScriptName = process.argv[4]
  const scriptPath = `./integration/${testScriptName}.js`
  const script = require(scriptPath)

  console.log('ARTIFACTS: ', artifacts)
  const utils = require('./utils.js')

  script(artifacts, web3, config, fcrJsConfig, utils).then(() => {
    callback()
  }, (err) => {
    callback(err)
  })
}
