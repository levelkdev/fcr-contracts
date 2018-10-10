const fs = require('fs')

const dir = 'build/contracts'

console.log('reseting truffle network configurations')

fs.readdir(dir, (err, files) => {
  if (err) {
    throw new Error(`could not read files from ${dir}: `, err)
  }
  files.forEach(file => {
    let contractObj = JSON.parse(fs.readFileSync(`${dir}/${file}`, 'utf8'));
    contractObj.networks = {}
    fs.writeFileSync(`${dir}/${file}`, JSON.stringify(contractObj, null, 2))
  })
})

console.log('')
