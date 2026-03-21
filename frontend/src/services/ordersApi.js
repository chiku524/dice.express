/**
 * P2P orders API — place and list orders; matching runs on the server.
 */
import { apiUrl } from './apiBase'

export async function fetchOpenOrders(marketId, outcome = null) {
  const params = new URLSearchParams({ marketId })
  if (outcome) params.set('outcome', outcome)
  const res = await fetch(`${apiUrl('orders')}?${params}`)
  if (!res.ok) throw new Error('Failed to fetch orders')
  const data = await res.json()
  return data.orders || []
}

export async function placeOrder({ marketId, outcome, side, amount, price, owner }) {
  const res = await fetch(apiUrl('orders'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ marketId, outcome, side, amount, price, owner }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || 'Order failed')
  return data
}

export async function cancelOrder(orderId, owner) {
  const res = await fetch(apiUrl('orders'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cancel: true, orderId, owner }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Cancel failed')
  return data
}
