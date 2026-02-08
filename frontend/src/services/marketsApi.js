/**
 * Virtual markets API client — no blockchain.
 */
const MARKETS_API = '/api/markets'

export async function fetchMarkets(source = null) {
  const params = new URLSearchParams()
  if (source && source !== 'all') params.set('source', source)
  const url = params.toString() ? `${MARKETS_API}?${params}` : MARKETS_API
  const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
  if (!res.ok) throw new Error('Failed to fetch markets')
  const data = await res.json()
  return (data.markets || []).map((m) => ({
    contractId: m.contractId,
    templateId: m.templateId,
    payload: { ...m.payload, status: m.payload?.status ?? 'Active', source: m.payload?.source ?? 'user' },
    party: m.party,
    status: m.status,
    createdAt: m.createdAt,
  }))
}

export async function createMarket(body) {
  const res = await fetch(MARKETS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || err.error || 'Failed to create market')
  }
  return res.json()
}

export async function fetchPool(marketId) {
  const res = await fetch(`/api/pools?marketId=${encodeURIComponent(marketId)}`)
  if (!res.ok) return null
  const data = await res.json()
  return data.pool || null
}

export async function executeTrade({ marketId, side, amount, minOut = 0, userId }) {
  const res = await fetch('/api/trade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ marketId, side, amount, minOut, userId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || err.error || 'Trade failed')
  }
  return res.json()
}
