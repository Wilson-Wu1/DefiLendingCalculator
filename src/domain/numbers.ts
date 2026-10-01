import BigNumber from 'bignumber.js'

export function bn(value: string | number): BigNumber {
  const parsed = new BigNumber(value)
  if (!parsed.isFinite()) return new BigNumber(0)
  return parsed
}

export function clampNonNegative(value: string | undefined): string | null {
  if (value === undefined) return null
  const parsed = bn(value)
  if (parsed.lt(0)) return '0'
  return parsed.toFixed()
}

export function humanToRaw(amount: string, decimals: number): string {
  return bn(amount).shiftedBy(decimals).integerValue(BigNumber.ROUND_DOWN).toFixed(0)
}

export const RAY = new BigNumber(10).pow(27).toFixed(0)
export const MAX_UINT256 = new BigNumber(2).pow(256).minus(1).toFixed(0)

/** USD price to the raw oracle price in market-reference currency. */
export function usdToMarketReference(
  usdPrice: string,
  marketReferenceCurrencyDecimals: number,
  marketReferencePriceInUsd: string,
): string {
  const usd = bn(usdPrice)
  const referenceUsd = bn(marketReferencePriceInUsd)
  if (usd.lt(0) || referenceUsd.lte(0)) return '0'
  return usd
    .multipliedBy(new BigNumber(10).pow(8 + marketReferenceCurrencyDecimals))
    .dividedBy(referenceUsd)
    .integerValue(BigNumber.ROUND_HALF_UP)
    .toFixed(0)
}

export function formatUsd(value: string | number): string {
  const parsed = bn(value)
  if (!parsed.isFinite()) return '—'
  const abs = parsed.abs()
  const digits = abs.gte(1) ? 2 : abs.gte(0.01) ? 4 : 6
  return parsed.toNumber().toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  })
}

export function formatAmount(value: string): string {
  const parsed = bn(value)
  if (!parsed.isFinite()) return '0'
  return parsed.toNumber().toLocaleString('en-US', { maximumFractionDigits: 6 })
}

export function formatCompactNumber(value: string | null, digits = 2): string {
  if (value === null) return '∞'
  const parsed = bn(value)
  if (!parsed.isFinite()) return '∞'
  return parsed.toNumber().toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** A fraction such as 0.05127, written as a percent. */
export function formatRate(fraction: string): string {
  return `${formatCompactNumber(bn(fraction).multipliedBy(100).toFixed(), 2)}%`
}
