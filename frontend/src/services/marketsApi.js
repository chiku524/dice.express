/**
 * Virtual markets API client — no blockchain.
 */
import { apiUrl } from './apiBase'

const MARKETS_API = apiUrl('markets')

export async function fetchMarkets(source = null) {
  const params = new URLSearchParams()
  if (source && source !== 'all') params.set('source', source)
  const url = params.toString() ? `${MARKETS_API}?${params}` : MARKETS_API
  let res
  try {
    res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    const msg = err?.message || 'Network error'
    throw new Error(
      msg.includes('fetch') ? 'Could not reach the markets API. If running locally, set VITE_API_ORIGIN to your deployed API URL or ensure the backend is running.' : msg
    )
  }
  if (!res.ok) {
    const status = res.status
    let detail = 'Failed to fetch markets'
    if (status === 404) detail = 'Markets API not found. Set VITE_API_ORIGIN in dev or ensure the backend is deployed.'
    else if (status >= 500) detail = 'Markets API error. Try again later.'
    throw new Error(detail)
  }
  const data = await res.json().catch(() => ({}))
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
  const res = await fetch(`${apiUrl('pools')}?marketId=${encodeURIComponent(marketId)}`)
  if (!res.ok) return null
  const data = await res.json()
  return data.pool || null
}

export async function executeTrade({ marketId, side, amount, minOut = 0, userId }) {
  const res = await fetch(apiUrl('trade'), {
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
