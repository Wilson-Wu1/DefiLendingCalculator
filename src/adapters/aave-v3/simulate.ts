import { formatReserves, formatUserSummary } from '@aave/math-utils'
import type { FormatReserveUSDResponse } from '@aave/math-utils'
import { bn, humanToRaw, RAY, usdToMarketReference } from '../../domain/numbers.ts'
import type {
  AaveReserve,
  AaveSnapshot,
  AaveUserReserve,
  AssetState,
  Edits,
  Result,
} from '../../domain/types.ts'

export type AaveEvaluation = {
  result: Result
  assets: AssetState[]
  /** Unconverted health factor. "-1" means no debt. */
  rawHealthFactor: string
}

type FormattedReserve = FormatReserveUSDResponse & AaveReserve

export function evaluateAave(snapshot: AaveSnapshot, edits: Edits): AaveEvaluation {
  const working = structuredClone(snapshot)
  applyPriceEdits(working, edits)
  const userReserves = applyBalanceEdits(working, edits)
  const formatted = formatReserves({
    reserves: working.reserves,
    eModes: working.eModes,
    currentTimestamp: working.timestamp,
    marketReferencePriceInUsd: working.marketReferencePriceInUsd,
    marketReferenceCurrencyDecimals: working.marketReferenceCurrencyDecimals,
  }) as FormattedReserve[]
  applyThresholdEdits(formatted, working.userEmodeCategoryId, edits)

  const summary = formatUserSummary({
    currentTimestamp: working.timestamp,
    marketReferencePriceInUsd: working.marketReferencePriceInUsd,
    marketReferenceCurrencyDecimals: working.marketReferenceCurrencyDecimals,
    userReserves,
    formattedReserves: formatted,
    userEmodeCategoryId: working.userEmodeCategoryId,
  })

  const assets = formatted
    .filter((reserve) => includeReserve(reserve, userReserves))
    .map((reserve) => toAsset(reserve, summary.userReservesData, working.userEmodeCategoryId))

  const collateral = assets.filter(
    (asset) => asset.usageAsCollateral && bn(asset.supplied).gt(0) && (asset.liquidationThreshold ?? 0) > 0,
  )
  const debt = bn(summary.totalBorrowsUSD)
  const borrows = debt
  const available = bn(summary.availableBorrowsUSD)
  const capacity = borrows.plus(available)
  const borrowUsage =
    capacity.gt(0) && borrows.gt(0) ? borrows.dividedBy(capacity).toFixed() : borrows.gt(0) ? '1' : null

  let liquidationPrice: Result['liquidationPrice'] = null
  if (collateral.length === 1 && debt.gt(0)) {
    const asset = collateral[0]
    const threshold = asset.liquidationThreshold ?? 0
    const amount = bn(asset.supplied)
    if (threshold > 0 && amount.gt(0)) {
      liquidationPrice = {
        assetId: asset.assetId,
        symbol: asset.symbol,
        priceUsd: debt.dividedBy(amount.multipliedBy(threshold)).toFixed(),
      }
    }
  }

  const rawHealthFactor = summary.healthFactor
  const healthFactor =
    rawHealthFactor === '-1' || bn(rawHealthFactor).lt(0) ? null : rawHealthFactor
  const health = healthFactor === null ? null : bn(healthFactor)
  const liquidationBuffer =
    health === null ? null : health.gt(0) ? bn(1).minus(bn(1).dividedBy(health)).toFixed() : '0'

  return {
    rawHealthFactor,
    assets,
    result: {
      healthFactor,
      netWorthUsd: summary.netWorthUSD,
      borrowUsage,
      liquidationPrice,
      healthUnit: 'ratio',
      liquidationHealthPercent: null,
      liquidationBuffer,
    },
  }
}

export function simulateAave(snapshot: AaveSnapshot, edits: Edits): Result {
  return evaluateAave(snapshot, edits).result
}

function includeReserve(reserve: AaveReserve, userReserves: AaveUserReserve[]): boolean {
  const user = userReserves.find(
    (entry) => entry.underlyingAsset.toLowerCase() === reserve.underlyingAsset.toLowerCase(),
  )
  const held =
    !!user && (bn(user.scaledATokenBalance).gt(0) || bn(user.scaledVariableDebt).gt(0))
  if (held) return true
  return reserve.isActive && !reserve.isPaused
}

function applyPriceEdits(snapshot: AaveSnapshot, edits: Edits) {
  const gho = new Set(snapshot.ghoAssetIds.map((id) => id.toLowerCase()))
  for (const reserve of snapshot.reserves) {
    const id = reserve.underlyingAsset.toLowerCase()
    const override = edits.priceUsdByAsset[id] ?? edits.priceUsdByAsset[reserve.underlyingAsset]
    const usd = override ?? (gho.has(id) ? '1' : null)
    if (usd === null) continue
    reserve.priceInMarketReferenceCurrency = usdToMarketReference(
      usd,
      snapshot.marketReferenceCurrencyDecimals,
      snapshot.marketReferencePriceInUsd,
    )
  }
}

