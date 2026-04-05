/**
 * Promote raw news-article events into outcome-based markets when headlines support
 * checkable oracles: earnings (Finnhub), Fed funds (FRED), equities/crypto prices, etc.
 * Runs before enrichNewsEvent so election/conflict heuristics still apply to remaining articles.
 */

import {
  fetchAlphaVantageQuote,
  fetchCoinGeckoPrice,
  fetchFredObservationOnOrBefore,
  fetchFinnhubEarningsCalendar,
  ALL_NEWS_PROMO_EQUITY_TICKERS,
  COINGECKO_COINS,
  resolutionEndOfDayUTC,
} from './data-sources.mjs'

const NEWS_FEED_SOURCES = new Set(['gnews', 'perigon', 'newsapi_ai', 'newsdata_io'])

const PROMO_CRYPTO = COINGECKO_COINS.filter((c) =>
  ['bitcoin', 'ethereum', 'solana', 'cardano', 'dogecoin'].includes(c.id)
)

const FED_HEADLINE = /\b(federal reserve|fomc|the fed|fed chair|jerome powell|interest rates?|fed funds|policy rate|central bank)\b/i

const EARNINGS_HEADLINE = /\bearnings\b|\bEPS\b|quarterly results|results call|Q[1-4]\s+(results|earnings)/i

function newsFeedKey(ev) {
  return ev?.seedNewsSource || ev?.source
}

/** Compact numeric fragment for stable market ids (no headline hash). */
function idPartNumber(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 'x'
  return String(x).replace(/\./g, 'p')
}

function extractDollarAmounts(text) {
  const amounts = []
  const re = /\$\s*(\d{1,7}(?:\.\d{1,2})?)/gi
  let m
  while ((m = re.exec(text)) !== null) {
    const n = parseFloat(m[1])
    if (!Number.isNaN(n)) amounts.push(n)
  }
  return amounts
}

function extractPercentValues(text) {
  const out = []
  const re = /(\d+(?:\.\d+)?)\s*%/g
  let m
  while ((m = re.exec(text)) !== null) {
    const n = parseFloat(m[1])
    if (!Number.isNaN(n) && n >= 0 && n <= 25) out.push(n)
  }
  return out
}

function pickThreshold(amounts, spot, comparator) {
  const defUp = Math.round(spot * 1.035 * 100) / 100
  const defDn = Math.round(spot * 0.965 * 100) / 100
  if (!amounts.length) return comparator === 'lte' ? defDn : defUp
  let best = amounts[0]
  let bestAbs = Math.abs(amounts[0] - spot)
  for (const a of amounts) {
    const da = Math.abs(a - spot)
    if (da < bestAbs) {
      best = a
      bestAbs = da
    }
  }
  if (bestAbs / spot > 0.45) return comparator === 'lte' ? defDn : defUp
  return Math.round(best * 100) / 100
}

function detectComparator(text) {
  const bear = /\b(slump|plunge|crash|tumble|sink|fall\s+to|drop\s+to|below|under\s+\$|\$\d[\d.]*\s+and\s+fell)\b/i.test(
    text
  )
  const bull = /\b(rally|surge|soar|jump|rise\s+to|above|exceed|break|cross|hit|reach|tops?|record|high)\b/i.test(
    text
  )
  if (bear && !bull) return 'lte'
  if (bull && !bear) return 'gte'
  if (/\bbelow\b.*\$|\$\s*[\d.]+\s*.*\b(fall|drop|lose)/i.test(text)) return 'lte'
  return 'gte'
}

function inferFedComparator(text) {
  if (/\b(cut|cuts|lower|slash|ease|easing|reduce\s+rates?)\b/i.test(text)) return 'lte'
  if (/\b(hike|hikes|raise|increase|tighten|tightening|higher\s+rates?)\b/i.test(text)) return 'gte'
  return detectComparator(text)
}

