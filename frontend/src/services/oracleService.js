import axios from 'axios'
import { apiUrl as getApiUrl } from './apiBase'

const REDSTONE_API_URL = 'https://api.redstone.finance/prices'

/**
 * RedStone Oracle Service
 * Fetches data from RedStone oracles for market resolution
 */
class OracleService {
  /**
   * Fetch price data from RedStone
   * @param {string} symbol - Symbol to fetch (e.g., 'BTC', 'ETH', 'AAPL')
   * @param {boolean} useProxy - Whether to use proxy API route (default: true in production)
   * @returns {Promise<Object>} Oracle data
   */
  async fetchPrice(symbol, useProxy = null) {
    try {
      // Use proxy in production to avoid CORS, direct call in development
      const useProxyRoute = useProxy !== null ? useProxy : (import.meta.env.PROD || (typeof window !== 'undefined' && window.location.hostname !== 'localhost'))
      const url = useProxyRoute
        ? `${getApiUrl('oracle')}?symbol=${encodeURIComponent(symbol.toUpperCase())}`
        : `${REDSTONE_API_URL}?symbol=${encodeURIComponent(symbol.toUpperCase())}&provider=redstone`

      const response = await axios.get(url)

      // RedStone returns data in various formats, normalize it
      const data = response.data
      
      // Extract price information
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
        price: price,
        timestamp: new Date().toISOString(),
        source: 'RedStone',
        rawData: data,
      }
    } catch (error) {
      console.error('Error fetching RedStone price:', error)
      throw new Error(`Failed to fetch ${symbol} price from RedStone: ${error.message}`)
    }
  }

  /**
   * Fetch multiple symbols at once
   * @param {string[]} symbols - Array of symbols
   * @returns {Promise<Object>} Map of symbol to price data
   */
  async fetchMultiplePrices(symbols) {
    const promises = symbols.map(symbol => 
      this.fetchPrice(symbol).catch(error => {
        console.error(`Error fetching ${symbol}:`, error)
        return { symbol, error: error.message }
      })
    )

    const results = await Promise.all(promises)
    const priceMap = {}
    
    results.forEach(result => {
      if (result.error) {
        priceMap[result.symbol] = { error: result.error }
      } else {
        priceMap[result.symbol] = result
      }
    })

    return priceMap
  }

  /**
   * Check if a condition is met based on oracle data
   * @param {Object} oracleData - Oracle data
   * @param {Object} condition - Condition to check
   * @returns {boolean} Whether condition is met
   */
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

  /**
   * Format oracle data for market resolution
   * @param {Object} oracleData - Oracle data
   * @returns {string} Formatted JSON string
   */
  formatForLedger(oracleData) {
    return JSON.stringify({
      symbol: oracleData.symbol,
      price: oracleData.price,
      timestamp: oracleData.timestamp,
      source: oracleData.source,
    })
  }
}

// Export singleton instance
export const oracleService = new OracleService()
export default OracleService

