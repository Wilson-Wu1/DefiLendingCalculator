import { RAY } from '../../domain/numbers.ts'
import type { AaveReserve, AaveSnapshot, AaveUserReserve } from '../../domain/types.ts'

const TIMESTAMP = 1_700_000_000

export function makeReserve(partial: Partial<AaveReserve> & Pick<AaveReserve, 'underlyingAsset' | 'symbol' | 'decimals' | 'originalId'>): AaveReserve {
  return {
    id: partial.underlyingAsset,
    name: partial.symbol,
    baseLTVasCollateral: '8000',
    reserveLiquidationThreshold: '8000',
    reserveLiquidationBonus: '10500',
    reserveFactor: '0',
    usageAsCollateralEnabled: true,
    borrowingEnabled: true,
    isActive: true,
    isFrozen: false,
    liquidityIndex: RAY,
    variableBorrowIndex: RAY,
    liquidityRate: '0',
    variableBorrowRate: '0',
    lastUpdateTimestamp: TIMESTAMP,
    aTokenAddress: '0x0000000000000000000000000000000000000001',
    variableDebtTokenAddress: '0x0000000000000000000000000000000000000002',
    interestRateStrategyAddress: '0x0000000000000000000000000000000000000003',
    availableLiquidity: '0',
    totalScaledVariableDebt: '0',
    priceInMarketReferenceCurrency: '100000000',
    priceOracle: '0x0000000000000000000000000000000000000004',
    variableRateSlope1: '0',
    variableRateSlope2: '0',
    baseVariableBorrowRate: '0',
    optimalUsageRatio: '0',
    isPaused: false,
    isSiloedBorrowing: false,
    accruedToTreasury: '0',
    isolationModeTotalDebt: '0',
    flashLoanEnabled: true,
    debtCeiling: '0',
    debtCeilingDecimals: 2,
    borrowCap: '0',
    supplyCap: '0',
    borrowableInIsolation: true,
    virtualUnderlyingBalance: '0',
    deficit: '0',
    ...partial,
  }
}

export function makeSnapshot(args: {
  reserves: AaveReserve[]
  userReserves: AaveUserReserve[]
  userEmodeCategoryId?: number
  eModes?: AaveSnapshot['eModes']
  ghoAssetIds?: string[]
}): AaveSnapshot {
  return {
    kind: 'aave-v3',
    timestamp: TIMESTAMP,
    marketReferenceCurrencyDecimals: 8,
    marketReferencePriceInUsd: '100000000',
    ghoAssetIds: args.ghoAssetIds ?? [],
    reserves: args.reserves,
    eModes: args.eModes ?? [],
    userReserves: args.userReserves,
    userEmodeCategoryId: args.userEmodeCategoryId ?? 0,
  }
}

export function collateralBitmap(reserveId: number): string {
  const bits = Array.from({ length: 256 }, () => '0')
  bits[bits.length - 1 - reserveId] = '1'
  return bits.join('')
}
