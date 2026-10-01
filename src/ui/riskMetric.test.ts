import { describe, expect, it } from 'vitest'
import type { Result } from '../domain/types.ts'
import { isLiquidated, thirdMetric } from './riskMetric.ts'

function priced(): Result {
  return {
    healthFactor: '148.95',
    netWorthUsd: '51780',
    borrowUsage: '0.67',
    liquidationPrice: { assetId: '150', symbol: 'HYPE', priceUsd: '48.484848' },
    healthUnit: 'percent',
    liquidationHealthPercent: 78.787878,
    liquidationBuffer: '0.47',
  }
}

describe('Hyperliquid risk metric', () => {
  it('keeps the liquidation price for accounts that are not portfolio margin', () => {
    const metric = thirdMetric(priced(), 'percent', false)
    expect(metric.label).toBe('HYPE liquidation price')
    expect(metric.note).toBe('Price of the only collateral asset at which this position can be liquidated.')
  })

  it('labels the same price as a borrow threshold for portfolio margin', () => {
    const metric = thirdMetric(priced(), 'percent', true)
    expect(metric.label).toBe('HYPE borrow threshold')
    expect(metric.value).toBe(thirdMetric(priced(), 'percent', false).value)
    expect(metric.note).toContain('borrow threshold')
    expect(metric.note).toContain('perpetual margin')
  })

  it('relabels the multi-collateral buffer for portfolio margin', () => {
    const mixed: Result = { ...priced(), liquidationPrice: null }
    const metric = thirdMetric(mixed, 'percent', true)
    expect(metric.label).toBe('Away from borrow threshold')
    expect(metric.note).toContain('perpetual margin')
    expect(thirdMetric(mixed, 'percent', false).label).toBe('Away from liquidation')
  })
})

describe('isLiquidated', () => {
  it('is false while there is still room', () => {
    expect(isLiquidated(priced(), '91.78')).toBe(false)
  })

  it('is true when away from liquidation is 0% or worse', () => {
    expect(isLiquidated({ ...priced(), liquidationBuffer: '0', liquidationPrice: null }, null)).toBe(true)
    expect(isLiquidated({ ...priced(), liquidationBuffer: '-0.12', liquidationPrice: null }, null)).toBe(true)
  })

  it('is true when the collateral price has reached the liquidation price', () => {
    expect(isLiquidated(priced(), '48.484848')).toBe(true)
    expect(isLiquidated(priced(), '40')).toBe(true)
  })
})
