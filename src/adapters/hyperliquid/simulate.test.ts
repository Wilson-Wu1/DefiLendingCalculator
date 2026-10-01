import { describe, expect, it } from 'vitest'
import { emptyEdits } from '../../domain/types.ts'
import type { HyperliquidSnapshot } from '../../domain/types.ts'
import { evaluateHyperliquid } from './simulate.ts'

function snapshot(): HyperliquidSnapshot {
  return {
    kind: 'hyperliquid',
    accountMode: null,
    reserves: [
      { tokenIndex: 0, symbol: 'USDC', oraclePx: '1', ltv: '0', supplyYearlyRate: '0.01', borrowYearlyRate: '0.05' },
      { tokenIndex: 150, symbol: 'HYPE', oraclePx: '91.78', ltv: '0.65', supplyYearlyRate: '0.02', borrowYearlyRate: '0.04' },
      { tokenIndex: 197, symbol: 'UBTC', oraclePx: '80905', ltv: '0.5', supplyYearlyRate: '0', borrowYearlyRate: '0.03' },
    ],
    balances: [
      { tokenIndex: 150, supply: '1000', borrow: '0' },
      { tokenIndex: 0, supply: '0', borrow: '40000' },
    ],
  }
}

describe('Hyperliquid simulate', () => {
  it('uses LTV-weighted collateral over borrowed value, as a percentage', () => {
    const result = evaluateHyperliquid(snapshot(), emptyEdits())
    const weighted = 1000 * 91.78 * 0.65
    expect(Number(result.result.healthFactor)).toBeCloseTo((weighted / 40000) * 100, 4)
    expect(result.result.healthUnit).toBe('percent')
  })

  it('does not let quote-asset supply increase borrow capacity', () => {
    const withQuote = structuredClone(snapshot())
    withQuote.balances.push({ tokenIndex: 0, supply: '10000', borrow: '40000' })
    withQuote.balances = withQuote.balances.filter((balance, index, all) => {
      return all.findIndex((entry) => entry.tokenIndex === balance.tokenIndex) === index
    })
    const quote = withQuote.balances.find((balance) => balance.tokenIndex === 0)
    if (quote) quote.supply = '10000'
    const base = evaluateHyperliquid(snapshot(), emptyEdits())
    const supplied = evaluateHyperliquid(withQuote, emptyEdits())
    expect(Number(supplied.result.healthFactor)).toBeCloseTo(Number(base.result.healthFactor), 6)
    expect(Number(supplied.result.netWorthUsd)).toBeCloseTo(Number(base.result.netWorthUsd) + 10000, 2)
  })

  it('derives the liquidation price from (1 + LTV) / 2', () => {
    const hype = evaluateHyperliquid(snapshot(), emptyEdits())
    expect(hype.result.liquidationPrice?.symbol).toBe('HYPE')
    expect(Number(hype.result.liquidationPrice?.priceUsd)).toBeCloseTo(40000 / (1000 * 0.825), 4)
    expect(hype.result.liquidationHealthPercent).toBeCloseTo((0.65 / 0.825) * 100, 4)

    const btc = evaluateHyperliquid(
      {
        kind: 'hyperliquid',
        accountMode: null,
        reserves: snapshot().reserves,
        balances: [
          { tokenIndex: 197, supply: '0.5', borrow: '0' },
          { tokenIndex: 0, supply: '0', borrow: '10000' },
        ],
      },
      emptyEdits(),
    )
    expect(btc.result.liquidationPrice?.symbol).toBe('UBTC')
    expect(Number(btc.result.liquidationPrice?.priceUsd)).toBeCloseTo(10000 / (0.5 * 0.75), 2)
    expect(Number(btc.result.healthFactor)).toBeCloseTo(((0.5 * 80905 * 0.5) / 10000) * 100, 2)
  })

  it('does not invent one liquidation price when two collateral assets are supplied', () => {
    const mixed = evaluateHyperliquid(
      {
        kind: 'hyperliquid',
        accountMode: null,
        reserves: snapshot().reserves,
        balances: [
          { tokenIndex: 150, supply: '1000', borrow: '0' },
          { tokenIndex: 197, supply: '0.5', borrow: '0' },
          { tokenIndex: 0, supply: '0', borrow: '40000' },
        ],
      },
      emptyEdits(),
    )
    expect(mixed.result.liquidationPrice).toBeNull()
    expect(mixed.result.borrowUsage).not.toBeNull()
    const liquidationWeighted = 1000 * 91.78 * 0.825 + 0.5 * 80905 * 0.75
    expect(Number(mixed.result.liquidationBuffer)).toBeCloseTo(1 - 40000 / liquidationWeighted, 6)
  })

  it('keeps a liquidation buffer at the borrow cap, below the health factor', () => {
    const atCap = evaluateHyperliquid(snapshot(), {
      ...emptyEdits(),
      borrowedByAsset: { '0': String(1000 * 91.78 * 0.65) },
    })
    expect(Number(atCap.result.healthFactor)).toBeCloseTo(100, 4)
    expect(Number(atCap.result.liquidationBuffer)).toBeCloseTo(1 - 0.65 / 0.825, 6)
  })

  it('lets a threshold override move the liquidation price and not the health factor', () => {
    const base = evaluateHyperliquid(snapshot(), emptyEdits())
    const edited = evaluateHyperliquid(snapshot(), {
      ...emptyEdits(),
      liquidationThresholdByAsset: { '150': '0.9' },
    })
    expect(Number(edited.result.healthFactor)).toBeCloseTo(Number(base.result.healthFactor), 6)
    expect(Number(edited.result.liquidationPrice?.priceUsd)).toBeCloseTo(40000 / (1000 * 0.9), 4)
  })

  it('keeps the protocol yearly supply and borrow rates', () => {
    const result = evaluateHyperliquid(snapshot(), emptyEdits())
    const hype = result.assets.find((asset) => asset.symbol === 'HYPE')
    const usdc = result.assets.find((asset) => asset.symbol === 'USDC')
    expect(hype?.supplyApy).toBe('0.02')
    expect(hype?.borrowApy).toBe('0.04')
    expect(usdc?.borrowApy).toBe('0.05')
  })

  it('returns no health factor when nothing is borrowed', () => {
    const result = evaluateHyperliquid(
      {
        kind: 'hyperliquid',
        accountMode: null,
        reserves: snapshot().reserves,
        balances: [{ tokenIndex: 150, supply: '10', borrow: '0' }],
      },
      emptyEdits(),
    )
    expect(result.rawHealthFactor).toBeNull()
    expect(result.result.healthFactor).toBeNull()
    expect(result.result.liquidationPrice).toBeNull()
    expect(result.result.liquidationBuffer).toBeNull()
  })
})
