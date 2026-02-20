/**
 * Resolve prediction markets by calling the appropriate external API and comparing to oracleConfig.
 * Returns { resolved: true, outcome: 'Yes' | 'No' | <string> } or { resolved: false }.
 */
import * as ds from './data-sources.mjs'

/** Is the market due for resolution? (event time or end date has passed) */
export function isMarketDueForResolution(market) {
  const payload = market.payload || {}
  const cfg = payload.oracleConfig || {}
  const source = payload.oracleSource || payload.source

  if (source === 'the_odds_api') {
    const commenceTime = cfg.commenceTime || payload.commenceTime
    if (commenceTime) return new Date(commenceTime) < new Date()
    return true
  }
  if (source === 'alpha_vantage' || source === 'coingecko') {
    const endDate = cfg.endDate
    if (endDate) return new Date(endDate + 'T23:59:59Z') < new Date()
    return false
  }
  if (source === 'openweathermap' || source === 'weatherapi') {
    const date = cfg.date
    if (date) return new Date(date + 'T23:59:59Z') < new Date()
    return false
  }
  if (source === 'gnews' || source === 'perigon') {
    const date = cfg.date || cfg.publishedAt
    if (date) return new Date(date) < new Date()
    return false
  }
  return false
}

/** Resolve a single market. Returns { resolved, outcome } or throws. */
export async function resolveOutcome(env, market) {
  const payload = market.payload || {}
  const cfg = payload.oracleConfig || {}
  const source = payload.oracleSource || payload.source

  if (source === 'the_odds_api') {
    const eventId = cfg.eventId || (market.contractId && market.contractId.replace(/^market-/, ''))
    const sportKey = cfg.sportKey || 'basketball_nba'
    if (!eventId) return { resolved: false }
    const scores = await ds.fetchOddsScores(env, sportKey, 3, [eventId])
    const game = scores.find((e) => e.id === eventId)
    if (!game || !game.completed || !game.scores || game.scores.length < 2) return { resolved: false }
    const homeScore = parseFloat(game.scores.find((s) => s.name === game.home_team)?.score) || 0
    const awayScore = parseFloat(game.scores.find((s) => s.name === game.away_team)?.score) || 0
    const homeWon = homeScore > awayScore
    return { resolved: true, outcome: homeWon ? 'Yes' : 'No' }
  }

  if (source === 'alpha_vantage') {
    const { symbol, threshold, endDate } = cfg
    if (!symbol || threshold == null) return { resolved: false }
    const end = endDate ? new Date(endDate + 'T23:59:59Z') : new Date()
    if (end > new Date()) return { resolved: false }
    const q = await ds.fetchAlphaVantageQuote(env, symbol)
    if (!q || q.price == null) return { resolved: false }
    const above = q.price >= threshold
    return { resolved: true, outcome: above ? 'Yes' : 'No' }
  }

  if (source === 'coingecko') {
    const { coinId, threshold, endDate } = cfg
    if (!coinId || threshold == null) return { resolved: false }
    const end = endDate ? new Date(endDate + 'T23:59:59Z') : new Date()
    if (end > new Date()) return { resolved: false }
    const prices = await ds.fetchCoinGeckoPrice(env, [coinId], 'usd')
    const price = prices?.[coinId]?.usd
    if (price == null) return { resolved: false }
    const above = price >= threshold
    return { resolved: true, outcome: above ? 'Yes' : 'No' }
  }

  if (source === 'openweathermap') {
    const { city, date } = cfg
    if (!city || !date) return { resolved: false }
    const target = new Date(date + 'T23:59:59Z')
    if (target > new Date()) return { resolved: false }
    const forecast = await ds.fetchOpenWeatherForecast(env, city, 'metric')
    const list = forecast?.list || []
    const dayList = list.filter((x) => x.dt_txt && x.dt_txt.startsWith(date))
    const hadRain = dayList.some((x) => (x.weather && x.weather[0] && (x.weather[0].main === 'Rain' || x.weather[0].main === 'Drizzle')) || (x.pop && x.pop > 0.5))
    return { resolved: true, outcome: hadRain ? 'Yes' : 'No' }
  }

  if (source === 'weatherapi') {
    const { city, date } = cfg
    if (!city || !date) return { resolved: false }
    const target = new Date(date + 'T23:59:59Z')
    if (target > new Date()) return { resolved: false }
    const forecast = await ds.fetchWeatherApiForecast(env, city, 5)
    const forecastDay = forecast?.forecast?.forecastday?.find((d) => d.date === date)
    const hadRain = forecastDay?.day?.daily_will_it_rain === 1
    return { resolved: true, outcome: hadRain ? 'Yes' : 'No' }
  }

  if (source === 'gnews' || source === 'perigon') {
    // News markets: resolve to No after resolution date if no automated check; or leave unresolved for manual
    const endDate = cfg.date || cfg.publishedAt
    if (endDate && new Date(endDate) < new Date()) {
      return { resolved: true, outcome: 'No' }
    }
    return { resolved: false }
  }

  return { resolved: false }
}
