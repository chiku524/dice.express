import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { isTauriApp } from '../utils/platform'
import { NOTIFICATION_ACTION_TYPE_ID } from '../utils/marketAlerts'

/**
 * Desktop: listen for notification clicks and navigate to the market URL in `extra.url`.
 * Registers a default action type so the OS delivers actionPerformed events.
 * Not mounted on splash/launch (avoids plugin work in the intro webview).
 */
export default function NotificationActionBridge() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isTauriApp()) return undefined
    if (location.pathname === '/splashscreen' || location.pathname === '/launch') {
      return undefined
    }

    let cancelled = false
    let unlisten

    const setup = (async () => {
      try {
        const { onAction, registerActionTypes } = await import('@tauri-apps/plugin-notification')
        await registerActionTypes([
          {
            id: NOTIFICATION_ACTION_TYPE_ID,
            actions: [{ id: 'open', title: 'Open' }],
          },
        ])
        if (cancelled) return
        unlisten = await onAction((notification) => {
          const raw = notification?.extra?.url
          const url = typeof raw === 'string' ? raw.trim() : ''
          if (!url) return
          try {
            if (url.startsWith('http://') || url.startsWith('https://')) {
              const u = new URL(url)
              navigate(`${u.pathname}${u.search}${u.hash}`, { replace: false })
            } else if (url.startsWith('/')) {
              navigate(url, { replace: false })
            }
          } catch {
            /* ignore bad urls */
          }
        })
        if (cancelled && typeof unlisten === 'function') {
          unlisten()
          unlisten = undefined
        }
      } catch {
        /* plugin unavailable */
      }
    })()

    return () => {
      cancelled = true
      setup.then(() => {
        if (typeof unlisten === 'function') unlisten()
        else if (unlisten && typeof unlisten.then === 'function') {
          unlisten.then((fn) => {
            if (typeof fn === 'function') fn()
          })
        }
      })
    }
  }, [navigate, location.pathname])

  return null
}
