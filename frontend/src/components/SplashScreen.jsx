import { useEffect, useState, useRef } from 'react'
import { BRAND_NAME, BRAND_TAGLINE } from '../constants/brand'
import DesktopUpdateOverlay from './DesktopUpdateOverlay'
import DiceLoader from './DiceLoader'
import './SplashScreen.css'

const WALLET_STORAGE_KEY = 'virtual_account'

const PHASE = {
  INTRO: 'intro',
  CHECKING: 'checking',
  DOWNLOADING: 'downloading',
  INSTALLING: 'installing',
  OPENING: 'opening',
}

/**
 * Frameless desktop intro: clean intro animation → update check (and optional download) → transition to main window.
 * Inspired by VibeMiner's minimal, elegant splash design.
 */
export default function SplashScreen() {
  const [phase, setPhase] = useState(PHASE.INTRO)
  const [introDone, setIntroDone] = useState(false)
  const [updateVersion, setUpdateVersion] = useState(null)
  const cancelledRef = useRef(false)

  const isTauri = typeof window !== 'undefined' && window.__TAURI__

  // Intro animation: minimal fade-in, then move to checking
  useEffect(() => {
    if (!isTauri) {
      setIntroDone(true)
      return
    }
    const t = setTimeout(() => setIntroDone(true), 1800)
    return () => clearTimeout(t)
  }, [isTauri])

  // After intro, run update check and optional download
  useEffect(() => {
    if (!introDone || !isTauri) return

    cancelledRef.current = false

    const getInitialPath = () => {
      try {
        const raw = localStorage.getItem(WALLET_STORAGE_KEY)
        const data = raw ? JSON.parse(raw) : null
        if (data?.party) return '/'
      } catch {
        // ignore invalid stored wallet
      }
      return '/sign-in'
    }

    const run = async () => {
      setPhase(PHASE.CHECKING)

      try {
        const [{ check }, { relaunch }] = await Promise.all([
          import('@tauri-apps/plugin-updater'),
          import('@tauri-apps/plugin-process'),
        ])
        const update = await check()
        if (cancelledRef.current) return

        if (update) {
          setUpdateVersion(update.version)
          setPhase(PHASE.DOWNLOADING)

          await update.downloadAndInstall(() => {
            if (cancelledRef.current) return
          })

          if (cancelledRef.current) return
          setPhase(PHASE.INSTALLING)
          await relaunch()
          return
        }
      } catch {
        // No updater config or network error: continue to app
      }

      if (cancelledRef.current) return
      setPhase(PHASE.OPENING)

      const path = getInitialPath()
      try {
        localStorage.setItem('desktop_initial_path', path)
      } catch {
        // localStorage may be unavailable
      }

      const tauri = window.__TAURI__
      if (tauri?.core?.invoke) {
        await tauri.core.invoke('close_splash_and_show_main').catch(() => {})
      }
    }

    run()
    return () => {
      cancelledRef.current = true
    }
  }, [introDone, isTauri])

  const showUpdateOverlay = phase === PHASE.DOWNLOADING || phase === PHASE.INSTALLING

  return (
    <>
      <div className="splash-screen splash-screen--intro">
        <div className="splash-screen__content">
          <div className="splash-screen__symbol" aria-hidden>
            <img src="/logo.svg" alt="" width={72} height={72} />
          </div>
          <h1 className="splash-screen__name">{BRAND_NAME}</h1>
          <p className="splash-screen__tagline">{BRAND_TAGLINE}</p>
          {phase === PHASE.CHECKING && (
            <div className="splash-screen__dice">
              <DiceLoader size="sm" label="Checking for updates…" />
            </div>
          )}
        </div>
      </div>
      {showUpdateOverlay && (
        <DesktopUpdateOverlay phase={phase} version={updateVersion} />
      )}
    </>
  )
}
