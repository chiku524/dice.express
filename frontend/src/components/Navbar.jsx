import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { getVirtualBalance } from '../services/balance'
import { BRAND_NAME, BRAND_TAGLINE } from '../constants/brand'
import './Navbar.css'

export default function Navbar({ showWalletModal, setShowWalletModal }) {
  const { wallet, disconnectWallet } = useWallet()
  const location = useLocation()
  const [showMarketsMenu, setShowMarketsMenu] = useState(false)
  const [showToolsMenu, setShowToolsMenu] = useState(false)
  const [balanceFormatted, setBalanceFormatted] = useState(null)
  const marketsMenuRef = useRef(null)
  const toolsMenuRef = useRef(null)

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
      if (marketsMenuRef.current && !marketsMenuRef.current.contains(event.target)) {
        setShowMarketsMenu(false)
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target)) {
        setShowToolsMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdowns when route changes
  useEffect(() => {
    setShowMarketsMenu(false)
    setShowToolsMenu(false)
  }, [location.pathname])

  const isActive = (path) => location.pathname === path

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
          {/* Markets Dropdown */}
          <div className="nav-dropdown" ref={marketsMenuRef}>
            <button
              className={`nav-dropdown-toggle ${isActive('/') || isActive('/create') ? 'active' : ''}`}
              onClick={() => {
                setShowMarketsMenu(!showMarketsMenu)
                setShowToolsMenu(false)
              }}
            >
              Markets
              <span className="dropdown-arrow">▼</span>
            </button>
            {showMarketsMenu && (
              <div className="nav-dropdown-menu">
                <Link to="/" className={isActive('/') ? 'active' : ''}>
                  Browse Markets
                </Link>
                <Link to="/create" className={isActive('/create') ? 'active' : ''}>
                  Create Market
                </Link>
                <Link to="/portfolio" className={isActive('/portfolio') ? 'active' : ''}>
                  My Portfolio
                </Link>
              </div>
            )}
          </div>

          {/* Tools Dropdown */}
          <div className="nav-dropdown" ref={toolsMenuRef}>
            <button
              className={`nav-dropdown-toggle ${isActive('/admin') || isActive('/history') || isActive('/docs') || isActive('/documentation') || isActive('/test') ? 'active' : ''}`}
              onClick={() => {
                setShowToolsMenu(!showToolsMenu)
                setShowMarketsMenu(false)
              }}
            >
              Tools
              <span className="dropdown-arrow">▼</span>
            </button>
            {showToolsMenu && (
              <div className="nav-dropdown-menu">
                <Link to="/admin" className={isActive('/admin') ? 'active' : ''}>
                  Admin Dashboard
                </Link>
                <Link to="/history" className={isActive('/history') ? 'active' : ''}>
                  Contract History
                </Link>
                <Link to="/docs" className={isActive('/docs') || isActive('/documentation') ? 'active' : ''}>
                  📚 Documentation
                </Link>
                <Link to="/test" className={isActive('/test') ? 'active' : ''}>
                  🧪 Test Contracts
                </Link>
              </div>
            )}
          </div>

          {/* Wallet Section */}
          {wallet ? (
            <div className="wallet-info">
              {balanceFormatted != null && (
                <Link to="/portfolio" className="nav-balance" title="View in Portfolio">
                  {balanceFormatted}
                </Link>
              )}
              <span>{wallet.party.substring(0, 20)}...</span>
              <button onClick={() => setShowWalletModal(true)}>Wallet</button>
              <button onClick={disconnectWallet}>Disconnect</button>
            </div>
          ) : (
            <button 
              className="btn-connect"
              onClick={() => setShowWalletModal(true)}
            >
              Connect Wallet
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}

