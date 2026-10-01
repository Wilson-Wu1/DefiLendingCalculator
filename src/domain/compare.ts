import { bn, MAX_UINT256 } from './numbers.ts'

/** Local Aave health factor uses "-1" for no debt. The pool uses max uint256. */
export function aaveHealthAgrees(local: string, protocolWad: string): boolean {
  const localInfinite = local === '-1' || bn(local).lt(0) || !bn(local).isFinite()
  const protocolInfinite = protocolWad === MAX_UINT256
  if (localInfinite || protocolInfinite) return localInfinite && protocolInfinite

  const protocol = bn(protocolWad).shiftedBy(-18)
  const model = bn(local)
  const diff = protocol.minus(model).abs()
  const scale = protocol.abs().gte(1) ? protocol.abs() : bn(1)
  return diff.dividedBy(scale).lte(0.005) || diff.lte(0.01)
}

/**
 * Hyperliquid's info endpoint returns a health factor string, or null when there
 * is no borrow. The published formula is a percentage, so a value near 1.5 and
 * a value near 150 can both mean the same position.
 */
export function hyperliquidHealthAgrees(
  localPercent: string | null,
  protocolValue: string | null,
): boolean {
  if (protocolValue === null || protocolValue === '') return localPercent === null
  if (localPercent === null) return false
  const reported = bn(protocolValue.replace('%', ''))
  const local = bn(localPercent)
  if (!reported.isFinite()) return false
  return close(local, reported) || close(local, reported.multipliedBy(100))
}

function close(local: ReturnType<typeof bn>, reported: ReturnType<typeof bn>): boolean {
  const diff = local.minus(reported).abs()
  const scale = local.abs().gt(1) ? local.abs() : bn(1)
  return diff.dividedBy(scale).lte(0.01) || diff.lte(0.05)
}

/** Protocol health factor expressed in the same percent units as the local model. */
export function normalizeHyperliquidHealth(
  localPercent: string | null,
  protocolValue: string | null,
): string | null {
  if (protocolValue === null || protocolValue === '') return null
  const reported = bn(protocolValue.replace('%', ''))
  if (!reported.isFinite()) return null
  if (localPercent !== null && close(bn(localPercent), reported.multipliedBy(100))) {
    return reported.multipliedBy(100).toFixed()
  }
  return reported.toFixed()
}
