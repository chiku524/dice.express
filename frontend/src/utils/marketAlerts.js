/**
 * Browser desktop alerts for new markets and watchlist status changes.
 * Stored locally only (no server). SMS would need Twilio + backend + verified phone.
 */
import { categoryForFilter } from '../constants/marketConfig'

const PREFIX = 'dice.alerts.v1'

const KEYS = {
  desktopEnabled: `${PREFIX}.desktopEnabled`,
  notifyNewMarkets: `${PREFIX}.notifyNewMarkets`,
  notifyWatchlist: `${PREFIX}.notifyWatchlist`,
  newMarketsCategory: `${PREFIX}.newMarketsCategory`,
  pollIntervalMs: `${PREFIX}.pollIntervalMs`,
  lastSeenIds: `${PREFIX}.lastSeenContractIds`,
  watchSnapshot: `${PREFIX}.watchStatusSnapshot`,
  seeded: `${PREFIX}.seededBaseline`,
}

function readBool(key, defaultVal = false) {
  try {
    const v = localStorage.getItem(key)
    if (v == null) return defaultVal
    return v === '1' || v === 'true'
  } catch {
    return defaultVal
  }
}

function writeBool(key, val) {
  try {
    localStorage.setItem(key, val ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function readStr(key, defaultVal = '') {
  try {
    return localStorage.getItem(key) ?? defaultVal
  } catch {
    return defaultVal
  }
}

function writeStr(key, val) {
  try {
    localStorage.setItem(key, String(val))
  } catch {
    /* ignore */
  }
}

export const ALERT_POLL_PRESETS_MS = [
  { label: '5 min', ms: 5 * 60 * 1000 },
  { label: '15 min', ms: 15 * 60 * 1000 },
  { label: '30 min', ms: 30 * 60 * 1000 },
]

export function readAlertPrefs() {
  let pollMs = parseInt(readStr(KEYS.pollIntervalMs, ''), 10)
  if (!Number.isFinite(pollMs) || pollMs < 60_000) pollMs = ALERT_POLL_PRESETS_MS[0].ms
  return {
    desktopEnabled: readBool(KEYS.desktopEnabled, false),
    notifyNewMarkets: readBool(KEYS.notifyNewMarkets, true),
    notifyWatchlist: readBool(KEYS.notifyWatchlist, true),
    newMarketsCategory: readStr(KEYS.newMarketsCategory, 'all'),
    pollIntervalMs: pollMs,
  }
}

export function writeAlertPrefs(partial) {
  if (partial.desktopEnabled != null) writeBool(KEYS.desktopEnabled, partial.desktopEnabled)
  if (partial.notifyNewMarkets != null) writeBool(KEYS.notifyNewMarkets, partial.notifyNewMarkets)
  if (partial.notifyWatchlist != null) writeBool(KEYS.notifyWatchlist, partial.notifyWatchlist)
  if (partial.newMarketsCategory != null) writeStr(KEYS.newMarketsCategory, partial.newMarketsCategory)
  if (partial.pollIntervalMs != null) writeStr(KEYS.pollIntervalMs, String(partial.pollIntervalMs))
}

export function dispatchAlertsPrefsChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('dice-alerts-prefs'))
}

export function readLastSeenIds() {
  try {
    const raw = localStorage.getItem(KEYS.lastSeenIds)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr.map(String) : [])
  } catch {
    return new Set()
  }
}

export function writeLastSeenIds(idSet) {
  try {
    const arr = [...idSet].slice(-800)
    localStorage.setItem(KEYS.lastSeenIds, JSON.stringify(arr))
  } catch {
    /* ignore */
  }
}

export function readWatchStatusSnapshot() {
  try {
    const raw = localStorage.getItem(KEYS.watchSnapshot)
    if (!raw) return {}
    const o = JSON.parse(raw)
    return o && typeof o === 'object' ? o : {}
  } catch {
    return {}
  }
}

export function writeWatchStatusSnapshot(obj) {
  try {
    localStorage.setItem(KEYS.watchSnapshot, JSON.stringify(obj))
  } catch {
    /* ignore */
  }
}

export function hasSeededBaseline() {
  return readBool(KEYS.seeded, false)
}

export function setSeededBaseline(done) {
  writeBool(KEYS.seeded, done)
}

export function isTauriApp() {
  return typeof window !== 'undefined' && !!window.__TAURI__
}

export function notificationSupport() {
  if (typeof window === 'undefined') return 'unsupported'
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission() {
  if (isTauriApp()) {
    try {
      const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification')
      if (await isPermissionGranted()) return 'granted'
      const r = await requestPermission()
      return r === 'granted' ? 'granted' : r === 'denied' ? 'denied' : 'default'
    } catch {
      return 'denied'
    }
  }
  if (typeof Notification === 'undefined') return 'unsupported'
  const cur = Notification.permission
  if (cur === 'granted' || cur === 'denied') return cur
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/**
 * Tauri: uses `tauri-plugin-notification` (native toast via notify-rs / OS APIs).
 * Browser: Web Notification API with click-to-navigate.
 */
export async function showDesktopNotification(title, body, options = {}) {
  const tag = options.tag || 'dice-market'
  const icon = options.icon || '/favicon.ico'

  if (isTauriApp()) {
    try {
      const { sendNotification } = await import('@tauri-apps/plugin-notification')
      if (Notification.permission !== 'granted') return
      sendNotification({
        title,
        body,
        icon,
        group: tag,
        extra: options.url ? { url: String(options.url) } : undefined,
      })
    } catch {
      /* ignore */
    }
    return
  }

  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, {
      body,
      tag,
      icon,
    })
    n.onclick = () => {
      window.focus()
      if (options.url) window.location.assign(options.url)
      n.close()
    }
  } catch {
    /* ignore */
  }
}

export function marketMatchesNewMarketCategory(market, categoryKey) {
  if (!categoryKey || categoryKey === 'all') return true
  const cat = categoryForFilter(market?.payload)
  return cat === categoryKey
}