function cryptoPattern(c) {
  const id = typeof c === 'string' ? c : c.id
  const sym = typeof c === 'string' ? id.toUpperCase() : c.symbol
  switch (id) {
    case 'bitcoin':
      return { id, symbol: sym, re: /\b(bitcoin|btc)\b/i }
    case 'ethereum':
      return { id, symbol: sym, re: /\b(ethereum|eth)\b/i }
    case 'solana':
      return { id, symbol: sym, re: /\b(solana|sol)\b/i }
    case 'cardano':
      return { id, symbol: sym, re: /\b(cardano|ada)\b/i }
    case 'dogecoin':
      return { id, symbol: sym, re: /\b(dogecoin|doge)\b/i }
    default:
      return { id, symbol: sym, re: new RegExp(`\\b(${id}|${sym})\\b`, 'i') }
  }
}

function tickersInText(text) {
  const found = []
  for (const sym of ALL_NEWS_PROMO_EQUITY_TICKERS) {
    if (new RegExp(`\\b${sym}\\b`, 'i').test(text)) found.push(sym)
  }
  return found
}

async function tryPromoteEarnings(env, ev, text, headline) {
  if (!env.FINNHUB_API_KEY || !EARNINGS_HEADLINE.test(text)) return null
  const syms = tickersInText(text)
  if (!syms.length) return null
  const sym = syms[0]
  const today = new Date().toISOString().slice(0, 10)
  const to = new Date()
  to.setUTCDate(to.getUTCDate() + 120)
  const toYmd = to.toISOString().slice(0, 10)
  let cal = []
  try {
    cal = await fetchFinnhubEarningsCalendar(env, sym, today, toYmd)
  } catch {
    return null
  }
  const upcoming = (cal || [])
    .filter((r) => r && r.date && r.epsEstimate != null && parseFloat(r.epsEstimate) > 0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0]
  if (!upcoming) return null
  const epsEst = parseFloat(upcoming.epsEstimate)
  if (Number.isNaN(epsEst)) return null
  const q = upcoming.quarter
  const y = upcoming.year
  const reportDate = String(upcoming.date).slice(0, 10)
  const title = `Will ${sym} report EPS of at least $${epsEst.toFixed(2)} for Q${q} ${y} (Finnhub consensus)?`
  const id = `on-fh-${sym}-${y}-Q${q}-${reportDate}-eps${idPartNumber(epsEst)}`
  const seedSnippet = headline.length > 120 ? `${headline.slice(0, 117)}…` : headline
  return {
    ...ev,
    id,
    source: 'finnhub',
    title,
    description: `${title} Seeded from news (“${seedSnippet}”). Report ~${reportDate}. Data source: Finnhub.`,
    resolutionCriteria: `Yes if Finnhub reported EPS for ${sym} Q${q} ${y} is ≥ $${epsEst.toFixed(2)}. If actual is missing 7+ days after ${reportDate}, leave open or resolve per operator policy.`,
    oneLiner: `${sym} Q${q} ${y} EPS ≥ $${epsEst.toFixed(2)}; otherwise No.`,
    endDate: reportDate,
    resolutionDeadline: resolutionEndOfDayUTC(reportDate),
    oracleSource: 'finnhub',
    oracleConfig: {
      finnhubSymbol: sym,
      epsEstimate: epsEst,
      quarter: q,
      year: y,
      reportDate,
      outcomeResolutionKind: 'earnings_beat',
      newsOutcomeSeed: { headline, newsApiSource: newsFeedKey(ev) },
    },
    seedNewsSource: ev.seedNewsSource,
  }
}

