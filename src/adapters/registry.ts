import type { ProtocolAdapter } from '../domain/types.ts'
import { aaveV3Adapter } from './aave-v3/adapter.ts'
import { hyperliquidAdapter } from './hyperliquid/adapter.ts'
import { loadMarkets } from './markets.ts'

const adapters: Record<string, ProtocolAdapter> = {
  [aaveV3Adapter.id]: aaveV3Adapter,
  [hyperliquidAdapter.id]: hyperliquidAdapter,
}

export { loadMarkets }

export function adapterFor(protocolId: string): ProtocolAdapter {
  const adapter = adapters[protocolId]
  if (!adapter) throw new Error(`Unknown protocol ${protocolId}`)
  return adapter
}

export function protocolChoices(): Array<{ id: string; label: string }> {
  return [
    { id: aaveV3Adapter.id, label: aaveV3Adapter.label },
    { id: hyperliquidAdapter.id, label: hyperliquidAdapter.label },
  ]
}
