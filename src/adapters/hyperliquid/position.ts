import { hyperliquidHealthAgrees, normalizeHyperliquidHealth } from '../../domain/compare.ts'
import { emptyEdits, type HyperliquidSnapshot, type Position } from '../../domain/types.ts'
import { evaluateHyperliquid } from './simulate.ts'

export function buildHyperliquidPosition(args: {
  marketId: string
  user: string | null
  snapshot: HyperliquidSnapshot
  protocolHealthFactor: string | null
  checkProtocol: boolean
}): Position {
  const evaluation = evaluateHyperliquid(args.snapshot, emptyEdits())
  return {
    protocolId: 'hyperliquid',
    marketId: args.marketId,
    user: args.user,
    assets: evaluation.assets,
    healthUnit: 'percent',
    protocolHealthFactor: args.checkProtocol
      ? normalizeHyperliquidHealth(evaluation.rawHealthFactor, args.protocolHealthFactor)
      : null,
    modelHealthFactor: evaluation.result.healthFactor,
    verified: args.checkProtocol
      ? hyperliquidHealthAgrees(evaluation.rawHealthFactor, args.protocolHealthFactor)
      : null,
    snapshot: args.snapshot,
  }
}
