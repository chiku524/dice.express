import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { isTauriApp } from '../utils/platform'

/**
 * Desktop (Tauri): react to system tray "Sign out" — clear local account and go to sign-in.
 * Tray icon is created in Rust (src-tauri); this listens for the emitted event.
 */
export default function TauriTrayBridge() {
  const navigate = useNavigate()
  const { disconnectWallet } = useWallet()

  useEffect(() => {
    if (!isTauriApp()) return undefined

    let unlistenFn
    let cancelled = false

    const setup = import('@tauri-apps/api/event').then(async ({ listen }) => {
      if (cancelled) return
      unlistenFn = await listen('tray-sign-out', () => {
        disconnectWallet()
        navigate('/sign-in', { replace: true })
      })
    })

    return () => {
      cancelled = true
      setup.then(() => {
        if (typeof unlistenFn === 'function') unlistenFn()
      })
    }
  }, [disconnectWallet, navigate])

  return null
}
