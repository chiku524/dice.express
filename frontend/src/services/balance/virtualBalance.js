/**
 * Virtual balance (platform Credits) service.
 * All platform activity uses Credits; this service fetches and formats balance.
 * @see docs/VIRTUAL_CURRENCY_AND_MULTICHAIN.md
 */
import { formatCredits, PLATFORM_CURRENCY_SYMBOL } from '../../constants/currency'

const BALANCE_API = '/api/get-user-balance'

/**
 * Fetch current virtual balance for a party.
 * @param {string} userParty - Canton party ID
 * @returns {Promise<{ balance: string, formatted: string, raw: number }>}
 */
export async function getVirtualBalance(userParty) {
  if (!userParty) {
    return { balance: '0', formatted: formatCredits(0), raw: 0 }
  }
  try {
    const response = await fetch(BALANCE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userParty }),
    })
    if (!response.ok) {
      console.warn('[virtualBalance] Failed to fetch balance:', response.status)
      return { balance: '0', formatted: formatCredits(0), raw: 0 }
    }
    const data = await response.json()
    const raw = parseFloat(data.balance || '0') || 0
    return {
      balance: String(raw),
      formatted: formatCredits(raw),
      raw,
    }
  } catch (err) {
    console.warn('[virtualBalance] Error:', err)
    return { balance: '0', formatted: formatCredits(0), raw: 0 }
  }
}

export { formatCredits, PLATFORM_CURRENCY_SYMBOL }
