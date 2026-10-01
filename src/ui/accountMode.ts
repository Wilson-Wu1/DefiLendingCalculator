import type { HyperliquidAccountMode, Position } from '../domain/types.ts'

const LABELS: Record<HyperliquidAccountMode, string> = {
  unifiedAccount: 'Unified',
  portfolioMargin: 'Portfolio margin',
  disabled: 'Manual',
  default: 'Manual',
  dexAbstraction: 'DEX abstraction',
}

/** Display name for a loaded Hyperliquid wallet. Null for other protocols and blank scenarios. */
export function hyperliquidAccountLabel(position: Position | null): string | null {
  if (!position?.user || position.snapshot.kind !== 'hyperliquid') return null
  const mode = position.snapshot.accountMode
  if (!mode) return 'Unknown'
  return LABELS[mode]
}
