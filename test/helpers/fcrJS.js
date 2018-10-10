import Web3_beta from 'web3'
import fcrjs from 'fcr-js'
import config from './fcrJS.config.json'

export default (
  registryAddress,
  tokenAddress,
  futarchyChallengeFactoryAddress
) => {
  const web3_beta = new Web3_beta(new Web3_beta.providers.HttpProvider(config.local.web3Url))
  const fcrJS = fcrjs(web3_beta, _.merge(config.local, {
    registryAddress,
    tokenAddress,
    futarchyChallengeFactoryAddress
  }))
  return fcrJS
}
