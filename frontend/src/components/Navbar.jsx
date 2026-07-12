import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { useToastContext } from '../contexts/ToastContext'
import { getVirtualBalance } from '../services/balance'
import { BRAND_NAME, BRAND_TAGLINE } from '../constants/brand'
import { isTauriApp } from '../utils/platform'
import './Navbar.css'

export default function Navbar() {
  const { wallet, disconnectWallet } = useWallet()
  const { showToast } = useToastContext()
  const location = useLocation()
  const [showResourcesMenu, setShowResourcesMenu] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [balanceFormatted, setBalanceFormatted] = useState(null)
  const resourcesMenuRef = useRef(null)

  useEffect(() => {
    if (!wallet?.party) {
      setBalanceFormatted(null)
      return
    }
    let cancelled = false
    getVirtualBalance(wallet.party).then(({ formatted }) => {
      if (!cancelled) setBalanceFormatted(formatted)
    })
    return () => { cancelled = true }
  }, [wallet?.party])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (resourcesMenuRef.current && !resourcesMenuRef.current.contains(event.target)) {
        setShowResourcesMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setShowResourcesMenu(false)
    setMobileMenuOpen(false)
  }, [location.pathname, location.hash, location.search])

  const isActive = (path) => location.pathname === path
  const isMarketsActive =
    isActive('/') || location.pathname.startsWith('/discover') || location.pathname.startsWith('/market')
  const isResourcesActive = () =>
    isActive('/activity') ||
    isActive('/history') ||
    isActive('/download') ||
    isActive('/automation') ||
    isActive('/docs') ||
    isActive('/documentation') ||
    isActive('/whitepaper')

  const isDesktopApp = isTauriApp()

  const copyDisplayName = () => {
    if (!wallet?.party) return
    navigator.clipboard?.writeText(wallet.party).then(
      () => showToast('Display name copied', 'success'),
      () => showToast('Could not copy', 'error')
    )
  }

  return (
    <header className="app-header">
      <div className="container">
        <Link to="/" className="logo" data-tauri-drag-region={isDesktopApp ? true : undefined}>
          <img src="/logo.svg" alt="" className="logo-mark" width={32} height={32} />
          <span className="logo-text">
            <span className="logo-name">{BRAND_NAME}</span>
            <span className="logo-tagline">{BRAND_TAGLINE}</span>
          </span>
        </Link>

        <button
          type="button"
          className={`nav-mobile-toggle${mobileMenuOpen ? ' is-open' : ''}`}
          aria-expanded={mobileMenuOpen}
          aria-controls="primary-nav"
          onClick={() => setMobileMenuOpen((o) => !o)}
        >
          <span className="nav-mobile-toggle-bar" aria-hidden="true" />
          <span className="nav-mobile-toggle-bar" aria-hidden="true" />
          <span className="nav-mobile-toggle-bar" aria-hidden="true" />
        </button>
        <nav id="primary-nav" className={mobileMenuOpen ? 'nav-open' : ''}>
          <Link to="/" className={isMarketsActive ? 'active' : ''}>
            Markets
          </Link>

          <div className="nav-dropdown nav-dropdown-resources" ref={resourcesMenuRef}>
            <button
              className={`nav-dropdown-toggle ${isResourcesActive() ? 'active' : ''}`}
              onClick={() => setShowResourcesMenu(!showResourcesMenu)}
            >
              Resources
              <span className="dropdown-arrow">▼</span>
            </button>
            {showResourcesMenu && (
              <div className="nav-dropdown-menu">
                <Link
                  to="/documentation"
                  className={isActive('/documentation') || isActive('/docs') ? 'active' : ''}
                >
                  Documentation
                </Link>
                <Link to="/whitepaper" className={isActive('/whitepaper') ? 'active' : ''}>
                  Whitepaper
                </Link>
                <Link to="/download" className={isActive('/download') ? 'active' : ''}>
                  Download desktop
                </Link>
                <Link to="/automation" className={isActive('/automation') ? 'active' : ''}>
                  Automation status
                </Link>
                <Link
                  to="/activity"
                  className={isActive('/activity') || isActive('/history') ? 'active' : ''}
                >
                  Activity
                </Link>
              </div>
            )}
          </div>

          {wallet ? (
            <div className="wallet-info">
              {balanceFormatted != null && (
                <Link to="/portfolio" className="nav-balance" title="Pips (Credits) — View in Portfolio">
                  {balanceFormatted}
                </Link>
              )}
              <Link to="/watchlist" className="nav-watchlist-link" title="Your starred markets">
                Watchlist
              </Link>
              <span className="nav-user-name-wrap">
                <Link to="/dashboard" className="nav-user-name" title={`${wallet.party} — Click copy to copy`}>
                  {wallet.party.length > 16 ? wallet.party.substring(0, 16) + '…' : wallet.party}
                </Link>
                <button
                  type="button"
                  className="nav-copy-btn"
                  onClick={copyDisplayName}
                  aria-label="Copy display name"
                  title="Copy display name"
                >
                  📋
                </button>
              </span>
              <button type="button" className="nav-disconnect-btn" onClick={disconnectWallet}>Sign out</button>
            </div>
          ) : (
            <>
              <Link to="/sign-in" className="nav-sign-in-link">Sign in</Link>
              <Link to="/register" className="btn-connect">Create account</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
