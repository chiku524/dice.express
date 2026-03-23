import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { useToastContext } from '../contexts/ToastContext'
import { getVirtualBalance } from '../services/balance'
import { BRAND_NAME, BRAND_TAGLINE } from '../constants/brand'
import { MARKET_SOURCES, getDiscoverPathForSource } from '../constants/marketConfig'
import { DOCUMENTATION_SECTIONS } from '../constants/documentationSections'
import './DesktopSidebar.css'

const discoverSources = MARKET_SOURCES.filter(
  (s) => s.value === 'all' || s.value !== 'user'
)

function isDiscoverRoute(pathname) {
  if (pathname === '/') return true
  if (pathname.startsWith('/discover')) return true
  if (pathname.startsWith('/market/')) return true
  return false
}

export default function DesktopSidebar() {
  const { wallet, disconnectWallet } = useWallet()
  const { showToast } = useToastContext()
  const location = useLocation()
  const [balanceFormatted, setBalanceFormatted] = useState(null)
  const [marketsMenuOpen, setMarketsMenuOpen] = useState(false)
  const [docsMenuOpen, setDocsMenuOpen] = useState(false)
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 })
  const [docsFlyoutPos, setDocsFlyoutPos] = useState({ top: 0, left: 0 })
  const marketsBlockRef = useRef(null)
  const flyoutRef = useRef(null)
  const triggerRef = useRef(null)
  const docsBlockRef = useRef(null)
  const docsFlyoutRef = useRef(null)
  const docsTriggerRef = useRef(null)

  const discoverActive = isDiscoverRoute(location.pathname)
  const docsRouteActive =
    location.pathname === '/docs' || location.pathname === '/documentation'

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

  const updateFlyoutPosition = () => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const gap = 8
    const flyoutW = 260
    const maxH = Math.min(window.innerHeight - 16, 480)
    let top = r.top
    if (top + maxH > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - 8 - maxH)
    }
    let left = r.right + gap
    if (left + flyoutW > window.innerWidth - 8) {
      left = Math.max(8, r.left - gap - flyoutW)
    }
    setFlyoutPos({ top, left })
  }

  const updateDocsFlyoutPosition = () => {
    const el = docsTriggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const gap = 8
    const flyoutW = 320
    const maxH = Math.min(window.innerHeight - 16, 560)
    let top = r.top
    if (top + maxH > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - 8 - maxH)
    }
    let left = r.right + gap
    if (left + flyoutW > window.innerWidth - 8) {
      left = Math.max(8, r.left - gap - flyoutW)
    }
    setDocsFlyoutPos({ top, left })
  }

  useLayoutEffect(() => {
    if (!marketsMenuOpen) return
    updateFlyoutPosition()
    const onResize = () => updateFlyoutPosition()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [marketsMenuOpen])

  useLayoutEffect(() => {
    if (!docsMenuOpen) return
    updateDocsFlyoutPosition()
    const onResize = () => updateDocsFlyoutPosition()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [docsMenuOpen])

  useEffect(() => {
    if (!marketsMenuOpen && !docsMenuOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMarketsMenuOpen(false)
        setDocsMenuOpen(false)
      }
    }
    const onPointerDown = (e) => {
      const mBlock = marketsBlockRef.current
      const mFlyout = flyoutRef.current
      const dBlock = docsBlockRef.current
      const dFlyout = docsFlyoutRef.current
      const insideMarkets = mBlock?.contains(e.target) || mFlyout?.contains(e.target)
      const insideDocs = dBlock?.contains(e.target) || dFlyout?.contains(e.target)
      if (marketsMenuOpen && !insideMarkets) setMarketsMenuOpen(false)
      if (docsMenuOpen && !insideDocs) setDocsMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown, { passive: true })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [marketsMenuOpen, docsMenuOpen])

  useEffect(() => {
    setMarketsMenuOpen(false)
    setDocsMenuOpen(false)
  }, [location.pathname, location.hash])

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
        <div
          className="desktop-sidebar__markets-block"
          ref={marketsBlockRef}
        >
          <p className="desktop-sidebar__section-label">Markets</p>
          <button
            ref={triggerRef}
            type="button"
            className={`desktop-sidebar__markets-trigger${discoverActive ? ' desktop-sidebar__markets-trigger--active' : ''}`}
            aria-expanded={marketsMenuOpen}
            aria-haspopup="true"
            aria-controls="desktop-markets-flyout"
            id="desktop-markets-trigger"
            onClick={() => setMarketsMenuOpen((o) => !o)}
          >
            <span className="desktop-sidebar__markets-trigger-label">Browse categories</span>
            <span className="desktop-sidebar__markets-trigger-chevron" aria-hidden>
              {marketsMenuOpen ? '▾' : '▸'}
            </span>
          </button>
          {marketsMenuOpen &&
            createPortal(
              <div
                id="desktop-markets-flyout"
                ref={flyoutRef}
                className="desktop-sidebar__markets-flyout"
                role="menu"
                aria-labelledby="desktop-markets-trigger"
                style={{
                  position: 'fixed',
                  top: flyoutPos.top,
                  left: flyoutPos.left,
                }}
              >
                <p className="desktop-sidebar__flyout-title">Market categories</p>
                <ul className="desktop-sidebar__flyout-list">
                  {discoverSources.map((source) => {
                    const path = getDiscoverPathForSource(source.value)
                    return (
                      <li key={source.value} role="none">
                        <NavLink
                          role="menuitem"
                          to={path}
                          end={path === '/'}
                          className={({ isActive }) =>
                            `desktop-sidebar__flyout-link${isActive ? ' desktop-sidebar__flyout-link--active' : ''}`
                          }
                          onClick={() => setMarketsMenuOpen(false)}
                        >
                          {source.label}
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              </div>,
              document.body
            )}
        </div>

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
          <li className="desktop-sidebar__docs-item">
            <div className="desktop-sidebar__docs-block" ref={docsBlockRef}>
              <button
                ref={docsTriggerRef}
                type="button"
                className={`desktop-sidebar__markets-trigger desktop-sidebar__docs-trigger${docsRouteActive ? ' desktop-sidebar__markets-trigger--active' : ''}`}
                aria-expanded={docsMenuOpen}
                aria-haspopup="true"
                aria-controls="desktop-docs-flyout"
                id="desktop-docs-trigger"
                onClick={() => setDocsMenuOpen((o) => !o)}
              >
                <span className="desktop-sidebar__markets-trigger-label">Documentation</span>
                <span className="desktop-sidebar__markets-trigger-chevron" aria-hidden>
                  {docsMenuOpen ? '▾' : '▸'}
                </span>
              </button>
              {docsMenuOpen &&
                createPortal(
                  <div
                    id="desktop-docs-flyout"
                    ref={docsFlyoutRef}
                    className="desktop-sidebar__markets-flyout desktop-sidebar__docs-flyout"
                    role="menu"
                    aria-labelledby="desktop-docs-trigger"
                    style={{
                      position: 'fixed',
                      top: docsFlyoutPos.top,
                      left: docsFlyoutPos.left,
                    }}
                  >
                    <p className="desktop-sidebar__flyout-title">Documentation</p>
                    <ul className="desktop-sidebar__flyout-list">
                      {DOCUMENTATION_SECTIONS.map((section) => {
                        const hash = location.hash.replace(/^#/, '')
                        const isActiveSection =
                          docsRouteActive &&
                          (hash === section.id || (!hash && section.id === 'getting-started'))
                        return (
                          <li key={section.id} role="none">
                            <NavLink
                              role="menuitem"
                              to={`/docs#${section.id}`}
                              className={`desktop-sidebar__flyout-link${isActiveSection ? ' desktop-sidebar__flyout-link--active' : ''}`}
                              onClick={() => setDocsMenuOpen(false)}
                            >
                              {section.title}
                            </NavLink>
                          </li>
                        )
                      })}
                    </ul>
                  </div>,
                  document.body
                )}
            </div>
          </li>
          <li>
            <NavLink
              to="/activity"
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
