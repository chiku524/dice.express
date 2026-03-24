import { useEffect, useState } from 'react'
import DiceLoader from './DiceLoader'
import './DesktopUpdateOverlay.css'

/**
 * Full-screen overlay shown during update download/install in the desktop app.
 * Clean, centered card with rolling die and message.
 */
export default function DesktopUpdateOverlay({ phase, version }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(phase === 'downloading' || phase === 'installing')
  }, [phase])

  if (!visible) return null

  const label =
    phase === 'downloading'
      ? version
        ? `Downloading v${version}…`
        : 'Downloading update…'
      : 'Installing… The app will be restarting in a moment.'

  return (
    <div
      className="desktop-update-overlay"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="desktop-update-overlay__card">
        <div className="desktop-update-overlay__symbol" aria-hidden>
          <img src="/logo.svg" alt="" width={56} height={56} />
        </div>
        <p className="desktop-update-overlay__name">dice.express</p>
        <DiceLoader size="sm" className="desktop-update-overlay__dice" />
        <p className="desktop-update-overlay__message">{label}</p>
      </div>
    </div>
  )
}
