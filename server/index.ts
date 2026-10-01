import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { aaveConfig, aavePosition } from './aave.ts'
import { hyperliquidConfig, hyperliquidPosition } from './hyperliquid.ts'
import { publicMarkets } from './markets.ts'

const app = new Hono()
app.use('/api/*', cors())

app.get('/api/markets', (c) => c.json(publicMarkets()))

app.get('/api/aave/markets/:marketId/config', async (c) => {
  try {
    const snapshot = await aaveConfig(c.req.param('marketId'))
    return c.json({ snapshot })
  } catch (error) {
    return c.json({ error: message(error) }, 502)
  }
})

app.get('/api/aave/markets/:marketId/position', async (c) => {
  const user = c.req.query('user') ?? ''
  try {
    const position = await aavePosition(c.req.param('marketId'), user)
    return c.json(position)
  } catch (error) {
    const status = message(error).includes('wallet') ? 400 : 502
    return c.json({ error: message(error) }, status)
  }
})

app.get('/api/hyperliquid/config', async (c) => {
  try {
    const snapshot = await hyperliquidConfig()
    return c.json({ snapshot })
  } catch (error) {
    return c.json({ error: message(error) }, 502)
  }
})

app.get('/api/hyperliquid/position', async (c) => {
  const user = c.req.query('user') ?? ''
  try {
    const position = await hyperliquidPosition(user)
    return c.json(position)
  } catch (error) {
    const status = message(error).includes('wallet') ? 400 : 502
    return c.json({ error: message(error) }, status)
  }
})

function message(error: unknown): string {
  const text = error instanceof Error ? error.message : 'Request failed.'
  const first = text.split('\n')[0] ?? text
  return first.length > 280 ? `${first.slice(0, 280)}…` : first
}

const port = Number(process.env.PORT ?? 8787)
serve({ fetch: app.fetch, port }, () => {
  console.log(`API listening on http://127.0.0.1:${port}`)
})
