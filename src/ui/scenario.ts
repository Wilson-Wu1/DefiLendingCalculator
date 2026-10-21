import { bn, formatRate } from '../domain/numbers.ts'
import type { Edits, Position } from '../domain/types.ts'

export type ScenarioRow = {
  assetId: string
  symbol: string
  supplied: string
  borrowed: string
  priceUsd: string
  protocolPriceUsd: string
  liquidationThreshold: number | null
  protocolLiquidationThreshold: number | null
  supplyUsd: string
  borrowUsd: string
  marketSizeUsd: string | null
  supplyApy: string | null
  borrowApy: string | null
  /** Collateral loan-to-value as a fraction. Null when this asset has no LTV. */
  ltv: string | null
  usageAsCollateral: boolean
  frozen: boolean
  showThreshold: boolean
}

export function scenarioRows(position: Position, edits: Edits): ScenarioRow[] {
  return position.assets.map((asset) => {
    const priceUsd = edits.priceUsdByAsset[asset.assetId] ?? asset.priceUsd
    const supplied = edits.suppliedByAsset[asset.assetId] ?? asset.supplied
    const borrowed = edits.borrowedByAsset[asset.assetId] ?? asset.borrowed
    const thresholdEdit = edits.liquidationThresholdByAsset[asset.assetId]
    const liquidationThreshold =
      thresholdEdit === undefined ? asset.liquidationThreshold : Number(thresholdEdit)
    const price = bn(priceUsd)
    return {
      assetId: asset.assetId,
      symbol: asset.symbol,
      supplied,
      borrowed,
      priceUsd,
      protocolPriceUsd: asset.priceUsd,
      liquidationThreshold: Number.isFinite(liquidationThreshold) ? liquidationThreshold : null,
      protocolLiquidationThreshold:
        asset.liquidationThreshold !== null && Number.isFinite(asset.liquidationThreshold)
          ? asset.liquidationThreshold
          : null,
      supplyUsd: price.multipliedBy(bn(supplied)).toFixed(),
      borrowUsd: price.multipliedBy(bn(borrowed)).toFixed(),
      marketSizeUsd: asset.marketSizeUsd,
      supplyApy: asset.supplyApy,
      borrowApy: asset.borrowApy,
      ltv: asset.ltv,
      usageAsCollateral: asset.usageAsCollateral,
      frozen: asset.frozen,
      showThreshold: asset.liquidationThreshold !== null || thresholdEdit !== undefined,
    }
  })
}

export type SupplyRatePart = {
  kind: 'apy' | 'ltv'
  /** Formatted percent, such as "5.00%". */
  value: string
  label: 'APY' | 'LTV'
}

/**
 * Supply-side rate caption. Collateral LTV is included only when the asset reports one,
 * so an asset without LTV stays APY-only and does not leave an empty divider.
 */
export function rateExplanation(kind: 'apy' | 'ltv', side: 'supply' | 'borrow'): string {
  if (kind === 'ltv') return 'Loan-to-value. How much can be borrowed against this asset.'
  return side === 'borrow'
    ? 'Annual percentage yield charged on the amount borrowed.'
    : 'Annual percentage yield earned on the amount supplied.'
}

export function supplyRateParts(apy: string | null, ltv: string | null): SupplyRatePart[] {
  const parts: SupplyRatePart[] = []
  if (apy !== null) parts.push({ kind: 'apy', value: formatRate(apy), label: 'APY' })
  if (ltv !== null) parts.push({ kind: 'ltv', value: formatRate(ltv), label: 'LTV' })
  return parts
}

/** Largest market size first. Assets without a size stay in symbol order. */
export function compareByMarketSize(
  a: { symbol: string; marketSizeUsd: string | null },
  b: { symbol: string; marketSizeUsd: string | null },
): number {
  if (a.marketSizeUsd !== null && b.marketSizeUsd !== null) {
    const diff = bn(b.marketSizeUsd).minus(bn(a.marketSizeUsd))
    if (!diff.isZero()) return diff.gt(0) ? 1 : -1
  }
  return a.symbol.localeCompare(b.symbol)
}

export type NetYield = {
  /** Yearly supply interest minus yearly borrow interest, in USD. */
  yearlyUsd: string | null
  /** Yearly USD divided by net worth. Null when net worth is not positive. */
  apy: string | null
}

export function netYield(rows: ScenarioRow[], netWorthUsd: string): NetYield {
  let yearly = bn(0)
  let sawRate = false
  for (const row of rows) {
    if (row.supplyApy !== null) {
      yearly = yearly.plus(bn(row.supplyUsd).multipliedBy(row.supplyApy))
      sawRate = true
    }
    if (row.borrowApy !== null) {
      yearly = yearly.minus(bn(row.borrowUsd).multipliedBy(row.borrowApy))
      sawRate = true
    }
  }
  if (!sawRate) return { yearlyUsd: null, apy: null }
  const worth = bn(netWorthUsd)
  const yearlyUsd = yearly.toFixed()
  return {
    yearlyUsd,
    apy: worth.gt(0) ? yearly.dividedBy(worth).toFixed() : null,
  }
}
