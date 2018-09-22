export default async (PriceOracleInterface, dutchExchange) => {
  const ethUSDOracleAddress = await dutchExchange.ethUSDOracle()
  const ethUSDOracle = PriceOracleInterface.at(ethUSDOracleAddress)
  const tx = await ethUSDOracle.raiseEmergency(true)
  console.log('DutchExchange.ethUSDOracle: emergencyMode set to `true`')
  console.log('')
  return tx
}