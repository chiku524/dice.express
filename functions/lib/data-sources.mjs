/**
 * External data sources for automated prediction markets.
 * All functions take env (with API keys) and return normalized data or throw.
 * Keys are read from env; never hardcode keys.
 */

import { envFlagTrue } from './auto-market-seed.mjs'
import {
  FRANKFURTER_PAIR_ROTATION,
  deterministicShuffle,
  interleaveArrays,
  pickOddsSportKeysForSeed,
  pickRotatingWindow,
  rotatedNewsCategory,
  rotatedNewsQuery,
  utcHourSlot,
  varietyOffsetSlot,
} from './auto-market-variety.mjs'

export {
  deterministicShuffle,
  utcHourSlot,
  rotatedNewsCategory,
  rotatedNewsQuery,
  varietyOffsetSlot,
} from './auto-market-variety.mjs'

/** Pick a stable variant from parallel equivalent wordings (variety without changing oracle semantics). */
function pickVariant(seedKey, variants) {
  const s = String(seedKey)
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return variants[h % variants.length]
}

const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query'
const COINGECKO_PRO_BASE = 'https://pro-api.coingecko.com/api/v3'
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4'
const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5'
const OPENWEATHER_GEO = 'https://api.openweathermap.org/geo/1.0/direct'
const WEATHERAPI_BASE = 'https://api.weatherapi.com/v1'
const GNEWS_BASE = 'https://gnews.io/api/v4'
const PERIGON_BASE = 'https://api.goperigon.com/v1'
const NEWSAPI_AI_BASE = 'https://eventregistry.org/api/v1'
const NEWSDATA_BASE = 'https://newsdata.io/api/1'
const FRED_API_ROOT = 'https://api.stlouisfed.org/fred'
const FINNHUB_BASE = 'https://finnhub.io/api/v1'
const FEC_API_ROOT = 'https://api.open.fec.gov/v1'
const FRANKFURTER_ROOT = 'https://api.frankfurter.app'
const USGS_FDSN_ROOT = 'https://earthquake.usgs.gov/fdsnws/event/1'
const NASA_NEO_ROOT = 'https://api.nasa.gov/neo/rest/v1'
const CONGRESS_GOV_ROOT = 'https://api.congress.gov/v3'
const BLS_TIMESERIES_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data'

/** Generic fetch with timeout; returns JSON or text. */
async function fetchApi(url, options = {}, timeoutMs = 15000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal })
    clearTimeout(t)
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) return await res.json()
    const text = await res.text()
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  } catch (e) {
    clearTimeout(t)
    throw e
  }
}

// --- Alpha Vantage (stocks) ---
/** Get global quote for a symbol. env.ALPHA_VANTAGE_API_KEY */
export async function fetchAlphaVantageQuote(env, symbol = 'AAPL') {
  const key = env.ALPHA_VANTAGE_API_KEY
  if (!key) throw new Error('ALPHA_VANTAGE_API_KEY not set')
  const url = `${ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${key}`
  const data = await fetchApi(url)
  if (data?.Note || data?.Information) {
    console.warn('[data-sources] Alpha Vantage', symbol, String(data.Note || data.Information).slice(0, 200))
  }
  const q = data?.['Global Quote']
  if (!q) return null
  return {
    symbol: q['01 symbol'],
    price: parseFloat(q['05 price']) || null,
    change: parseFloat(q['09 change']) || null,
    changePercent: q['10 change percent'] ? parseFloat(q['10 change percent'].replace('%', '')) : null,
    high: parseFloat(q['03 high']) || null,
    low: parseFloat(q['04 low']) || null,
    volume: parseInt(q['06 volume'], 10) || null,
    latestTradingDay: q['07 latest trading day'],
  }
}

/** List of symbols we can create markets for (sample). */
export const ALPHA_VANTAGE_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BTC', 'ETH']

/** GLOBAL_QUOTE is equity-oriented; BTC/ETH belong on the CoinGecko lane. */
export const ALPHA_VANTAGE_EQUITY_SYMBOLS = ALPHA_VANTAGE_SYMBOLS.filter((s) => s !== 'BTC' && s !== 'ETH')

/** Extra liquid tickers for news→outcome promotion (earnings + price). */
export const NEWS_OUTCOME_EXTRA_TICKERS = [
  'JPM', 'BAC', 'XOM', 'CVX', 'WMT', 'JNJ', 'PG', 'UNH', 'MA', 'V', 'DIS', 'NFLX', 'AMD', 'INTC', 'CSCO',
  'PEP', 'COST', 'ABBV', 'MRK', 'KO', 'TMO', 'ACN', 'DHR', 'MCD', 'ABT', 'WFC', 'BMY', 'NEE', 'PM', 'TXN',
  'RTX', 'UPS', 'QCOM', 'LOW', 'AMT', 'HON', 'SPGI', 'INTU', 'IBM', 'GS', 'CAT', 'DE', 'LMT', 'SBUX',
]

/** All equity tickers used when scanning headlines (excludes BTC/ETH — use crypto path). */
export const ALL_NEWS_PROMO_EQUITY_TICKERS = [
  ...new Set(ALPHA_VANTAGE_SYMBOLS.filter((s) => s !== 'BTC' && s !== 'ETH').concat(NEWS_OUTCOME_EXTRA_TICKERS)),
]

// --- CoinGecko (crypto) ---
/** Get simple price. env.COINGECKO_API_KEY (Pro: x-cg-pro-api-key). */
export async function fetchCoinGeckoPrice(env, coinIds = ['bitcoin'], vsCurrencies = ['usd']) {
  const key = env.COINGECKO_API_KEY
  const ids = (Array.isArray(coinIds) ? coinIds : [coinIds]).join(',')
  const vs = (Array.isArray(vsCurrencies) ? vsCurrencies : [vsCurrencies]).join(',')
  const url = key
    ? `${COINGECKO_PRO_BASE}/simple/price?ids=${ids}&vs_currencies=${vs}`
    : `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vs}`
  const headers = key ? { 'x-cg-pro-api-key': key } : {}
  const data = await fetchApi(url, { headers })
  if (!data || typeof data !== 'object') return null
  const errMsg = data?.status?.error_message || data?.error || data?.errors
  if (errMsg) {
    console.warn('[data-sources] CoinGecko simple/price', String(errMsg).slice(0, 200))
    return null
  }
  return data
}

/** CoinGecko coin ids for common markets. */
export const COINGECKO_COINS = [
  { id: 'bitcoin', symbol: 'BTC' },
  { id: 'ethereum', symbol: 'ETH' },
  { id: 'solana', symbol: 'SOL' },
  { id: 'cardano', symbol: 'ADA' },
  { id: 'dogecoin', symbol: 'DOGE' },
  { id: 'tether', symbol: 'USDT' },
  { id: 'usd-coin', symbol: 'USDC' },
]

// --- The Odds API (sports) ---
/** Primary + optional fallback key when primary quota/auth fails. Never hardcode keys. */
function oddsKeysFromEnv(env) {
  const primary = String(env.THE_ODDS_API_KEY ?? '').trim()
  const fallback = String(env.THE_ODDS_API_KEY_FALLBACK ?? '').trim()
  const out = []
  if (primary) out.push(primary)
  if (fallback && !out.includes(fallback)) out.push(fallback)
  return out
}

function oddsFailureIsKeyOrQuota(status, data) {
  if (status === 401 || status === 402 || status === 403 || status === 429) return true
  const msg = String(data?.message ?? data?.error ?? '').toLowerCase()
  if (
    msg.includes('quota') ||
    msg.includes('exceed') ||
    msg.includes('limit') ||
    msg.includes('out of requests') ||
    msg.includes('usage') ||
    msg.includes('invalid api key') ||
    msg.includes('not authorized')
  )
    return true
  return false
}

async function fetchOddsOnce(url, timeoutMs = 15000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(t)
    const contentType = res.headers.get('content-type') || ''
    let data
    if (contentType.includes('application/json')) data = await res.json()
    else {
      const text = await res.text()
      try {
        data = JSON.parse(text)
      } catch {
        data = { message: text }
      }
    }
    return { ok: res.ok, status: res.status, data }
  } catch (e) {
    clearTimeout(t)
    throw e
  }
}

/** GET Odds API URL; on quota/invalid key (or network error), retries with THE_ODDS_API_KEY_FALLBACK if set. */
async function fetchOddsArrayWithFallback(env, buildUrl) {
  const keys = oddsKeysFromEnv(env)
  if (!keys.length) throw new Error('THE_ODDS_API_KEY not set')
  let lastQuotaErr = null
  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i]
    const url = buildUrl(apiKey)
    let result
    try {
      result = await fetchOddsOnce(url)
    } catch (e) {
      if (e?.name === 'AbortError') throw e
      if (i < keys.length - 1) {
        console.warn('[data-sources] Odds API network error, trying fallback key:', e?.message)
        continue
      }
      throw e
    }
    const { ok, status, data } = result
    if (ok && Array.isArray(data)) return data
    const msg = typeof data?.message === 'string' ? data.message : `HTTP ${status}`
    if (oddsFailureIsKeyOrQuota(status, data) && i < keys.length - 1) {
      console.warn('[data-sources] Odds API:', msg, '- trying THE_ODDS_API_KEY_FALLBACK')
      lastQuotaErr = new Error(msg)
      continue
    }
    if (ok && !Array.isArray(data)) {
      throw new Error(msg === `HTTP ${status}` ? 'Odds API returned non-array' : msg)
    }
    throw new Error(msg)
  }
  throw lastQuotaErr || new Error('THE_ODDS_API_KEY requests failed')
}

/** Get in-season sports. env.THE_ODDS_API_KEY; optional THE_ODDS_API_KEY_FALLBACK. /sports does not count against quota. */
export async function fetchOddsSports(env, all = false) {
  return fetchOddsArrayWithFallback(env, (apiKey) => `${ODDS_API_BASE}/sports?apiKey=${apiKey}${all ? '&all=true' : ''}`)
}

/** Get events with odds for a sport. */
export async function fetchOddsEvents(env, sportKey = 'basketball_nba', regions = 'us', oddsFormat = 'decimal') {
  return fetchOddsArrayWithFallback(
    env,
    (apiKey) =>
      `${ODDS_API_BASE}/sports/${encodeURIComponent(sportKey)}/odds?regions=${regions}&oddsFormat=${oddsFormat}&apiKey=${apiKey}`
  )
}

/** Get scores for completed games. daysFrom 1-3. */
export async function fetchOddsScores(env, sportKey, daysFrom = 2, eventIds = null) {
  return fetchOddsArrayWithFallback(env, (apiKey) => {
    let url = `${ODDS_API_BASE}/sports/${encodeURIComponent(sportKey)}/scores?apiKey=${apiKey}&daysFrom=${daysFrom}`
    if (eventIds && eventIds.length) url += `&eventIds=${eventIds.join(',')}`
    return url
  })
}

// --- OpenWeatherMap ---
/** Geocode city to lat/lon. env.OPENWEATHER_API_KEY */
export async function fetchOpenWeatherGeocode(env, city = 'London', limit = 1) {
  const key = env.OPENWEATHER_API_KEY
  if (!key) throw new Error('OPENWEATHER_API_KEY not set')
  const url = `${OPENWEATHER_GEO}?q=${encodeURIComponent(city)}&limit=${limit}&appid=${key}`
  const data = await fetchApi(url)
  return Array.isArray(data) ? data : []
}

