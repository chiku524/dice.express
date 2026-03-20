import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { useToastContext } from '../contexts/ToastContext'
import { getVirtualBalance } from '../services/balance'
import { BRAND_NAME, BRAND_TAGLINE } from '../constants/brand'
import { MARKET_SOURCES, getDiscoverPathForSource } from '../constants/marketConfig'
import './DesktopSidebar.css'

const discoverSources = MARKET_SOURCES.filter(
  (s) => s.value === 'all' || s.value !== 'user'
)

export default function DesktopSidebar() {
  const { wallet, disconnectWallet } = useWallet()
  const { showToast } = useToastContext()
  const [balanceFormatted, setBalanceFormatted] = useState(null)

  useEffect(() => {
    if (!wallet?.party) {
      setBalanceFormatted(null)
      return
    }
    let cancelled = false
    getVirtualBalance(wallet.party).then(({ formatted }) => {
      if (!cancelled) setBalanceFormatted(formatted)
    })
    return () => {
      cancelled = true
    }
  }, [wallet?.party])

  const copyDisplayName = () => {
    if (!wallet?.party) return
    navigator.clipboard?.writeText(wallet.party).then(() => {
      showToast('Display name copied', 'success')
    }).catch(() => {})
  }

  return (
    <aside className="desktop-sidebar" aria-label="Main navigation">
      <div className="desktop-sidebar__brand" data-tauri-drag-region>
        <Link to="/" className="desktop-sidebar__logo-link">
          <img src="/logo.svg" alt="" width={36} height={36} />
          <div className="desktop-sidebar__brand-text">
            <span className="desktop-sidebar__brand-name">{BRAND_NAME}</span>
            <span className="desktop-sidebar__brand-tagline">{BRAND_TAGLINE}</span>
          </div>
        </Link>
      </div>

      <nav className="desktop-sidebar__nav">
        <p className="desktop-sidebar__section-label">Markets</p>
        <ul className="desktop-sidebar__list">
          {discoverSources.map((source) => {
            const path = getDiscoverPathForSource(source.value)
            return (
              <li key={source.value}>
                <NavLink
                  to={path}
                  end={path === '/'}
                  className={({ isActive }) =>
                    `desktop-sidebar__link${isActive ? ' desktop-sidebar__link--active' : ''}`
                  }
                >
                  {source.label}
                </NavLink>
              </li>
            )
          })}
        </ul>

        {wallet?.party && (
          <>
            <p className="desktop-sidebar__section-label">Account</p>
            <ul className="desktop-sidebar__list">
              <li>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `desktop-sidebar__link ${isActive ? 'desktop-sidebar__link--active' : ''}`
                  }
                >
                  Dashboard
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/portfolio"
                  className={({ isActive }) =>
                    `desktop-sidebar__link ${isActive ? 'desktop-sidebar__link--active' : ''}`
                  }
                >
                  Portfolio
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `desktop-sidebar__link ${isActive ? 'desktop-sidebar__link--active' : ''}`
                  }
                >
                  Profile
                </NavLink>
              </li>
            </ul>
          </>
        )}

        <p className="desktop-sidebar__section-label">More</p>
        <ul className="desktop-sidebar__list">
          <li>
            <NavLink
              to="/create"
              className={({ isActive }) =>
                `desktop-sidebar__link ${isActive ? 'desktop-sidebar__link--active' : ''}`
              }
            >
              Create market
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/docs"
              className={({ isActive }) =>
                `desktop-sidebar__link ${isActive ? 'desktop-sidebar__link--active' : ''}`
              }
            >
              Documentation
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `desktop-sidebar__link ${isActive ? 'desktop-sidebar__link--active' : ''}`
              }
            >
              Activity
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="desktop-sidebar__footer">
        {wallet ? (
          <>
            {balanceFormatted != null && (
              <Link to="/portfolio" className="desktop-sidebar__balance" title="Pips (Credits)">
                {balanceFormatted}
              </Link>
            )}
            <div className="desktop-sidebar__user-row">
              <span className="desktop-sidebar__user-name" title={wallet.party}>
                {wallet.party.length > 22 ? `${wallet.party.slice(0, 22)}…` : wallet.party}
              </span>
              <button
                type="button"
                className="desktop-sidebar__icon-btn"
                onClick={copyDisplayName}
                aria-label="Copy display name"
              >
                ⧉
              </button>
            </div>
            <button
              type="button"
              className="desktop-sidebar__disconnect"
              onClick={disconnectWallet}
            >
              Sign out
            </button>
          </>
        ) : (
          <div className="desktop-sidebar__auth">
            <Link to="/sign-in" className="desktop-sidebar__btn desktop-sidebar__btn--secondary">
              Sign in
            </Link>
            <Link to="/register" className="desktop-sidebar__btn desktop-sidebar__btn--primary">
              Create account
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
