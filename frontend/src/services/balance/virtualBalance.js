/**
 * Balance (Pips) service.
 */
import { formatGuap, PLATFORM_CURRENCY_SYMBOL } from '../../constants/currency'

const BALANCE_API = '/api/get-user-balance'

/**
 * Fetch current virtual balance for a party.
 * @param {string} userParty - Virtual user/account ID
 * @returns {Promise<{ balance: string, formatted: string, raw: number }>}
 */
export async function getVirtualBalance(userParty) {
  if (!userParty) {
    return { balance: '0', formatted: formatGuap(0), raw: 0 }
  }
  try {
    const response = await fetch(BALANCE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userParty }),
    })
    if (!response.ok) {
      console.warn('[virtualBalance] Failed to fetch balance:', response.status)
      return { balance: '0', formatted: formatGuap(0), raw: 0 }
    }
    const data = await response.json()
    const raw = parseFloat(data.balance || '0') || 0
    return {
      balance: String(raw),
      formatted: formatGuap(raw),
      raw,
    }
  } catch (err) {
    console.warn('[virtualBalance] Error:', err)
    return { balance: '0', formatted: formatGuap(0), raw: 0 }
  }
}

export { formatGuap, PLATFORM_CURRENCY_SYMBOL }