/** Current weather by city name. env.OPENWEATHER_API_KEY */
export async function fetchOpenWeatherCurrent(env, city = 'London', units = 'metric') {
  const key = env.OPENWEATHER_API_KEY
  if (!key) throw new Error('OPENWEATHER_API_KEY not set')
  const url = `${OPENWEATHER_BASE}/weather?q=${encodeURIComponent(city)}&units=${units}&appid=${key}`
  return await fetchApi(url)
}

/** Forecast (next 5 days). env.OPENWEATHER_API_KEY */
export async function fetchOpenWeatherForecast(env, city = 'London', units = 'metric') {
  const key = env.OPENWEATHER_API_KEY
  if (!key) throw new Error('OPENWEATHER_API_KEY not set')
  const geo = await fetchOpenWeatherGeocode(env, city, 1)
  if (!geo[0]) throw new Error(`City not found: ${city}`)
  const { lat, lon } = geo[0]
  const url = `${OPENWEATHER_BASE}/forecast?lat=${lat}&lon=${lon}&units=${units}&appid=${key}`
  return await fetchApi(url)
}

// --- WeatherAPI.com ---
/** Current weather. env.WEATHERAPI_API_KEY */
export async function fetchWeatherApiCurrent(env, q = 'London') {
  const key = env.WEATHERAPI_API_KEY
  if (!key) throw new Error('WEATHERAPI_API_KEY not set')
  const url = `${WEATHERAPI_BASE}/current.json?key=${key}&q=${encodeURIComponent(q)}`
  return await fetchApi(url)
}

/** Forecast. env.WEATHERAPI_API_KEY */
export async function fetchWeatherApiForecast(env, q = 'London', days = 3) {
  const key = env.WEATHERAPI_API_KEY
  if (!key) throw new Error('WEATHERAPI_API_KEY not set')
  const url = `${WEATHERAPI_BASE}/forecast.json?key=${key}&q=${encodeURIComponent(q)}&days=${days}`
  return await fetchApi(url)
}

// --- GNews ---
/** Top headlines. env.GNEWS_API_KEY */
export async function fetchGNewsHeadlines(env, category = 'general', lang = 'en', limit = 10) {
  const key = env.GNEWS_API_KEY
  if (!key) throw new Error('GNEWS_API_KEY not set')
  const url = `${GNEWS_BASE}/top-headlines?category=${category}&lang=${lang}&max=${limit}&apikey=${key}`
  const data = await fetchApi(url)
  return data?.articles || []
}

/** Search news. env.GNEWS_API_KEY */
export async function fetchGNewsSearch(env, q = 'technology', lang = 'en', limit = 10) {
  const key = env.GNEWS_API_KEY
  if (!key) throw new Error('GNEWS_API_KEY not set')
  const url = `${GNEWS_BASE}/search?q=${encodeURIComponent(q)}&lang=${lang}&max=${limit}&apikey=${key}`
  const data = await fetchApi(url)
  return data?.articles || []
}

// --- Perigon ---
/** Search articles. env.PERIGON_API_KEY (Bearer; falls back to legacy query apiKey). */
export async function fetchPerigonSearch(env, q = 'technology', limit = 10) {
  const key = env.PERIGON_API_KEY
  if (!key) throw new Error('PERIGON_API_KEY not set')
  const baseQs = `q=${encodeURIComponent(q)}&size=${limit}`
  const tryFetch = async (url, init = {}) => {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 15000)
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal })
      clearTimeout(t)
      const ct = res.headers.get('content-type') || ''
      let data
      if (ct.includes('application/json')) data = await res.json()
      else {
        const text = await res.text()
        try {
          data = JSON.parse(text)
        } catch {
          data = { message: text?.slice(0, 200) }
        }
      }
      return { res, data }
    } catch (e) {
      clearTimeout(t)
      throw e
    }
  }
  const bearerInit = { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' } }
  let { res, data } = await tryFetch(`${PERIGON_BASE}/all?${baseQs}`, bearerInit)
  const articleCount = () => {
    const a = data?.articles
    const r = data?.results
    return (Array.isArray(a) ? a.length : 0) + (Array.isArray(r) ? r.length : 0)
  }
  if (!res.ok || articleCount() === 0) {
    const legacyUrl = `${PERIGON_BASE}/all?${baseQs}&apiKey=${encodeURIComponent(key)}`
    ;({ res, data } = await tryFetch(legacyUrl))
  }
  if (!res.ok) {
    console.warn('[data-sources] Perigon HTTP', res.status, data?.message || data?.error || '')
    return []
  }
  const articles = data?.articles ?? data?.results ?? []
  return Array.isArray(articles) ? articles : []
}

// --- NewsAPI.ai (Event Registry) ---
/** Search articles. env.NEWSAPI_AI_KEY. Uses Event Registry getArticles (newsapi.ai). */
// --- NewsData.io ---
/** Latest news by query. env.NEWSDATA_API_KEY. API: https://newsdata.io/documentation */
export async function fetchNewsDataIoLatest(env, q = 'technology', language = 'en', limit = 10) {
  const key = env.NEWSDATA_API_KEY
  if (!key) throw new Error('NEWSDATA_API_KEY not set')
  const params = new URLSearchParams({
    apikey: key,
    q: q,
    language,
  })
  const url = `${NEWSDATA_BASE}/latest?${params}`
  const data = await fetchApi(url)
  if (data?.status === 'error') throw new Error(data?.message || 'NewsData.io error')
  const results = data?.results || []
  return results.slice(0, Math.min(limit, 50))
}

export async function fetchNewsApiAiSearch(env, q = 'technology', limit = 10) {
  const key = env.NEWSAPI_AI_KEY
  if (!key) throw new Error('NEWSAPI_AI_KEY not set')
  const url = `${NEWSAPI_AI_BASE}/article/getArticles`
  const body = {
    apiKey: key,
    keyword: q,
    articlesCount: Math.min(limit, 50),
    articlesPage: 1,
  }
  const data = await fetchApi(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const results = data?.articles?.results ?? data?.results ?? []
  return Array.isArray(results) ? results : []
}

/**
 * Article titles from the same feed parameters as market creation (for feed-topic resolution).
 */
export async function fetchNewsTitlesForOracle(env, oracleSource, cfg = {}) {
  const limit = Math.min(Math.max(1, cfg.resolutionCheckLimit || 20), 50)
  try {
    if (oracleSource === 'gnews') {
      const articles = await fetchGNewsHeadlines(env, cfg.category || 'general', 'en', limit)
      return articles.map((a) => (a.title ? String(a.title) : '')).filter(Boolean)
    }
    if (oracleSource === 'perigon') {
      const articles = await fetchPerigonSearch(env, cfg.seedQuery || 'technology', limit)
      return articles.map((a) => String(a.title || a.headline || '')).filter(Boolean)
    }
    if (oracleSource === 'newsapi_ai') {
      const articles = await fetchNewsApiAiSearch(env, cfg.seedQuery || 'technology', limit)
      return articles.map((a) => String(a.title || '')).filter(Boolean)
    }
    if (oracleSource === 'newsdata_io') {
      const articles = await fetchNewsDataIoLatest(env, cfg.seedQuery || 'technology', 'en', limit)
      return articles.map((a) => String(a.title || '')).filter(Boolean)
    }
  } catch (err) {
    console.warn('[data-sources] fetchNewsTitlesForOracle', oracleSource, err?.message)
    throw err
  }
  return []
}

// --- FRED (St. Louis Fed) — env.FRED_API_KEY ---
/**
 * Latest numeric observation on or before observationEnd (YYYY-MM-DD). Skips FRED "." missing values.
 */
export async function fetchFredObservationOnOrBefore(env, seriesId, observationEndYmd) {
  const key = env.FRED_API_KEY
  if (!key) throw new Error('FRED_API_KEY not set')
  const end = (observationEndYmd || '').toString().slice(0, 10)
  const url = `${FRED_API_ROOT}/series/observations?series_id=${encodeURIComponent(seriesId)}&api_key=${encodeURIComponent(key)}&file_type=json&sort_order=desc&observation_end=${encodeURIComponent(end)}&limit=30`
  const data = await fetchApi(url)
  const obs = data?.observations || []
  for (const o of obs) {
    if (!o || o.value === '.' || o.value == null) continue
    const v = parseFloat(o.value)
    if (!Number.isNaN(v)) return { date: o.date, value: v }
  }
  return null
}

// --- Finnhub — env.FINNHUB_API_KEY ---
export async function fetchFinnhubEarningsCalendar(env, symbol, fromYmd, toYmd) {
  const token = env.FINNHUB_API_KEY
  if (!token) throw new Error('FINNHUB_API_KEY not set')
  const url = `${FINNHUB_BASE}/calendar/earnings?symbol=${encodeURIComponent(symbol)}&from=${fromYmd}&to=${toYmd}&token=${encodeURIComponent(token)}`
  const data = await fetchApi(url)
  return Array.isArray(data?.earningsCalendar) ? data.earningsCalendar : []
}

export async function fetchFinnhubStockEarnings(env, symbol) {
  const token = env.FINNHUB_API_KEY
  if (!token) throw new Error('FINNHUB_API_KEY not set')
  const url = `${FINNHUB_BASE}/stock/earnings?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`
  return await fetchApi(url)
}

/**
 * Scheduled macro markets: effective fed funds (DFF) vs a threshold by a future date.
 */
export async function eventsFromFredFunds(env, limit = 2, horizonSlot = utcHourSlot()) {
  const key = env.FRED_API_KEY
  if (!key) return []
  const today = new Date().toISOString().slice(0, 10)
  let current
  try {
    current = await fetchFredObservationOnOrBefore(env, 'DFF', today)
  } catch (err) {
    console.warn('[data-sources] FRED DFF', err?.message)
    return []
  }
  if (!current || current.value == null) return []
  const spot = current.value
  const events = []
  const horizonSets = [
    [14, 28],
    [10, 21],
    [7, 14],
    [12, 26],
  ]
  const pair = horizonSets[Math.abs(horizonSlot) % horizonSets.length]
  const horizons = []
  if (limit >= 1) horizons.push(pair[0])
  if (limit >= 2) horizons.push(pair[1])
  for (const days of horizons) {
    const end = new Date()
    end.setUTCDate(end.getUTCDate() + days)
    const dateStr = end.toISOString().slice(0, 10)
    const threshold = Math.round(spot * 100) / 100
    const title = `Will the effective federal funds rate (FRED: DFF) be at or above ${threshold}% on the last print on or before ${dateStr}?`
    events.push({
      id: `fred-dff-${dateStr}-${days}d`,
      source: 'fred',
      title,
      description: `${title} Latest observation ${spot}% as of ${current.date}. Data source: FRED.`,
      resolutionCriteria: `Yes if the latest FRED series DFF observation on or before ${dateStr} (UTC calendar) is ≥ ${threshold}%. No if it is below. Missing/invalid prints: market stays open until data is available.`,
      oneLiner: `DFF last print on or before ${dateStr} is ≥ ${threshold}%; otherwise No.`,
      endDate: dateStr,
      resolutionDeadline: `${dateStr.slice(0, 10)}T23:59:59.000Z`,
      oracleSource: 'fred',
      oracleConfig: {
        seriesId: 'DFF',
        threshold,
        comparator: 'gte',
        endDate: dateStr,
        outcomeResolutionKind: 'macro_fred',
        unit: 'percent',
      },
    })
  }
  return events
}

/**
 * Upcoming earnings: EPS at or above Finnhub consensus for the next scheduled print.
 */
export async function eventsFromFinnhubEarnings(env, symbols = ALPHA_VANTAGE_EQUITY_SYMBOLS.slice(0, 6), maxEvents = 6) {
  if (!env.FINNHUB_API_KEY) return []
  const today = new Date()
  const fromYmd = today.toISOString().slice(0, 10)
  const to = new Date(today)
  to.setUTCDate(to.getUTCDate() + 90)
  const toYmd = to.toISOString().slice(0, 10)
  const events = []
  for (const symbol of symbols) {
    if (events.length >= maxEvents) break
    let cal = []
    try {
      cal = await fetchFinnhubEarningsCalendar(env, symbol, fromYmd, toYmd)
    } catch (err) {
      console.warn('[data-sources] Finnhub calendar', symbol, err?.message)
      continue
    }
    const upcoming = cal
      .filter((r) => r.symbol === symbol && r.date && r.epsEstimate != null && parseFloat(r.epsEstimate) > 0)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0]
    if (!upcoming) continue
    const epsEst = parseFloat(upcoming.epsEstimate)
    if (Number.isNaN(epsEst)) continue
    const q = upcoming.quarter
    const y = upcoming.year
    const reportDate = String(upcoming.date).slice(0, 10)
    const title = `Will ${symbol} report EPS of at least $${epsEst.toFixed(2)} for Q${q} ${y} (Finnhub consensus)?`
    const id = `fh-earn-${symbol}-${y}-Q${q}-${reportDate}`
    events.push({
      id,
      source: 'finnhub',
      title,
      description: `${title} Expected report date ~${reportDate} (Finnhub earnings calendar). Resolved from Finnhub reported EPS vs stored estimate.`,
      resolutionCriteria: `Yes if Finnhub’s reported EPS (stock/earnings) for ${symbol} Q${q} ${y} is ≥ $${epsEst.toFixed(2)} when available. If no actual EPS after 7 calendar days past ${reportDate}, leave open until data appears or operator intervenes.`,
      oneLiner: `${symbol} Q${q} ${y} EPS ≥ $${epsEst.toFixed(2)}; otherwise No.`,
      endDate: reportDate,
      resolutionDeadline: `${reportDate.slice(0, 10)}T23:59:59.000Z`,
      oracleSource: 'finnhub',
      oracleConfig: {
        finnhubSymbol: symbol,
        epsEstimate: epsEst,
        quarter: q,
        year: y,
        reportDate,
        outcomeResolutionKind: 'earnings_beat',
      },
    })
  }
  return events
}

