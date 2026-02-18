import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { getVirtualBalance } from '../services/balance'
import { BRAND_NAME, BRAND_TAGLINE } from '../constants/brand'
import './Navbar.css'

export default function Navbar({ showWalletModal, setShowWalletModal }) {
  const { wallet, disconnectWallet } = useWallet()
  const location = useLocation()
  const [showDiscoverMenu, setShowDiscoverMenu] = useState(false)
  const [showResourcesMenu, setShowResourcesMenu] = useState(false)
  const [balanceFormatted, setBalanceFormatted] = useState(null)
  const discoverMenuRef = useRef(null)
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
    setShowResourcesMenu(false)
  }, [location.pathname])

  const isActive = (path) => location.pathname === path
  const isDiscoverActive = () => ['/', '/create', '/portfolio', '/dashboard', '/profile'].some(isActive) ||
    location.pathname.startsWith('/discover')

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
          {/* Discover: markets by source + portfolio */}
          <div className="nav-dropdown" ref={discoverMenuRef}>
            <button
              className={`nav-dropdown-toggle ${isDiscoverActive() ? 'active' : ''}`}
              onClick={() => {
                setShowDiscoverMenu(!showDiscoverMenu)
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
                <Link to="/discover/user" className={location.pathname === '/discover/user' ? 'active' : ''}>
                  User-Created
                </Link>
                <div className="nav-dropdown-divider" />
                <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
                  Dashboard
                </Link>
                <Link to="/portfolio" className={isActive('/portfolio') ? 'active' : ''}>
                  My Portfolio
                </Link>
                <Link to="/profile" className={isActive('/profile') ? 'active' : ''}>
                  Profile
                </Link>
                <Link to="/create" className={isActive('/create') ? 'active' : ''}>
                  Create Market
                </Link>
              </div>
            )}
          </div>

          {/* Resources / Tools */}
          <div className="nav-dropdown" ref={resourcesMenuRef}>
            <button
              className={`nav-dropdown-toggle ${isActive('/admin') || isActive('/history') || isActive('/docs') || isActive('/documentation') ? 'active' : ''}`}
              onClick={() => {
                setShowResourcesMenu(!showResourcesMenu)
                setShowDiscoverMenu(false)
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
                <Link to="/docs#amm" className="">
                  AMM &amp; Fees
                </Link>
                <Link to="/admin" className={isActive('/admin') ? 'active' : ''}>
                  Admin Dashboard
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
                <Link to="/portfolio" className="nav-balance" title="Credits — View in Portfolio">
                  {balanceFormatted}
                </Link>
              )}
              <Link to="/dashboard" className="nav-user-name" title={wallet.party}>
                {wallet.party.length > 16 ? wallet.party.substring(0, 16) + '…' : wallet.party}
              </Link>
              <button onClick={() => setShowWalletModal(true)}>Account</button>
              <button onClick={disconnectWallet}>Disconnect</button>
            </div>
          ) : (
            <button 
              className="btn-connect"
              onClick={() => setShowWalletModal(true)}
            >
              Sign in
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}
