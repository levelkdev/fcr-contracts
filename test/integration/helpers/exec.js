require('babel-register')
require('babel-polyfill')

module.exports = (callback) => {
  const testScriptName = process.argv[4]
  const scriptPath = `../${testScriptName}.js`
  const script = require(scriptPath)

  script(artifacts, web3).then(() => {
    callback()
  }, (err) => {
    callback(err)
  })
}
