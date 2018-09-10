import config from '../../conf/config.json'
const paramConfig = config.paramDefaults;

export default async (registryName, token, registryFactory, challengeFactory) => {
  const registryReceipt = await registryFactory.newRegistryBYOToken(
    token.address,
    [
      paramConfig.minDeposit,
      paramConfig.pMinDeposit,
      paramConfig.applyStageLength,
      paramConfig.pApplyStageLength,
      paramConfig.commitStageLength,
      paramConfig.pCommitStageLength,
      paramConfig.revealStageLength,
      paramConfig.pRevealStageLength,
      paramConfig.dispensationPct,
      paramConfig.pDispensationPct,
      paramConfig.voteQuorum,
      paramConfig.pVoteQuorum,
    ],
    registryName,
    challengeFactory.address
  )

  const {
    parameterizer,
    registry
  } = registryReceipt.logs[0].args;

  return {
    registryAddress: registry,
    parameterizerAddress: parameterizer
  }
}
