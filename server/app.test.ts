import { describe, expect, it } from 'vitest'
import { app, requestForApp } from './app.ts'

describe('api app', () => {
  it('lists markets', async () => {
    const response = await app.request('/api/markets')
    expect(response.status).toBe(200)
    const markets = (await response.json()) as Array<{ id: string; protocolId: string }>
    expect(markets.some((market) => market.id === 'hyperliquid-mainnet')).toBe(true)
    expect(markets.some((market) => market.protocolId === 'aave-v3')).toBe(true)
    expect(markets.find((market) => market.id === 'aave-v3-optimism')).toMatchObject({ disabled: true })
  })

  it('keeps an /api path that was not rewritten', () => {
    const request = new Request('https://aavehealth.org/api/markets')
    expect(requestForApp(request).url).toBe('https://aavehealth.org/api/markets')
  })

  it('restores /api after the Netlify function rewrite', () => {
    const request = new Request(
      'https://aavehealth.org/.netlify/functions/api/aave/markets/aave-v3-ethereum/position?user=0xabc',
    )
    expect(requestForApp(request).url).toBe(
      'https://aavehealth.org/api/aave/markets/aave-v3-ethereum/position?user=0xabc',
    )
  })
})
