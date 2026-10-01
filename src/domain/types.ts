export type Market = {
  id: string
  protocolId: string
  name: string
  chainId: number | null
}

export type AssetState = {
  assetId: string
  symbol: string
  decimals: number
  supplied: string
  borrowed: string
  priceUsd: string
  /** Total supplied in USD. Null when the protocol does not report market size. */
  marketSizeUsd: string | null
  /** Supply interest as a fraction. Null when the protocol does not report it. */
  supplyApy: string | null
  /** Borrow interest as a fraction. Null when the protocol does not report it. */
  borrowApy: string | null
  /** Fraction from 0 to 1. Null when this asset has no liquidation threshold. */
  liquidationThreshold: number | null
  usageAsCollateral: boolean
  frozen: boolean
  borrowingEnabled: boolean
  canBeCollateral: boolean
}

export type Edits = {
  priceUsdByAsset: Record<string, string>
  suppliedByAsset: Record<string, string>
  borrowedByAsset: Record<string, string>
  /** Fraction from 0 to 1, keyed by asset id. */
  liquidationThresholdByAsset: Record<string, string>
}

export type LiquidationPrice = {
  assetId: string
  symbol: string
  priceUsd: string
}

export type Result = {
  /** Null means there is no debt, so the health factor is infinite. */
  healthFactor: string | null
  netWorthUsd: string
  /** Debt divided by maximum borrow, as a fraction. Null when it is not meaningful. */
  borrowUsage: string | null
  liquidationPrice: LiquidationPrice | null
  healthUnit: 'ratio' | 'percent'
  /** Hyperliquid health factor, in percent, at which liquidation starts. */
  liquidationHealthPercent: number | null
  /**
   * Fraction that collateral prices can fall, together, before liquidation.
   * Null when there is no debt or no liquidation-weighted collateral.
   */
  liquidationBuffer: string | null
}

export type Position = {
  protocolId: string
  marketId: string
  user: string | null
  assets: AssetState[]
  healthUnit: 'ratio' | 'percent'
  /** Protocol account view. Null means infinite or no borrow. */
  protocolHealthFactor: string | null
  /** Local model before edits. Null means infinite. */
  modelHealthFactor: string | null
  /** Null when no wallet was loaded. False when the model disagrees with the protocol. */
  verified: boolean | null
  snapshot: AaveSnapshot | HyperliquidSnapshot
}

export type ProtocolAdapter = {
  id: string
  label: string
  markets: () => Promise<Market[]>
  /** Market reserves with an empty user position. */
  blank: (market: Market) => Promise<Position>
  position: (user: string, market: Market) => Promise<Position>
  simulate: (position: Position, edits: Edits) => Result
}

export type AaveEMode = {
  id: number
  eMode: {
    ltv: string
    liquidationThreshold: string
    liquidationBonus: string
    collateralBitmap: string
    isolated: boolean
    label: string
    borrowableBitmap: string
    ltvzeroBitmap: string
  }
}

export type AaveReserve = {
  originalId: number
  id: string
  underlyingAsset: string
  name: string
  symbol: string
  decimals: number
  baseLTVasCollateral: string
  reserveLiquidationThreshold: string
  reserveLiquidationBonus: string
  reserveFactor: string
  usageAsCollateralEnabled: boolean
  borrowingEnabled: boolean
  isActive: boolean
  isFrozen: boolean
  liquidityIndex: string
  variableBorrowIndex: string
  liquidityRate: string
  variableBorrowRate: string
  lastUpdateTimestamp: number
  aTokenAddress: string
  variableDebtTokenAddress: string
  interestRateStrategyAddress: string
  availableLiquidity: string
  totalScaledVariableDebt: string
  priceInMarketReferenceCurrency: string
  priceOracle: string
  variableRateSlope1: string
  variableRateSlope2: string
  baseVariableBorrowRate: string
  optimalUsageRatio: string
  isPaused: boolean
  isSiloedBorrowing: boolean
  accruedToTreasury: string
  isolationModeTotalDebt: string
  flashLoanEnabled: boolean
  debtCeiling: string
  debtCeilingDecimals: number
  borrowCap: string
  supplyCap: string
  borrowableInIsolation: boolean
  virtualUnderlyingBalance: string
  deficit: string
}

export type AaveUserReserve = {
  underlyingAsset: string
  scaledATokenBalance: string
  usageAsCollateralEnabledOnUser: boolean
  scaledVariableDebt: string
}

export type AaveSnapshot = {
  kind: 'aave-v3'
  timestamp: number
  marketReferenceCurrencyDecimals: number
  marketReferencePriceInUsd: string
  ghoAssetIds: string[]
  reserves: AaveReserve[]
  eModes: AaveEMode[]
  userReserves: AaveUserReserve[]
  userEmodeCategoryId: number
}

export type HyperliquidReserve = {
  tokenIndex: number
  symbol: string
  oraclePx: string
  ltv: string
  /** Yearly supply rate as a fraction. */
  supplyYearlyRate: string
  /** Yearly borrow rate as a fraction. */
  borrowYearlyRate: string
}

export type HyperliquidBalance = {
  tokenIndex: number
  supply: string
  borrow: string
}

/**
 * Hyperliquid account abstraction. `default` and `disabled` are manual / standard.
 * Null when no wallet is loaded.
 */
export type HyperliquidAccountMode =
  | 'unifiedAccount'
  | 'portfolioMargin'
  | 'disabled'
  | 'default'
  | 'dexAbstraction'

export type HyperliquidSnapshot = {
  kind: 'hyperliquid'
  reserves: HyperliquidReserve[]
  balances: HyperliquidBalance[]
  accountMode: HyperliquidAccountMode | null
}

export function emptyEdits(): Edits {
  return {
    priceUsdByAsset: {},
    suppliedByAsset: {},
    borrowedByAsset: {},
    liquidationThresholdByAsset: {},
  }
}