// --- Frankfurter (ECB reference rates) — NO API KEY ---
/** Latest or historical cross rate: `rates[quote]` = quote units per 1 base. */
export async function fetchFrankfurterRate(dateYmd, base, quote) {
  const path = dateYmd ? `/${String(dateYmd).slice(0, 10)}` : '/latest'
  const url = `${FRANKFURTER_ROOT}${path}?from=${encodeURIComponent(base)}&to=${encodeURIComponent(quote)}`
  const data = await fetchApi(url)
  const r = data?.rates?.[quote]
  if (r == null) return null
  const rate = parseFloat(r)
  if (Number.isNaN(rate)) return null
  return { date: data.date, rate }
}

/** Walk back up to 5 days if ECB did not publish on endYmd (weekends/holidays). */
export async function fetchFrankfurterRateOnOrBefore(endYmd, base, quote) {
  let d = new Date(`${String(endYmd).slice(0, 10)}T12:00:00.000Z`)
  for (let i = 0; i < 6; i++) {
    const ymd = d.toISOString().slice(0, 10)
    try {
      const r = await fetchFrankfurterRate(ymd, base, quote)
      if (r && r.rate != null) return r
    } catch {
      /* try previous day */
    }
    d.setUTCDate(d.getUTCDate() - 1)
  }
  return null
}

export async function eventsFromFrankfurterForex(env, limit = 4, rotateSlot = utcHourSlot()) {
  const n = Math.max(1, Math.min(limit, 4))
  const pairs = pickRotatingWindow(FRANKFURTER_PAIR_ROTATION, n, rotateSlot)
  const events = []
  const settle = new Date()
  settle.setUTCDate(settle.getUTCDate() + 7)
  const dateStr = settle.toISOString().slice(0, 10)
  for (const { base, quote } of pairs) {
    try {
      const cur = await fetchFrankfurterRate(null, base, quote)
      if (!cur || cur.rate == null) continue
      const decimals = quote === 'JPY' ? 2 : 4
      const mult = 10 ** decimals
      const threshold = Math.round(cur.rate * 0.998 * mult) / mult
      const title = pickVariant(`${base}-${quote}-${dateStr}-fx`, [
        `Frankfurter ECB rate: On ${dateStr}, will 1 ${base} buy at least ${threshold} ${quote}?`,
        `FX (${base}/${quote}): ≥ ${threshold} on ${dateStr} per Frankfurter (ECB)?`,
        `Will ${base}/${quote} be ≥ ${threshold} on ${dateStr} using Frankfurter’s ECB feed?`,
      ])
      const id = `fx-${base}-${quote}-${dateStr}`
      events.push({
        id,
        source: 'frankfurter',
        title,
        description: `${title} Spot at seed ≈ ${cur.rate} (Frankfurter date ${cur.date}). Threshold = 99.8% of that spot, rounded to ${decimals} decimal place(s).`,
        resolutionCriteria: `Yes if Frankfurter’s rate for 1 ${base} in ${quote} on ${dateStr}, or the latest ECB rate on or before that date if no print exists, is ≥ ${threshold}. Comparator: ≥. Source: Frankfurter (ECB reference data).`,
        oneLiner: `${base}/${quote} ≥ ${threshold} on ${dateStr}; otherwise No.`,
        endDate: dateStr,
        resolutionDeadline: `${dateStr}T23:59:59.000Z`,
        oracleSource: 'frankfurter',
        oracleConfig: {
          base,
          quote,
          threshold,
          comparator: 'gte',
          endDate: dateStr,
          outcomeResolutionKind: 'forex_ecb',
        },
      })
    } catch (err) {
      console.warn('[data-sources] Frankfurter', base, quote, err?.message)
    }
  }
  return events
}

// --- USGS FDSN earthquake query — NO API KEY ---
export async function fetchUsgsEarthquakeCount(startYmd, endYmd, minMagnitude = 5) {
  const url = `${USGS_FDSN_ROOT}/query?format=geojson&starttime=${encodeURIComponent(startYmd)}&endtime=${encodeURIComponent(endYmd)}&minmagnitude=${minMagnitude}`
  const data = await fetchApi(url)
  const n = data?.metadata?.count
  if (typeof n === 'number') return n
  return Array.isArray(data?.features) ? data.features.length : 0
}

export async function eventsFromUsgsQuakeCount(env, limit = 1, profileSlot = utcHourSlot()) {
  if (limit < 1) return []
  const profiles = [
    { minMag: 5, minCount: 12 },
    { minMag: 4.5, minCount: 26 },
    { minMag: 5.5, minCount: 9 },
  ]
  const { minMag, minCount } = profiles[Math.abs(profileSlot) % profiles.length]
  const start = new Date()
  const startYmd = start.toISOString().slice(0, 10)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 7)
  const endYmd = end.toISOString().slice(0, 10)
  const title = `Will USGS record at least ${minCount} global earthquakes M≥${minMag} from ${startYmd} through ${endYmd} (UTC)?`
  return [
    {
      id: `usgs-m${String(minMag).replace('.', 'p')}-${startYmd}-${endYmd}`,
      source: 'usgs',
      title,
      description: `${title} Counts from USGS FDSNWS event API (public, no key).`,
      resolutionCriteria: `Yes if USGS FDSNWS “count” for starttime=${startYmd} and endtime=${endYmd} with minmagnitude=${minMag} is ≥ ${minCount}.`,
      oneLiner: `≥ ${minCount} quakes M≥${minMag} in window; otherwise No.`,
      endDate: endYmd,
      resolutionDeadline: `${endYmd}T23:59:59.000Z`,
      oracleSource: 'usgs',
      oracleConfig: {
        usgsStartYmd: startYmd,
        usgsEndYmd: endYmd,
        minMagnitude: minMag,
        minCount,
        outcomeResolutionKind: 'usgs_count',
      },
    },
  ]
}

// --- OpenFEC — DEMO_KEY works for low volume; set FEC_API_KEY (or shared api.data.gov key) for production ---
export function fecApiKey(env) {
  const k = env.FEC_API_KEY || env.OPENFEC_API_KEY || env.DATA_GOV_API_KEY
  if (k && String(k).trim()) return String(k).trim()
  return 'DEMO_KEY'
}

export async function fetchFecTopPresidentialByReceipts(env, electionYear) {
  const key = fecApiKey(env)
  const url = `${FEC_API_ROOT}/candidates/totals/?election_year=${electionYear}&office=P&sort=-receipts&per_page=3&api_key=${encodeURIComponent(key)}`
  const data = await fetchApi(url)
  const results = data?.results || []
  return results.length ? results[0] : null
}

export async function eventsFromFecPresidentialLead(env, limit = 1) {
  if (limit < 1) return []
  const electionYear = nextUsPresidentialElectionYear()
  let top
  try {
    top = await fetchFecTopPresidentialByReceipts(env, electionYear)
  } catch (err) {
    console.warn('[data-sources] OpenFEC', err?.message)
    return []
  }
  if (!top || !top.candidate_id) return []
  const name = top.name || top.candidate_id
  const receipts = top.receipts != null ? `$${Number(top.receipts).toLocaleString()}` : 'N/A'
  const end = new Date()
  end.setUTCDate(end.getUTCDate() + 21)
  const endYmd = end.toISOString().slice(0, 10)
  const title = `Will ${name} still lead presidential candidates by FEC total receipts for ${electionYear} on ${endYmd}?`
  return [
    {
      id: `fec-pres-lead-${electionYear}-${endYmd}`,
      source: 'fec',
      title,
      description: `${title} Leader by OpenFEC candidates/totals when created (${receipts} reported). Use FEC_API_KEY in production (DEMO_KEY is rate-limited).`,
      resolutionCriteria: `Yes if the same OpenFEC query (election_year=${electionYear}, office=P, sort=-receipts) still lists candidate_id ${top.candidate_id} first on resolution. Ties: Yes only if that candidate remains first in API order.`,
      oneLiner: `${name} stays #1 by receipts on ${endYmd}; otherwise No.`,
      endDate: endYmd,
      resolutionDeadline: `${endYmd}T23:59:59.000Z`,
      oracleSource: 'fec',
      oracleConfig: {
        fecElectionYear: electionYear,
        leaderCandidateId: top.candidate_id,
        leaderName: name,
        outcomeResolutionKind: 'fec_presidential_lead',
        endDate: endYmd,
      },
    },
  ]
}

