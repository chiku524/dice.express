import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import './WalletModal.css'

function formatMemberSince(isoString) {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

function getFocusableElements(container) {
  if (!container) return []
  const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  return Array.from(container.querySelectorAll(selector)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
  )
}

export default function WalletModal({ isOpen, onClose }) {
  const { wallet, disconnectWallet } = useWallet()
  const modalRef = useRef(null)

  useEffect(() => {
    if (!isOpen || !modalRef.current) return
    const modal = modalRef.current
    const focusables = getFocusableElements(modal)
    if (focusables.length) focusables[0].focus()

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const els = getFocusableElements(modal)
      if (els.length === 0) return
      const first = els[0]
      const last = els[els.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    modal.addEventListener('keydown', handleKeyDown)
    return () => modal.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="wallet-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="wallet-modal-title">
      <div ref={modalRef} className="wallet-modal" onClick={(e) => e.stopPropagation()} tabIndex={-1}>
        <div className="wallet-modal-header">
          <h2 id="wallet-modal-title">Account</h2>
          <button className="wallet-modal-close" onClick={onClose} aria-label="Close modal">×</button>
        </div>
        <div className="wallet-modal-content">
          {wallet ? (
            <div className="wallet-connected">
              <p><strong>Display name</strong></p>
              <code className="party-id">{wallet.party}</code>
              {wallet.accountId && (
                <p className="wallet-hint">Account ID: <code className="party-id-inline">{wallet.accountId.slice(0, 12)}…</code></p>
              )}
              {wallet.createdAt && (
                <p className="wallet-hint">Member since {formatMemberSince(wallet.createdAt)}</p>
              )}
              <p className="wallet-hint">Your activity and balance are stored under this ID. No password required.</p>
              <div className="wallet-modal-actions">
                <Link to="/dashboard" className="btn-primary wallet-modal-btn" onClick={onClose}>Dashboard</Link>
                <Link to="/profile" className="btn-secondary wallet-modal-btn" onClick={onClose}>Profile</Link>
              </div>
              <button className="btn-secondary btn-block" onClick={() => { disconnectWallet(); onClose() }}>
                Switch account
              </button>
            </div>
          ) : (
            <div className="wallet-disconnected">
              <p className="wallet-hint">Sign in to your account or create a new one.</p>
              <div className="wallet-modal-actions">
                <Link to="/sign-in" className="btn-primary wallet-modal-btn" onClick={onClose}>Sign in</Link>
                <Link to="/register" className="btn-secondary wallet-modal-btn" onClick={onClose}>Create account</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
