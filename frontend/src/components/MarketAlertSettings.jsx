import { useState, useEffect } from 'react'
import { useToastContext } from '../contexts/ToastContext'
import { fetchMarkets } from '../services/marketsApi'
import { MARKET_CATEGORIES } from '../constants/marketConfig'
import { usePublicConfig } from '../hooks/usePublicConfig'
import {
  readAlertPrefs,
  writeAlertPrefs,
  ALERT_POLL_PRESETS_MS,
  requestNotificationPermission,
  notificationSupport,
  writeLastSeenIds,
  setSeededBaseline,
  dispatchAlertsPrefsChanged,
  isTauriApp,
} from '../utils/marketAlerts'

export default function MarketAlertSettings({ variant = 'full' }) {
  const { showToast } = useToastContext()
  const publicCfg = usePublicConfig()
  const [prefs, setPrefs] = useState(readAlertPrefs)
  const [perm, setPerm] = useState(() => notificationSupport())

  useEffect(() => {
    setPerm(notificationSupport())
  }, [prefs.desktopEnabled])

  const syncPrefs = (patch) => {
    writeAlertPrefs(patch)
    setPrefs(readAlertPrefs())
    dispatchAlertsPrefsChanged()
  }

  const handleDisableDesktop = () => {
    syncPrefs({ desktopEnabled: false })
    showToast('Desktop alerts turned off.', 'info')
  }

  const handleEnableDesktop = async () => {
    const r = await requestNotificationPermission()
    setPerm(r)
    if (r !== 'granted') {
      showToast(
        r === 'unsupported'
          ? 'This browser does not support notifications.'
          : 'Notification permission was not granted.',
        'error'
      )
      return
    }
    syncPrefs({ desktopEnabled: true })
    try {
      const list = await fetchMarkets(null, { sort: 'activity' })
      writeLastSeenIds(new Set(list.map((m) => m.contractId)))
      setSeededBaseline(true)
      showToast('Desktop alerts are on.', 'success')
    } catch {
      showToast('Alerts on — the next check will learn the current market list.', 'info')
    }
  }

  const compact = variant === 'compact'
  const noAlertTypes = !prefs.notifyNewMarkets && !prefs.notifyWatchlist

  return (
    <div className={compact ? 'market-alerts market-alerts--compact' : 'market-alerts'}>
      {!compact && (
        <>
          <h2 className="profile-section-title" id="market-alerts-section">
            Market alerts
          </h2>
          <p className="profile-hint">
            {isTauriApp()
              ? 'Native OS notifications when new markets appear or a watchlist market changes status (via the Tauri notification plugin). Preferences stay on this device — no account server required.'
              : 'Browser notifications when new markets appear or a watchlist market changes status. Everything stays in this browser — no account server required. For SMS, the operator must wire Twilio (or similar) on the API.'}
          </p>
        </>
      )}
      {compact && (
        <p className="market-alerts-compact-lead text-secondary">
          {isTauriApp() ? 'Native OS alerts (saved on this device)' : 'Desktop notifications (saved in this browser)'}
        </p>
      )}

      <div className="market-alerts-row">
        {!prefs.desktopEnabled ? (
          <button type="button" className="btn-primary" onClick={handleEnableDesktop}>
            Enable desktop alerts
          </button>
        ) : (
          <button type="button" className="btn-secondary" onClick={handleDisableDesktop}>
            Turn off desktop alerts
          </button>
        )}
        <span className="market-alerts-perm text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
          {perm === 'granted' && 'Permission: granted'}
          {perm === 'denied' && 'Permission: blocked — enable in browser site settings'}
          {perm === 'default' && prefs.desktopEnabled && 'Permission: pending'}
          {perm === 'unsupported' && 'Not supported here'}
        </span>
      </div>

      {prefs.desktopEnabled && (
        <>
          <div className="market-alerts-toggles">
            <label className="market-alerts-check">
              <input
                type="checkbox"
                checked={prefs.notifyNewMarkets}
                onChange={(e) => syncPrefs({ notifyNewMarkets: e.target.checked })}
              />
              <span>New markets</span>
            </label>
            <label className="market-alerts-check">
              <input
                type="checkbox"
                checked={prefs.notifyWatchlist}
                onChange={(e) => syncPrefs({ notifyWatchlist: e.target.checked })}
              />
              <span>Watchlist status changes</span>
            </label>
          </div>
          {noAlertTypes && (
            <p className="profile-error" style={{ marginTop: '0.75rem' }}>
              Choose at least one alert type above, or turn desktop alerts off.
            </p>
          )}
          {prefs.notifyNewMarkets && (
            <div className="form-group market-alerts-field">
              <label htmlFor="alert-cat">New markets — category filter</label>
              <select
                id="alert-cat"
                className="filter-select"
                value={prefs.newMarketsCategory}
                onChange={(e) => syncPrefs({ newMarketsCategory: e.target.value })}
              >
                <option value="all">All categories</option>
                {MARKET_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group market-alerts-field">
            <label htmlFor="alert-poll">Check interval</label>
            <select
              id="alert-poll"
              className="filter-select"
              value={String(prefs.pollIntervalMs)}
              onChange={(e) => syncPrefs({ pollIntervalMs: parseInt(e.target.value, 10) })}
            >
              {ALERT_POLL_PRESETS_MS.map((p) => (
                <option key={p.ms} value={String(p.ms)}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {!compact && (
        <p className="text-muted mt-md" style={{ fontSize: 'var(--font-size-sm)' }}>
          {publicCfg.smsAlertsAvailable
            ? 'SMS is configured on the server but not exposed in this UI yet — use desktop alerts for now.'
            : 'Phone/SMS is not configured on this deployment; desktop notifications are the supported channel.'}
        </p>
      )}
    </div>
  )
}