function nextUsPresidentialElectionYear() {
  const y = new Date().getUTCFullYear()
  const cycles = [2024, 2028, 2032, 2036, 2040, 2044]
  return cycles.find((c) => c >= y) || y + 4 - (y % 4)
}

// --- NASA NeoWs — DEMO_KEY allowed; set NASA_API_KEY (or shared api.data.gov key) for higher limits ---
export function nasaApiKey(env) {
  const k = env.NASA_API_KEY || env.DATA_GOV_API_KEY
  if (k && String(k).trim()) return String(k).trim()
  return 'DEMO_KEY'
}

export async function fetchNasaNeoElementCount(startYmd, endYmd, apiKey) {
  const url = `${NASA_NEO_ROOT}/feed?start_date=${encodeURIComponent(startYmd)}&end_date=${encodeURIComponent(endYmd)}&api_key=${encodeURIComponent(apiKey)}`
  const data = await fetchApi(url)
  const n = data?.element_count
  return typeof n === 'number' ? n : 0
}

export async function eventsFromNasaNeo(env, limit = 1) {
  if (limit < 1) return []
  const startYmd = new Date().toISOString().slice(0, 10)
  const end = new Date()
  end.setUTCDate(end.getUTCDate() + 7)
  const endYmd = end.toISOString().slice(0, 10)
  const key = nasaApiKey(env)
  let baseline = 0
  try {
    baseline = await fetchNasaNeoElementCount(startYmd, endYmd, key)
  } catch (err) {
    console.warn('[data-sources] NASA NEO', err?.message)
    return []
  }
  const threshold = Math.max(35, Math.ceil(baseline * 1.08))
  const title = `Will NASA NeoWs report at least ${threshold} near-Earth objects from ${startYmd} through ${endYmd}?`
  return [
    {
      id: `nasa-neo-${startYmd}-${endYmd}`,
      source: 'nasa_neo',
      title,
      description: `${title} Uses element_count from NeoWs feed. Public DEMO_KEY ok; set NASA_API_KEY for production.`,
      resolutionCriteria: `Yes if NASA NeoWs feed for the same start_date/end_date returns element_count ≥ ${threshold}. API: https://api.nasa.gov.`,
      oneLiner: `NeoWs element_count ≥ ${threshold}; otherwise No.`,
      endDate: endYmd,
      resolutionDeadline: `${endYmd}T23:59:59.000Z`,
      oracleSource: 'nasa_neo',
      oracleConfig: {
        nasaNeoStartYmd: startYmd,
        nasaNeoEndYmd: endYmd,
        neoMinCount: threshold,
        outcomeResolutionKind: 'nasa_neo_count',
      },
    },
  ]
}

// --- BLS Public Data API — free registration: https://data.bls.gov/registrationEngine/ ---
export async function fetchBlsLatestObservation(env, seriesId) {
  const regKey = env.BLS_API_KEY
  if (!regKey || !String(regKey).trim()) throw new Error('BLS_API_KEY not set')
  const y = new Date().getUTCFullYear()
  const body = JSON.stringify({
    seriesid: [seriesId],
    startyear: String(y - 1),
    endyear: String(y),
    registrationkey: String(regKey).trim(),
  })
  const data = await fetchApi(BLS_TIMESERIES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  const series = data?.Results?.series?.[0]
  const pts = series?.data || []
  const latest = pts[0]
  if (!latest || latest.value == null) return null
  const v = parseFloat(latest.value)
  if (Number.isNaN(v)) return null
  return { period: latest.period, year: latest.year, value: v }
}

function blsPeriodEndUtc(yearStr, period) {
  const y = parseInt(yearStr, 10)
  if (!period?.startsWith('M')) return null
  const mi = parseInt(period.slice(1), 10) - 1
  if (mi < 0 || mi > 11) return null
  return new Date(Date.UTC(y, mi + 1, 0, 23, 59, 59, 999))
}

/** Newest observation whose period end is on or before endYmd (for resolution). */
export async function fetchBlsLatestObservationOnOrBefore(env, seriesId, endYmd) {
  const regKey = env.BLS_API_KEY
  if (!regKey || !String(regKey).trim()) throw new Error('BLS_API_KEY not set')
  const end = new Date(`${String(endYmd).slice(0, 10)}T23:59:59.000Z`)
  const y = new Date().getUTCFullYear()
  const body = JSON.stringify({
    seriesid: [seriesId],
    startyear: String(y - 2),
    endyear: String(y + 1),
    registrationkey: String(regKey).trim(),
  })
  const data = await fetchApi(BLS_TIMESERIES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  const series = data?.Results?.series?.[0]
  const pts = series?.data || []
  for (const pt of pts) {
    const d = blsPeriodEndUtc(pt.year, pt.period)
    if (!d || d > end) continue
    const v = parseFloat(pt.value)
    if (Number.isNaN(v)) continue
    return { period: pt.period, year: pt.year, value: v }
  }
  return null
}

export async function eventsFromBlsCpi(env, limit = 1) {
  if (limit < 1 || !env.BLS_API_KEY) return []
  const seriesId = 'CUSR0000SA0'
  let obs
  try {
    obs = await fetchBlsLatestObservation(env, seriesId)
  } catch (err) {
    console.warn('[data-sources] BLS CPI', err?.message)
    return []
  }
  if (!obs) return []
  const threshold = Math.round(obs.value * 1000) / 1000
  const end = new Date()
  end.setUTCDate(end.getUTCDate() + 45)
  const endYmd = end.toISOString().slice(0, 10)
  const title = `Will CPI-U (all items, seasonally adjusted, BLS ${seriesId}) stay at or above index ${threshold} on the latest print on or before ${endYmd}?`
  return [
    {
      id: `bls-cpi-${seriesId}-${endYmd}`,
      source: 'bls',
      title,
      description: `${title} Latest BLS point ${obs.year} ${obs.period}: ${obs.value}. Requires free BLS_API_KEY (data.bls.gov; not api.data.gov).`,
      resolutionCriteria: `Yes if the latest BLS observation for ${seriesId} on or before ${endYmd} is ≥ ${threshold}. No if below. Source: U.S. Bureau of Labor Statistics Public Data API.`,
      oneLiner: `CPI-U SA index ≥ ${threshold} on last print by ${endYmd}; otherwise No.`,
      endDate: endYmd,
      resolutionDeadline: `${endYmd}T23:59:59.000Z`,
      oracleSource: 'bls',
      oracleConfig: {
        blsSeriesId: seriesId,
        thresholdIndex: threshold,
        comparator: 'gte',
        endDate: endYmd,
        outcomeResolutionKind: 'bls_cpi',
      },
    },
  ]
}

// --- Congress.gov v3 — key from https://api.congress.gov/sign-up/ (often same style as api.data.gov keys) ---
export function congressGovApiKey(env) {
  const k = env.CONGRESS_GOV_API_KEY || env.DATA_GOV_API_KEY
  return k && String(k).trim() ? String(k).trim() : ''
}

/** Default session when CONGRESS_GOV_CONGRESS is unset (UTC year heuristic). */
export function defaultCongressGovSession(env) {
  const raw = env?.CONGRESS_GOV_CONGRESS
  if (raw != null && String(raw).trim() !== '') {
    const n = parseInt(String(raw).trim(), 10)
    if (Number.isFinite(n) && n >= 1 && n <= 999) return n
  }
  const y = new Date().getUTCFullYear()
  if (y >= 2025) return 119
  if (y >= 2023) return 118
  return 117
}

/** Recent bills (metadata only). Used for seeding; resolution is count-based for transparency. */
export async function fetchCongressBillList(env, congress, limit = 5) {
  const key = congressGovApiKey(env)
  if (!key) throw new Error('CONGRESS_GOV_API_KEY or DATA_GOV_API_KEY not set')
  const url = `${CONGRESS_GOV_ROOT}/bill/${congress}?api_key=${encodeURIComponent(key)}&limit=${limit}&sort=updateDate+desc`
  return await fetchApi(url)
}

/**
 * Outcome market: same Congress.gov query at resolution must still return ≥ minBillCount bills (first page).
 * Transparent but sensitive to API pagination/behavior changes.
 */
export async function eventsFromCongressGovBillFeed(env, limit = 1) {
  if (limit < 1 || !congressGovApiKey(env)) return []
  const congress = defaultCongressGovSession(env)
  const pageSize = 25
  let data
  try {
    data = await fetchCongressBillList(env, congress, pageSize)
  } catch (err) {
    console.warn('[data-sources] Congress.gov seed', err?.message)
    return []
  }
  const bills = data?.bills || data?.results || []
  const n = Array.isArray(bills) ? bills.length : 0
  if (n < 1) return []
  // minBillCount must stay ≤ n or the market is impossible; old rule required n≥5 and broke on sparse pages.
  const minBillCount = Math.max(1, Math.min(n, Math.floor(n * 0.88)))
  const end = new Date()
  end.setUTCDate(end.getUTCDate() + 30)
  const endYmd = end.toISOString().slice(0, 10)
  const title = `Will Congress.gov still return at least ${minBillCount} bills (first page, updateDate desc) for the ${congress}th Congress on ${endYmd}?`
  return [
    {
      id: `congress-feed-${congress}-${endYmd}`,
      source: 'congress_gov',
      title,
      description: `${title} Snapshot at creation: ${n} bills on first page (limit=${pageSize}). Resolution re-runs the same API call.`,
      resolutionCriteria: `Yes if GET /v3/bill/${congress} with limit=${pageSize} and sort=updateDate+desc returns an array of length ≥ ${minBillCount} on resolution day. No otherwise. Source: Congress.gov API v3.`,
      oneLiner: `Congress.gov bill list still has ≥ ${minBillCount} items on first page; otherwise No.`,
      endDate: endYmd,
      resolutionDeadline: `${endYmd}T23:59:59.000Z`,
      oracleSource: 'congress_gov',
      oracleConfig: {
        congress,
        congressBillLimit: pageSize,
        minBillCount,
        outcomeResolutionKind: 'congress_feed_count',
        endDate: endYmd,
      },
    },
  ]
}

// --- RapidAPI (generic: use with any RapidAPI hub API) ---
/** Call a RapidAPI host. env.RAPIDAPI_KEY. Pass host (e.g. api-nba-v1.p.rapidapi.com) and path. */
export async function fetchRapidApi(env, host, path, query = {}) {
  const key = env.RAPIDAPI_KEY
  if (!key) throw new Error('RAPIDAPI_KEY not set')
  const qs = new URLSearchParams(query).toString()
  const url = `https://${host}${path.startsWith('/') ? path : `/${path}`}${qs ? `?${qs}` : ''}`
  const data = await fetchApi(url, {
    headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': host },
  })
  return data
}

// --- Massive (https://massive.com — successor to Polygon.io stock market API) ---
/**
 * Generic GET helper. Auth uses `apiKey` query param (Polygon/Massive REST style). env.MASSIVE_API_KEY.
 * Optional env.MASSIVE_API_BASE (default https://api.massive.com).
 */
export async function fetchMassive(env, path = '/', query = {}) {
  const key = env.MASSIVE_API_KEY
  if (!key) throw new Error('MASSIVE_API_KEY not set')
  const base = (env.MASSIVE_API_BASE || 'https://api.massive.com').replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  const q = new URLSearchParams({ apiKey: key, ...query })
  const url = `${base}${p}?${q.toString()}`
  return fetchApi(url)
}

/**
 * Latest completed daily bar close for equities (for threshold markets + resolution). env.MASSIVE_API_KEY.
 */
export async function fetchMassiveLatestDailyClose(env, ticker = 'AAPL') {
  const key = env.MASSIVE_API_KEY
  if (!key) throw new Error('MASSIVE_API_KEY not set')
  const base = (env.MASSIVE_API_BASE || 'https://api.massive.com').replace(/\/$/, '')
  const to = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 21 * 864e5).toISOString().slice(0, 10)
  const url = `${base}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${from}/${to}?adjusted=true&sort=desc&limit=1&apiKey=${encodeURIComponent(key)}`
  const data = await fetchApi(url)
  const bar = data?.results?.[0]
  if (!bar || bar.c == null) return null
  const day = bar.t != null ? new Date(bar.t).toISOString().slice(0, 10) : null
  return {
    symbol: ticker,
    price: bar.c,
    high: bar.h,
    low: bar.l,
    open: bar.o,
    volume: bar.v,
    latestTradingDay: day,
  }
}

// --- Event builders for auto-markets (normalize API responses into "events" we can turn into markets) ---

function formatEventStart(isoString) {
  if (!isoString) return 'TBD'
  try {
    const d = new Date(isoString)
    return d.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
  } catch {
    return isoString
  }
}

export async function eventsFromOdds(env, sportKey = 'basketball_nba', limit = 20) {
  const events = await fetchOddsEvents(env, sportKey, 'us', 'decimal')
  const list = (events || []).slice(0, limit).map((e) => {
    const eventStart = formatEventStart(e.commence_time)
    const seedKey = `${e.id}-${e.home_team}`
    const title = pickVariant(seedKey, [
      `Will ${e.home_team} (home on card) defeat ${e.away_team} per The Odds API final score?`,
      `Will ${e.home_team} beat ${e.away_team} as the winning side on The Odds API’s completed fixture?`,
      `Moneyline (home): Will ${e.home_team} finish ahead of ${e.away_team} when The Odds API marks the game complete?`,
    ])
    const description = `${title} Scheduled start (local format): ${eventStart}. Teams and home/away roles follow this Odds API event id (${e.id}). Resolution uses only The Odds API /scores for sport ${e.sport_key || 'TBD'}—no manual picks.`
    const resolutionCriteria = `Yes if The Odds API reports the fixture complete and the score for ${e.home_team} (home_team) is strictly greater than the score for ${e.away_team} (away_team). No if away scores higher, scores are equal (including draws), the event is cancelled or not completed in the API, or scores are missing. Commence time (API): ${e.commence_time || 'TBD'}.`
    const oneLiner = `Yes if ${e.home_team} wins on the posted final score; No if ${e.away_team} wins or the result is a draw.`
    const resolutionDeadline = resolutionAfterCommence(e.commence_time, 3)
    return {
      id: e.id,
      source: 'the_odds_api',
      sportKey: e.sport_key,
      title,
      description,
      resolutionCriteria,
      oneLiner,
      endDate: e.commence_time ? e.commence_time.slice(0, 10) : null,
      resolutionDeadline: resolutionDeadline || (e.commence_time ? e.commence_time.slice(0, 10) : null),
      commenceTime: e.commence_time,
      homeTeam: e.home_team,
      awayTeam: e.away_team,
      oracleSource: 'the_odds_api',
      oracleConfig: { eventId: e.id, sportKey: e.sport_key, homeTeam: e.home_team, awayTeam: e.away_team, commenceTime: e.commence_time },
    }
  })
  return list
}

/** Stock threshold markets from Massive daily aggregates (parallel to Alpha Vantage stock lane). */
export async function eventsFromMassive(env, symbols = ALPHA_VANTAGE_SYMBOLS.slice(0, 3), opts = {}) {
  const mix = Number(opts.thresholdMix ?? 0) || 0
  const mults = [1.034, 1.048, 1.056, 1.042, 1.051]
  const events = []
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 7)
  const dateStr = endDate.toISOString().slice(0, 10)
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i]
    try {
      const q = await fetchMassiveLatestDailyClose(env, symbol)
      if (!q || q.price == null) continue
      const mult = mults[(i + mix) % mults.length]
      const threshold = Math.round(q.price * mult)
      const title = pickVariant(`${symbol}-${dateStr}-m`, [
        `Will ${symbol}’s latest Massive daily bar close be ≥ $${threshold} after ${dateStr} (UTC calendar)?`,
        `After ${dateStr}, will Massive’s most recent completed 1D close for ${symbol} reach at least $${threshold}?`,
        `Massive 1D close: Will ${symbol} show ≥ $${threshold} when resolved after the deadline?`,
      ])
      events.push({
        id: `massive-${symbol}-${dateStr}`,
        source: 'massive',
        title,
        description: `${title} Reference print when created: about $${q.price} (latest daily bar in Massive feed). Threshold rounds to whole dollars as stored.`,
        resolutionCriteria: `After ${dateStr}T23:59:59.000Z (UTC end of that calendar day), Yes if Massive’s latest available completed daily aggregate close (same ticker endpoint as at seeding) is ≥ $${threshold} USD. No if below. Comparator: ≥. Data: Massive daily aggregates.`,
        oneLiner: `Yes if Massive latest completed daily close ≥ $${threshold} after UTC end of ${dateStr}; otherwise No.`,
        symbol,
        threshold,
        endDate: dateStr,
        resolutionDeadline: resolutionEndOfDayUTC(dateStr),
        oracleSource: 'massive',
        oracleConfig: { symbol, threshold, endDate: dateStr },
      })
    } catch (err) {
      console.warn('[data-sources] Massive', symbol, err?.message)
    }
  }
  return events
}

