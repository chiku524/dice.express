import { useEffect, useState } from 'react'
import './SplashScreen.css'

/**
 * Frameless intro screen for the Tauri desktop app.
 * Runs a short animation, then invokes the backend to close the splash window
 * and show the main (windowed) app at the login/register screen.
 */
export default function SplashScreen() {
  const [phase, setPhase] = useState('enter')

  useEffect(() => {
    const tauri = typeof window !== 'undefined' && window.__TAURI__
    if (!tauri) {
      setPhase('done')
      return
    }

    const timer = setTimeout(() => {
      setPhase('exit')
    }, 2200)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (phase !== 'exit') return
    const tauri = typeof window !== 'undefined' && window.__TAURI__
    if (!tauri?.core?.invoke) return

    tauri.core.invoke('close_splash_and_show_main').catch(() => {
      tauri.core.invoke('set_splash_complete', { task: 'frontend' }).catch(() => {}) // fallback
    })
  }, [phase])

  return (
    <div className={`splash-screen splash-screen--${phase}`}>
      <div className="splash-screen__bg" />
      <div className="splash-screen__content">
        <div className="splash-screen__logo-wrap">
          <img
            src="/logo.svg"
            alt="dice.express"
            className="splash-screen__logo"
            width={80}
            height={80}
          />
        </div>
        <h1 className="splash-screen__title">dice.express</h1>
        <p className="splash-screen__tagline">Prediction markets. Your choice. Your chance.</p>
        <div className="splash-screen__loader" aria-hidden />
      </div>
    </div>
  )
}
