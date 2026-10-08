import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { getVirtualBalance } from '../services/balance'
import { BRAND_NAME, BRAND_TAGLINE } from '../constants/brand'
import { isTauriApp } from '../utils/platform'
import ThemeToggle from './ThemeToggle'
import './Navbar.css'

export default function Navbar() {
  const { wallet, disconnectWallet } = useWallet()
  const location = useLocation()
  const [showResourcesMenu, setShowResourcesMenu] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [balanceFormatted, setBalanceFormatted] = useState(null)
  const resourcesMenuRef = useRef(null)
  const accountMenuRef = useRef(null)

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
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setShowAccountMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setShowResourcesMenu(false)
    setShowAccountMenu(false)
    setMobileMenuOpen(false)
  }, [location.pathname, location.hash, location.search])

  const isActive = (path) => location.pathname === path
  const isMarketsActive =
    isActive('/') || location.pathname.startsWith('/discover') || location.pathname.startsWith('/market')
  const isResourcesActive = () =>
    isActive('/download') ||
    isActive('/automation') ||
    isActive('/docs') ||
    isActive('/documentation') ||
    isActive('/whitepaper')
  const isAccountActive = () =>
    isActive('/dashboard') ||
    isActive('/portfolio') ||
    isActive('/watchlist') ||
    isActive('/profile') ||
    isActive('/activity') ||
    isActive('/history')

  const isDesktopApp = isTauriApp()
  const accountLabel = wallet?.party
    ? wallet.party.length > 14
      ? `${wallet.party.substring(0, 14)}…`
      : wallet.party
    : 'Account'

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
          <Link to="/create" className={isActive('/create') ? 'active' : ''}>
            Create
          </Link>

          <div className="nav-dropdown nav-dropdown-resources" ref={resourcesMenuRef}>
            <button
              type="button"
              className={`nav-dropdown-toggle ${isResourcesActive() ? 'active' : ''}`}
              onClick={() => {
                setShowResourcesMenu(!showResourcesMenu)
                setShowAccountMenu(false)
              }}
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
              </div>
            )}
          </div>

          {wallet ? (
            <div className="wallet-info">
              <ThemeToggle variant="compact" />
              {balanceFormatted != null && (
                <Link to="/portfolio" className="nav-balance" title="Pips — Portfolio">
                  {balanceFormatted}
                </Link>
              )}
              <div className="nav-dropdown nav-dropdown-account" ref={accountMenuRef}>
                <button
                  type="button"
                  className={`nav-dropdown-toggle ${isAccountActive() ? 'active' : ''}`}
                  onClick={() => {
                    setShowAccountMenu(!showAccountMenu)
                    setShowResourcesMenu(false)
                  }}
                  title={wallet.party}
                >
                  {accountLabel}
                  <span className="dropdown-arrow">▼</span>
                </button>
                {showAccountMenu && (
                  <div className="nav-dropdown-menu">
                    <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
                      Dashboard
                    </Link>
                    <Link to="/portfolio" className={isActive('/portfolio') ? 'active' : ''}>
                      Portfolio
                    </Link>
                    <Link to="/watchlist" className={isActive('/watchlist') ? 'active' : ''}>
                      Watchlist
                    </Link>
                    <Link to="/profile" className={isActive('/profile') ? 'active' : ''}>
                      Profile
                    </Link>
                    <Link
                      to="/portfolio?tab=activity"
                      className={isActive('/activity') || isActive('/history') ? 'active' : ''}
                    >
                      Activity
                    </Link>
                    <ThemeToggle variant="menu" />
                    <button type="button" className="nav-menu-sign-out" onClick={disconnectWallet}>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <ThemeToggle variant="compact" />
              <Link to="/sign-in" className="nav-sign-in-link">Sign in</Link>
              <Link to="/register" className="btn-connect">Create account</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