function applyBalanceEdits(snapshot: AaveSnapshot, edits: Edits): AaveUserReserve[] {
  const byAsset = new Map<string, AaveUserReserve>()
  for (const reserve of snapshot.userReserves) {
    byAsset.set(reserve.underlyingAsset.toLowerCase(), { ...reserve })
  }

  const touched = new Set<string>([
    ...Object.keys(edits.suppliedByAsset),
    ...Object.keys(edits.borrowedByAsset),
  ])
  for (const assetId of touched) {
    const key = assetId.toLowerCase()
    if (byAsset.has(key)) continue
    const reserve = snapshot.reserves.find((entry) => entry.underlyingAsset.toLowerCase() === key)
    if (!reserve) continue
    byAsset.set(key, {
      underlyingAsset: reserve.underlyingAsset,
      scaledATokenBalance: '0',
      scaledVariableDebt: '0',
      usageAsCollateralEnabledOnUser: reserve.usageAsCollateralEnabled,
    })
  }

  for (const [assetId, amount] of Object.entries(edits.suppliedByAsset)) {
    const user = byAsset.get(assetId.toLowerCase())
    const reserve = snapshot.reserves.find(
      (entry) => entry.underlyingAsset.toLowerCase() === assetId.toLowerCase(),
    )
    if (!user || !reserve) continue
    user.scaledATokenBalance = humanToRaw(amount, reserve.decimals)
    reserve.liquidityIndex = RAY
    reserve.liquidityRate = '0'
    reserve.lastUpdateTimestamp = snapshot.timestamp
  }

  for (const [assetId, amount] of Object.entries(edits.borrowedByAsset)) {
    const user = byAsset.get(assetId.toLowerCase())
    const reserve = snapshot.reserves.find(
      (entry) => entry.underlyingAsset.toLowerCase() === assetId.toLowerCase(),
    )
    if (!user || !reserve) continue
    user.scaledVariableDebt = humanToRaw(amount, reserve.decimals)
    reserve.variableBorrowIndex = RAY
    reserve.variableBorrowRate = '0'
    reserve.lastUpdateTimestamp = snapshot.timestamp
  }

  return [...byAsset.values()].filter(
    (user) => bn(user.scaledATokenBalance).gt(0) || bn(user.scaledVariableDebt).gt(0),
  )
}

function applyThresholdEdits(
  reserves: FormattedReserve[],
  userEmodeCategoryId: number,
  edits: Edits,
) {
  for (const reserve of reserves) {
    const raw =
      edits.liquidationThresholdByAsset[reserve.underlyingAsset.toLowerCase()] ??
      edits.liquidationThresholdByAsset[reserve.underlyingAsset]
    if (raw === undefined) continue
    const fraction = bn(raw)
    const bps = fraction.multipliedBy(10_000).integerValue().toFixed(0)
    const eMode = reserve.eModes?.find((mode) => mode.id === userEmodeCategoryId)
    if (userEmodeCategoryId && eMode?.collateralEnabled) {
      eMode.eMode.liquidationThreshold = bps
    } else {
      reserve.reserveLiquidationThreshold = bps
    }
  }
}

function toAsset(
  reserve: FormattedReserve,
  userReserves: Array<{
    underlyingAsset: string
    underlyingBalance: string
    variableBorrows: string
    usageAsCollateralEnabledOnUser: boolean
  }>,
  userEmodeCategoryId: number,
): AssetState {
  const user = userReserves.find(
    (entry) => entry.underlyingAsset.toLowerCase() === reserve.underlyingAsset.toLowerCase(),
  )
  const eMode = reserve.eModes?.find((mode) => mode.id === userEmodeCategoryId)
  const useEMode = Boolean(userEmodeCategoryId && eMode?.collateralEnabled)
  const thresholdSource = useEMode
    ? eMode?.eMode.formattedLiquidationThreshold
    : reserve.formattedReserveLiquidationThreshold
  const threshold = thresholdSource === undefined ? 0 : Number(thresholdSource)

  return {
    assetId: reserve.underlyingAsset.toLowerCase(),
    symbol: reserve.symbol,
    decimals: reserve.decimals,
    supplied: user?.underlyingBalance ?? '0',
    borrowed: user?.variableBorrows ?? '0',
    priceUsd: reserve.priceInUSD,
    totalSupplied: reserve.totalLiquidity,
    totalBorrowed: reserve.totalDebt,
    marketSizeUsd: reserve.totalLiquidityUSD,
    totalBorrowedUsd: reserve.totalDebtUSD,
    supplyApy: reserve.supplyAPY,
    borrowApy: reserve.variableBorrowAPY,
    liquidationThreshold: threshold > 0 ? threshold : null,
    usageAsCollateral: user
      ? user.usageAsCollateralEnabledOnUser
      : reserve.usageAsCollateralEnabled,
    frozen: reserve.isFrozen,
    borrowingEnabled: reserve.borrowingEnabled,
    canBeCollateral: reserve.usageAsCollateralEnabled || threshold > 0,
  }
}
