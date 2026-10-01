import { bn, formatCompactNumber, formatUsd } from '../domain/numbers.ts'
import type { Result } from '../domain/types.ts'

const PERPETUAL_MARGIN =
  'Account liquidation also depends on perpetual margin, which this calculator does not include.'

export function thirdMetric(
  result: Result | null,
  unit: 'ratio' | 'percent',
  portfolioMargin: boolean,
): { label: string; value: string; note: string } {
  if (unit === 'percent') {
    if (result?.liquidationPrice) {
      if (portfolioMargin) {
        return {
          label: `${result.liquidationPrice.symbol} borrow threshold`,
          value: `$${formatUsd(result.liquidationPrice.priceUsd)}`,
          note: `Price of the only collateral asset at the borrow threshold. ${PERPETUAL_MARGIN}`,
        }
      }
      return {
        label: `${result.liquidationPrice.symbol} liquidation price`,
        value: `$${formatUsd(result.liquidationPrice.priceUsd)}`,
        note: 'Price of the only collateral asset at which this position can be liquidated.',
      }
    }
    const buffer = result?.liquidationBuffer ?? null
    if (portfolioMargin) {
      return {
        label: 'Away from borrow threshold',
        value: buffer === null ? '—' : `${formatCompactNumber(String(Number(buffer) * 100), 2)}%`,
        note: `How far collateral prices can fall, together, before the borrow threshold. ${PERPETUAL_MARGIN}`,
      }
    }
    return {
      label: 'Away from liquidation',
      value: buffer === null ? '—' : `${formatCompactNumber(String(Number(buffer) * 100), 2)}%`,
      note: 'How far collateral prices can fall, together, before this position can be liquidated.',
    }
  }
  const usage = result?.borrowUsage
  return {
    label: 'Borrow usage',
    value: usage ? `${formatCompactNumber(String(Number(usage) * 100), 2)}%` : '0.00%',
    note: 'How much of the borrow limit is in use. At 100%, no more borrowing is allowed.',
  }
}

/** True when the shown distance to liquidation is 0% or worse. */
export function percentReached(fraction: string | null): boolean {
  if (fraction == null) return false
  const shown = Number(formatCompactNumber(bn(fraction).multipliedBy(100).toFixed(), 2).replace(/,/g, ''))
  return Number.isFinite(shown) && shown <= 0
}

/**
 * The position is at liquidation when the buffer is 0%, or the collateral
 * price has reached the liquidation price.
 */
export function isLiquidated(result: Result | null, currentPriceUsd: string | null): boolean {
  if (!result) return false
  if (percentReached(result.liquidationBuffer)) return true
  if (!result.liquidationPrice || currentPriceUsd == null) return false
  if (!bn(currentPriceUsd).gt(0)) return bn(result.liquidationPrice.priceUsd).gte(0)
  const distance = bn(1).minus(bn(result.liquidationPrice.priceUsd).dividedBy(currentPriceUsd))
  return percentReached(distance.toFixed())
}
