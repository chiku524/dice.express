/**
 * Fixed-window rate limits: prefers KV when bound; falls back to in-memory per isolate
 * (useful for `wrangler pages dev` without KV preview). Not shared across workers.
 */

/** @type {Map<string, number>} */
const memBuckets = new Map()

function consumeMemoryBucket(keyPrefix, max, windowSec) {
  const now = Math.floor(Date.now() / 1000)
  const bucket = Math.floor(now / windowSec)
  const key = `rl:v1:${keyPrefix}:${bucket}`
  const n = (memBuckets.get(key) || 0) + 1
  memBuckets.set(key, n)
  if (memBuckets.size > 5000) {
    const minB = bucket - 5
    for (const k of memBuckets.keys()) {
      const tail = k.split(':').pop()
      const b = parseInt(tail, 10)
      if (Number.isFinite(b) && b < minB) memBuckets.delete(k)
    }
  }
  if (n > max) return { ok: false, remaining: 0, backend: 'memory' }
  return { ok: true, remaining: max - n, backend: 'memory' }
}

/**
 * @param {KVNamespace | undefined | null} kv
 * @param {string} keyPrefix stable id e.g. `p2p-order:alice`
 * @param {number} max max requests per window
 * @param {number} windowSec window length in seconds
 * @returns {Promise<{ ok: boolean, remaining?: number, backend?: string }>}
 */
export async function consumeRateLimitBucket(kv, keyPrefix, max, windowSec) {
  if (!keyPrefix || max <= 0 || windowSec <= 0) return { ok: true }
  if (kv) {
    const now = Math.floor(Date.now() / 1000)
    const bucket = Math.floor(now / windowSec)
    const key = `rl:v1:${keyPrefix}:${bucket}`
    try {
      const raw = await kv.get(key)
      let n = 0
      if (raw) {
        try {
          const j = JSON.parse(raw)
          n = typeof j.n === 'number' ? j.n : 0
        } catch {
          n = 0
        }
      }
      n += 1
      if (n > max) return { ok: false, remaining: 0, backend: 'kv' }
      await kv.put(key, JSON.stringify({ n }), { expirationTtl: windowSec + 10 })
      return { ok: true, remaining: max - n, backend: 'kv' }
    } catch {
      // KV error (e.g. misconfigured preview) — degrade to memory
    }
  }
  return Promise.resolve(consumeMemoryBucket(keyPrefix, max, windowSec))
}

/**
 * Client identity for unscoped get-contracts rate limits (no `party` in query/body).
 * @param {Request} request
 */
export function contractsListingClientKey(request) {
  const cf = request.headers.get('CF-Connecting-IP')?.trim()
  if (cf) return cf
  const xff = request.headers.get('X-Forwarded-For')
  if (xff) {
    const first = xff.split(',')[0].trim()
    if (first) return first
  }
  try {
    const url = new URL(request.url)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return 'local-dev'
  } catch {
    /* ignore */
  }
  return 'unknown'
}