export async function eventsFromAlphaVantage(env, symbols = ALPHA_VANTAGE_SYMBOLS.slice(0, 5), opts = {}) {
  const mix = Number(opts.thresholdMix ?? 0) || 0
  const mults = [1.034, 1.048, 1.056, 1.041, 1.052]
  const events = []
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 7)
  const dateStr = endDate.toISOString().slice(0, 10)
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i]
    try {
      const q = await fetchAlphaVantageQuote(env, symbol)
      if (!q || q.price == null) continue
      const mult = mults[(i + mix) % mults.length]
      const threshold = Math.round(q.price * mult)
      const title = pickVariant(`${symbol}-${dateStr}-av`, [
        `Will Alpha Vantage’s GLOBAL_QUOTE price for ${symbol} be ≥ $${threshold} after ${dateStr} (UTC)?`,
        `After ${dateStr}, will ${symbol} quote at or above $${threshold} on Alpha Vantage GLOBAL_QUOTE?`,
        `${symbol} ≥ $${threshold} on Alpha Vantage (post–${dateStr} resolution check)?`,
      ])
      events.push({
        id: `av-${symbol}-${dateStr}`,
        source: 'alpha_vantage',
        title,
        description: `${title} Snapshot “05. price” when created: about $${q.price}. Important: resolution reads GLOBAL_QUOTE again after the deadline—not a frozen historical auction print.`,
        resolutionCriteria: `After ${dateStr}T23:59:59.000Z, Yes if Alpha Vantage GLOBAL_QUOTE field “05. price” for ${symbol} is ≥ $${threshold} USD on that fetch. No if below or quote missing. (Uses the live GLOBAL_QUOTE returned when the worker resolves, not a stored historical print.)`,
        oneLiner: `Yes if Alpha Vantage GLOBAL_QUOTE ≥ $${threshold} after UTC end of ${dateStr}; otherwise No.`,
        symbol,
        threshold,
        endDate: dateStr,
        resolutionDeadline: resolutionEndOfDayUTC(dateStr),
        oracleSource: 'alpha_vantage',
        oracleConfig: { symbol, threshold, endDate: dateStr },
      })
    } catch (err) {
      console.warn('[data-sources] Alpha Vantage', symbol, err?.message)
    }
  }
  return events
}

export async function eventsFromCoinGecko(env, coins = COINGECKO_COINS.slice(0, 3), opts = {}) {
  const mix = Number(opts.thresholdMix ?? 0) || 0
  const mults = [1.072, 1.088, 1.105, 1.092, 1.078]
  const ids = coins.map((c) => (typeof c === 'string' ? c : c.id))
  const prices = await fetchCoinGeckoPrice(env, ids, 'usd')
  if (!prices || typeof prices !== 'object') return []
  const events = []
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 7)
  const dateStr = endDate.toISOString().slice(0, 10)
  for (let i = 0; i < coins.length; i++) {
    const c = coins[i]
    const id = typeof c === 'string' ? c : c.id
    const sym = typeof c === 'string' ? id.toUpperCase() : c.symbol
    const price = prices[id]?.usd
    if (price == null) continue
    const mult = mults[(i + mix) % mults.length]
    const threshold = Math.round(price * mult)
    const title = pickVariant(`${id}-${dateStr}-cg`, [
      `Will CoinGecko USD spot for ${sym} (${id}) be ≥ $${threshold} after ${dateStr} (UTC)?`,
      `After ${dateStr}, will ${sym} trade at or above $${threshold} on CoinGecko simple/price?`,
      `Crypto spot: ${sym} ≥ $${threshold} on CoinGecko when resolved past ${dateStr}?`,
    ])
    events.push({
      id: `cg-${id}-${dateStr}`,
      source: 'coingecko',
      title,
      description: `${title} Spot USD when created: about $${price}. Coin ID: ${id}. Resolution re-fetches simple/price after the deadline.`,
      resolutionCriteria: `After ${dateStr}T23:59:59.000Z, Yes if CoinGecko simple/price for coin id “${id}” in USD is ≥ $${threshold}. No if below or price missing. Source: CoinGecko API (same family as at creation).`,
      oneLiner: `Yes if CoinGecko USD spot ≥ $${threshold} after UTC end of ${dateStr}; otherwise No.`,
      symbol: sym,
      coinId: id,
      threshold,
      endDate: dateStr,
      resolutionDeadline: resolutionEndOfDayUTC(dateStr),
      oracleSource: 'coingecko',
      oracleConfig: { coinId: id, symbol: sym, threshold, endDate: dateStr },
    })
  }
  return events
}

export const WEATHER_CITIES = [
  'London',
  'New York',
  'Los Angeles',
  'Chicago',
  'Tokyo',
  'Paris',
  'Sydney',
  'Singapore',
  'Dubai',
  'Berlin',
  'Toronto',
  'Mumbai',
  'Seoul',
  'Madrid',
  'Amsterdam',
  'Mexico City',
  'Vancouver',
]

/** Precise resolution time: end of calendar day UTC (for news, weather, crypto date-based). */
export function resolutionEndOfDayUTC(dateStr) {
  if (!dateStr || dateStr.length < 10) return null
  return `${dateStr.slice(0, 10)}T23:59:59.000Z`
}

/**
 * US equity regular-session close mapped to UTC (4pm America/New_York, DST heuristic by month).
 * Auto-seeded price markets use `resolutionEndOfDayUTC` instead so `resolutionDeadline` matches the worker gate.
 */
