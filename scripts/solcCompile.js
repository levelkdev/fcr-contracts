const fs = require('fs');
const { exec } = require('child_process');

const path = `./contracts_flattened/${process.argv[2]}.sol`
console.log(`compiling ${path}`)
console.log('')

exec(`solc --optimize --abi --bin ${path}`, { maxBuffer: 1024 * 10000 }, (err, stdout, stderr) => {
  if (err) {
    console.error(`exec error: ${err}`)
    return
  }

  let parts = stdout.split('=======')

  for (let pos = 1; pos < parts.length; pos += 2) {
    let [contractPath, contractName] = parts[pos].trim().split(':')

    let [, , binary, , abi] = parts[pos + 1].split("\n")
    let truffleBuildFile = `./build/contracts/${contractName}.json`
    let truffleBuild, truffleBuildString
    
    if (fs.existsSync(truffleBuildFile)) {
      truffleBuildString = fs.readFileSync(truffleBuildFile).toString()
      truffleBuild = JSON.parse(truffleBuildString)
    }
    else truffleBuild = Object.assign({}, truffleBuildTemplate)

    truffleBuild.abi = JSON.parse(abi)
    truffleBuild.bytecode = binary
    truffleBuild.updated_at = Date.now()

    fs.writeFileSync(truffleBuildFile, JSON.stringify(truffleBuild, null, 2))

    console.log(`compiled ${truffleBuildFile}`)
  }
  console.log('')
})
