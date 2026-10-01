import type {
  HyperliquidSnapshot,
  Market,
  Position,
  ProtocolAdapter,
  Result,
} from '../../domain/types.ts'
import { getJson } from '../api.ts'
import { loadMarkets } from '../markets.ts'
import { buildHyperliquidPosition } from './position.ts'
import { simulateHyperliquid } from './simulate.ts'

type ConfigResponse = { snapshot: HyperliquidSnapshot }
type PositionResponse = { snapshot: HyperliquidSnapshot; healthFactor: string | null }

export const hyperliquidAdapter: ProtocolAdapter = {
  id: 'hyperliquid',
  label: 'Hyperliquid',
  markets: async () => (await loadMarkets()).filter((market) => market.protocolId === 'hyperliquid'),
  blank: (market) => loadBlank(market),
  position: (user, market) => loadPosition(user, market),
  simulate: (position, edits) => simulatePosition(position, edits),
}

async function loadBlank(market: Market): Promise<Position> {
  const payload = await getJson<ConfigResponse>('/api/hyperliquid/config')
  return buildHyperliquidPosition({
    marketId: market.id,
    user: null,
    snapshot: payload.snapshot,
    protocolHealthFactor: null,
    checkProtocol: false,
  })
}

async function loadPosition(user: string, market: Market): Promise<Position> {
  const payload = await getJson<PositionResponse>(
    `/api/hyperliquid/position?user=${encodeURIComponent(user)}`,
  )
  return buildHyperliquidPosition({
    marketId: market.id,
    user,
    snapshot: payload.snapshot,
    protocolHealthFactor: payload.healthFactor,
    checkProtocol: true,
  })
}

function simulatePosition(
  position: Position,
  edits: Parameters<ProtocolAdapter['simulate']>[1],
): Result {
  if (position.snapshot.kind !== 'hyperliquid') {
    throw new Error('This position is not a Hyperliquid position.')
  }
  return simulateHyperliquid(position.snapshot, edits)
}
