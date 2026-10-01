import { describe, expect, it } from 'vitest'
import { bn, RAY } from '../../domain/numbers.ts'
import { emptyEdits } from '../../domain/types.ts'
import { collateralBitmap, makeReserve, makeSnapshot } from './fixture.ts'
import { evaluateAave } from './simulate.ts'

const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const GHO = '0x40d16fc0246ad3160ccc09b8d0d3a2cd28ae6c2f'

function ethUsdcSnapshot(collateralEnabled: boolean) {
  return makeSnapshot({
    reserves: [
      makeReserve({
        originalId: 0,
        underlyingAsset: WETH,
        symbol: 'WETH',
        decimals: 18,
        priceInMarketReferenceCurrency: '200000000000',
      }),
      makeReserve({
        originalId: 1,
        underlyingAsset: USDC,
        symbol: 'USDC',
        decimals: 6,
        baseLTVasCollateral: '0',
        reserveLiquidationThreshold: '0',
        usageAsCollateralEnabled: false,
        priceInMarketReferenceCurrency: '100000000',
      }),
    ],
    userReserves: [
      {
        underlyingAsset: WETH,
        scaledATokenBalance: '10000000000000000000',
        scaledVariableDebt: '0',
        usageAsCollateralEnabledOnUser: collateralEnabled,
      },
      {
        underlyingAsset: USDC,
        scaledATokenBalance: '0',
        scaledVariableDebt: '8000000000',
        usageAsCollateralEnabledOnUser: false,
      },
    ],
  })
}

