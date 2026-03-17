import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { getVirtualBalance } from '../services/balance'
import { BRAND_NAME, BRAND_TAGLINE } from '../constants/brand'
import './Navbar.css'

export default function Navbar({ setShowWalletModal }) {
  const { wallet, disconnectWallet } = useWallet()
  const location = useLocation()
  const [showDiscoverMenu, setShowDiscoverMenu] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showResourcesMenu, setShowResourcesMenu] = useState(false)
  const [balanceFormatted, setBalanceFormatted] = useState(null)
  const discoverMenuRef = useRef(null)
  const accountMenuRef = useRef(null)
  const resourcesMenuRef = useRef(null)

  // Fetch virtual balance when wallet is connected
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (discoverMenuRef.current && !discoverMenuRef.current.contains(event.target)) {
        setShowDiscoverMenu(false)
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setShowAccountMenu(false)
      }
      if (resourcesMenuRef.current && !resourcesMenuRef.current.contains(event.target)) {
        setShowResourcesMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdowns when route changes
  useEffect(() => {
    setShowDiscoverMenu(false)
    setShowAccountMenu(false)
    setShowResourcesMenu(false)
  }, [location.pathname])

  const isActive = (path) => location.pathname === path
  const isDiscoverActive = () => isActive('/') || location.pathname.startsWith('/discover') || location.pathname.startsWith('/market')
  const isAccountActive = () => ['/dashboard', '/portfolio', '/profile', '/account'].some(isActive)

  return (
    <header className="app-header">
      <div className="container">
        <Link to="/" className="logo">
          <img src="/logo.svg" alt="" className="logo-img" width="36" height="36" />
          <span className="logo-text">
            <span className="logo-name">{BRAND_NAME}</span>
            <span className="logo-tagline">{BRAND_TAGLINE}</span>
          </span>
        </Link>
        <nav>
          {/* Discover: markets only */}
          <div className="nav-dropdown" ref={discoverMenuRef}>
            <button
              className={`nav-dropdown-toggle ${isDiscoverActive() ? 'active' : ''}`}
              onClick={() => {
                setShowDiscoverMenu(!showDiscoverMenu)
                setShowAccountMenu(false)
                setShowResourcesMenu(false)
              }}
            >
              Discover
              <span className="dropdown-arrow">▼</span>
            </button>
            {showDiscoverMenu && (
              <div className="nav-dropdown-menu">
                <Link to="/" className={isActive('/') ? 'active' : ''}>
                  All Markets
                </Link>
                <Link to="/discover/global-events" className={location.pathname === '/discover/global-events' ? 'active' : ''}>
                  Global Events
                </Link>
                <Link to="/discover/industry" className={location.pathname === '/discover/industry' ? 'active' : ''}>
                  Industry Topics
                </Link>
                <Link to="/discover/virtual-realities" className={location.pathname === '/discover/virtual-realities' ? 'active' : ''}>
                  Virtual Realities
                </Link>
              </div>
            )}
          </div>

          {/* Account: dashboard, portfolio, profile (when logged in) */}
          {wallet && (
            <div className="nav-dropdown nav-dropdown-account" ref={accountMenuRef}>
              <button
                className={`nav-dropdown-toggle ${isAccountActive() ? 'active' : ''}`}
                onClick={() => {
                  setShowAccountMenu(!showAccountMenu)
                  setShowDiscoverMenu(false)
                  setShowResourcesMenu(false)
                }}
              >
                Account
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
                  <Link to="/profile" className={isActive('/profile') ? 'active' : ''}>
                    Profile
                  </Link>
                  <div className="nav-dropdown-divider" />
                  <Link to="/account" className={isActive('/account') ? 'active' : ''}>
                    Account summary
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Resources */}
          <div className="nav-dropdown nav-dropdown-resources" ref={resourcesMenuRef}>
            <button
              className={`nav-dropdown-toggle ${isActive('/history') || isActive('/docs') || isActive('/documentation') ? 'active' : ''}`}
              onClick={() => {
                setShowResourcesMenu(!showResourcesMenu)
                setShowDiscoverMenu(false)
                setShowAccountMenu(false)
              }}
            >
              Resources
              <span className="dropdown-arrow">▼</span>
            </button>
            {showResourcesMenu && (
              <div className="nav-dropdown-menu">
                <Link to="/docs" className={isActive('/docs') || isActive('/documentation') ? 'active' : ''}>
                  Documentation
                </Link>
                <Link to="/history" className={isActive('/history') ? 'active' : ''}>
                  Activity
                </Link>
              </div>
            )}
          </div>

          {/* Wallet Section */}
          {wallet ? (
            <div className="wallet-info">
              {balanceFormatted != null && (
                <Link to="/portfolio" className="nav-balance" title="Your Pips balance — View in Portfolio">
                  {balanceFormatted}
                </Link>
              )}
              <Link to="/dashboard" className="nav-user-name" title={wallet.party}>
                {wallet.party.length > 16 ? wallet.party.substring(0, 16) + '…' : wallet.party}
              </Link>
              <Link to="/account" className="nav-account-link">Account</Link>
              <button type="button" className="nav-disconnect-btn" onClick={disconnectWallet}>Disconnect</button>
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
