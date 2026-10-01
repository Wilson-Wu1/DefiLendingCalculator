import type {
  HyperliquidReserve,
  HyperliquidSnapshot,
  HyperliquidAccountMode,
} from '../src/domain/types.ts'
import { cached, MARKET_CACHE_MS } from './cache.ts'

const INFO_URL = 'https://api.hyperliquid.xyz/info'

type ReserveState = {
  oraclePx: string
  ltv: string
  supplyYearlyRate: string
  borrowYearlyRate: string
}

type SpotToken = {
  name: string
  index: number
}

type UserState = {
  tokenToState: Array<
    [
      number,
      {
        borrow: { basis: string; value: string }
        supply: { basis: string; value: string }
      },
    ]
  >
  health: string
  healthFactor: string | null
}

async function info<T>(body: unknown): Promise<T> {
  const response = await fetch(INFO_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`Hyperliquid info failed (${response.status})`)
  }
  return (await response.json()) as T
}

async function loadReserves(): Promise<HyperliquidReserve[]> {
  const [states, meta] = await Promise.all([
    info<Array<[number, ReserveState]>>({ type: 'allBorrowLendReserveStates' }),
    info<{ tokens: SpotToken[] }>({ type: 'spotMeta' }),
  ])
  const names = new Map(meta.tokens.map((token) => [token.index, token.name]))
  return states.map(([tokenIndex, state]) => ({
    tokenIndex,
    symbol: names.get(tokenIndex) ?? `Token ${tokenIndex}`,
    oraclePx: state.oraclePx,
    ltv: state.ltv,
    supplyYearlyRate: state.supplyYearlyRate,
    borrowYearlyRate: state.borrowYearlyRate,
  }))
}

function reserveList(): Promise<HyperliquidReserve[]> {
  return cached('hyperliquid-reserves', MARKET_CACHE_MS, loadReserves)
}

const ACCOUNT_MODES = new Set<HyperliquidAccountMode>([
  'unifiedAccount',
  'portfolioMargin',
  'disabled',
  'default',
  'dexAbstraction',
])

function accountMode(value: unknown): HyperliquidAccountMode | null {
  return typeof value === 'string' && ACCOUNT_MODES.has(value as HyperliquidAccountMode)
    ? (value as HyperliquidAccountMode)
    : null
}

export async function hyperliquidConfig(): Promise<HyperliquidSnapshot> {
  return {
    kind: 'hyperliquid',
    reserves: await reserveList(),
    balances: [],
    accountMode: null,
  }
}

export async function hyperliquidPosition(user: string): Promise<{
  snapshot: HyperliquidSnapshot
  healthFactor: string | null
}> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(user)) throw new Error('Enter a valid wallet address.')
  const [reserves, state, mode] = await Promise.all([
    reserveList(),
    info<UserState>({ type: 'borrowLendUserState', user }),
    info<unknown>({ type: 'userAbstraction', user }),
  ])
  return {
    snapshot: {
      kind: 'hyperliquid',
      reserves,
      balances: state.tokenToState
        .map(([tokenIndex, token]) => ({
          tokenIndex,
          supply: token.supply.value,
          borrow: token.borrow.value,
        }))
        .filter((balance) => Number(balance.supply) > 0 || Number(balance.borrow) > 0),
      accountMode: accountMode(mode),
    },
    healthFactor: state.healthFactor,
  }
}
