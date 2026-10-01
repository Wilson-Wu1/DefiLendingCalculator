import type { AaveSnapshot, Market, Position, ProtocolAdapter, Result } from '../../domain/types.ts'
import { getJson } from '../api.ts'
import { loadMarkets } from '../markets.ts'
import { buildAavePosition } from './position.ts'
import { simulateAave } from './simulate.ts'

type ConfigResponse = { snapshot: AaveSnapshot }
type PositionResponse = { snapshot: AaveSnapshot; healthFactor: string }

export const aaveV3Adapter: ProtocolAdapter = {
  id: 'aave-v3',
  label: 'Aave V3',
  markets: async () => (await loadMarkets()).filter((market) => market.protocolId === 'aave-v3'),
  blank: (market) => loadBlank(market),
  position: (user, market) => loadPosition(user, market),
  simulate: (position, edits) => simulatePosition(position, edits),
}

async function loadBlank(market: Market): Promise<Position> {
  const payload = await getJson<ConfigResponse>(`/api/aave/markets/${market.id}/config`)
  return buildAavePosition({
    marketId: market.id,
    user: null,
    snapshot: payload.snapshot,
    protocolHealthFactorWad: null,
  })
}

async function loadPosition(user: string, market: Market): Promise<Position> {
  const payload = await getJson<PositionResponse>(
    `/api/aave/markets/${market.id}/position?user=${encodeURIComponent(user)}`,
  )
  return buildAavePosition({
    marketId: market.id,
    user,
    snapshot: payload.snapshot,
    protocolHealthFactorWad: payload.healthFactor,
  })
}

function simulatePosition(position: Position, edits: Parameters<ProtocolAdapter['simulate']>[1]): Result {
  if (position.snapshot.kind !== 'aave-v3') {
    throw new Error('This position is not an Aave V3 position.')
  }
  return simulateAave(position.snapshot, edits)
}
