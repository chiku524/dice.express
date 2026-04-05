/**
 * Auto-market seeding: quality gates, creation audit metadata, KV history / source health.
 * See docs/AUTO_MARKETS.md → "Automation quality roadmap".
 */

export const AUTO_MARKET_BUILDER_VERSION = '1'

/** D1 row status: seeded but not yet promoted (hidden from default GET /api/markets). */
export const CONTRACT_STATUS_AUTO_PENDING = 'AutoPending'
/** D1 row status: failed post-activation validation (hidden from default listing). */
export const CONTRACT_STATUS_AUTO_REJECTED = 'AutoRejected'

export function envFlagTrue(env, key) {
  const v = env?.[key]
  return v === '1' || v === 'true' || String(v).toLowerCase() === 'true'
}

function parsePositiveInt(env, key, fallback) {
  const n = parseInt(String(env?.[key] ?? ''), 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** Dry-run: no D1 / pool / embedding writes (still runs dedupe + quality gates). */
export function seedShadowModeEnabled(env) {
  return envFlagTrue(env, 'AUTO_MARKETS_SEED_SHADOW')
}

export function maxMarketsCreatedPerRun(env) {
  return parsePositiveInt(env, 'AUTO_MARKETS_MAX_CREATE_PER_RUN', 120)
}

export function maxEventsScannedPerRun(env) {
  return parsePositiveInt(env, 'AUTO_MARKETS_MAX_EVENTS_SCAN_PER_RUN', 400)
}

/** When true, new auto-markets are stored as AutoPending until POST activate_pending promotes them. */
export function autoPendingActivationEnabled(env) {
  return envFlagTrue(env, 'AUTO_MARKETS_PENDING_ACTIVATION')
}

/**
 * Consecutive fetch failures before a source is skipped for seeding (0 = disable pause).
 * Reads merged KV `auto_markets:source_health`.
 */
export function sourcePauseFailureThreshold(env) {
  const n = parseInt(String(env?.AUTO_MARKETS_PAUSE_AFTER_CONSECUTIVE_FAILURES ?? '5'), 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * @param {any} kv
 * @param {Record<string, unknown>} env
 * @param {string[]} sources
 * @returns {Promise<{ sources: string[], skippedDueToHealth: string[] }>}
 */
export async function filterAutoMarketSourcesByHealth(kv, env, sources) {
  const th = sourcePauseFailureThreshold(env)
  if (!th || !kv || !Array.isArray(sources) || sources.length === 0) {
    return { sources: [...sources], skippedDueToHealth: [] }
  }
  let raw = null
  try {
    raw = await kv.get('auto_markets:source_health')
  } catch {
    return { sources: [...sources], skippedDueToHealth: [] }
  }
  let health = {}
  try {
    const p = JSON.parse(raw || '{}')
    health = p && typeof p === 'object' ? p : {}
  } catch {
    health = {}
  }
  const skippedDueToHealth = []
  const allowed = []
  for (const s of sources) {
    const h = health[s]
    const cf = h && typeof h === 'object' ? Number(h.consecutiveFailures) || 0 : 0
    if (cf >= th) skippedDueToHealth.push(s)
    else allowed.push(s)
  }
  return { sources: allowed, skippedDueToHealth }
}

function sortJsonKeys(val) {
  if (val === null || typeof val !== 'object') return val
  if (Array.isArray(val)) return val.map((x) => sortJsonKeys(x))
  const out = {}
  for (const k of Object.keys(val).sort()) {
    out[k] = sortJsonKeys(val[k])
  }
  return out
}

/**
 * SHA-256 over canonical title, criteria, oracle source, sorted oracleConfig (content-stable).
 * @param {Record<string, unknown>} payload
 * @param {Record<string, unknown>} [_evOut]
 */
export async function computeStableAutoMarketFingerprint(payload, _evOut) {
  void _evOut
  const canon = JSON.stringify({
    title: String(payload?.title || '').trim(),
    resolutionCriteria: String(payload?.resolutionCriteria || '').trim(),
    oracleSource: String(payload?.oracleSource || payload?.source || ''),
    oracleConfig: sortJsonKeys(payload?.oracleConfig && typeof payload.oracleConfig === 'object' ? payload.oracleConfig : {}),
  })
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canon))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * @param {Record<string, unknown>} payload
 * @param {Record<string, unknown>} env
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function evaluateAutoMarketQualityGates(payload, env) {
  const reasons = []
  const minTitle = parsePositiveInt(env, 'AUTO_MARKETS_MIN_TITLE_LENGTH', 10)
  const maxTitle = parsePositiveInt(env, 'AUTO_MARKETS_MAX_TITLE_LENGTH', 600)
  const title = String(payload?.title || '').trim()
  if (title.length < minTitle) reasons.push(`title_too_short:${title.length}`)
  if (title.length > maxTitle) reasons.push('title_too_long')

  const requireDeadline =
    env?.AUTO_MARKETS_REQUIRE_DEADLINE !== '0' &&
    env?.AUTO_MARKETS_REQUIRE_DEADLINE !== 'false' &&
    String(env?.AUTO_MARKETS_REQUIRE_DEADLINE || '').toLowerCase() !== 'off'
  if (requireDeadline && !payload?.resolutionDeadline) reasons.push('missing_resolution_deadline')

  const minCrit = parsePositiveInt(env, 'AUTO_MARKETS_MIN_RESOLUTION_CRITERIA_LENGTH', 12)
  const crit = String(payload?.resolutionCriteria || '').trim()
  if (crit.length < minCrit) reasons.push('resolution_criteria_too_short')

  const blockRe = env?.AUTO_MARKETS_TITLE_BLOCKLIST_REGEX
  if (blockRe && typeof blockRe === 'string' && blockRe.trim()) {
    try {
      const re = new RegExp(blockRe, 'i')
      if (re.test(title)) reasons.push('title_blocklist_match')
    } catch {
      /* invalid regex — ignore */
    }
  }

  if (!payload?.oracleConfig || typeof payload.oracleConfig !== 'object') {
    reasons.push('missing_oracle_config')
  }

  return { ok: reasons.length === 0, reasons }
}

/**
 * @param {{
 *   seedRunId: string
 *   seedStartedAt: string
 *   evOut: Record<string, unknown>
 *   payload: Record<string, unknown>
 *   primaryDedupeKey: string | null
 *   stableContentFingerprint?: string | null
 * }} p
 */
export function attachAutoMarketCreationAudit(p) {
  const { seedRunId, seedStartedAt, evOut, payload, primaryDedupeKey, stableContentFingerprint } = p
  payload.autoMarketCreation = {
    builderVersion: AUTO_MARKET_BUILDER_VERSION,
    seedRunId,
    seedStartedAt,
    seededAt: new Date().toISOString(),
    eventSource: evOut?.source != null ? String(evOut.source) : null,
    stableEventId: evOut?.id != null ? String(evOut.id) : null,
    primaryDedupeKey,
    ...(stableContentFingerprint ? { stableContentFingerprint } : {}),
  }
}

/** @param {any} kv */
export async function appendSeedRunHistory(kv, entry) {
  if (!kv) return
  try {
    const raw = await kv.get('auto_markets:seed_run_history')
    let arr = []
    try {
      const p = JSON.parse(raw || '[]')
      arr = Array.isArray(p) ? p : []
    } catch {
      arr = []
    }
    arr.unshift(entry)
    await kv.put('auto_markets:seed_run_history', JSON.stringify(arr.slice(0, 25)))
  } catch (e) {
    console.error('[auto-market-seed] appendSeedRunHistory', e?.message)
  }
}

/**
 * Merge per-source fetch outcomes into rolling KV state (success vs thrown errors from gather).
 * @param {any} kv
 * @param {Record<string, { ok: boolean, count?: number, error?: string }>} snapshot
 */
export async function mergeSourceHealthSnapshot(kv, snapshot) {
  if (!kv || !snapshot || typeof snapshot !== 'object') return
  try {
    const raw = await kv.get('auto_markets:source_health')
    let prev = {}
    try {
      prev = JSON.parse(raw || '{}')
      if (!prev || typeof prev !== 'object') prev = {}
    } catch {
      prev = {}
    }
    const now = new Date().toISOString()
    for (const [src, info] of Object.entries(snapshot)) {
      const p = prev[src] && typeof prev[src] === 'object' ? prev[src] : {}
      if (info.ok) {
        prev[src] = {
          lastOkAt: now,
          lastEventCount: info.count ?? 0,
          consecutiveFailures: 0,
          lastError: null,
          firstSeenAt: p.firstSeenAt || now,
        }
      } else {
        prev[src] = {
          ...p,
          lastFailureAt: now,
          lastError: info.error || 'fetch_failed',
          consecutiveFailures: (p.consecutiveFailures || 0) + 1,
          firstSeenAt: p.firstSeenAt || now,
        }
      }
    }
    await kv.put('auto_markets:source_health', JSON.stringify(prev))
  } catch (e) {
    console.error('[auto-market-seed] mergeSourceHealthSnapshot', e?.message)
  }
}
