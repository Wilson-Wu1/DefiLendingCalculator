import { describe, expect, it } from 'vitest'
import type { HyperliquidSnapshot, Position } from '../domain/types.ts'
import { hyperliquidAccountLabel } from './accountMode.ts'

function position(mode: HyperliquidSnapshot['accountMode'], user: string | null): Position {
  return {
    protocolId: 'hyperliquid',
    marketId: 'hyperliquid',
    user,
    assets: [],
    healthUnit: 'percent',
    protocolHealthFactor: null,
    modelHealthFactor: null,
    verified: null,
    snapshot: {
      kind: 'hyperliquid',
      reserves: [],
      balances: [],
      accountMode: mode,
    },
  }
}

describe('hyperliquid account label', () => {
  it('names the three account modes', () => {
    expect(hyperliquidAccountLabel(position('unifiedAccount', '0xabc'))).toBe('Unified')
    expect(hyperliquidAccountLabel(position('portfolioMargin', '0xabc'))).toBe('Portfolio margin')
    expect(hyperliquidAccountLabel(position('default', '0xabc'))).toBe('Manual')
    expect(hyperliquidAccountLabel(position('disabled', '0xabc'))).toBe('Manual')
  })

  it('stays hidden when no wallet is loaded', () => {
    expect(hyperliquidAccountLabel(position(null, null))).toBeNull()
    expect(hyperliquidAccountLabel(null)).toBeNull()
  })
})
