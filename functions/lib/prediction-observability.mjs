/**
 * Structured logs for prediction-market cron paths (Workers / Pages Functions).
 * Search in Logpush / dashboard for event names: auto_markets.seed.*, resolve_markets.*, prediction_maintenance.*
 */

/**
 * @param {string} event
 * @param {Record<string, unknown>} data
 */
export function predictionLog(event, data = {}) {
  try {
    console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...data }))
  } catch {
    console.log(String(event), data)
  }
}
