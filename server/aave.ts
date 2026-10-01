import { UiPoolDataProvider } from '@aave/contract-helpers'
import { ethers } from 'ethers'
import type { AaveEMode, AaveReserve, AaveSnapshot, AaveUserReserve } from '../src/domain/types.ts'
import { cached, MARKET_CACHE_MS } from './cache.ts'
import { aaveMarketById, type AaveMarketConfig } from './markets.ts'

const providers = new Map<number, ethers.providers.StaticJsonRpcProvider>()

function providerFor(market: AaveMarketConfig): ethers.providers.StaticJsonRpcProvider {
  const existing = providers.get(market.chainId)
  if (existing) return existing
  const provider = new ethers.providers.StaticJsonRpcProvider(market.rpcUrl, market.chainId)
  providers.set(market.chainId, provider)
  return provider
}

const poolAbi = [
  'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
]

const emodeCall = new ethers.utils.Interface(['function getEModes(address provider) view returns (uint256)'])

const emodeShapes = [
  'tuple(uint8 id, tuple(uint16 ltv, uint16 liquidationThreshold, uint16 liquidationBonus, uint128 collateralBitmap, bool isolated, string label, uint128 borrowableBitmap, uint128 ltvzeroBitmap) eMode)[]',
  'tuple(uint8 id, tuple(uint16 ltv, uint16 liquidationThreshold, uint16 liquidationBonus, uint128 collateralBitmap, string label, bool isolated, uint128 borrowableBitmap) eMode)[]',
]

type DecodedEMode = {
  id: ethers.BigNumber
  eMode: {
    ltv: ethers.BigNumber
    liquidationThreshold: ethers.BigNumber
    liquidationBonus: ethers.BigNumber
    collateralBitmap: ethers.BigNumber
    isolated: boolean
    label: string
    borrowableBitmap: ethers.BigNumber
    ltvzeroBitmap?: ethers.BigNumber
  }
}

function bitmap(value: ethers.BigNumber): string {
  return value.toBigInt().toString(2).padStart(256, '0')
}

async function readEModes(
  provider: ethers.providers.StaticJsonRpcProvider,
  market: AaveMarketConfig,
): Promise<AaveEMode[]> {
  const data = emodeCall.encodeFunctionData('getEModes', [market.poolAddressesProvider])
  const result = await provider.call({ to: market.uiPoolDataProvider, data })
  let decoded: DecodedEMode[] | null = null
  for (const shape of emodeShapes) {
    try {
      decoded = ethers.utils.defaultAbiCoder.decode([shape], result)[0] as DecodedEMode[]
      break
    } catch {
      decoded = null
    }
  }
  if (!decoded) throw new Error('Could not read eMode categories for this market.')
  const emptyBitmap = '0'.repeat(256)
  return decoded.map((mode) => ({
    id: Number(mode.id),
    eMode: {
      ltv: mode.eMode.ltv.toString(),
      liquidationThreshold: mode.eMode.liquidationThreshold.toString(),
      liquidationBonus: mode.eMode.liquidationBonus.toString(),
      collateralBitmap: bitmap(mode.eMode.collateralBitmap),
      isolated: mode.eMode.isolated,
      label: mode.eMode.label,
      borrowableBitmap: bitmap(mode.eMode.borrowableBitmap),
      ltvzeroBitmap: mode.eMode.ltvzeroBitmap ? bitmap(mode.eMode.ltvzeroBitmap) : emptyBitmap,
    },
  }))
}

async function readMarket(market: AaveMarketConfig, user: string | null): Promise<{
  snapshot: AaveSnapshot
  healthFactor: string | null
}> {
  const provider = providerFor(market)
  const data = new UiPoolDataProvider({
    uiPoolDataProviderAddress: market.uiPoolDataProvider,
    provider,
    chainId: market.chainId,
  })
  const pool = new ethers.Contract(market.pool, poolAbi, provider)
  const input = { lendingPoolAddressProvider: market.poolAddressesProvider }

  const reservesPromise = data.getReservesHumanized(input)
  const eModesPromise = readEModes(provider, market)
  const userPromise = user
    ? data.getUserReservesHumanized({ ...input, user })
    : Promise.resolve({ userReserves: [], userEmodeCategoryId: 0 })
  const accountPromise = user ? pool.getUserAccountData(user) : Promise.resolve(null)
  const blockPromise = provider.getBlock('latest')

  const [reserves, eModes, userReserves, account, block] = await Promise.all([
    reservesPromise,
    eModesPromise,
    userPromise,
    accountPromise,
    blockPromise,
  ])

  const snapshot: AaveSnapshot = {
    kind: 'aave-v3',
    timestamp: block?.timestamp ?? Math.floor(Date.now() / 1000),
    marketReferenceCurrencyDecimals: reserves.baseCurrencyData.marketReferenceCurrencyDecimals,
    marketReferencePriceInUsd: reserves.baseCurrencyData.marketReferenceCurrencyPriceInUsd,
    ghoAssetIds: market.ghoAssetIds,
    reserves: reserves.reservesData as AaveReserve[],
    eModes,
    userReserves: userReserves.userReserves.map(
      (reserve): AaveUserReserve => ({
        underlyingAsset: reserve.underlyingAsset,
        scaledATokenBalance: reserve.scaledATokenBalance,
        usageAsCollateralEnabledOnUser: reserve.usageAsCollateralEnabledOnUser,
        scaledVariableDebt: reserve.scaledVariableDebt,
      }),
    ),
    userEmodeCategoryId: userReserves.userEmodeCategoryId,
  }

  return {
    snapshot,
    healthFactor: account ? account.healthFactor.toString() : null,
  }
}

export async function aaveConfig(marketId: string): Promise<AaveSnapshot> {
  const market = requireMarket(marketId)
  return cached(`aave-config:${market.id}`, MARKET_CACHE_MS, async () => {
    const result = await readMarket(market, null)
    return result.snapshot
  })
}

export async function aavePosition(marketId: string, user: string): Promise<{
  snapshot: AaveSnapshot
  healthFactor: string
}> {
  const market = requireMarket(marketId)
  if (!ethers.utils.isAddress(user)) throw new Error('Enter a valid wallet address.')
  const result = await readMarket(market, ethers.utils.getAddress(user))
  if (!result.healthFactor) throw new Error('The pool did not return account health.')
  return { snapshot: result.snapshot, healthFactor: result.healthFactor }
}

function requireMarket(marketId: string): AaveMarketConfig {
  const market = aaveMarketById(marketId)
  if (!market) throw new Error('Unknown Aave market.')
  return market
}
