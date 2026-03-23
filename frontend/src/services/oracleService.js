import { apiUrl as getApiUrl } from './apiBase'

const REDSTONE_API_URL = 'https://api.redstone.finance/prices'

/**
 * RedStone Oracle Service
 * Fetches data from RedStone oracles for market resolution
 */
class OracleService {
  /**
   * @param {string} symbol - Symbol to fetch (e.g., 'BTC', 'ETH', 'AAPL')
   * @param {boolean|null} useProxy - Use `/api/oracle` proxy (default: true in production)
   */
  async fetchPrice(symbol, useProxy = null) {
    try {
      const useProxyRoute =
        useProxy !== null
          ? useProxy
          : import.meta.env.PROD ||
            (typeof window !== 'undefined' && window.location.hostname !== 'localhost')
      const url = useProxyRoute
        ? `${getApiUrl('oracle')}?symbol=${encodeURIComponent(symbol.toUpperCase())}`
        : `${REDSTONE_API_URL}?symbol=${encodeURIComponent(symbol.toUpperCase())}&provider=redstone`

      const response = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()

      let price = null
      if (data.price) {
        price = data.price
      } else if (data.value) {
        price = data.value
      } else if (Array.isArray(data) && data.length > 0) {
        price = data[0].value || data[0].price
      } else if (typeof data === 'number') {
        price = data
      }

      return {
        symbol: symbol.toUpperCase(),
        price,
        timestamp: new Date().toISOString(),
        source: 'RedStone',
        rawData: data,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('Error fetching RedStone price:', error)
      throw new Error(`Failed to fetch ${symbol} price from RedStone: ${msg}`)
    }
  }

  async fetchMultiplePrices(symbols) {
    const promises = symbols.map((symbol) =>
      this.fetchPrice(symbol).catch((error) => {
        console.error(`Error fetching ${symbol}:`, error)
        return { symbol, error: error instanceof Error ? error.message : String(error) }
      })
    )

    const results = await Promise.all(promises)
    const priceMap = {}

    results.forEach((result) => {
      if (result.error) {
        priceMap[result.symbol] = { error: result.error }
      } else {
        priceMap[result.symbol] = result
      }
    })

    return priceMap
  }

  checkCondition(oracleData, condition) {
    if (!oracleData.price) return false

    const price = parseFloat(oracleData.price)
    const { operator, value } = condition

    switch (operator) {
      case '>':
        return price > value
      case '>=':
        return price >= value
      case '<':
        return price < value
      case '<=':
        return price <= value
      case '==':
        return price === value
      default:
        return false
    }
  }

  formatForLedger(oracleData) {
    return JSON.stringify({
      symbol: oracleData.symbol,
      price: oracleData.price,
      timestamp: oracleData.timestamp,
      source: oracleData.source,
    })
  }
}

export const oracleService = new OracleService()
export default OracleService