export function resolutionUSMarketCloseUTC(dateStr) {
  if (!dateStr || dateStr.length < 10) return null
  const y = dateStr.slice(0, 4)
  const m = dateStr.slice(5, 7)
  const d = dateStr.slice(8, 10)
  const month = parseInt(m, 10)
  const isDST = month >= 3 && month <= 10
  const utcHour = isDST ? 20 : 21
  return `${y}-${m}-${d}T${String(utcHour).padStart(2, '0')}:00:00.000Z`
}

/** Resolution time: commenceTime + hours (for sports; when the game is final and result is known). NBA/NHL ~2.5h, use 3h. */
function resolutionAfterCommence(commenceTimeIso, hours = 3) {
  if (!commenceTimeIso) return null
  const d = new Date(commenceTimeIso)
  if (Number.isNaN(d.getTime())) return null
  d.setUTCHours(d.getUTCHours() + hours)
  return d.toISOString()
}

export async function eventsFromOpenWeather(env, cities = WEATHER_CITIES.slice(0, 3)) {
  const events = []
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateStr = tomorrow.toISOString().slice(0, 10)
  for (const city of cities) {
    try {
      const forecast = await fetchOpenWeatherForecast(env, city, 'metric')
      const list = forecast?.list || []
      const dayList = list.filter((x) => x.dt_txt && x.dt_txt.startsWith(dateStr))
      const title = pickVariant(`${city}-${dateStr}-ow`, [
        `Will OpenWeather show rain, drizzle, or >50% POP for ${city} on ${dateStr} (UTC date)?`,
        `OpenWeather (${city}, ${dateStr}): rain, drizzle, or high precipitation probability?`,
        `Will ${city} hit the OpenWeather rain/drizzle/high-POP rule on ${dateStr}?`,
      ])
      events.push({
        id: `ow-${city.replace(/\s+/g, '-')}-${dateStr}`,
        source: 'openweathermap',
        title,
        description: `${title} POP = probability of precipitation on a 3-hour step. Same rule is re-evaluated from a fresh forecast fetch at resolution.`,
        resolutionCriteria: `For ${city} on calendar date ${dateStr} (UTC), Yes if any OpenWeather 3-hour forecast step in that day has weather.main “Rain” or “Drizzle”, or has probability of precipitation (pop) strictly greater than 0.5. No otherwise. Re-fetch the same OpenWeather forecast API at resolution (metric units).`,
        oneLiner: `Yes if any 3h step is Rain/Drizzle or pop > 0.5; otherwise No.`,
        endDate: dateStr,
        resolutionDeadline: resolutionEndOfDayUTC(dateStr),
        city,
        date: dateStr,
        oracleSource: 'openweathermap',
        oracleConfig: { city, date: dateStr },
      })
    } catch (err) {
      console.warn('[data-sources] OpenWeather', city, err?.message)
    }
  }
  return events
}

export async function eventsFromWeatherApi(env, cities = WEATHER_CITIES.slice(0, 3)) {
  const events = []
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateStr = tomorrow.toISOString().slice(0, 10)
  for (const city of cities) {
    try {
      await fetchWeatherApiForecast(env, city, 3)
      const title = pickVariant(`${city}-${dateStr}-wa`, [
        `Will WeatherAPI flag measurable rain for ${city} on ${dateStr}?`,
        `WeatherAPI daily_will_it_rain = 1 for ${city} on ${dateStr}?`,
        `Rain day (${city}): does WeatherAPI’s daily forecast say it will rain on ${dateStr}?`,
      ])
      events.push({
        id: `wa-${city.replace(/\s+/g, '-')}-${dateStr}`,
        source: 'weatherapi',
        title,
        description: `${title} Oracle field: forecastday[].day.daily_will_it_rain === 1 for date ${dateStr}. Re-checked via the same WeatherAPI forecast call at resolution.`,
        resolutionCriteria: `Yes if WeatherAPI forecast for ${city} has daily_will_it_rain === 1 on ${dateStr} for that calendar day. No if 0 or day missing. Data source: WeatherAPI.com forecast.json.`,
        oneLiner: `Yes if daily_will_it_rain is 1; otherwise No.`,
        endDate: dateStr,
        resolutionDeadline: resolutionEndOfDayUTC(dateStr),
        city,
        date: dateStr,
        oracleSource: 'weatherapi',
        oracleConfig: { city, date: dateStr },
      })
    } catch (err) {
      console.warn('[data-sources] WeatherAPI', city, err?.message)
    }
  }
  return events
}

/** Sanitize headline to English ASCII (strip control chars, optional max length). */
function sanitizeHeadline(text, maxLen = null) {
  if (!text || typeof text !== 'string') return 'This headline'
  const cleaned = text.replace(/[\x00-\x1f]/g, '').trim()
  return maxLen != null ? cleaned.slice(0, maxLen) : cleaned
}

export async function eventsFromGNews(env, category = 'general', limit = 5) {
  const articles = await fetchGNewsHeadlines(env, category, 'en', limit)
  const dateStr = new Date().toISOString().slice(0, 10)
  const events = articles.slice(0, limit).map((a, i) => {
    const fullHeadline = sanitizeHeadline(a.title)
    return {
      id: `gnews-${category}-${Date.now()}-${i}`,
      source: 'gnews',
      title: fullHeadline,
      description: pickVariant(`${category}-${i}-${dateStr}`, [
        `Headline from GNews category “${category}” (${dateStr})—may become a feed-continuation or promoted outcome market after enrichment.`,
        `GNews “${category}” article title captured ${dateStr}; downstream automation picks resolution mode.`,
        `Source row: GNews top headlines · ${category} · ${dateStr}.`,
      ]),
      resolutionCriteria: '',
      oneLiner: '',
      endDate: dateStr,
      resolutionDeadline: resolutionEndOfDayUTC(dateStr),
      oracleSource: 'gnews',
      oracleConfig: {
        title: a.title,
        url: a.url,
        publishedAt: a.publishedAt,
        dateStr,
        category,
      },
      seedNewsSource: 'gnews',
    }
  })
  return events
}

export async function eventsFromPerigon(env, q = 'technology', limit = 5) {
  const articles = await fetchPerigonSearch(env, q, limit)
  const dateStr = new Date().toISOString().slice(0, 10)
  const events = (articles || []).slice(0, limit).map((a, i) => {
    const fullHeadline = sanitizeHeadline(a.title || a.headline)
    return {
      id: `perigon-${Date.now()}-${i}`,
      source: 'perigon',
      title: fullHeadline,
      description: pickVariant(`${q}-${i}-${dateStr}-pg`, [
        `Perigon search “${q}” (${dateStr})—headline retained for automated topic/outcome promotion.`,
        `Article from Perigon query “${q}” on ${dateStr}; resolution mode assigned later in the seed pipeline.`,
        `Perigon hit · query “${q}” · ${dateStr}.`,
      ]),
      resolutionCriteria: '',
      oneLiner: '',
      endDate: dateStr,
      resolutionDeadline: resolutionEndOfDayUTC(dateStr),
      oracleSource: 'perigon',
      oracleConfig: { title: a.title || a.headline, url: a.url, dateStr, seedQuery: q },
      seedNewsSource: 'perigon',
    }
  })
  return events
}

export async function eventsFromNewsApiAi(env, q = 'technology', limit = 5) {
  const articles = await fetchNewsApiAiSearch(env, q, limit)
  const dateStr = new Date().toISOString().slice(0, 10)
  const events = (articles || []).slice(0, limit).map((a, i) => {
    const fullHeadline = sanitizeHeadline(a.title)
    return {
      id: `newsapi_ai-${Date.now()}-${i}`,
      source: 'newsapi_ai',
      title: fullHeadline,
      description: pickVariant(`${q}-${i}-${dateStr}-nai`, [
        `NewsAPI.ai articles for “${q}” (${dateStr})—seed headline for automated markets.`,
        `Headline pulled from NewsAPI.ai keyword “${q}” on ${dateStr}.`,
        `NewsAPI.ai row · “${q}” · ${dateStr}.`,
      ]),
      resolutionCriteria: '',
      oneLiner: '',
      endDate: dateStr,
      resolutionDeadline: resolutionEndOfDayUTC(dateStr),
      oracleSource: 'newsapi_ai',
      oracleConfig: { title: a.title, url: a.url, uri: a.uri, dateTime: a.dateTime, dateStr, seedQuery: q },
      seedNewsSource: 'newsapi_ai',
    }
  })
  return events
}

export async function eventsFromNewsDataIo(env, q = 'technology', limit = 5) {
  const articles = await fetchNewsDataIoLatest(env, q, 'en', limit)
  const dateStr = new Date().toISOString().slice(0, 10)
  const events = (articles || []).slice(0, limit).map((a, i) => {
    const fullHeadline = sanitizeHeadline(a.title)
    return {
      id: `newsdata_io-${Date.now()}-${i}`,
      source: 'newsdata_io',
      title: fullHeadline,
      description: pickVariant(`${q}-${i}-${dateStr}-ndi`, [
        `NewsData.io latest query “${q}” (${dateStr})—feeds automated market creation.`,
        `Headline from NewsData.io “${q}” on ${dateStr}.`,
        `NewsData.io result · “${q}” · ${dateStr}.`,
      ]),
      resolutionCriteria: '',
      oneLiner: '',
      endDate: dateStr,
      resolutionDeadline: resolutionEndOfDayUTC(dateStr),
      oracleSource: 'newsdata_io',
      oracleConfig: {
        title: a.title,
        link: a.link,
        article_id: a.article_id,
        pubDate: a.pubDate,
        dateStr,
        seedQuery: q,
      },
      seedNewsSource: 'newsdata_io',
    }
  })
  return events
}

// --- Trend-based algorithms: settlement time + threshold from current level ---

/** End of week (Friday) or next weekday for settlement. */
function settlementWeekday(d, preferEndOfWeek = true) {
  const out = new Date(d)
  if (preferEndOfWeek) {
    const friday = 5
    const day = out.getDay()
    let add = friday - day
    if (add <= 0) add += 7
    out.setDate(out.getDate() + add)
  } else {
    out.setDate(out.getDate() + 1)
    while (out.getDay() === 0 || out.getDay() === 6) out.setDate(out.getDate() + 1)
  }
  return out
}

/**
 * Trend-based stock events: "Will [symbol] close above $X by [date]?"
 * Uses current price; threshold = current * (1 + pctUp). Settlement = end of week (Friday) or next trading day.
 * No extra API calls beyond GLOBAL_QUOTE (fits free tier).
 */
