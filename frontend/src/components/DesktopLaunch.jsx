import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import './DesktopLaunch.css'

const WALLET_STORAGE_KEY = 'virtual_account'
const INITIAL_PATH_KEY = 'desktop_initial_path'

/**
 * Main window entry: shown after the frameless splash closes.
 * Only redirects to home or sign-in (path was set by the splash before opening this window).
 */
export default function DesktopLaunch() {
  const navigate = useNavigate()
  const { wallet } = useWallet()
  const doneRef = useRef(false)

  const isTauri = typeof window !== 'undefined' && window.__TAURI__

  useEffect(() => {
    if (!isTauri) {
      const target = wallet?.party ? '/' : '/sign-in'
      navigate(target, { replace: true })
      return
    }

    if (doneRef.current) return
    doneRef.current = true

    const getTarget = () => {
      try {
        const stored = localStorage.getItem(INITIAL_PATH_KEY)
        if (stored) {
          localStorage.removeItem(INITIAL_PATH_KEY)
          return stored
        }
      } catch (_) {}
      if (wallet?.party) return '/'
      try {
        const raw = localStorage.getItem(WALLET_STORAGE_KEY)
        const data = raw ? JSON.parse(raw) : null
        if (data?.party) return '/'
      } catch (_) {}
      return '/sign-in'
    }

    const target = getTarget()
    navigate(target, { replace: true })
  }, [isTauri, navigate, wallet])

  if (!isTauri) return null

  return (
    <div className="desktop-launch">
      <div className="desktop-launch__bg" />
      <div className="desktop-launch__content">
        <div className="desktop-launch__logo-wrap">
          <img
            src="/logo.svg"
            alt=""
            className="desktop-launch__logo"
            width={72}
            height={72}
          />
        </div>
        <h1 className="desktop-launch__title">dice.express</h1>
        <p className="desktop-launch__step">Opening…</p>
      </div>
    </div>
  )
}
