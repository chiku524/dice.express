import { useEffect, useState, useRef } from 'react'
import { BRAND_NAME, BRAND_TAGLINE } from '../constants/brand'
import './SplashScreen.css'

const WALLET_STORAGE_KEY = 'virtual_account'

const PHASE = {
  INTRO: 'intro',
  CHECKING: 'checking',
  DOWNLOADING: 'downloading',
  OPENING: 'opening',
}

/**
 * Frameless desktop intro: intro animation → update check (and optional download) → transition to main window.
 * All of this runs in the small frameless window; the main window only opens at home or sign-in when done.
 */
export default function SplashScreen() {
  const [phase, setPhase] = useState(PHASE.INTRO)
  const [introDone, setIntroDone] = useState(false)
  const [progress, setProgress] = useState(0)
  const [updateVersion, setUpdateVersion] = useState(null)
  const cancelledRef = useRef(false)

  const isTauri = typeof window !== 'undefined' && window.__TAURI__

  // Intro animation: run enter then exit, then move to checking
  useEffect(() => {
    if (!isTauri) {
      setIntroDone(true)
      return
    }
    const t = setTimeout(() => setIntroDone(true), 2400)
    return () => clearTimeout(t)
  }, [isTauri])

  // After intro, run update check and optional download in this frameless window
  useEffect(() => {
    if (!introDone || !isTauri) return

    cancelledRef.current = false

    const getInitialPath = () => {
      try {
        const raw = localStorage.getItem(WALLET_STORAGE_KEY)
        const data = raw ? JSON.parse(raw) : null
        if (data?.party) return '/'
      } catch (_) {}
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
          let downloaded = 0
          let contentLength = 0

          await update.downloadAndInstall((event) => {
            if (cancelledRef.current) return
            switch (event.event) {
              case 'Started':
                contentLength = event.data?.contentLength ?? 0
                setProgress(0)
                break
              case 'Progress':
                downloaded += event.data?.chunkLength ?? 0
                setProgress(
                  contentLength > 0
                    ? Math.round((downloaded / contentLength) * 100)
                    : 50
                )
                break
              case 'Finished':
                setProgress(100)
                break
              default:
                break
            }
          })

          if (cancelledRef.current) return
          await relaunch()
          return
        }
      } catch (_) {
        // No updater config or network error: continue to app
      }

      if (cancelledRef.current) return
      setPhase(PHASE.OPENING)
      setProgress(100)

      const path = getInitialPath()
      try {
        localStorage.setItem('desktop_initial_path', path)
      } catch (_) {}

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

  const showIntro = phase === PHASE.INTRO
  const stepLabel =
    phase === PHASE.CHECKING
      ? 'Checking for updates…'
      : phase === PHASE.DOWNLOADING
        ? updateVersion
          ? `Downloading v${updateVersion}…`
          : 'Downloading update…'
        : phase === PHASE.OPENING
          ? 'Opening ' + BRAND_NAME + '…'
          : ''

  return (
    <div
      className={`splash-screen splash-screen--${showIntro ? 'intro' : 'ready'}`}
      data-phase={phase}
    >
      <div className="splash-screen__bg" />
      <div className="splash-screen__content">
        <div className="splash-screen__logo-wrap">
          <img
            src="/logo.svg"
            alt=""
            className="splash-screen__logo"
            width={80}
            height={80}
          />
        </div>
        <h1 className="splash-screen__title">{BRAND_NAME}</h1>
        <p className="splash-screen__tagline">{BRAND_TAGLINE}</p>

        {showIntro ? (
          <div className="splash-screen__loader" aria-hidden />
        ) : (
          <>
            <p className="splash-screen__step">{stepLabel}</p>
            <div
              className="splash-screen__progress-wrap"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="splash-screen__progress-bar"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
