export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: 'no-store' })
  let body: { error?: string } = {}
  try {
    body = (await response.json()) as { error?: string }
  } catch {
    body = {}
  }
  if (!response.ok) {
    throw new Error(body.error ?? `Request failed (${response.status})`)
  }
  return body as T
}
