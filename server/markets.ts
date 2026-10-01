import {
  AaveV3Arbitrum,
  AaveV3Avalanche,
  AaveV3BNB,
  AaveV3Base,
  AaveV3Celo,
  AaveV3Ethereum,
  AaveV3EthereumEtherFi,
  AaveV3EthereumHorizon,
  AaveV3EthereumLido,
  AaveV3Gnosis,
  AaveV3InkWhitelabel,
  AaveV3Linea,
  AaveV3Mantle,
  AaveV3Metis,
  AaveV3Optimism,
  AaveV3Polygon,
  AaveV3Scroll,
  AaveV3Soneium,
  AaveV3Sonic,
  AaveV3ZkSync,
} from '@bgd-labs/aave-address-book'

export type PublicMarket = {
  id: string
  protocolId: string
  name: string
  chainId: number | null
}

export type AaveMarketConfig = PublicMarket & {
  chainId: number
  pool: string
  poolAddressesProvider: string
  uiPoolDataProvider: string
  ghoAssetIds: string[]
  rpcUrl: string
}

const RPC_URLS: Record<number, string> = {
  1: 'https://ethereum.publicnode.com',
  10: 'https://optimism.publicnode.com',
  56: 'https://bsc.publicnode.com',
  100: 'https://gnosis.publicnode.com',
  137: 'https://polygon-bor.publicnode.com',
  146: 'https://sonic.publicnode.com',
  324: 'https://mainnet.era.zksync.io',
  1088: 'https://andromeda.metis.io/?owner=1088',
  1868: 'https://rpc.soneium.org',
  5000: 'https://rpc.mantle.xyz',
  8453: 'https://base.publicnode.com',
  42161: 'https://arbitrum-one.publicnode.com',
  42220: 'https://forno.celo.org',
  43114: 'https://avalanche-c-chain.publicnode.com',
  534352: 'https://scroll.publicnode.com',
  57073: 'https://rpc-gel.inkonchain.com',
  59144: 'https://rpc.linea.build',
}

type BookMarket = {
  CHAIN_ID: number
  POOL: string
  POOL_ADDRESSES_PROVIDER: string
  UI_POOL_DATA_PROVIDER: string
  ASSETS: object
}

const ZERO = '0x0000000000000000000000000000000000000000'

const aaveBooks: Array<{ id: string; name: string; book: BookMarket }> = [
  { id: 'aave-v3-ethereum', name: 'Ethereum', book: AaveV3Ethereum },
  { id: 'aave-v3-ethereum-prime', name: 'Ethereum Prime', book: AaveV3EthereumLido },
  { id: 'aave-v3-ethereum-etherfi', name: 'Ethereum EtherFi', book: AaveV3EthereumEtherFi },
  { id: 'aave-v3-ethereum-horizon', name: 'Ethereum Horizon', book: AaveV3EthereumHorizon },
  { id: 'aave-v3-arbitrum', name: 'Arbitrum', book: AaveV3Arbitrum },
  { id: 'aave-v3-optimism', name: 'Optimism', book: AaveV3Optimism },
  { id: 'aave-v3-polygon', name: 'Polygon', book: AaveV3Polygon },
  { id: 'aave-v3-avalanche', name: 'Avalanche', book: AaveV3Avalanche },
  { id: 'aave-v3-base', name: 'Base', book: AaveV3Base },
  { id: 'aave-v3-gnosis', name: 'Gnosis', book: AaveV3Gnosis },
  { id: 'aave-v3-bnb', name: 'BNB', book: AaveV3BNB },
  { id: 'aave-v3-scroll', name: 'Scroll', book: AaveV3Scroll },
  { id: 'aave-v3-metis', name: 'Metis', book: AaveV3Metis },
  { id: 'aave-v3-linea', name: 'Linea', book: AaveV3Linea },
  { id: 'aave-v3-sonic', name: 'Sonic', book: AaveV3Sonic },
  { id: 'aave-v3-celo', name: 'Celo', book: AaveV3Celo },
  { id: 'aave-v3-mantle', name: 'Mantle', book: AaveV3Mantle },
  { id: 'aave-v3-zksync', name: 'zkSync', book: AaveV3ZkSync },
  { id: 'aave-v3-soneium', name: 'Soneium', book: AaveV3Soneium },
  { id: 'aave-v3-ink', name: 'Ink', book: AaveV3InkWhitelabel },
]

function ghoAssetIds(assets: object): string[] {
  if (!('GHO' in assets)) return []
  const underlying = (assets as { GHO?: { UNDERLYING?: string } }).GHO?.UNDERLYING
  return underlying ? [underlying.toLowerCase()] : []
}

function toAaveMarket(entry: { id: string; name: string; book: BookMarket }): AaveMarketConfig | null {
  const rpcUrl = RPC_URLS[entry.book.CHAIN_ID]
  if (!rpcUrl) return null
  if (entry.book.UI_POOL_DATA_PROVIDER.toLowerCase() === ZERO) return null
  return {
    id: entry.id,
    protocolId: 'aave-v3',
    name: entry.name,
    chainId: entry.book.CHAIN_ID,
    pool: entry.book.POOL,
    poolAddressesProvider: entry.book.POOL_ADDRESSES_PROVIDER,
    uiPoolDataProvider: entry.book.UI_POOL_DATA_PROVIDER,
    ghoAssetIds: ghoAssetIds(entry.book.ASSETS),
    rpcUrl,
  }
}

export const aaveMarkets: AaveMarketConfig[] = aaveBooks
  .map(toAaveMarket)
  .filter((market): market is AaveMarketConfig => market !== null)

export const hyperliquidMarket: PublicMarket = {
  id: 'hyperliquid-mainnet',
  protocolId: 'hyperliquid',
  name: 'HyperCore',
  chainId: null,
}

export function publicMarkets(): PublicMarket[] {
  return [
    ...aaveMarkets.map(({ id, protocolId, name, chainId }) => ({ id, protocolId, name, chainId })),
    hyperliquidMarket,
  ]
}

export function aaveMarketById(id: string): AaveMarketConfig | undefined {
  return aaveMarkets.find((market) => market.id === id)
}
