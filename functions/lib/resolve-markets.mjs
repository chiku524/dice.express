/**
 * Resolve prediction markets by calling the appropriate external API and comparing to oracleConfig.
 * Returns { resolved: true, outcome: 'Yes' | 'No' | <string> } or { resolved: false }.
 */
import * as ds from './data-sources.mjs'
import { overlapSetCount } from './news-market-topic.mjs'

/** Is the market due for resolution? (event time or end date has passed) */
export function isMarketDueForResolution(market) {
  const payload = market.payload || {}
  const cfg = payload.oracleConfig || {}
  const source = payload.oracleSource || payload.source

  if (source === 'operator_manual') return false

  if (source === 'the_odds_api') {
    const commenceTime = cfg.commenceTime || payload.commenceTime
    if (commenceTime) return new Date(commenceTime) < new Date()
    return true
  }
  if (source === 'fred') {
    const endDate = cfg.endDate
    if (!endDate) return false
    return new Date(`${endDate}T23:59:59.000Z`) < new Date()
  }
  if (source === 'finnhub') {
    const rd = cfg.reportDate
    if (!rd || String(rd).length < 10) return false
    const grace = new Date(`${String(rd).slice(0, 10)}T23:59:59.000Z`)
    grace.setUTCDate(grace.getUTCDate() + 7)
    return new Date() > grace
  }
  if (source === 'frankfurter') {
    const endDate = cfg.endDate
    if (!endDate) return false
    return new Date(`${String(endDate).slice(0, 10)}T23:59:59.000Z`) < new Date()
  }
  if (source === 'usgs') {
    const endYmd = cfg.usgsEndYmd
    if (!endYmd) return false
    return new Date(`${String(endYmd).slice(0, 10)}T23:59:59.000Z`) < new Date()
  }
  if (source === 'fec') {
    const endYmd = cfg.endDate
    if (!endYmd) return false
    return new Date(`${String(endYmd).slice(0, 10)}T23:59:59.000Z`) < new Date()
  }
  if (source === 'nasa_neo') {
    const endYmd = cfg.nasaNeoEndYmd || cfg.endDate
    if (!endYmd) return false
    return new Date(`${String(endYmd).slice(0, 10)}T23:59:59.000Z`) < new Date()
  }
  if (source === 'bls') {
    const endDate = cfg.endDate
    if (!endDate) return false
    return new Date(`${String(endDate).slice(0, 10)}T23:59:59.000Z`) < new Date()
  }
  if (source === 'congress_gov') {
    const endYmd = cfg.endDate
    if (!endYmd) return false
    return new Date(`${String(endYmd).slice(0, 10)}T23:59:59.000Z`) < new Date()
  }
  if (source === 'alpha_vantage' || source === 'coingecko' || source === 'massive') {
    const endDate = cfg.endDate
    if (endDate) return new Date(endDate + 'T23:59:59Z') < new Date()
    return false
  }
  if (source === 'openweathermap' || source === 'weatherapi') {
    const date = cfg.date
    if (date) return new Date(date + 'T23:59:59Z') < new Date()
    return false
  }
  if (source === 'gnews' || source === 'perigon' || source === 'newsapi_ai' || source === 'newsdata_io') {
    if (cfg.customType) return false
    const day = (cfg.dateStr || cfg.date || '').toString().slice(0, 10)
    if (day && day.length >= 10) return new Date(`${day}T23:59:59.000Z`) < new Date()
    const date = cfg.publishedAt || cfg.date
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

  /** Automated oracle path is binary-oriented; multi-outcome markets settle via ops (e.g. update-market-status). */
  if (payload.marketType === 'MultiOutcome') return { resolved: false }

  if (source === 'operator_manual') return { resolved: false }

  if (source === 'fred') {
    const { seriesId = 'DFF', threshold, comparator = 'gte', endDate } = cfg
    if (threshold == null || !endDate) return { resolved: false }
    if (new Date(`${endDate}T23:59:59.000Z`) > new Date()) return { resolved: false }
    try {
      const row = await ds.fetchFredObservationOnOrBefore(env, seriesId, String(endDate).slice(0, 10))
      if (!row || row.value == null) return { resolved: false }
      const ok = comparator === 'lte' ? row.value <= threshold : row.value >= threshold
      return { resolved: true, outcome: ok ? 'Yes' : 'No' }
    } catch {
      return { resolved: false }
    }
  }

  if (source === 'finnhub') {
    const { finnhubSymbol, epsEstimate, quarter, year } = cfg
    if (!finnhubSymbol || epsEstimate == null || quarter == null || year == null) return { resolved: false }
    try {
      const data = await ds.fetchFinnhubStockEarnings(env, finnhubSymbol)
      const rows = data?.earnings || []
      const row = rows.find(
        (r) => Number(r.quarter) === Number(quarter) && Number(r.year) === Number(year)
      )
      if (!row || row.actual == null) return { resolved: false }
      const actual = parseFloat(row.actual)
      if (Number.isNaN(actual)) return { resolved: false }
      const ok = actual + 1e-9 >= epsEstimate
      return { resolved: true, outcome: ok ? 'Yes' : 'No' }
    } catch {
      return { resolved: false }
    }
  }

  if (source === 'frankfurter') {
    const { base, quote, threshold, comparator = 'gte', endDate } = cfg
    if (!base || !quote || threshold == null || !endDate) return { resolved: false }
    if (new Date(`${String(endDate).slice(0, 10)}T23:59:59.000Z`) > new Date()) return { resolved: false }
    try {
      const r = await ds.fetchFrankfurterRateOnOrBefore(endDate, base, quote)
      if (!r || r.rate == null) return { resolved: false }
      const ok = comparator === 'lte' ? r.rate <= threshold : r.rate >= threshold
      return { resolved: true, outcome: ok ? 'Yes' : 'No' }
    } catch {
      return { resolved: false }
    }
  }

  if (source === 'usgs') {
    const { usgsStartYmd, usgsEndYmd, minMagnitude, minCount } = cfg
    if (!usgsStartYmd || !usgsEndYmd || minCount == null) return { resolved: false }
    if (new Date(`${String(usgsEndYmd).slice(0, 10)}T23:59:59.000Z`) > new Date()) return { resolved: false }
    try {
      const c = await ds.fetchUsgsEarthquakeCount(usgsStartYmd, usgsEndYmd, minMagnitude ?? 5)
      return { resolved: true, outcome: c >= minCount ? 'Yes' : 'No' }
    } catch {
      return { resolved: false }
    }
  }

  if (source === 'fec') {
    const { fecElectionYear, leaderCandidateId, endDate } = cfg
    if (!fecElectionYear || !leaderCandidateId || !endDate) return { resolved: false }
    if (new Date(`${String(endDate).slice(0, 10)}T23:59:59.000Z`) > new Date()) return { resolved: false }
    try {
      const top = await ds.fetchFecTopPresidentialByReceipts(env, fecElectionYear)
      if (!top || !top.candidate_id) return { resolved: false }
      const ok = String(top.candidate_id) === String(leaderCandidateId)
      return { resolved: true, outcome: ok ? 'Yes' : 'No' }
    } catch {
      return { resolved: false }
    }
  }

  if (source === 'nasa_neo') {
    const { nasaNeoStartYmd, nasaNeoEndYmd, neoMinCount } = cfg
    if (!nasaNeoStartYmd || !nasaNeoEndYmd || neoMinCount == null) return { resolved: false }
    const endYmd = cfg.nasaNeoEndYmd || cfg.endDate
    if (new Date(`${String(endYmd).slice(0, 10)}T23:59:59.000Z`) > new Date()) return { resolved: false }
    try {
      const key = ds.nasaApiKey(env)
      const c = await ds.fetchNasaNeoElementCount(nasaNeoStartYmd, nasaNeoEndYmd, key)
      return { resolved: true, outcome: c >= neoMinCount ? 'Yes' : 'No' }
    } catch {
      return { resolved: false }
    }
  }

  if (source === 'bls') {
    const { blsSeriesId, thresholdIndex, comparator = 'gte', endDate } = cfg
    if (!blsSeriesId || thresholdIndex == null || !endDate) return { resolved: false }
    if (new Date(`${String(endDate).slice(0, 10)}T23:59:59.000Z`) > new Date()) return { resolved: false }
    if (!env.BLS_API_KEY) return { resolved: false }
    try {
      const row = await ds.fetchBlsLatestObservationOnOrBefore(env, blsSeriesId, String(endDate).slice(0, 10))
      if (!row || row.value == null) return { resolved: false }
      const ok = comparator === 'lte' ? row.value <= thresholdIndex : row.value >= thresholdIndex
      return { resolved: true, outcome: ok ? 'Yes' : 'No' }
    } catch {
      return { resolved: false }
    }
  }

  if (source === 'congress_gov') {
    const { congress, congressBillLimit, minBillCount, endDate } = cfg
    if (congress == null || minBillCount == null || !endDate) return { resolved: false }
    if (!ds.congressGovApiKey(env)) return { resolved: false }
    if (new Date(`${String(endDate).slice(0, 10)}T23:59:59.000Z`) > new Date()) return { resolved: false }
    try {
      const data = await ds.fetchCongressBillList(env, Number(congress), congressBillLimit || 25)
      const bills = data?.bills || data?.results || []
      const c = Array.isArray(bills) ? bills.length : 0
      return { resolved: true, outcome: c >= minBillCount ? 'Yes' : 'No' }
    } catch {
      return { resolved: false }
    }
  }

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
    const { symbol, threshold, endDate, comparator = 'gte' } = cfg
    if (!symbol || threshold == null) return { resolved: false }
    const end = endDate ? new Date(endDate + 'T23:59:59Z') : new Date()
    if (end > new Date()) return { resolved: false }
    const q = await ds.fetchAlphaVantageQuote(env, symbol)
    if (!q || q.price == null) return { resolved: false }
    const price = q.price
    const ok = comparator === 'lte' ? price <= threshold : price >= threshold
    return { resolved: true, outcome: ok ? 'Yes' : 'No' }
  }

  if (source === 'massive') {
    const { symbol, threshold, endDate, comparator = 'gte' } = cfg
    if (!symbol || threshold == null) return { resolved: false }
    const end = endDate ? new Date(endDate + 'T23:59:59Z') : new Date()
    if (end > new Date()) return { resolved: false }
    if (!env.MASSIVE_API_KEY) return { resolved: false }
    const q = await ds.fetchMassiveLatestDailyClose(env, symbol)
    if (!q || q.price == null) return { resolved: false }
    const price = q.price
    const ok = comparator === 'lte' ? price <= threshold : price >= threshold
    return { resolved: true, outcome: ok ? 'Yes' : 'No' }
  }

  if (source === 'coingecko') {
    const { coinId, threshold, endDate, comparator = 'gte' } = cfg
    if (!coinId || threshold == null) return { resolved: false }
    const end = endDate ? new Date(endDate + 'T23:59:59Z') : new Date()
    if (end > new Date()) return { resolved: false }
    const prices = await ds.fetchCoinGeckoPrice(env, [coinId], 'usd')
    const price = prices?.[coinId]?.usd
    if (price == null) return { resolved: false }
    const ok = comparator === 'lte' ? price <= threshold : price >= threshold
    return { resolved: true, outcome: ok ? 'Yes' : 'No' }
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

  if (cfg.newsResolutionMode === 'feed_topic_continuation') {
    const day = (cfg.dateStr || '').toString().slice(0, 10)
    if (!day || day.length < 10) return { resolved: false }
    if (new Date(`${day}T23:59:59.000Z`) > new Date()) return { resolved: false }
    const anchorList = cfg.anchorTokens
    if (!Array.isArray(anchorList) || anchorList.length === 0) {
      return { resolved: true, outcome: 'No' }
    }
    const anchorSet = new Set(anchorList.map((t) => String(t).toLowerCase()))
    const minO = typeof cfg.minTokenOverlap === 'number' ? cfg.minTokenOverlap : 2
    try {
      const titles = await ds.fetchNewsTitlesForOracle(env, source, cfg)
      for (const t of titles) {
        if (overlapSetCount(anchorSet, t) >= minO) return { resolved: true, outcome: 'Yes' }
      }
      return { resolved: true, outcome: 'No' }
    } catch {
      return { resolved: false }
    }
  }

  if (
    !cfg.customType &&
    (source === 'gnews' || source === 'perigon' || source === 'newsapi_ai' || source === 'newsdata_io')
  ) {
    const day = (cfg.dateStr || cfg.date || '').toString().slice(0, 10)
    if (day && day.length >= 10 && new Date(`${day}T23:59:59.000Z`) < new Date()) {
      return { resolved: true, outcome: 'No' }
    }
    const endDate = cfg.publishedAt
    if (endDate && new Date(endDate) < new Date()) {
      return { resolved: true, outcome: 'No' }
    }
    return { resolved: false }
  }

  return { resolved: false }
}
