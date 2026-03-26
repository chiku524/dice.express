import { useEffect, useRef } from 'react'
import { fetchMarkets } from '../services/marketsApi'
import { readWatchlist } from '../utils/marketUX'
import {
  readAlertPrefs,
  readLastSeenIds,
  writeLastSeenIds,
  readWatchStatusSnapshot,
  writeWatchStatusSnapshot,
  setSeededBaseline,
  showDesktopNotification,
  marketMatchesNewMarketCategory,
  notificationSupport,
} from '../utils/marketAlerts'

async function pollOnce() {
  const prefs = readAlertPrefs()
  if (!prefs.desktopEnabled) return
  if (!prefs.notifyNewMarkets && !prefs.notifyWatchlist) return
  if (notificationSupport() !== 'granted') return

  let markets = []
  try {
    markets = await fetchMarkets(null, { sort: 'activity' })
  } catch {
    return
  }

  const idSet = new Set(markets.map((m) => m.contractId))

  if (prefs.notifyNewMarkets) {
    const last = readLastSeenIds()
    if (last.size === 0) {
      writeLastSeenIds(idSet)
      setSeededBaseline(true)
    } else {
      const fresh = markets.filter((m) => !last.has(m.contractId))
      const filtered = fresh.filter((m) => marketMatchesNewMarketCategory(m, prefs.newMarketsCategory))
      if (filtered.length > 0) {
        const title =
          filtered.length === 1 ? 'New market on dice.express' : `${filtered.length} new markets`
        const body = filtered
          .slice(0, 3)
          .map((m) => m.payload?.title || m.contractId)
          .join(' · ')
        const first = filtered[0]
        const url = first.contractId ? `/market/${first.contractId}` : '/'
        const shortBody = body.length > 140 ? `${body.slice(0, 137)}…` : body
        await showDesktopNotification(title, shortBody, {
          tag: `dice-new-${first.contractId}`,
          url,
        })
      }
      writeLastSeenIds(idSet)
    }
  }

  if (prefs.notifyWatchlist) {
    const watched = readWatchlist()
    const prev = readWatchStatusSnapshot()
    const next = { ...prev }
    for (const id of watched) {
      const m = markets.find((x) => x.contractId === id || x.payload?.marketId === id)
      const key = m ? m.contractId : String(id)
      const st = m?.payload?.status || 'unknown'
      const title = m?.payload?.title || String(id)
      if (prev[key] != null && prev[key] !== st) {
        const u = m?.contractId ? `/market/${m.contractId}` : '/'
        const shortTitle = title.length > 72 ? `${title.slice(0, 69)}…` : title
        await showDesktopNotification('Watchlist update', `${shortTitle} → ${st}`, {
          tag: `dice-watch-${key}`,
          url: u,
        })
      }
      next[key] = st
    }
    writeWatchStatusSnapshot(next)
  }
}

export default function MarketAlertsPoller() {
  const timerRef = useRef(null)

  useEffect(() => {
    const schedule = () => {
      if (timerRef.current) clearInterval(timerRef.current)
      const prefs = readAlertPrefs()
      const ms = prefs.pollIntervalMs || 5 * 60 * 1000
      timerRef.current = setInterval(pollOnce, ms)
      pollOnce()
    }

    schedule()
    window.addEventListener('dice-alerts-prefs', schedule)
    return () => {
      window.removeEventListener('dice-alerts-prefs', schedule)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return null
}
