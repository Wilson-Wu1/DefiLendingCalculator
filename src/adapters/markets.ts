import type { Market } from '../domain/types.ts'
import { getJson } from './api.ts'

let marketsRequest: Promise<Market[]> | null = null

export function loadMarkets(): Promise<Market[]> {
  if (!marketsRequest) {
    marketsRequest = getJson<Market[]>('/api/markets').catch((error: unknown) => {
      marketsRequest = null
      throw error
    })
  }
  return marketsRequest
}
