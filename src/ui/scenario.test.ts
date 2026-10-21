import { describe, expect, it } from 'vitest'
import { emptyEdits, type AssetState, type Position } from '../domain/types.ts'
import type { ScenarioRow } from './scenario.ts'
import { compareByMarketSize, netYield, scenarioRows, supplyRateParts } from './scenario.ts'

describe('compareByMarketSize', () => {
  it('orders known market sizes from largest to smallest', () => {
    const assets = [
      { symbol: 'WETH', marketSizeUsd: '20000' },
      { symbol: 'USDC', marketSizeUsd: '58000' },
      { symbol: 'AAVE', marketSizeUsd: '20000' },
    ]
    expect(assets.sort(compareByMarketSize).map((asset) => asset.symbol)).toEqual([
      'USDC',
      'AAVE',
      'WETH',
    ])
  })

  it('keeps assets without a market size in symbol order', () => {
    const assets = [
      { symbol: 'HYPE', marketSizeUsd: null },
      { symbol: 'BTC', marketSizeUsd: null },
    ]
    expect(assets.sort(compareByMarketSize).map((asset) => asset.symbol)).toEqual(['BTC', 'HYPE'])
  })
})

function row(partial: Pick<ScenarioRow, 'supplyUsd' | 'borrowUsd' | 'supplyApy' | 'borrowApy'>): ScenarioRow {
  return {
    assetId: 'asset',
    symbol: 'ASSET',
    supplied: '0',
    borrowed: '0',
    priceUsd: '1',
    protocolPriceUsd: '1',
    liquidationThreshold: null,
    protocolLiquidationThreshold: null,
    marketSizeUsd: null,
    ltv: null,
    usageAsCollateral: false,
    frozen: false,
    showThreshold: false,
    ...partial,
  }
}

describe('netYield', () => {
  it('subtracts borrow cost from supply yield and divides by net worth', () => {
    const result = netYield(
      [
        row({ supplyUsd: '10000', borrowUsd: '0', supplyApy: '0.05', borrowApy: '0.1' }),
        row({ supplyUsd: '0', borrowUsd: '4000', supplyApy: '0.01', borrowApy: '0.08' }),
      ],
      '6000',
    )
    expect(Number(result.yearlyUsd)).toBeCloseTo(10000 * 0.05 - 4000 * 0.08, 6)
    expect(Number(result.apy)).toBeCloseTo((500 - 320) / 6000, 6)
  })

  it('keeps the dollar amount and omits the rate when net worth is not positive', () => {
    const flat = netYield(
      [row({ supplyUsd: '1000', borrowUsd: '1000', supplyApy: '0.04', borrowApy: '0.06' })],
      '0',
    )
    expect(Number(flat.yearlyUsd)).toBeCloseTo(1000 * 0.04 - 1000 * 0.06, 6)
    expect(flat.apy).toBeNull()

    const underwater = netYield(
      [row({ supplyUsd: '1000', borrowUsd: '2000', supplyApy: '0.04', borrowApy: '0.06' })],
      '-1000',
    )
    expect(Number(underwater.yearlyUsd)).toBeCloseTo(1000 * 0.04 - 2000 * 0.06, 6)
    expect(underwater.apy).toBeNull()
  })

  it('returns nothing when no asset reports a rate', () => {
    expect(
      netYield([row({ supplyUsd: '1000', borrowUsd: '0', supplyApy: null, borrowApy: null })], '1000'),
    ).toEqual({ yearlyUsd: null, apy: null })
  })
})

describe('supplyRateParts', () => {
  it('places collateral LTV to the right of supply APY', () => {
    expect(supplyRateParts('0.05', '0.8')).toEqual([
      { kind: 'apy', value: '5.00%', label: 'APY' },
      { kind: 'ltv', value: '80.00%', label: 'LTV' },
    ])
  })

  it('omits LTV when the asset is not collateral', () => {
    expect(supplyRateParts('0.0214', null)).toEqual([{ kind: 'apy', value: '2.14%', label: 'APY' }])
  })

  it('shows LTV alone when supply APY is not reported', () => {
    expect(supplyRateParts(null, '0.65')).toEqual([{ kind: 'ltv', value: '65.00%', label: 'LTV' }])
  })

  it('returns nothing when neither rate is reported', () => {
    expect(supplyRateParts(null, null)).toEqual([])
  })
})

describe('scenarioRows', () => {
  it('carries collateral LTV onto the row and leaves it empty when absent', () => {
    const [withLtv] = scenarioRows(position('0.65'), emptyEdits())
    const [without] = scenarioRows(position(null), emptyEdits())
    expect(withLtv?.ltv).toBe('0.65')
    expect(without?.ltv).toBeNull()
  })
})

function position(ltv: string | null): Position {
  const asset: AssetState = {
    assetId: '150',
    symbol: 'HYPE',
    decimals: 8,
    supplied: '1',
    borrowed: '0',
    priceUsd: '10',
    totalSupplied: null,
    totalBorrowed: null,
    marketSizeUsd: null,
    totalBorrowedUsd: null,
    supplyApy: '0.02',
    borrowApy: '0.04',
    ltv,
    liquidationThreshold: 0.825,
    usageAsCollateral: ltv !== null,
    frozen: false,
    borrowingEnabled: true,
    canBeCollateral: ltv !== null,
  }
  return {
    protocolId: 'hyperliquid',
    marketId: 'hyperliquid-mainnet',
    user: null,
    assets: [asset],
    healthUnit: 'percent',
    protocolHealthFactor: null,
    modelHealthFactor: null,
    verified: null,
    snapshot: { kind: 'hyperliquid', reserves: [], balances: [], accountMode: null },
  }
}