export async function eventsFromStocksTrend(
  env,
  symbols = ALPHA_VANTAGE_SYMBOLS.slice(0, 5),
  settlementEndOfWeek = true,
  mixSeed = 0
) {
  const events = []
  const settle = settlementWeekday(new Date(), settlementEndOfWeek)
  const dateStr = settle.toISOString().slice(0, 10)
  const pcts = [0.016, 0.022, 0.019, 0.025, 0.02]
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i]
    try {
      const q = await fetchAlphaVantageQuote(env, symbol)
      if (!q || q.price == null) continue
      const pctUp = pcts[(i + mixSeed) % pcts.length]
      const threshold = Math.round(q.price * (1 + pctUp) * 100) / 100
      const title = pickVariant(`${symbol}-${dateStr}-tr`, [
        `Trend: Will ${symbol}’s Alpha Vantage GLOBAL_QUOTE be ≥ $${threshold} after ${dateStr} (US close window)?`,
        `Will ${symbol} quote ≥ $${threshold} on Alpha Vantage once ${dateStr} has passed (trend lane)?`,
        `${symbol} ≥ $${threshold} on Alpha Vantage after ${dateStr}—trend threshold market?`,
      ])
      events.push({
        id: `av-trend-${symbol}-${dateStr}`,
        source: 'alpha_vantage_trend',
        title,
        description: `${title} Reference quote ~$${q.price} when created; threshold from +${(pctUp * 100).toFixed(1)}% move. Uses same GLOBAL_QUOTE resolution rule as other Alpha Vantage markets (post-deadline fetch).`,
        resolutionCriteria: `After ${dateStr}T23:59:59.000Z (UTC end of that calendar day), Yes if Alpha Vantage GLOBAL_QUOTE “05. price” for ${symbol} is ≥ $${threshold}. No otherwise. Note: the worker keys off endDate for the gate, not the separate US-close display timestamp.`,
        oneLiner: `Yes if GLOBAL_QUOTE ≥ $${threshold} after UTC end of ${dateStr}; otherwise No.`,
        symbol,
        threshold,
        endDate: dateStr,
        resolutionDeadline: resolutionEndOfDayUTC(dateStr),
        commenceTime: settle.toISOString(),
        oracleSource: 'alpha_vantage',
        oracleConfig: { symbol, threshold, endDate: dateStr },
      })
    } catch (err) {
      console.warn('[data-sources] stocks trend', symbol, err?.message)
    }
  }
  return events
}

/**
 * Trend-based crypto events: per-asset horizon and % bump rotate for variety.
 */
export async function eventsFromCryptoTrend(env, coins = COINGECKO_COINS.slice(0, 3), mixSeed = 0) {
  const ids = coins.map((c) => (typeof c === 'string' ? c : c.id))
  const prices = await fetchCoinGeckoPrice(env, ids, 'usd')
  if (!prices || typeof prices !== 'object') return []
  const events = []
  const hourOpts = [18, 24, 30, 36]
  const pctOpts = [0.015, 0.02, 0.025, 0.018, 0.022]
  for (let i = 0; i < coins.length; i++) {
    const c = coins[i]
    const id = typeof c === 'string' ? c : c.id
    const sym = typeof c === 'string' ? id.toUpperCase() : c.symbol
    const price = prices[id]?.usd
    if (price == null) continue
    const settlementHours = hourOpts[(i + mixSeed) % hourOpts.length]
    const pctUp = pctOpts[(i + mixSeed * 3) % pctOpts.length]
    const settle = new Date(Date.now() + settlementHours * 60 * 60 * 1000)
    const dateOnly = settle.toISOString().slice(0, 10)
    const threshold = Math.round(price * (1 + pctUp) * 100) / 100
    const title = pickVariant(`${id}-${settlementHours}-ctr`, [
      `Will ${sym} (CoinGecko ${id}) be ≥ $${threshold} USD by UTC end of ${dateOnly}?`,
      `CoinGecko trend: ${sym} ≥ $${threshold} after UTC calendar day ${dateOnly}?`,
      `By end of ${dateOnly} (UTC): ${sym} spot ≥ $${threshold} on CoinGecko?`,
    ])
    events.push({
      id: `cg-trend-${id}-${dateOnly}-${settlementHours}h`,
      source: 'coingecko_trend',
      title,
      description: `${title} Spot ~$${price} when created; nominal horizon ${settlementHours}h; bump +${(pctUp * 100).toFixed(1)}%. Resolution compares CoinGecko simple/price only after UTC end-of-day ${dateOnly} (worker uses date-only endDate).`,
      resolutionCriteria: `After ${dateOnly}T23:59:59.000Z, Yes if CoinGecko simple/price USD for coin id “${id}” is ≥ $${threshold}. No if below or missing. (Implementation maps endDate to end-of that UTC calendar day before fetching.)`,
      oneLiner: `Yes if CoinGecko USD ≥ $${threshold} after UTC end of ${dateOnly}; otherwise No.`,
      symbol: sym,
      coinId: id,
      threshold,
      endDate: dateOnly,
      resolutionDeadline: resolutionEndOfDayUTC(dateOnly),
      commenceTime: settle.toISOString(),
      oracleSource: 'coingecko',
      oracleConfig: { coinId: id, symbol: sym, threshold, endDate: dateOnly, settlementHours },
    })
  }
  return events
}

/**
 * Which third-party API env vars are set (boolean only — never values). For ops / GET ?action=probe.
 */
export function probeAutoMarketEnv(env) {
  const set = (k) => !!(env[k] && String(env[k]).trim())
  return {
    THE_ODDS_API_KEY: set('THE_ODDS_API_KEY'),
    THE_ODDS_API_KEY_FALLBACK: set('THE_ODDS_API_KEY_FALLBACK'),
    ALPHA_VANTAGE_API_KEY: set('ALPHA_VANTAGE_API_KEY'),
    COINGECKO_API_KEY: set('COINGECKO_API_KEY'),
    OPENWEATHER_API_KEY: set('OPENWEATHER_API_KEY'),
    WEATHERAPI_API_KEY: set('WEATHERAPI_API_KEY'),
    GNEWS_API_KEY: set('GNEWS_API_KEY'),
    PERIGON_API_KEY: set('PERIGON_API_KEY'),
    NEWSAPI_AI_KEY: set('NEWSAPI_AI_KEY'),
    NEWSDATA_API_KEY: set('NEWSDATA_API_KEY'),
    FRED_API_KEY: set('FRED_API_KEY'),
    FINNHUB_API_KEY: set('FINNHUB_API_KEY'),
    DATA_GOV_API_KEY: set('DATA_GOV_API_KEY'),
    FEC_API_KEY: set('FEC_API_KEY'),
    OPENFEC_API_KEY: set('OPENFEC_API_KEY'),
    BLS_API_KEY: set('BLS_API_KEY'),
    NASA_API_KEY: set('NASA_API_KEY'),
    CONGRESS_GOV_API_KEY: set('CONGRESS_GOV_API_KEY'),
    RAPIDAPI_KEY: set('RAPIDAPI_KEY'),
    MASSIVE_API_KEY: set('MASSIVE_API_KEY'),
    note:
      'Keyless: Frankfurter (FX), USGS earthquakes. Optional DEMO_KEY: OpenFEC, NASA NeoWs when no service-specific key. At runtime, DATA_GOV_API_KEY is used as fallback for FEC, NASA, and Congress.gov if those vars are unset. BLS requires BLS_API_KEY only (register at data.bls.gov). CoinGecko public tier works without COINGECKO_API_KEY.',
  }
}

/** Default list of source keys for seed_all. Excludes stocks_trend to stay under Alpha Vantage 25 req/day. */
export const AUTO_MARKET_SOURCES = [
  'sports',
  'stocks',
  'crypto',
  'crypto_trend',
  'weather',
  'weatherapi',
  'frankfurter',
  'usgs',
  'fec',
  'nasa_neo',
  'congress_gov',
  'bls',
  'fred',
  'finnhub',
  'news',
  'perigon',
  'newsapi_ai',
  'newsdata_io',
  'massive',
]

/** Same order as seed_all, minus sports (The Odds API monthly quota). Used by auto-markets cron Worker. */
export const AUTO_MARKET_SOURCES_WITHOUT_SPORTS = AUTO_MARKET_SOURCES.filter((s) => s !== 'sports')

/**
 * Default `sources` for POST seed_all when the client omits an explicit `sources` array.
 * Pages env: set **`AUTO_MARKETS_INCLUDE_STOCKS_TREND=1`** to append the Alpha Vantage trend lane
 * (extra GLOBAL_QUOTE calls — mind the 25 req/day free tier alongside `stocks`).
 */
export function resolveDefaultSeedSources(env) {
  const base = [...AUTO_MARKET_SOURCES]
  if (envFlagTrue(env, 'AUTO_MARKETS_INCLUDE_STOCKS_TREND') && !base.includes('stocks_trend')) {
    const idx = base.indexOf('stocks')
    if (idx >= 0) base.splice(idx + 1, 0, 'stocks_trend')
    else base.push('stocks_trend')
  }
  return base
}

/**
 * Env keys shown on probe that never invoke `getEventsFromSource` (reserved / future hooks).
 */
export function probeKeysNotUsedInAutoMarketSeeding(env) {
  const p = probeAutoMarketEnv(env)
  const unused = []
  if (p.RAPIDAPI_KEY) unused.push('RAPIDAPI_KEY')
  return unused
}

/**
 * When `bySource[src] === 0`, explains common causes (keys may still be "present").
 * @param {Record<string, number>} bySource
 * @param {Record<string, boolean>} [keysPresent]
 */
export function buildAutoMarketFetchDiagnostics(bySource, keysPresent = {}) {
  if (!bySource || typeof bySource !== 'object') return {}
  const k = (name) => keysPresent[name] === true
  const hints = {
    sports:
      'No fixtures returned: Odds API monthly/day quota, invalid keys, off-season for rotated sports, or empty /odds responses.',
    stocks: k('ALPHA_VANTAGE_API_KEY')
      ? 'No GLOBAL_QUOTE rows: rate limit or “Note” throttling from Alpha Vantage, or symbol not quoted. Lane uses one equity ticker per tick (not crypto symbols).'
      : 'ALPHA_VANTAGE_API_KEY not set on Pages.',
    crypto: k('COINGECKO_API_KEY')
      ? 'No CoinGecko prices: Pro auth error, rate limit, or unexpected JSON (see worker logs).'
      : 'CoinGecko public tier may rate-limit Cloudflare egress; set COINGECKO_API_KEY for Pro.',
    crypto_trend: 'Same as crypto: simple/price must return USD for rotated coin ids.',
    weather: 'OpenWeather forecast empty or geocode failure for rotated cities (see logs).',
    weatherapi: 'WeatherAPI forecast failed for a city or returned no forecastday rows.',
    frankfurter: 'Rare: ECB rate fetch failed for rotated pairs (network or Frankfurter outage).',
    usgs: 'Unexpected: USGS public API should return one synthetic count market.',
    fec: 'OpenFEC presidential totals empty, DEMO_KEY throttled, or network error.',
    nasa_neo: 'NASA NeoWs element_count failed or API key/DEMO_KEY blocked.',
    congress_gov:
      'Congress.gov bill list empty, HTTP error, or fewer than one bill on the first page for the configured session.',
    bls: 'BLS CPI series missing or BLS_API_KEY invalid.',
    fred: 'FRED DFF observation missing or FRED_API_KEY issue.',
    finnhub: 'No upcoming earnings rows with positive EPS estimate for scanned symbols.',
    news: 'GNews returned no articles for the rotated category.',
    perigon: 'Perigon returned no articles for the rotated query, or auth still rejected after Bearer + legacy attempts.',
    newsapi_ai: 'NewsAPI.ai returned no results for the rotated keyword (or throttled).',
    newsdata_io: 'NewsData.io returned no results for the rotated query (or throttled).',
    massive: 'Massive daily agg empty for a ticker (symbol, date window, or API error).',
  }
  /** @type {Record<string, string>} */
  const out = {}
  for (const [src, n] of Object.entries(bySource)) {
    if (typeof n === 'number' && n === 0 && hints[src]) out[src] = hints[src]
  }
  return out
}

