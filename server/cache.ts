type Entry = { expires: number; value: unknown }

const entries = new Map<string, Entry>()

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = entries.get(key)
  if (hit && hit.expires > Date.now()) return hit.value as T
  const value = await load()
  entries.set(key, { expires: Date.now() + ttlMs, value })
  return value
}

export const MARKET_CACHE_MS = 60_000
