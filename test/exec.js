require('babel-register')
require('babel-polyfill')

const fs = require('fs')

const config = JSON.parse(fs.readFileSync('../conf/config.json'))
const fcrJsConfig = JSON.parse(fs.readFileSync('./fcrJsConfig.json'))
const utils = require('./utils.js')(artifacts, config)

const scriptPath = process.argv[4]
const script = require(scriptPath)

module.exports = (callback) => {

  script(artifacts, web3, config, fcrJsConfig, utils).then(() => {
    callback()
  }, (err) => {
    callback(err)
  })
}
