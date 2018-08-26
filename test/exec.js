require('babel-register')
require('babel-polyfill')

const fs = require('fs')
const config = require('../conf/config.json')
const fcrJsConfig = require('./fcrJsConfig.json')
const utils = require('./utils.js')(artifacts)

module.exports = (callback) => {
  const scenarioName = process.argv[4]
  const scriptPath = `./scenarios/${scenarioName}.js`
  const script = require(scriptPath)

  script(artifacts, web3, config, fcrJsConfig, utils).then(() => {
    callback()
  }, (err) => {
    callback(err)
  })
}
