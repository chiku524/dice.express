/**
 * External data sources for automated prediction markets.
 * All functions take env (with API keys) and return normalized data or throw.
 * Keys are read from env; never hardcode keys.
 */

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
  return data
}

/** CoinGecko coin ids for common markets. */
export const COINGECKO_COINS = [
  { id: 'bitcoin', symbol: 'BTC' },
  { id: 'ethereum', symbol: 'ETH' },
  { id: 'solana', symbol: 'SOL' },
  { id: 'tether', symbol: 'USDT' },
  { id: 'usd-coin', symbol: 'USDC' },
]

// --- The Odds API (sports) ---
/** Get in-season sports. env.THE_ODDS_API_KEY. Does not count against quota. */
export async function fetchOddsSports(env, all = false) {
  const key = env.THE_ODDS_API_KEY
  if (!key) throw new Error('THE_ODDS_API_KEY not set')
  const url = `${ODDS_API_BASE}/sports?apiKey=${key}${all ? '&all=true' : ''}`
  const data = await fetchApi(url)
  return Array.isArray(data) ? data : []
}

/** Get events with odds for a sport. env.THE_ODDS_API_KEY */
export async function fetchOddsEvents(env, sportKey = 'basketball_nba', regions = 'us', oddsFormat = 'decimal') {
  const key = env.THE_ODDS_API_KEY
  if (!key) throw new Error('THE_ODDS_API_KEY not set')
  const url = `${ODDS_API_BASE}/sports/${encodeURIComponent(sportKey)}/odds?regions=${regions}&oddsFormat=${oddsFormat}&apiKey=${key}`
  const data = await fetchApi(url)
  return Array.isArray(data) ? data : []
}

