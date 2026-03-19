/**
 * Balance (Pips) service.
 */
import { formatPips, PLATFORM_CURRENCY_SYMBOL } from '../../constants/currency'

const BALANCE_API = '/api/get-user-balance'

/**
 * Fetch current virtual balance for a party.
 * @param {string} userParty - Virtual user/account ID
 * @returns {Promise<{ balance: string, formatted: string, raw: number }>}
 */
export async function getVirtualBalance(userParty) {
  if (!userParty) {
    return { balance: '0', formatted: formatPips(0), raw: 0 }
  }
  try {
    const response = await fetch(BALANCE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userParty }),
    })
    if (!response.ok) {
      console.warn('[virtualBalance] Failed to fetch balance:', response.status)
      return { balance: '0', formatted: formatPips(0), raw: 0 }
    }
    const data = await response.json()
    const raw = parseFloat(data.balance || '0') || 0
    return {
      balance: String(raw),
      formatted: formatPips(raw),
      raw,
    }
  } catch (err) {
    console.warn('[virtualBalance] Error:', err)
    return { balance: '0', formatted: formatPips(0), raw: 0 }
  }
}

const TRANSFER_API = '/api/transfer-pips'

/**
 * Transfer Pips from one user to another (tip).
 * @param {string} fromParty - Sender party (display name)
 * @param {string} toParty - Recipient party (display name)
 * @param {string|number} amount - Amount in Pips
 * @returns {Promise<{ success: boolean, amount?: string, senderNewBalance?: string, error?: string }>}
 */
export async function transferPips(fromParty, toParty, amount) {
  const res = await fetch(TRANSFER_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromParty, toParty, amount: String(amount) }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Transfer failed')
  }
  return data
}

export { formatPips, PLATFORM_CURRENCY_SYMBOL }
