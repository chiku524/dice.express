import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import MarketQuickTrade from './MarketQuickTrade'
import './MarketQuickTrade.css'

function getFocusableElements(container) {
  if (!container) return []
  const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  return Array.from(container.querySelectorAll(selector)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
  )
}

/**
 * Centered dialog for Discover quick trade (Yes/No chips or Quick trade button).
 * @param {{ market: object, initialTradeSide?: string, onClose: () => void, onTradeSuccess?: () => void }} props
 */
export default function MarketQuickTradeModal({ market, initialTradeSide, onClose, onTradeSuccess }) {
  const modalRef = useRef(null)
  const payload = market?.payload
  const marketId = payload?.marketId
  const title = (payload?.title || 'Market').trim()
  const titleId = marketId ? `quick-trade-modal-title-${marketId}` : 'quick-trade-modal-title'

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const modal = modalRef.current
    modal?.focus()

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !modal) return
      const els = getFocusableElements(modal)
      if (els.length === 0) return
      const first = els[0]
      const last = els[els.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === modal) {
          e.preventDefault()
          last.focus()
        }
      } else if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  if (typeof document === 'undefined' || !market || !marketId) return null

  const detailHref = `/market/${marketId}`

  return createPortal(
    <div
      className="market-quick-trade-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="market-quick-trade-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="market-quick-trade-modal-header">
          <div className="market-quick-trade-modal-heading">
            <p className="market-quick-trade-modal-kicker">Quick trade</p>
            <h2 id={titleId} className="market-quick-trade-modal-title">
              {title}
            </h2>
          </div>
          <div className="market-quick-trade-modal-header-actions">
            <Link to={detailHref} className="market-quick-trade-link" onClick={onClose}>
              Full page
            </Link>
            <button
              type="button"
              className="market-quick-trade-modal-close"
              onClick={onClose}
              aria-label="Close quick trade"
            >
              ×
            </button>
          </div>
        </div>
        <div className="market-quick-trade-modal-body">
          <MarketQuickTrade
            key={`${marketId}-${initialTradeSide ?? 'default'}`}
            market={market}
            initialTradeSide={initialTradeSide}
            onTradeSuccess={onTradeSuccess}
            inModal
          />
        </div>
      </div>
    </div>,
    document.body
  )
}
