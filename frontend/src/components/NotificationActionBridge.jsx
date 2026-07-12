import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isTauriApp } from '../utils/platform'
import { NOTIFICATION_ACTION_TYPE_ID } from '../utils/marketAlerts'

/**
 * Desktop: listen for notification clicks and navigate to the market URL in `extra.url`.
 * Registers a default action type so the OS delivers actionPerformed events.
 */
export default function NotificationActionBridge() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isTauriApp()) return undefined

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
  }, [navigate])

  return null
}