async function tryPromoteFred(env, ev, text, headline) {
  if (!env.FRED_API_KEY || !FED_HEADLINE.test(text)) return null
  const today = new Date().toISOString().slice(0, 10)
  let current
  try {
    current = await fetchFredObservationOnOrBefore(env, 'DFF', today)
  } catch {
    return null
  }
  if (!current || current.value == null) return null
  const spot = current.value
  const comparator = inferFedComparator(text)
  const pctVals = extractPercentValues(text)
  let threshold
  if (pctVals.length) {
    let best = pctVals[0]
    let bestAbs = Math.abs(pctVals[0] - spot)
    for (const p of pctVals) {
      const d = Math.abs(p - spot)
      if (d < bestAbs) {
        best = p
        bestAbs = d
      }
    }
    threshold = Math.round(best * 100) / 100
  } else {
    threshold =
      comparator === 'lte'
        ? Math.max(0, Math.round((spot - 0.25) * 100) / 100)
        : Math.round(spot * 100) / 100
  }
  const end = new Date()
  end.setUTCDate(end.getUTCDate() + 14)
  const dateStr = end.toISOString().slice(0, 10)
  const title =
    comparator === 'lte'
      ? `Will the effective federal funds rate (FRED: DFF) be at or below ${threshold}% on the last print on or before ${dateStr}?`
      : `Will the effective federal funds rate (FRED: DFF) be at or above ${threshold}% on the last print on or before ${dateStr}?`
  const id = `on-fred-dff-${dateStr}-${shortHash(headline)}`
  const seedSnippet = headline.length > 120 ? `${headline.slice(0, 117)}…` : headline
  return {
    ...ev,
    id,
    source: 'fred',
    title,
    description: `${title} Seeded from news (“${seedSnippet}”). Latest DFF ${spot}% (${current.date}). Data source: FRED.`,
    resolutionCriteria: `Yes if the latest FRED DFF observation on or before ${dateStr} is ${comparator === 'lte' ? '≤' : '≥'} ${threshold}%. No otherwise. Missing data: leave open until available.`,
    oneLiner:
      comparator === 'lte'
        ? `DFF last print on or before ${dateStr} is ≤ ${threshold}%; otherwise No.`
        : `DFF last print on or before ${dateStr} is ≥ ${threshold}%; otherwise No.`,
    endDate: dateStr,
    resolutionDeadline: resolutionEndOfDayUTC(dateStr),
    oracleSource: 'fred',
    oracleConfig: {
      seriesId: 'DFF',
      threshold,
      comparator,
      endDate: dateStr,
      outcomeResolutionKind: 'macro_fred',
      unit: 'percent',
      newsOutcomeSeed: { headline, newsApiSource: newsFeedKey(ev) },
    },
    seedNewsSource: ev.seedNewsSource,
  }
}

async function tryPromoteStock(env, ev, text, headline) {
  for (const sym of ALL_NEWS_PROMO_EQUITY_TICKERS) {
    if (!new RegExp(`\\b${sym}\\b`, 'i').test(text)) continue
    let spot
    try {
      const q = await fetchAlphaVantageQuote(env, sym)
      spot = q?.price
    } catch {
      continue
    }
    if (spot == null) continue
    const comparator = detectComparator(text)
    const amounts = extractDollarAmounts(text)
    const threshold = pickThreshold(amounts, spot, comparator)
    const end = new Date()
    end.setDate(end.getDate() + 7)
    const dateStr = end.toISOString().slice(0, 10)
    const id = `on-av-${sym}-${dateStr}-${comparator}-${idPartNumber(threshold)}`
    const title =
      comparator === 'lte'
        ? `Will ${sym} close at or below $${threshold} by ${dateStr}?`
        : `Will ${sym} close at or above $${threshold} by ${dateStr}?`
    const seedSnippet = headline.length > 140 ? `${headline.slice(0, 137)}…` : headline
    return {
      ...ev,
      id,
      source: 'alpha_vantage',
      title,
      description: `${title} Outcome market seeded from a news headline (“${seedSnippet}”). Spot about $${spot} when created. Data source: Alpha Vantage.`,
      resolutionCriteria:
        comparator === 'lte'
          ? `After ${dateStr}T23:59:59.000Z, Yes if Alpha Vantage GLOBAL_QUOTE “05. price” for ${sym} is ≤ $${threshold}. No otherwise. (Live quote at resolution.)`
          : `After ${dateStr}T23:59:59.000Z, Yes if Alpha Vantage GLOBAL_QUOTE “05. price” for ${sym} is ≥ $${threshold}. No otherwise. (Live quote at resolution.)`,
      oneLiner:
        comparator === 'lte'
          ? `${sym} GLOBAL_QUOTE ≤ $${threshold} after UTC end of ${dateStr}; otherwise No.`
          : `${sym} GLOBAL_QUOTE ≥ $${threshold} after UTC end of ${dateStr}; otherwise No.`,
      endDate: dateStr,
      resolutionDeadline: resolutionEndOfDayUTC(dateStr),
      oracleSource: 'alpha_vantage',
      oracleConfig: {
        symbol: sym,
        threshold,
        endDate: dateStr,
        comparator,
        outcomeResolutionKind: 'price_feed',
        newsOutcomeSeed: { headline, newsApiSource: newsFeedKey(ev) },
      },
      seedNewsSource: ev.seedNewsSource,
    }
  }
  return null
}