describe('Aave V3 simulate', () => {
  it('counts only collateral the user has enabled', () => {
    const enabled = evaluateAave(ethUsdcSnapshot(true), emptyEdits())
    const disabled = evaluateAave(ethUsdcSnapshot(false), emptyEdits())
    expect(Number(enabled.result.healthFactor)).toBeCloseTo(2, 4)
    expect(Number(enabled.result.liquidationBuffer)).toBeCloseTo(0.5, 4)
    expect(enabled.assets.find((asset) => asset.symbol === 'WETH')?.usageAsCollateral).toBe(true)
    expect(Number(disabled.result.healthFactor)).toBeCloseTo(0, 6)
    expect(Number(enabled.result.netWorthUsd)).toBeCloseTo(12000, 2)
  })

  it('uses the eMode liquidation threshold when the user is in that category', () => {
    const snapshot = ethUsdcSnapshot(true)
    snapshot.userEmodeCategoryId = 1
    snapshot.eModes = [
      {
        id: 1,
        eMode: {
          ltv: '9000',
          liquidationThreshold: '9300',
          liquidationBonus: '10100',
          collateralBitmap: collateralBitmap(0),
          borrowableBitmap: collateralBitmap(1),
          ltvzeroBitmap: '0'.repeat(256),
          isolated: false,
          label: 'ETH',
        },
      },
    ]
    const result = evaluateAave(snapshot, emptyEdits())
    expect(Number(result.result.healthFactor)).toBeCloseTo(2.325, 3)
    expect(result.assets.find((asset) => asset.symbol === 'WETH')?.liquidationThreshold).toBeCloseTo(0.93, 4)
  })

  it('keeps a frozen reserve that the user still holds', () => {
    const snapshot = ethUsdcSnapshot(true)
    snapshot.reserves[0].isFrozen = true
    snapshot.reserves[0].isActive = false
    const result = evaluateAave(snapshot, emptyEdits())
    const weth = result.assets.find((asset) => asset.symbol === 'WETH')
    expect(weth?.frozen).toBe(true)
    expect(Number(weth?.supplied)).toBeCloseTo(10, 6)
    expect(Number(result.result.healthFactor)).toBeCloseTo(2, 4)
  })

  it('prices GHO at one dollar until the scenario overrides it', () => {
    const snapshot = makeSnapshot({
      ghoAssetIds: [GHO],
      reserves: [
        makeReserve({
          originalId: 0,
          underlyingAsset: WETH,
          symbol: 'WETH',
          decimals: 18,
          priceInMarketReferenceCurrency: '200000000000',
        }),
        makeReserve({
          originalId: 1,
          underlyingAsset: GHO,
          symbol: 'GHO',
          decimals: 18,
          baseLTVasCollateral: '0',
          reserveLiquidationThreshold: '0',
          usageAsCollateralEnabled: false,
          priceInMarketReferenceCurrency: '200000000',
        }),
      ],
      userReserves: [
        {
          underlyingAsset: WETH,
          scaledATokenBalance: '1000000000000000000',
          scaledVariableDebt: '0',
          usageAsCollateralEnabledOnUser: true,
        },
        {
          underlyingAsset: GHO,
          scaledATokenBalance: '0',
          scaledVariableDebt: '1000000000000000000000',
          usageAsCollateralEnabledOnUser: false,
        },
      ],
    })
    const priced = evaluateAave(snapshot, emptyEdits())
    expect(Number(priced.assets.find((asset) => asset.symbol === 'GHO')?.priceUsd)).toBeCloseTo(1, 4)
    expect(Number(priced.result.healthFactor)).toBeCloseTo(1.6, 3)

    const overridden = evaluateAave(snapshot, {
      ...emptyEdits(),
      priceUsdByAsset: { [GHO]: '1.5' },
    })
    expect(Number(overridden.assets.find((asset) => asset.symbol === 'GHO')?.priceUsd)).toBeCloseTo(1.5, 3)
    expect(Number(overridden.result.healthFactor)).toBeCloseTo(1600 / 1500, 3)
  })

  it('reports total supplied in USD as market size', () => {
    const snapshot = ethUsdcSnapshot(true)
    snapshot.reserves[0].availableLiquidity = '10000000000000000000'
    snapshot.reserves[1].availableLiquidity = '50000000000'
    const result = evaluateAave(snapshot, emptyEdits())
    const weth = result.assets.find((asset) => asset.symbol === 'WETH')
    const usdc = result.assets.find((asset) => asset.symbol === 'USDC')
    expect(Number(weth?.marketSizeUsd)).toBeCloseTo(20000, 2)
    expect(Number(usdc?.marketSizeUsd)).toBeCloseTo(50000, 2)
  })

  it('compounds reserve rates into supply and borrow APY', () => {
    const snapshot = ethUsdcSnapshot(true)
    snapshot.reserves[0].liquidityRate = bn(RAY).multipliedBy('0.05').integerValue().toFixed(0)
    snapshot.reserves[1].variableBorrowRate = bn(RAY).multipliedBy('0.1').integerValue().toFixed(0)
    const result = evaluateAave(snapshot, emptyEdits())
    const weth = result.assets.find((asset) => asset.symbol === 'WETH')
    const usdc = result.assets.find((asset) => asset.symbol === 'USDC')
    expect(Number(weth?.supplyApy)).toBeGreaterThan(0.05)
    expect(Number(weth?.supplyApy)).toBeCloseTo(0.05127, 4)
    expect(Number(usdc?.borrowApy)).toBeGreaterThan(0.1)
    expect(Number(usdc?.borrowApy)).toBeCloseTo(0.10517, 4)
  })

  it('reports an infinite health factor when there is no debt', () => {
    const snapshot = ethUsdcSnapshot(true)
    snapshot.userReserves = snapshot.userReserves.filter((reserve) => reserve.underlyingAsset === WETH)
    const result = evaluateAave(snapshot, emptyEdits())
    expect(result.result.healthFactor).toBeNull()
    expect(result.result.liquidationBuffer).toBeNull()
    expect(result.rawHealthFactor).toBe('-1')
  })

  it('applies price and threshold edits without reading outside the snapshot', () => {
    const base = evaluateAave(ethUsdcSnapshot(true), emptyEdits())
    const repriced = evaluateAave(ethUsdcSnapshot(true), {
      ...emptyEdits(),
      priceUsdByAsset: { [WETH]: '4000' },
    })
    const tighter = evaluateAave(ethUsdcSnapshot(true), {
      ...emptyEdits(),
      liquidationThresholdByAsset: { [WETH]: '0.5' },
    })
    expect(Number(base.result.healthFactor)).toBeCloseTo(2, 4)
    expect(Number(repriced.result.healthFactor)).toBeCloseTo(4, 3)
    expect(Number(tighter.result.healthFactor)).toBeCloseTo(1.25, 3)
    expect(Number(tighter.result.liquidationBuffer)).toBeCloseTo(0.2, 4)
    expect(repriced.result.liquidationPrice?.symbol).toBe('WETH')
    expect(Number(repriced.result.liquidationPrice?.priceUsd)).toBeCloseTo(8000 / (10 * 0.8), 2)
  })
})
