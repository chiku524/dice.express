import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import './DesktopLaunch.css'

const WALLET_STORAGE_KEY = 'virtual_account'

const STEPS = {
  CHECKING: 'checking',
  DOWNLOADING: 'downloading',
  OPENING: 'opening',
  DONE: 'done',
}

/**
 * Desktop-only launch screen: runs after the splash window closes.
 * Checks for updates (with progress), then redirects to home or sign-in based on auth.
 */
export default function DesktopLaunch() {
  const navigate = useNavigate()
  const { wallet } = useWallet()
  const [step, setStep] = useState(STEPS.CHECKING)
  const [progress, setProgress] = useState(0)
  const [updateVersion, setUpdateVersion] = useState(null)
  const timeoutRef = useRef(null)

  const isTauri = typeof window !== 'undefined' && window.__TAURI__

  useEffect(() => {
    if (!isTauri) {
      const target = wallet ? '/' : '/sign-in'
      navigate(target, { replace: true })
      return
    }

    let cancelled = false

    const run = async () => {
      try {
        const [{ check }, { relaunch }] = await Promise.all([
          import('@tauri-apps/plugin-updater'),
          import('@tauri-apps/plugin-process'),
        ])
        const update = await check()
        if (cancelled) return

        if (update) {
          setUpdateVersion(update.version)
          setStep(STEPS.DOWNLOADING)
          let downloaded = 0
          let contentLength = 0

          await update.downloadAndInstall((event) => {
            if (cancelled) return
            switch (event.event) {
              case 'Started':
                contentLength = event.data?.contentLength ?? 0
                setProgress(0)
                break
              case 'Progress':
                downloaded += event.data?.chunkLength ?? 0
                setProgress(contentLength > 0 ? Math.round((downloaded / contentLength) * 100) : 50)
                break
              case 'Finished':
                setProgress(100)
                break
              default:
                break
            }
          })

          if (cancelled) return
          await relaunch()
          return
        }
      } catch (_) {
        // No updater config or network error: continue to app
      }

      if (cancelled) return
      setStep(STEPS.OPENING)
      setProgress(100)

      // Redirect: use wallet from context if ready, else localStorage (hydration may not be done yet)
      const getTarget = () => {
        if (wallet?.party) return '/'
        try {
          const raw = localStorage.getItem(WALLET_STORAGE_KEY)
          const data = raw ? JSON.parse(raw) : null
          if (data?.party) return '/'
        } catch (_) {}
        return '/sign-in'
      }

      timeoutRef.current = setTimeout(() => {
        if (cancelled) return
        navigate(getTarget(), { replace: true })
      }, 600)
    }

    run()
    return () => {
      cancelled = true
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isTauri, navigate, wallet])

  if (!isTauri) return null

  const stepLabel =
    step === STEPS.CHECKING
      ? 'Checking for updates…'
      : step === STEPS.DOWNLOADING
        ? updateVersion
          ? `Downloading v${updateVersion}…`
          : 'Downloading update…'
        : 'Opening dice.express…'

  return (
    <div className="desktop-launch">
      <div className="desktop-launch__bg" />
      <div className="desktop-launch__content">
        <div className="desktop-launch__logo-wrap">
          <img src="/logo.svg" alt="" className="desktop-launch__logo" width={72} height={72} />
        </div>
        <h1 className="desktop-launch__title">dice.express</h1>
        <p className="desktop-launch__step">{stepLabel}</p>
        <div className="desktop-launch__progress-wrap" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="desktop-launch__progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}
