const CHAIN_SLUG: Record<number, string> = {
  1: 'ethereum',
  10: 'optimism',
  56: 'bsc',
  100: 'gnosis',
  137: 'polygon',
  146: 'sonic',
  324: 'zksync-era',
  1088: 'metis',
  1868: 'soneium',
  5000: 'mantle',
  8453: 'base',
  42161: 'arbitrum',
  42220: 'celo',
  43114: 'avalanche',
  534352: 'scroll',
  57073: 'ink',
  59144: 'linea',
}

const HYPERLIQUID_TOKEN: Record<string, string> = {
  HYPE: 'https://icons.llamao.fi/icons/protocols/hyperliquid',
  UBTC: tokenByAddress(1, '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'),
  USDC: tokenByAddress(1, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'),
  USDH: '/usdh.png',
  USDT0: tokenByAddress(1, '0xdac17f958d2ee523a2206206994597c13d831ec7'),
}

export function protocolIconUrl(protocolId: string): string | null {
  if (protocolId === 'aave-v3') return 'https://icons.llamao.fi/icons/protocols/aave-v3'
  if (protocolId === 'hyperliquid') return 'https://icons.llamao.fi/icons/protocols/hyperliquid'
  return null
}

export function chainIconUrl(chainId: number | null): string | null {
  if (chainId == null) return protocolIconUrl('hyperliquid')
  const slug = CHAIN_SLUG[chainId]
  if (!slug) return null
  return `https://icons.llamao.fi/icons/chains/rsz_${slug}.jpg`
}

const SYMBOL_ICON: Record<string, string> = {
  link: '/link.png',
  syrupusdt: '/syrupusdt.png',
}

export function tokenIconUrl(args: {
  protocolId: string
  chainId: number | null
  assetId: string
  symbol: string
}): string | null {
  const symbol = args.symbol.toLowerCase()
  const override = SYMBOL_ICON[symbol] ?? (symbol.startsWith('pt-usde') ? '/pt-usde.png' : null)
  if (override) return override
  if (args.protocolId === 'hyperliquid') return HYPERLIQUID_TOKEN[args.symbol] ?? null
  if (args.chainId == null || !args.assetId.startsWith('0x')) return null
  return tokenByAddress(args.chainId, args.assetId)
}

function tokenByAddress(chainId: number, address: string): string {
  return `https://assets.smold.app/api/token/${chainId}/${address.toLowerCase()}/logo.svg`
}
