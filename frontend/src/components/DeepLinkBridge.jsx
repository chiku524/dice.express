import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isTauriApp } from '../utils/platform'
import { pathFromDeepLinkUrl } from '../utils/deepLinks'

/**
 * Desktop: open diceexpress://… (and https://dice.express/…) deep links in the SPA.
 */
export default function DeepLinkBridge() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isTauriApp()) return undefined

    let cancelled = false
    let unlisten

    const go = (urls) => {
      const list = Array.isArray(urls) ? urls : [urls]
      for (const raw of list) {
        const path = pathFromDeepLinkUrl(raw)
        if (path) {
          navigate(path, { replace: false })
          break
        }
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
        unlisten = await onOpenUrl((urls) => {
          if (!cancelled) go(urls)
        })
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
  }, [navigate])

  return null
}