/** Get scores for completed games. env.THE_ODDS_API_KEY. daysFrom 1-3. */
export async function fetchOddsScores(env, sportKey, daysFrom = 2, eventIds = null) {
  const key = env.THE_ODDS_API_KEY
  if (!key) throw new Error('THE_ODDS_API_KEY not set')
  let url = `${ODDS_API_BASE}/sports/${encodeURIComponent(sportKey)}/scores?apiKey=${key}&daysFrom=${daysFrom}`
  if (eventIds && eventIds.length) url += `&eventIds=${eventIds.join(',')}`
  const data = await fetchApi(url)
  return Array.isArray(data) ? data : []
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
/** Search articles. env.PERIGON_API_KEY */
export async function fetchPerigonSearch(env, q = 'technology', limit = 10) {
  const key = env.PERIGON_API_KEY
  if (!key) throw new Error('PERIGON_API_KEY not set')
  const url = `${PERIGON_BASE}/all?q=${encodeURIComponent(q)}&size=${limit}&apiKey=${key}`
  const data = await fetchApi(url)
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
  return results.slice(0, Math.min(limit, 20))
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

// --- Massive (placeholder: add endpoint when you have docs) ---
/** Placeholder for Massive API. env.MASSIVE_API_KEY */
export async function fetchMassive(env, path = '/', query = {}) {
  const key = env.MASSIVE_API_KEY
  if (!key) throw new Error('MASSIVE_API_KEY not set')
  const base = env.MASSIVE_API_BASE || 'https://api.massive.com'
  const qs = new URLSearchParams({ ...query }).toString()
  const url = `${base}${path}${qs ? `?${qs}` : ''}`
  const data = await fetchApi(url, { headers: { Authorization: `Bearer ${key}` } })
  return data
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
    const title = `Will ${e.home_team} win vs ${e.away_team}?`
    const description = `${title} Event start: ${eventStart}.`
    const resolutionCriteria = `Home team (${e.home_team}) wins the match. Resolved using The Odds API scores after the event (commence: ${e.commence_time || 'TBD'}).`
    const oneLiner = `Home team (${e.home_team}) wins; otherwise No.`
    const resolutionDeadline = resolutionAfterCommence(e.commence_time, 4)
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

export async function eventsFromAlphaVantage(env, symbols = ALPHA_VANTAGE_SYMBOLS.slice(0, 5)) {
  const events = []
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 7)
  const dateStr = endDate.toISOString().slice(0, 10)
  for (const symbol of symbols) {
    try {
      const q = await fetchAlphaVantageQuote(env, symbol)
      if (!q || q.price == null) continue
      const threshold = Math.round(q.price * 1.05) // 5% above current
      const title = `Will ${symbol} close above $${threshold} by ${dateStr}?`
      events.push({
        id: `av-${symbol}-${dateStr}`,
        source: 'alpha_vantage',
        title,
        description: `${title} Current price about $${q.price}.`,
        resolutionCriteria: `Closing price of ${symbol} on or before ${dateStr} is at or above $${threshold}. Data source: Alpha Vantage.`,
        oneLiner: `${symbol} closes at or above $${threshold} by ${dateStr}; otherwise No.`,
        symbol,
        threshold,
        endDate: dateStr,
        resolutionDeadline: resolutionUSMarketCloseUTC(dateStr),
        oracleSource: 'alpha_vantage',
        oracleConfig: { symbol, threshold, endDate: dateStr },
      })
    } catch (err) {
      console.warn('[data-sources] Alpha Vantage', symbol, err?.message)
    }
  }
  return events
}

export async function eventsFromCoinGecko(env, coins = COINGECKO_COINS.slice(0, 3)) {
  const ids = coins.map((c) => (typeof c === 'string' ? c : c.id))
  const prices = await fetchCoinGeckoPrice(env, ids, 'usd')
  if (!prices || typeof prices !== 'object') return []
  const events = []
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 7)
  const dateStr = endDate.toISOString().slice(0, 10)
  for (const c of coins) {
    const id = typeof c === 'string' ? c : c.id
    const sym = typeof c === 'string' ? id.toUpperCase() : c.symbol
    const price = prices[id]?.usd
    if (price == null) continue
    const threshold = Math.round(price * 1.1) // 10% above
    const title = `Will ${sym} be above $${threshold} by ${dateStr}?`
    events.push({
      id: `cg-${id}-${dateStr}`,
      source: 'coingecko',
      title,
      description: `${title} Current price about $${price}.`,
      resolutionCriteria: `${sym} price at or above $${threshold} on or before ${dateStr}. Data source: CoinGecko.`,
      oneLiner: `${sym} at or above $${threshold} by ${dateStr}; otherwise No.`,
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

export const WEATHER_CITIES = ['London', 'New York', 'Los Angeles', 'Chicago', 'Tokyo']

/** Precise resolution time: end of calendar day UTC (for news, weather, crypto date-based). */
function resolutionEndOfDayUTC(dateStr) {
  if (!dateStr || dateStr.length < 10) return null
  return `${dateStr.slice(0, 10)}T23:59:59.000Z`
}

/** Precise resolution time: US market close 4pm ET ≈ 21:00 UTC (for stocks). */
function resolutionUSMarketCloseUTC(dateStr) {
  if (!dateStr || dateStr.length < 10) return null
  return `${dateStr.slice(0, 10)}T21:00:00.000Z`
}

/** Resolution time: commenceTime + hours (for sports; game typically over by then). */
function resolutionAfterCommence(commenceTimeIso, hours = 4) {
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
      const hasRain = dayList.some((x) => (x.weather && x.weather[0] && x.weather[0].main === 'Rain') || (x.pop && x.pop > 0.5))
      const title = `Will it rain in ${city} on ${dateStr}?`
      events.push({
        id: `ow-${city.replace(/\s+/g, '-')}-${dateStr}`,
        source: 'openweathermap',
        title,
        description: `${title} Forecast for ${city} on ${dateStr}.`,
        resolutionCriteria: `Rain or significant precipitation in ${city} on ${dateStr}. Data source: OpenWeatherMap.`,
        oneLiner: `Rain in ${city} on ${dateStr}; otherwise No.`,
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
      const forecast = await fetchWeatherApiForecast(env, city, 3)
      const forecastDay = forecast?.forecast?.forecastday?.find((d) => d.date === dateStr)
      const willRain = forecastDay?.day?.daily_will_it_rain === 1
      const title = `Will it rain in ${city} on ${dateStr}?`
      events.push({
        id: `wa-${city.replace(/\s+/g, '-')}-${dateStr}`,
        source: 'weatherapi',
        title,
        description: `${title} Forecast for ${city} on ${dateStr}.`,
        resolutionCriteria: `Rain in ${city} on ${dateStr}. Data source: WeatherAPI.com.`,
        oneLiner: `Rain in ${city} on ${dateStr}; otherwise No.`,
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
    const titleHeadline = fullHeadline.length > 100 ? fullHeadline.slice(0, 97) + '…' : fullHeadline
    const title = `Will "${titleHeadline}" be a top headline on ${dateStr}?`
    const description = `Will this headline be among GNews top headlines on ${dateStr}? "${fullHeadline}" (GNews ${category}).`
    return {
      id: `gnews-${category}-${Date.now()}-${i}`,
      source: 'gnews',
      title,
      description,
      resolutionCriteria: `Article or topic matching this headline is among GNews top headlines on ${dateStr}. Data source: GNews.`,
      oneLiner: `This headline appears in GNews top headlines on ${dateStr}; otherwise No.`,
      endDate: dateStr,
      resolutionDeadline: resolutionEndOfDayUTC(dateStr),
      oracleSource: 'gnews',
      oracleConfig: { title: a.title, url: a.url, publishedAt: a.publishedAt, dateStr },
    }
  })
  return events
}

export async function eventsFromPerigon(env, q = 'technology', limit = 5) {
  const articles = await fetchPerigonSearch(env, q, limit)
  const dateStr = new Date().toISOString().slice(0, 10)
  const events = (articles || []).slice(0, limit).map((a, i) => {
    const fullHeadline = sanitizeHeadline(a.title || a.headline)
    const titleHeadline = fullHeadline.length > 100 ? fullHeadline.slice(0, 97) + '…' : fullHeadline
    const title = `Will "${titleHeadline}" be in top news on ${dateStr}?`
    const description = `Will this article be in Perigon top news on ${dateStr}? "${fullHeadline}" Topic: ${q}.`
    return {
      id: `perigon-${Date.now()}-${i}`,
      source: 'perigon',
      title,
      description,
      resolutionCriteria: `Article matching this topic appears in Perigon top news on ${dateStr}. Data source: Perigon.`,
      oneLiner: `Matching article in Perigon top news on ${dateStr}; otherwise No.`,
      endDate: dateStr,
      resolutionDeadline: resolutionEndOfDayUTC(dateStr),
      oracleSource: 'perigon',
      oracleConfig: { title: a.title || a.headline, url: a.url, dateStr },
    }
  })
  return events
}

export async function eventsFromNewsApiAi(env, q = 'technology', limit = 5) {
  const articles = await fetchNewsApiAiSearch(env, q, limit)
  const dateStr = new Date().toISOString().slice(0, 10)
  const events = (articles || []).slice(0, limit).map((a, i) => {
    const fullHeadline = sanitizeHeadline(a.title)
    const titleHeadline = fullHeadline.length > 100 ? fullHeadline.slice(0, 97) + '…' : fullHeadline
    const title = `Will "${titleHeadline}" be in top news on ${dateStr}?`
    const description = `Will this article be in NewsAPI.ai top news on ${dateStr}? "${fullHeadline}" Topic: ${q}.`
    return {
      id: `newsapi_ai-${Date.now()}-${i}`,
      source: 'newsapi_ai',
      title,
      description,
      resolutionCriteria: `Article matching this topic appears in NewsAPI.ai top news on ${dateStr}. Data source: NewsAPI.ai (Event Registry).`,
      oneLiner: `Matching article in NewsAPI.ai top news on ${dateStr}; otherwise No.`,
      endDate: dateStr,
      resolutionDeadline: resolutionEndOfDayUTC(dateStr),
      oracleSource: 'newsapi_ai',
      oracleConfig: { title: a.title, url: a.url, uri: a.uri, dateTime: a.dateTime, dateStr },
    }
  })
  return events
}

export async function eventsFromNewsDataIo(env, q = 'technology', limit = 5) {
  const articles = await fetchNewsDataIoLatest(env, q, 'en', limit)
  const dateStr = new Date().toISOString().slice(0, 10)
  const events = (articles || []).slice(0, limit).map((a, i) => {
    const fullHeadline = sanitizeHeadline(a.title)
    const titleHeadline = fullHeadline.length > 100 ? fullHeadline.slice(0, 97) + '…' : fullHeadline
    const title = `Will "${titleHeadline}" be in top news on ${dateStr}?`
    const description = `Will this article be in NewsData.io latest news on ${dateStr}? "${fullHeadline}" Topic: ${q}.`
    return {
      id: `newsdata_io-${Date.now()}-${i}`,
      source: 'newsdata_io',
      title,
      description,
      resolutionCriteria: `Article matching this topic appears in NewsData.io latest news on ${dateStr}. Data source: NewsData.io.`,
      oneLiner: `Matching article in NewsData.io latest news on ${dateStr}; otherwise No.`,
      endDate: dateStr,
      resolutionDeadline: resolutionEndOfDayUTC(dateStr),
      oracleSource: 'newsdata_io',
      oracleConfig: { title: a.title, link: a.link, article_id: a.article_id, pubDate: a.pubDate, dateStr },
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
export async function eventsFromStocksTrend(env, symbols = ALPHA_VANTAGE_SYMBOLS.slice(0, 5), pctUp = 0.02, settlementEndOfWeek = true) {
  const events = []
  const settle = settlementWeekday(new Date(), settlementEndOfWeek)
  const dateStr = settle.toISOString().slice(0, 10)
  for (const symbol of symbols) {
    try {
      const q = await fetchAlphaVantageQuote(env, symbol)
      if (!q || q.price == null) continue
      const threshold = Math.round(q.price * (1 + pctUp) * 100) / 100
      const title = `Will ${symbol} close above $${threshold} by ${dateStr}?`
      events.push({
        id: `av-trend-${symbol}-${dateStr}`,
        source: 'alpha_vantage_trend',
        title,
        description: `${title} Current price about $${q.price}. Settlement: ${dateStr}.`,
        resolutionCriteria: `Closing price of ${symbol} on or before ${dateStr} is at or above $${threshold}. Data source: Alpha Vantage.`,
        oneLiner: `${symbol} closes at or above $${threshold} by ${dateStr}; otherwise No.`,
        symbol,
        threshold,
        endDate: dateStr,
        resolutionDeadline: resolutionUSMarketCloseUTC(dateStr),
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
 * Trend-based crypto events: "Will [symbol] be above $X in 24h?"
 * Settlement = now + settlementHours. Threshold = current * (1 + pctUp).
 */
export async function eventsFromCryptoTrend(env, coins = COINGECKO_COINS.slice(0, 3), settlementHours = 24, pctUp = 0.02) {
  const ids = coins.map((c) => (typeof c === 'string' ? c : c.id))
  const prices = await fetchCoinGeckoPrice(env, ids, 'usd')
  if (!prices || typeof prices !== 'object') return []
  const events = []
  const settle = new Date(Date.now() + settlementHours * 60 * 60 * 1000)
  const dateStr = settle.toISOString().slice(0, 19).replace('T', ' ')
  const dateOnly = settle.toISOString().slice(0, 10)
  for (const c of coins) {
    const id = typeof c === 'string' ? c : c.id
    const sym = typeof c === 'string' ? id.toUpperCase() : c.symbol
    const price = prices[id]?.usd
    if (price == null) continue
    const threshold = Math.round(price * (1 + pctUp) * 100) / 100
    const title = `Will ${sym} be above $${threshold} in ${settlementHours} hours?`
    events.push({
      id: `cg-trend-${id}-${dateOnly}-${settlementHours}h`,
      source: 'coingecko_trend',
      title,
      description: `${title} Current price about $${price}. Settlement: ${dateStr} UTC.`,
      resolutionCriteria: `${sym} price at or above $${threshold} on or before ${dateStr} UTC. Data source: CoinGecko.`,
      oneLiner: `${sym} at or above $${threshold} within ${settlementHours}h; otherwise No.`,
      symbol: sym,
      coinId: id,
      threshold,
      endDate: dateOnly,
      resolutionDeadline: settle.toISOString(),
      commenceTime: settle.toISOString(),
      oracleSource: 'coingecko',
      oracleConfig: { coinId: id, symbol: sym, threshold, endDate: dateOnly, settlementHours },
    })
  }
  return events
}

/** Default list of source keys for seed_all. Order: sports, stocks, crypto, weather, news. */
export const AUTO_MARKET_SOURCES = [
  'sports',
  'stocks',
  'stocks_trend',
  'crypto',
  'crypto_trend',
  'weather',
  'weatherapi',
  'news',
  'perigon',
  'newsapi_ai',
  'newsdata_io',
]

/**
 * Get events from a single named source. Returns [] if source unknown or API key missing.
 * opts: { limit, sportKey, category, q }
 */
export async function getEventsFromSource(env, source, opts = {}) {
  const limit = Math.min(opts.limit ?? 5, 20)
  const sportKey = opts.sportKey ?? 'basketball_nba'
  const category = opts.category ?? 'general'
  const q = opts.q ?? 'technology'
  try {
    if (source === 'sports') return await eventsFromOdds(env, sportKey, limit)
    if (source === 'alpha_vantage' || source === 'stocks') return await eventsFromAlphaVantage(env, ALPHA_VANTAGE_SYMBOLS.slice(0, 5))
    if (source === 'stocks_trend') return await eventsFromStocksTrend(env, ALPHA_VANTAGE_SYMBOLS.slice(0, 5), 0.02, true)
    if (source === 'crypto' || source === 'coingecko') return await eventsFromCoinGecko(env, COINGECKO_COINS.slice(0, 5))
    if (source === 'crypto_trend') return await eventsFromCryptoTrend(env, COINGECKO_COINS.slice(0, 3), 24, 0.02)
    if (source === 'openweather' || source === 'weather') return await eventsFromOpenWeather(env, WEATHER_CITIES?.slice(0, 3) || ['London', 'New York'])
    if (source === 'weatherapi') return await eventsFromWeatherApi(env, WEATHER_CITIES?.slice(0, 3) || ['London', 'New York'])
    if (source === 'gnews' || source === 'news') return await eventsFromGNews(env, category, limit)
    if (source === 'perigon') return await eventsFromPerigon(env, q, limit)
    if (source === 'newsapi_ai') return await eventsFromNewsApiAi(env, q, limit)
    if (source === 'newsdata_io' || source === 'newsdata') return await eventsFromNewsDataIo(env, q, limit)
  } catch (err) {
    console.warn('[data-sources] getEventsFromSource', source, err?.message)
    return []
  }
  return []
}

/**
 * Gather events from multiple sources. Tries each source; on failure (e.g. no key) returns [] for that source.
 * perSourceLimit applied to each source. Returns { events, bySource: { [source]: count } }.
 */
export async function gatherEventsFromAllSources(env, sources = AUTO_MARKET_SOURCES, perSourceLimit = 5) {
  const bySource = {}
  const allEvents = []
  for (const src of sources) {
    const events = await getEventsFromSource(env, src, { limit: perSourceLimit })
    bySource[src] = events.length
    allEvents.push(...events)
  }
  return { events: allEvents, bySource }
}
