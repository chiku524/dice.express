/**
 * Rotation and interleaving for automated market seeding so each cron batch
 * mixes sports, tickers, cities, and news parameters instead of repeating one lane.
 */

/** Popular Odds API keys (in-season varies); invalid keys return [] from API. */
export const ODDS_SPORT_KEYS_SEED = [
  'basketball_nba',
  'basketball_wnba',
  'americanfootball_nfl',
  'baseball_mlb',
  'icehockey_nhl',
  'soccer_epl',
  'soccer_usa_mls',
  'americanfootball_ncaaf',
  'mma_mixed_martial_arts',
  'soccer_uefa_champs_league',
]

/** GNews top-headlines categories (API-supported). */
export const GNEWS_CATEGORY_ROTATION = [
  'world',
  'nation',
  'business',
  'technology',
  'science',
  'sports',
  'entertainment',
  'health',
]

/** Diverse search queries for Perigon / NewsAPI.ai / NewsData.io when no operator override. */
export const NEWS_QUERY_ROTATION = [
  'renewable energy policy',
  'artificial intelligence regulation',
  'central bank inflation',
  'space exploration launch',
  'electric vehicles market',
  'cybersecurity breach',
  'climate summit diplomacy',
  'biotech FDA trial',
  'semiconductor supply chain',
  'Olympics medal standings',
  'Middle East ceasefire',
  'US Congress budget vote',
  'cryptocurrency ETF',
  'hurricane season forecast',
  'United Nations security council',
  'antitrust tech hearing',
  'nuclear nonproliferation talks',
  'housing affordability crisis',
  'rare earth minerals export',
  'Arctic ice extent record',
  'WHO pandemic preparedness',
  'ocean shipping disruption',
  'wildfire smoke air quality',
  'student loan forgiveness court',
  'quantum computing breakthrough',
  'copper lithium mining Africa',
  'humanitarian aid Gaza Sudan',
  'bankruptcy regional lenders',
  'solar tariff trade dispute',
  'deepfake election disinformation',
  'mRNA vaccine seasonal flu',
  'Amazon labor union vote',
  'F1 Grand Prix championship',
  'agriculture commodity drought',
  'public education funding referendum',
  'telecom spectrum auction FCC',
  'rail freight labor negotiation',
  'commercial aviation safety recall',
  'grid battery storage deployment',
  'water rights Colorado river',
  'immigration border policy hearing',
  'retail bankruptcy chapter 11',
  'pharmacy drug pricing Medicare',
  'steel aluminum tariff exemption',
  'offshore wind lease auction',
  'microchip CHIPS Act factory',
  'sovereign debt restructuring IMF',
  'military aid package vote',
  'nuclear power plant lifespan',
  'college athletics NIL revenue',
  'port strike logistics backlog',
  'avian influenza poultry outbreak',
  'carbon credit voluntary market',
  'central bank digital currency pilot',
  'satellite internet constellation launch',
  'mining tailings environmental ruling',
]

/**
 * Stable per-run variety anchor: all lanes in one POST share one value; distinct runs in the same
 * UTC hour (manual replay, overlapping crons) still rotate queries, sports windows, and thresholds.
 * @param {number} hourSlot - from utcHourSlot()
 * @param {number | undefined} seedStartedAtMs - Date.now() at start of the seed request
 */
export function seedRunVarietyBaseSlot(hourSlot, seedStartedAtMs) {
  if (seedStartedAtMs == null || !Number.isFinite(seedStartedAtMs)) return hourSlot
  return varietyOffsetSlot(hourSlot, `seed:${seedStartedAtMs}`)
}

/** ECB cross-rates for rotating FX threshold markets (Frankfurter). */
export const FRANKFURTER_PAIR_ROTATION = [
  { base: 'USD', quote: 'EUR' },
  { base: 'USD', quote: 'GBP' },
  { base: 'USD', quote: 'JPY' },
  { base: 'EUR', quote: 'USD' },
  { base: 'USD', quote: 'CHF' },
  { base: 'USD', quote: 'CAD' },
  { base: 'AUD', quote: 'USD' },
  { base: 'NZD', quote: 'USD' },
]

/** Hour bucket (UTC) for stable rotation within the same hour. */
export function utcHourSlot() {
  return Math.floor(Date.now() / 3600000)
}

export function rotatedNewsCategory(slot = utcHourSlot()) {
  return GNEWS_CATEGORY_ROTATION[Math.abs(slot) % GNEWS_CATEGORY_ROTATION.length]
}

export function rotatedNewsQuery(slot = utcHourSlot()) {
  return NEWS_QUERY_ROTATION[Math.abs(slot) % NEWS_QUERY_ROTATION.length]
}

/**
 * Stable string hash → extra offset so parallel sources in one seed_all tick
 * (Perigon, NewsAPI.ai, NewsData.io, …) do not all fetch the same query/category.
 * @param {number} baseSlot
 * @param {string} salt
 */
export function varietyOffsetSlot(baseSlot, salt = '') {
  let h = 0
  const s = String(salt)
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return baseSlot + Math.abs(h)
}

/**
 * Fisher–Yates shuffle with deterministic seed (mixes source order in one batch).
 * @template T
 * @param {T[]} arr
 * @param {number} seed
 * @returns {T[]}
 */
export function deterministicShuffle(arr, seed) {
  const a = arr.slice()
  let s = seed >>> 0
  const rnd = () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0x100000000
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Pick `count` sport keys starting from a slot-dependent offset (diversifies each run).
 * @param {number} count
 * @param {number} [slot]
 */
export function pickOddsSportKeysForSeed(count, slot = utcHourSlot()) {
  const n = Math.max(1, Math.min(count, ODDS_SPORT_KEYS_SEED.length))
  const start = Math.abs(slot) % ODDS_SPORT_KEYS_SEED.length
  const out = []
  for (let i = 0; i < n; i++) {
    out.push(ODDS_SPORT_KEYS_SEED[(start + i) % ODDS_SPORT_KEYS_SEED.length])
  }
  return out
}

/**
 * Rotating window over `arr` of length `windowSize` (for tickers, cities).
 * @template T
 * @param {T[]} arr
 * @param {number} windowSize
 * @param {number} [slot]
 * @returns {T[]}
 */
export function pickRotatingWindow(arr, windowSize, slot = utcHourSlot()) {
  if (!arr?.length) return []
  const n = Math.max(1, Math.min(windowSize, arr.length))
  const start = Math.abs(slot) % arr.length
  const out = []
  for (let i = 0; i < n; i++) {
    out.push(arr[(start + i) % arr.length])
  }
  return out
}

/**
 * Interleave arrays (e.g. [nba0,nfl0,mlb0], [nba1,nfl1], …) for mixed batches.
 * @template T
 * @param {T[][]} arrays
 * @returns {T[]}
 */
export function interleaveArrays(arrays) {
  const lists = arrays.filter((a) => Array.isArray(a) && a.length > 0)
  if (!lists.length) return []
  const out = []
  let max = 0
  for (const a of lists) max = Math.max(max, a.length)
  for (let i = 0; i < max; i++) {
    for (const a of lists) {
      if (i < a.length) out.push(a[i])
    }
  }
  return out
}
