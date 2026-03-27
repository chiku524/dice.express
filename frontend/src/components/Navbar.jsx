import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { useToastContext } from '../contexts/ToastContext'
import { getVirtualBalance } from '../services/balance'
import { BRAND_NAME, BRAND_TAGLINE } from '../constants/brand'
import { MARKET_SOURCES, getDiscoverPathForSource } from '../constants/marketConfig'
import {
  DOCUMENTATION_SECTIONS,
  documentationBasePath,
} from '../constants/documentationSections'
import './Navbar.css'

export default function Navbar() {
  const { wallet, disconnectWallet } = useWallet()
  const { showToast } = useToastContext()
  const location = useLocation()
  const navigate = useNavigate()
  const [showDiscoverMenu, setShowDiscoverMenu] = useState(false)
  const [showResourcesMenu, setShowResourcesMenu] = useState(false)
  const [showDocsMenu, setShowDocsMenu] = useState(false)
  const [balanceFormatted, setBalanceFormatted] = useState(null)
  const discoverMenuRef = useRef(null)
  const resourcesMenuRef = useRef(null)
  const docsMenuRef = useRef(null)

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
      if (docsMenuRef.current && !docsMenuRef.current.contains(event.target)) {
        setShowDocsMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdowns when route changes
  useEffect(() => {
    setShowDiscoverMenu(false)
    setShowResourcesMenu(false)
    setShowDocsMenu(false)
  }, [location.pathname, location.hash])

  const isActive = (path) => location.pathname === path
  const isDiscoverActive = () => isActive('/') || location.pathname.startsWith('/discover') || location.pathname.startsWith('/market')
  const isDocsActive = () => isActive('/docs') || isActive('/documentation')
  const docsSectionIsActive = (sectionId) => {
    if (!isDocsActive()) return false
    const h = location.hash.replace(/^#/, '')
    if (!h && sectionId === 'getting-started') return true
    return h === sectionId
  }

  const isDesktopApp = typeof window !== 'undefined' && window.__TAURI__

  const copyDisplayName = () => {
    if (!wallet?.party) return
    navigator.clipboard?.writeText(wallet.party).then(() => {
      showToast('Display name copied', 'success')
    }).catch(() => {})
  }

  return (
    <header className="app-header">
      <div className="container">
        <Link to="/" className="logo" {...(isDesktopApp ? { 'data-tauri-drag-region': true } : {})}>
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
                setShowResourcesMenu(false)
                setShowDocsMenu(false)
              }}
            >
              Discover
              <span className="dropdown-arrow">▼</span>
            </button>
            {showDiscoverMenu && (
              <div className="nav-dropdown-menu">
                {MARKET_SOURCES.filter(s => s.value === 'all' || (s.value !== 'user')).map((source) => {
                  const path = getDiscoverPathForSource(source.value)
                  return (
                    <Link
                      key={source.value}
                      to={path}
                      className={isActive(path) ? 'active' : ''}
                    >
                      {source.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Documentation — hover (or click) opens full section list */}
          <div
            className="nav-dropdown nav-dropdown-docs"
            ref={docsMenuRef}
            onMouseEnter={() => setShowDocsMenu(true)}
            onMouseLeave={() => setShowDocsMenu(false)}
          >
            <button
              type="button"
              className={`nav-dropdown-toggle ${isDocsActive() ? 'active' : ''}`}
              aria-expanded={showDocsMenu}
              aria-haspopup="true"
              onClick={() => {
                setShowDocsMenu((o) => !o)
                setShowDiscoverMenu(false)
                setShowResourcesMenu(false)
              }}
            >
              Documentation
              <span className="dropdown-arrow">▼</span>
            </button>
            {showDocsMenu && (
              <div className="nav-dropdown-menu nav-dropdown-menu--docs" role="menu">
                {DOCUMENTATION_SECTIONS.map((section) => {
                  const docsPath = documentationBasePath(location.pathname)
                  const to = `${docsPath}#${section.id}`
                  return (
                    <Link
                      key={section.id}
                      role="menuitem"
                      to={to}
                      className={docsSectionIsActive(section.id) ? 'active' : ''}
                      onClick={(e) => {
                        e.preventDefault()
                        navigate({ pathname: docsPath, hash: `#${section.id}` })
                        setShowDocsMenu(false)
                      }}
                    >
                      {section.title}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Resources */}
          <div className="nav-dropdown nav-dropdown-resources" ref={resourcesMenuRef}>
            <button
              className={`nav-dropdown-toggle ${isActive('/activity') || isActive('/history') || isActive('/download') || isActive('/automation') ? 'active' : ''}`}
              onClick={() => {
                setShowResourcesMenu(!showResourcesMenu)
                setShowDiscoverMenu(false)
                setShowDocsMenu(false)
              }}
            >
              Resources
              <span className="dropdown-arrow">▼</span>
            </button>
            {showResourcesMenu && (
              <div className="nav-dropdown-menu">
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

          {/* Wallet Section */}
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