async function tryPromoteCrypto(env, ev, text, headline) {
  for (const c of PROMO_CRYPTO) {
    const { id, symbol, re } = cryptoPattern(c)
    if (!re.test(text)) continue
    let spot
    try {
      const prices = await fetchCoinGeckoPrice(env, [id], 'usd')
      spot = prices?.[id]?.usd
    } catch {
      continue
    }
    if (spot == null) continue
    const comparator = detectComparator(text)
    const amounts = extractDollarAmounts(text)
    const threshold = pickThreshold(amounts, spot, comparator)
    const end = new Date()
    end.setDate(end.getDate() + 7)
    const dateStr = end.toISOString().slice(0, 10)
    const idSlug = `on-cg-${id}-${dateStr}-${comparator}-${idPartNumber(threshold)}`
    const title =
      comparator === 'lte'
        ? `Will ${symbol} be at or below $${threshold} by ${dateStr}?`
        : `Will ${symbol} be at or above $${threshold} by ${dateStr}?`
    const seedSnippet = headline.length > 140 ? `${headline.slice(0, 137)}…` : headline
    return {
      ...ev,
      id: idSlug,
      source: 'coingecko',
      title,
      description: `${title} Outcome market seeded from a news headline (“${seedSnippet}”). Spot about $${spot} when created. Data source: CoinGecko.`,
      resolutionCriteria:
        comparator === 'lte'
          ? `${symbol} (${id}) price at or below $${threshold} on or before ${dateStr}. Data source: CoinGecko.`
          : `${symbol} (${id}) price at or above $${threshold} on or before ${dateStr}. Data source: CoinGecko.`,
      oneLiner:
        comparator === 'lte'
          ? `${symbol} at or below $${threshold} by ${dateStr}; otherwise No.`
          : `${symbol} at or above $${threshold} by ${dateStr}; otherwise No.`,
      endDate: dateStr,
      resolutionDeadline: resolutionEndOfDayUTC(dateStr),
      oracleSource: 'coingecko',
      oracleConfig: {
        coinId: id,
        symbol,
        threshold,
        endDate: dateStr,
        comparator,
        outcomeResolutionKind: 'price_feed',
        newsOutcomeSeed: { headline, newsApiSource: newsFeedKey(ev) },
      },
      seedNewsSource: ev.seedNewsSource,
    }
  }
  return null
}

/**
 * When a news headline supports an automated outcome oracle, return a transformed event.
 * Order: earnings → equities → crypto → Fed (macro), so e.g. “AAPL earnings” becomes EPS, not price.
 */
export async function promoteNewsArticleToOutcomeMarket(env, ev) {
  if (!ev || ev.customType) return ev
  const feed = newsFeedKey(ev)
  if (!NEWS_FEED_SOURCES.has(feed)) return ev
  const headline = (ev.title || '').trim()
  if (headline.length < 10) return ev
  const text = `${headline} ${ev.description || ''}`

  const earn = await tryPromoteEarnings(env, ev, text, headline)
  if (earn) return earn
  const stock = await tryPromoteStock(env, ev, text, headline)
  if (stock) return stock
  const crypto = await tryPromoteCrypto(env, ev, text, headline)
  if (crypto) return crypto
  const fred = await tryPromoteFred(env, ev, text, headline)
  if (fred) return fred
  return ev
}
