import { DESKTOP_APP_VERSION, DESKTOP_DOWNLOADS } from '../constants/downloads'
import './Download.css'

export default function Download() {
  const entries = [
    DESKTOP_DOWNLOADS.windows,
    DESKTOP_DOWNLOADS.macIntel,
    DESKTOP_DOWNLOADS.macApple,
    DESKTOP_DOWNLOADS.linux,
  ]

  return (
    <div className="download-page">
      <div className="download-hero">
        <img src="/logo.svg" alt="" className="download-logo" width={64} height={64} />
        <h1 className="download-title">Download dice.express</h1>
        <p className="download-lead">
          Desktop app for Windows and macOS. Same prediction markets, native experience — with a quick intro and a focused sign-in.
        </p>
        <p className="download-version">Version {DESKTOP_APP_VERSION}</p>
      </div>

      <section className="download-section" aria-labelledby="downloads-heading">
        <h2 id="downloads-heading" className="download-heading">Direct downloads</h2>
        <p className="download-note">These links download the installer directly (no redirect to GitHub).</p>
        <ul className="download-list">
          {entries.map((item) => (
            <li key={item.label} className="download-item">
              <span className="download-item-icon" aria-hidden>{item.icon}</span>
              <div className="download-item-content">
                <span className="download-item-label">{item.label}</span>
                <div className="download-item-buttons">
                  <a
                    href={item.primary.href}
                    className="download-btn"
                    download={item.primary.filename}
                    rel="noopener noreferrer"
                  >
                    {item.primary.label}
                  </a>
                  {item.secondary && (
                    <a
                      href={item.secondary.href}
                      className="download-btn download-btn--secondary"
                      download={item.secondary.filename}
                      rel="noopener noreferrer"
                    >
                      {item.secondary.label}
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="download-section download-section--info">
        <h2 className="download-heading">What you get</h2>
        <ul className="download-features">
          <li>Frameless intro animation, then the main app at sign-in</li>
          <li>Same markets, Pips, and trading as the web app</li>
          <li>dice.express icon in the taskbar/dock</li>
        </ul>
        <p className="download-releases">
          All releases are on{' '}
          <a href="https://github.com/chiku524/dice.express/releases" target="_blank" rel="noopener noreferrer">
            GitHub Releases
          </a>
          . If a direct download fails, grab the installer from the latest release there.
        </p>
      </section>
    </div>
  )
}
