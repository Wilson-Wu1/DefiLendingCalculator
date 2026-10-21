import { describe, expect, it } from 'vitest'
import type { Market } from '../domain/types.ts'
import { marketPath, resolveRoute } from './route.ts'

const markets: Market[] = [
  { id: 'aave-v3-ethereum', protocolId: 'aave-v3', name: 'Ethereum', chainId: 1 },
  { id: 'aave-v3-ethereum-prime', protocolId: 'aave-v3', name: 'Ethereum Prime', chainId: 1 },
  { id: 'aave-v3-arbitrum', protocolId: 'aave-v3', name: 'Arbitrum', chainId: 42161 },
  { id: 'aave-v3-zksync', protocolId: 'aave-v3', name: 'zkSync', chainId: 324 },
  { id: 'hyperliquid-mainnet', protocolId: 'hyperliquid', name: 'HyperCore', chainId: null },
]

describe('market paths', () => {
  it('builds a path from the protocol and market', () => {
    expect(marketPath('hyperliquid', 'HyperCore')).toBe('/hyperliquid/hypercore')
    expect(marketPath('aave-v3', 'Ethereum')).toBe('/aave/v3/ethereum')
    expect(marketPath('aave-v3', 'Ethereum Prime')).toBe('/aave/v3/ethereum-prime')
    expect(marketPath('aave-v3', 'zkSync')).toBe('/aave/v3/zksync')
    expect(marketPath('aave-v3', 'Ethereum', 'markets')).toBe('/aave/v3/ethereum/markets')
    expect(marketPath('hyperliquid', 'HyperCore', 'markets')).toBe('/hyperliquid/hypercore/markets')
    expect(marketPath('aave-v3', 'Ethereum', 'calculator')).toBe('/aave/v3/ethereum')
  })

  it('reads a protocol and market back from the path', () => {
    expect(resolveRoute('/hyperliquid/hypercore', markets)).toMatchObject({
      protocolId: 'hyperliquid',
      marketId: 'hyperliquid-mainnet',
      canonical: '/hyperliquid/hypercore',
    })
    expect(resolveRoute('/aave/v3/arbitrum', markets)).toMatchObject({
      protocolId: 'aave-v3',
      marketId: 'aave-v3-arbitrum',
      view: 'calculator',
      canonical: '/aave/v3/arbitrum',
    })
    expect(resolveRoute('/aave/v3/ethereum/markets', markets)).toMatchObject({
      protocolId: 'aave-v3',
      marketId: 'aave-v3-ethereum',
      view: 'markets',
      canonical: '/aave/v3/ethereum/markets',
    })
    expect(resolveRoute('/hyperliquid/hypercore/markets', markets)).toMatchObject({
      protocolId: 'hyperliquid',
      marketId: 'hyperliquid-mainnet',
      view: 'markets',
      canonical: '/hyperliquid/hypercore/markets',
    })
  })

  it('fills in the first market when the path names only the protocol', () => {
    expect(resolveRoute('/aave/v3', markets)).toMatchObject({
      protocolId: 'aave-v3',
      marketId: 'aave-v3-ethereum',
      canonical: '/aave/v3/ethereum',
    })
    expect(resolveRoute('/hyperliquid', markets).canonical).toBe('/hyperliquid/hypercore')
  })

  it('falls back to Aave Ethereum for an unknown path', () => {
    expect(resolveRoute('/', markets).canonical).toBe('/aave/v3/ethereum')
    expect(resolveRoute('/aave/v3/missing', markets).canonical).toBe('/aave/v3/ethereum')
    expect(
      resolveRoute('/aave/v3/optimism', [
        ...markets,
        { id: 'aave-v3-optimism', protocolId: 'aave-v3', name: 'Optimism', chainId: 10, disabled: true },
      ]).canonical,
    ).toBe('/aave/v3/ethereum')
  })

  it('drops an unknown view back to the calculator for that market', () => {
    expect(resolveRoute('/aave/v3/arbitrum/nope', markets)).toMatchObject({
      marketId: 'aave-v3-arbitrum',
      view: 'calculator',
      canonical: '/aave/v3/arbitrum',
    })
    expect(resolveRoute('/hyperliquid/hypercore/markets/extra', markets).canonical).toBe(
      '/hyperliquid/hypercore',
    )
  })
})