/** Default events requested per non-news source when seeding. */
export const DEFAULT_SEED_PER_SOURCE_LIMIT = 25

/**
 * News sources whose events pass through enrichNewsEvent (custom-news-markets.mjs).
 * Typically request more articles so enrichment has more signal.
 */
export const NEWS_ENRICHED_PER_SOURCE_LIMIT = 50

/** Source keys that use headline fetching + optional enrichment (must match custom-news-markets NEWS_SOURCES + route aliases). */
export const NEWS_ENRICHED_SEED_SOURCES = new Set(['news', 'gnews', 'perigon', 'newsapi_ai', 'newsdata_io', 'newsdata'])

/** Hard cap per upstream request (plan safety). */
export const MAX_SEED_EVENT_LIMIT = 100

export function clampSeedLimit(n) {
  const x = parseInt(String(n), 10)
  if (Number.isNaN(x) || x < 1) return 1
  return Math.min(x, MAX_SEED_EVENT_LIMIT)
}

/**
 * Normalize optional per-source overrides from API body.
 * @param {unknown} raw
 * @returns {Record<string, number>}
 */
export function normalizePerSourceOverrides(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [k, v] of Object.entries(raw)) {
    if (typeof k !== 'string' || !k.trim()) continue
    const n = parseInt(String(v), 10)
    if (!Number.isNaN(n)) out[k.trim()] = clampSeedLimit(n)
  }
  return out
}

/**
 * Resolved event fetch limit for one source (overrides > news tier > default).
 * @param {string} source
 * @param {{ defaultLimit?: number, newsEnrichedLimit?: number, overrides?: Record<string, number> }} [opts]
 */
export function resolveSeedLimitForSource(source, opts = {}) {
  const defaultLimit = clampSeedLimit(opts.defaultLimit ?? DEFAULT_SEED_PER_SOURCE_LIMIT)
  const newsLimit = clampSeedLimit(opts.newsEnrichedLimit ?? NEWS_ENRICHED_PER_SOURCE_LIMIT)
  const overrides = opts.overrides && typeof opts.overrides === 'object' ? opts.overrides : {}
  if (overrides[source] != null) return clampSeedLimit(overrides[source])
  if (NEWS_ENRICHED_SEED_SOURCES.has(source)) return newsLimit
  return defaultLimit
}

/**
 * Get events from a single named source. Returns [] if source unknown or API key missing.
 * opts: { limit, sportKey, category, q }
 */
export async function getEventsFromSource(env, source, opts = {}) {
  const limit = clampSeedLimit(opts.limit ?? DEFAULT_SEED_PER_SOURCE_LIMIT)
  const sportKey = opts.sportKey ?? 'basketball_nba'
  const baseSlot = utcHourSlot()
  const vKey = typeof opts.varietySourceKey === 'string' ? opts.varietySourceKey : source
  const vIdx = Number.isFinite(opts.varietyIndex) ? opts.varietyIndex : 0

  const slotNewsCat = varietyOffsetSlot(baseSlot, `${vKey}:gnews:${vIdx}`)
  const slotNewsQ = varietyOffsetSlot(baseSlot, `${vKey}:nq:${vIdx}`)
  const slotSport = varietyOffsetSlot(baseSlot, `${vKey}:sport:${vIdx}`)
  const slotAv = varietyOffsetSlot(baseSlot, `${vKey}:av:${vIdx}`)
  const slotMassive = varietyOffsetSlot(baseSlot, `${vKey}:massive:${vIdx}`)
  const slotFh = varietyOffsetSlot(baseSlot, `${vKey}:fh:${vIdx}`)
  const slotCg = varietyOffsetSlot(baseSlot, `${vKey}:cg:${vIdx}`)
  const slotTrend = varietyOffsetSlot(baseSlot, `${vKey}:trend:${vIdx}`)
  const slotMacro = varietyOffsetSlot(baseSlot, `${vKey}:macro:${vIdx}`)
  const slotOw = varietyOffsetSlot(baseSlot, `${vKey}:ow:${vIdx}`)
  const slotWa = varietyOffsetSlot(baseSlot, `${vKey}:wa:${vIdx}`)

  const category = opts.category ?? rotatedNewsCategory(slotNewsCat)
  const q = opts.q ?? rotatedNewsQuery(slotNewsQ)
  try {
    if (source === 'sports') {
      if (opts.sportsMix === 'single') {
        return await eventsFromOdds(env, sportKey, limit)
      }
      const keyCount = Math.min(5, Math.max(2, Math.ceil(limit / 6)))
      const keys = pickOddsSportKeysForSeed(keyCount, slotSport)
      const perKey = Math.max(1, Math.ceil(limit / keys.length))
      const lists = await Promise.all(keys.map((sk) => eventsFromOdds(env, sk, perKey)))
      return interleaveArrays(lists).slice(0, limit)
    }
    if (source === 'alpha_vantage' || source === 'stocks') {
      // One GLOBAL_QUOTE per seed tick keeps hourly cron under Alpha Vantage’s 25 calls/day free cap.
      const syms = pickRotatingWindow(ALPHA_VANTAGE_EQUITY_SYMBOLS, 1, slotAv)
      return await eventsFromAlphaVantage(env, syms, { thresholdMix: slotAv })
    }
    if (source === 'stocks_trend') {
      const syms = pickRotatingWindow(ALPHA_VANTAGE_EQUITY_SYMBOLS, 5, slotTrend)
      return await eventsFromStocksTrend(env, syms, true, slotTrend)
    }
    if (source === 'crypto' || source === 'coingecko') {
      const coins = pickRotatingWindow(COINGECKO_COINS, 5, slotCg)
      return await eventsFromCoinGecko(env, coins, { thresholdMix: slotCg })
    }
    if (source === 'crypto_trend') {
      const coins = pickRotatingWindow(COINGECKO_COINS, 4, slotTrend)
      return await eventsFromCryptoTrend(env, coins, slotTrend)
    }
    if (source === 'openweather' || source === 'weather') {
      const cities = pickRotatingWindow(WEATHER_CITIES, 5, slotOw)
      return await eventsFromOpenWeather(env, cities.length ? cities : ['London', 'New York'])
    }
    if (source === 'weatherapi') {
      const cities = pickRotatingWindow(WEATHER_CITIES, 5, slotWa)
      return await eventsFromWeatherApi(env, cities.length ? cities : ['London', 'New York'])
    }
    if (source === 'gnews' || source === 'news') return await eventsFromGNews(env, category, limit)
    if (source === 'perigon') return await eventsFromPerigon(env, q, limit)
    if (source === 'newsapi_ai') return await eventsFromNewsApiAi(env, q, limit)
    if (source === 'newsdata_io' || source === 'newsdata') return await eventsFromNewsDataIo(env, q, limit)
    if (source === 'frankfurter' || source === 'forex')
      return await eventsFromFrankfurterForex(env, Math.min(limit, 4), slotMacro)
    if (source === 'usgs') return await eventsFromUsgsQuakeCount(env, 1, slotMacro)
    if (source === 'fec' || source === 'openfec') return await eventsFromFecPresidentialLead(env, 1)
    if (source === 'nasa_neo') return await eventsFromNasaNeo(env, 1)
    if (source === 'congress_gov') return await eventsFromCongressGovBillFeed(env, 1)
    if (source === 'bls') return await eventsFromBlsCpi(env, 1)
    if (source === 'fred') return await eventsFromFredFunds(env, Math.min(limit, 2), slotMacro)
    if (source === 'finnhub') {
      const syms = pickRotatingWindow(ALPHA_VANTAGE_EQUITY_SYMBOLS, 8, slotFh)
      return await eventsFromFinnhubEarnings(env, syms, Math.min(limit, 8))
    }
    if (source === 'massive') {
      const symCount = Math.min(6, Math.max(3, Math.round(limit / 6)))
      const syms = pickRotatingWindow(ALPHA_VANTAGE_SYMBOLS, symCount, slotMassive)
      return await eventsFromMassive(env, syms, { thresholdMix: slotMassive })
    }
  } catch (err) {
    console.warn('[data-sources] getEventsFromSource', source, err?.message)
    return []
  }
  return []
}

/**
 * Gather events from multiple sources in parallel. On failure (e.g. no key, rate limit) returns [] for that source.
 * @param {number | { defaultLimit?: number, newsEnrichedLimit?: number, overrides?: Record<string, number>, sportKey?: string }} [limitOpts]
 *        If a number, that limit is used for every source (legacy). Otherwise default/news/overrides from resolveSeedLimitForSource.
 * Returns { events, bySource: { [source]: count }, limitsBySource }.
 */
export async function gatherEventsFromAllSources(env, sources = AUTO_MARKET_SOURCES, limitOpts = {}) {
  const opts =
    typeof limitOpts === 'number'
      ? {
          defaultLimit: clampSeedLimit(limitOpts),
          newsEnrichedLimit: clampSeedLimit(limitOpts),
          overrides: {},
        }
      : {
          defaultLimit: clampSeedLimit(limitOpts.defaultLimit ?? DEFAULT_SEED_PER_SOURCE_LIMIT),
          newsEnrichedLimit: clampSeedLimit(limitOpts.newsEnrichedLimit ?? NEWS_ENRICHED_PER_SOURCE_LIMIT),
          overrides: normalizePerSourceOverrides(limitOpts.overrides),
        }
  const sportKey = typeof limitOpts === 'object' && limitOpts !== null ? limitOpts.sportKey : undefined
  const sportsMix = typeof limitOpts === 'object' && limitOpts !== null && limitOpts.sportsMix === 'single' ? 'single' : undefined
  const bySource = {}
  const limitsBySource = {}
  /** @type {Record<string, { ok: boolean, count: number, error?: string }>} */
  const sourceHealth = {}
  const results = await Promise.allSettled(
    sources.map((src, i) => {
      const lim = resolveSeedLimitForSource(src, opts)
      limitsBySource[src] = lim
      return getEventsFromSource(env, src, {
        limit: lim,
        varietyIndex: i,
        varietySourceKey: src,
        ...(sportKey ? { sportKey } : {}),
        ...(sportsMix ? { sportsMix } : {}),
      })
    })
  )
  /** One array per source lane so we can interleave before the seed loop (fairer mix under maxScan). */
  const laneArrays = []
  results.forEach((outcome, i) => {
    const src = sources[i]
    if (outcome.status === 'fulfilled') {
      const events = outcome.value
      bySource[src] = events.length
      sourceHealth[src] = { ok: true, count: events.length }
      if (events.length) laneArrays.push(events)
    } else {
      bySource[src] = 0
      const err = outcome.reason
      sourceHealth[src] = {
        ok: false,
        count: 0,
        error: err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err),
      }
    }
  })
  const interleaved = interleaveArrays(laneArrays)
  return { events: interleaved, bySource, limitsBySource, sourceHealth }
}
