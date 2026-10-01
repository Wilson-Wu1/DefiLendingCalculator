import { bn } from '../../domain/numbers.ts'
import type {
  AssetState,
  Edits,
  HyperliquidSnapshot,
  Result,
} from '../../domain/types.ts'

export type HyperliquidEvaluation = {
  result: Result
  assets: AssetState[]
  /** Health factor as a percent string, or null when there is no debt. */
  rawHealthFactor: string | null
}

export function evaluateHyperliquid(snapshot: HyperliquidSnapshot, edits: Edits): HyperliquidEvaluation {
  const assets = snapshot.reserves.map((reserve) => {
    const assetId = String(reserve.tokenIndex)
    const balance = snapshot.balances.find((entry) => entry.tokenIndex === reserve.tokenIndex)
    const ltv = bn(reserve.ltv)
    const defaultThreshold = ltv.plus(1).dividedBy(2)
    const thresholdOverride = edits.liquidationThresholdByAsset[assetId]
    const threshold = thresholdOverride === undefined ? defaultThreshold : bn(thresholdOverride)
    const price = edits.priceUsdByAsset[assetId] ?? reserve.oraclePx
    const supplied = edits.suppliedByAsset[assetId] ?? balance?.supply ?? '0'
    const borrowed = edits.borrowedByAsset[assetId] ?? balance?.borrow ?? '0'
    return {
      assetId,
      symbol: reserve.symbol,
      decimals: 8,
      supplied: bn(supplied).toFixed(),
      borrowed: bn(borrowed).toFixed(),
      priceUsd: bn(price).toFixed(),
      marketSizeUsd: null,
      supplyApy: yearlyRate(reserve.supplyYearlyRate),
      borrowApy: yearlyRate(reserve.borrowYearlyRate),
      liquidationThreshold: ltv.gt(0) || threshold.gt(0) ? threshold.toNumber() : null,
      ltv,
      usageAsCollateral: ltv.gt(0),
      frozen: false,
      borrowingEnabled: true,
      canBeCollateral: ltv.gt(0),
    }
  })

  let suppliedValue = bn(0)
  let borrowedValue = bn(0)
  let ltvWeighted = bn(0)
  let liquidationWeighted = bn(0)
  const collateral: Array<{ assetId: string; symbol: string; amount: ReturnType<typeof bn>; threshold: ReturnType<typeof bn> }> = []

  for (const asset of assets) {
    const price = bn(asset.priceUsd)
    const supply = bn(asset.supplied)
    const borrow = bn(asset.borrowed)
    suppliedValue = suppliedValue.plus(supply.multipliedBy(price))
    borrowedValue = borrowedValue.plus(borrow.multipliedBy(price))
    if (asset.ltv.gt(0) && supply.gt(0)) {
      ltvWeighted = ltvWeighted.plus(supply.multipliedBy(price).multipliedBy(asset.ltv))
      const threshold = bn(asset.liquidationThreshold ?? 0)
      liquidationWeighted = liquidationWeighted.plus(supply.multipliedBy(price).multipliedBy(threshold))
      collateral.push({
        assetId: asset.assetId,
        symbol: asset.symbol,
        amount: supply,
        threshold,
      })
    }
  }

  const rawHealthFactor = borrowedValue.gt(0)
    ? ltvWeighted.dividedBy(borrowedValue).multipliedBy(100).toFixed()
    : null
  const liquidationHealthPercent = liquidationWeighted.gt(0)
    ? ltvWeighted.dividedBy(liquidationWeighted).multipliedBy(100).toNumber()
    : null
  const liquidationBuffer =
    borrowedValue.gt(0) && liquidationWeighted.gt(0)
      ? bn(1).minus(borrowedValue.dividedBy(liquidationWeighted)).toFixed()
      : null

  let liquidationPrice: Result['liquidationPrice'] = null
  if (collateral.length === 1 && borrowedValue.gt(0) && collateral[0].threshold.gt(0)) {
    const only = collateral[0]
    liquidationPrice = {
      assetId: only.assetId,
      symbol: only.symbol,
      priceUsd: borrowedValue.dividedBy(only.amount.multipliedBy(only.threshold)).toFixed(),
    }
  }

  const borrowUsage = ltvWeighted.gt(0) && borrowedValue.gt(0)
    ? borrowedValue.dividedBy(ltvWeighted).toFixed()
    : borrowedValue.gt(0)
      ? '1'
      : null

  const publicAssets: AssetState[] = assets.map(({ ltv: _ltv, ...asset }) => asset)

  return {
    rawHealthFactor,
    assets: publicAssets,
    result: {
      healthFactor: rawHealthFactor,
      netWorthUsd: suppliedValue.minus(borrowedValue).toFixed(),
      borrowUsage,
      liquidationPrice,
      healthUnit: 'percent',
      liquidationHealthPercent,
      liquidationBuffer,
    },
  }
}

function yearlyRate(value: string | undefined): string | null {
  if (value == null || value === '') return null
  return bn(value).toFixed()
}

export function simulateHyperliquid(snapshot: HyperliquidSnapshot, edits: Edits): Result {
  return evaluateHyperliquid(snapshot, edits).result
}
