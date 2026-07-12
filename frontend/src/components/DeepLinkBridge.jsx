import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { isTauriApp } from '../utils/platform'
import { pathFromDeepLinkUrl } from '../utils/deepLinks'

/**
 * Desktop: open diceexpress://… (and https://dice.express/…) deep links in the SPA.
 * Skipped on splash/launch so cold-start getCurrent cannot yank the intro webview off-route.
 */
export default function DeepLinkBridge() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isTauriApp()) return undefined
    if (location.pathname === '/splashscreen' || location.pathname === '/launch') {
      return undefined
    }

    let cancelled = false
    let unlisten

    const go = (urls) => {
      const list = Array.isArray(urls) ? urls : [urls]
      for (const raw of list) {
        const path = pathFromDeepLinkUrl(raw)
        if (!path) continue
        // Never deep-link into intro shells
        if (path === '/splashscreen' || path === '/launch' || path.startsWith('/splashscreen') || path.startsWith('/launch')) {
          continue
        }
        navigate(path, { replace: false })
        break
      }
    }

    const setup = (async () => {
      try {
        const { onOpenUrl, getCurrent } = await import('@tauri-apps/plugin-deep-link')
        if (cancelled) return
        try {
          const current = await getCurrent()
          if (!cancelled && current?.length) go(current)
        } catch {
          /* cold start may have no URL */
        }
        if (cancelled) return
        unlisten = await onOpenUrl((urls) => {
          if (!cancelled) go(urls)
        })
        if (cancelled && typeof unlisten === 'function') {
          unlisten()
          unlisten = undefined
        }
      } catch {
        /* plugin missing in web builds */
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
