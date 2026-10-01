import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { aaveConfig, aavePosition } from './aave.ts'
import { hyperliquidConfig, hyperliquidPosition } from './hyperliquid.ts'
import { publicMarkets } from './markets.ts'

export const app = new Hono()
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

const FUNCTION_PREFIX = '/.netlify/functions/api'

/** Netlify rewrites /api/* onto the function path. Hono still matches /api/*. */
export function requestForApp(request: Request): Request {
  const url = new URL(request.url)
  const at = url.pathname.indexOf(FUNCTION_PREFIX)
  if (at === -1) return request
  const rest = url.pathname.slice(at + FUNCTION_PREFIX.length)
  const suffix = rest.startsWith('/') ? rest : `/${rest}`
  url.pathname = suffix === '/api' || suffix.startsWith('/api/') ? suffix : `/api${suffix === '/' ? '' : suffix}`
  return new Request(url, request)
}
