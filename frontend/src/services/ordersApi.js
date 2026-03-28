/**
 * P2P orders API — place and list orders; matching runs on the server.
 */
import { apiUrl } from './apiBase'

function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

/** @param {string} marketId @param {string | null} [outcome] @param {string | null} [owner] filter to one party */
export async function fetchOpenOrders(marketId, outcome = null, owner = null) {
  const params = new URLSearchParams({ marketId })
  if (outcome) params.set('outcome', outcome)
  if (owner) params.set('owner', owner)
  const res = await fetch(`${apiUrl('orders')}?${params}`)
  if (!res.ok) throw new Error('Failed to fetch orders')
  const data = await res.json()
  return data.orders || []
}

/**
 * @param {{ marketId: string, outcome: string, side: string, amount: number|string, price: number|string, owner: string, idempotencyKey?: string }} p
 */
export async function placeOrder({ marketId, outcome, side, amount, price, owner, idempotencyKey }) {
  const headers = { 'Content-Type': 'application/json' }
  const idem = idempotencyKey || newIdempotencyKey()
  headers['Idempotency-Key'] = idem
  const res = await fetch(apiUrl('orders'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ marketId, outcome, side, amount, price, owner }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || data.message || 'Order failed')
    err.status = res.status
    err.responseBody = data
    throw err
  }
  return data
}

export async function cancelOrder(orderId, owner) {
  const res = await fetch(apiUrl('orders'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cancel: true, orderId, owner }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Cancel failed')
    err.status = res.status
    err.responseBody = data
    throw err
  }
  return data
}

/** Human-readable remaining size for book rows (partial fills). */
export function formatOrderSizeDisplay(o) {
  const rem = Number(o.amountRemaining ?? o.amountReal) || 0
  const orig = Number(o.amountReal) || rem
  if (orig > rem + 1e-9) {
    return `${rem.toFixed(2)} / ${orig.toFixed(2)} sh left`
  }
  return `${rem.toFixed(2)} sh`
}
