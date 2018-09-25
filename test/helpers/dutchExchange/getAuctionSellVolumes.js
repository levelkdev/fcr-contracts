export default async ({
  dutchExchange,
  fcrToken,
  etherToken
}) => {
  const fcrSellVolume = await dutchExchange.sellVolumesCurrent(
    fcrToken.address,
    etherToken.address
  )
  const ethSellVolume = await dutchExchange.sellVolumesCurrent(
    etherToken.address,
    fcrToken.address
  )
  return {
    fcrSellVolume,
    ethSellVolume
  }
}
