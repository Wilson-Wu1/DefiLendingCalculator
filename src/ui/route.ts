import type { Market } from '../domain/types.ts'

const protocolPaths: Array<{ id: string; path: string }> = [
  { id: 'aave-v3', path: 'aave/v3' },
  { id: 'hyperliquid', path: 'hyperliquid' },
]

export function marketSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function marketPath(protocolId: string, marketName: string): string {
  const protocol = protocolPaths.find((entry) => entry.id === protocolId)
  const prefix = protocol?.path ?? protocolId
  return `/${prefix}/${marketSlug(marketName)}`
}

export type RouteMatch = {
  protocolId: string
  marketId: string
  canonical: string
}

function segments(pathname: string): string[] {
  return pathname
    .split('/')
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part).toLowerCase()
      } catch {
        return part.toLowerCase()
      }
    })
}

function matchProtocol(parts: string[]): { protocolId: string; rest: string[] } | null {
  const ordered = [...protocolPaths].sort((left, right) => right.path.length - left.path.length)
  for (const protocol of ordered) {
    const prefix = protocol.path.split('/')
    if (parts.length < prefix.length) continue
    if (prefix.every((segment, index) => parts[index] === segment)) {
      return { protocolId: protocol.id, rest: parts.slice(prefix.length) }
    }
  }
  return null
}

export function protocolIdFromPath(pathname: string): string | null {
  return matchProtocol(segments(pathname))?.protocolId ?? null
}

export function resolveRoute(pathname: string, markets: Market[]): RouteMatch {
  const fallback = defaultRoute(markets)
  const matched = matchProtocol(segments(pathname))
  if (!matched) return fallback

  const protocolMarkets = markets.filter((market) => market.protocolId === matched.protocolId)
  const slug = matched.rest.join('/')
  const market = slug
    ? protocolMarkets.find((entry) => marketSlug(entry.name) === slug)
    : protocolMarkets[0]
  if (!market) return fallback

  return {
    protocolId: market.protocolId,
    marketId: market.id,
    canonical: marketPath(market.protocolId, market.name),
  }
}

function defaultRoute(markets: Market[]): RouteMatch {
  const market = markets.find((entry) => entry.protocolId === 'aave-v3') ?? markets[0]
  if (!market) {
    return { protocolId: 'aave-v3', marketId: '', canonical: '/aave/v3' }
  }
  return {
    protocolId: market.protocolId,
    marketId: market.id,
    canonical: marketPath(market.protocolId, market.name),
  }
}
