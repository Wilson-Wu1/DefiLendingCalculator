import { aaveHealthAgrees } from '../../domain/compare.ts'
import { bn, MAX_UINT256 } from '../../domain/numbers.ts'
import { emptyEdits, type AaveSnapshot, type Position } from '../../domain/types.ts'
import { evaluateAave } from './simulate.ts'

export function buildAavePosition(args: {
  marketId: string
  user: string | null
  snapshot: AaveSnapshot
  protocolHealthFactorWad: string | null
}): Position {
  const evaluation = evaluateAave(args.snapshot, emptyEdits())
  const checked = args.protocolHealthFactorWad !== null
  return {
    protocolId: 'aave-v3',
    marketId: args.marketId,
    user: args.user,
    assets: evaluation.assets,
    healthUnit: 'ratio',
    protocolHealthFactor: checked ? wadToHealth(args.protocolHealthFactorWad!) : null,
    modelHealthFactor: evaluation.result.healthFactor,
    verified: checked ? aaveHealthAgrees(evaluation.rawHealthFactor, args.protocolHealthFactorWad!) : null,
    snapshot: args.snapshot,
  }
}

function wadToHealth(wad: string): string | null {
  if (wad === MAX_UINT256) return null
  const value = bn(wad).shiftedBy(-18)
  if (!value.isFinite() || value.lt(0)) return null
  return value.toFixed()
}
