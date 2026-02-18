import { useState, useEffect, useRef } from 'react'
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
  const { wallet, connectWallet, disconnectWallet } = useWallet()
  const [step, setStep] = useState(1)
  const [displayName, setDisplayName] = useState('')
  const [financeChoice, setFinanceChoice] = useState(null) // 'blockchain' | 'stripe' | 'skip'
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const modalRef = useRef(null)

  // Reset wizard when modal opens for new user
  useEffect(() => {
    if (isOpen && !wallet) {
      setStep(1)
      setFinanceChoice(null)
      setError(null)
    }
  }, [isOpen, wallet])

  // Focus input when signing in (smoother registration); otherwise first focusable; trap focus and handle Escape
  useEffect(() => {
    if (!isOpen || !modalRef.current) return
    const modal = modalRef.current
    let timeoutId
    const input = modal.querySelector('#wallet-display-name')
    if (input && !wallet && step === 1) {
      timeoutId = setTimeout(() => input.focus(), 50)
    } else {
      const focusables = getFocusableElements(modal)
      if (focusables.length) focusables[0].focus()
    }

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
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      modal.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, wallet, step])

  if (!isOpen) return null

  const handleComplete = async () => {
    setError(null)
    setLoading(true)
    try {
      await connectWallet(displayName.trim() || undefined)
      setDisplayName('')
      setStep(1)
      setFinanceChoice(null)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = async () => {
    setError(null)
    setLoading(true)
    try {
      await connectWallet()
      setDisplayName('')
      setStep(1)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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
              <p className="wallet-hint">Your dashboard, profile, and balance are tied to this account. No password required.</p>
              <div className="wallet-modal-actions">
                <Link to="/dashboard" className="btn-primary wallet-modal-btn" onClick={onClose}>Dashboard</Link>
                <Link to="/profile" className="btn-secondary wallet-modal-btn" onClick={onClose}>Profile</Link>
              </div>
              <button className="btn-secondary btn-block" onClick={() => { disconnectWallet(); onClose() }}>
                Switch account
              </button>
            </div>
          ) : (
            <div className="wallet-disconnected onboarding-block onboarding-wizard">
              <div className="wizard-progress" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={2} aria-label={`Step ${step} of 2`}>
                <span className={step >= 1 ? 'wizard-dot active' : 'wizard-dot'} />
                <span className="wizard-line" />
                <span className={step >= 2 ? 'wizard-dot active' : 'wizard-dot'} />
              </div>
              <p className="wizard-step-label">Step {step} of 2</p>

              {step === 1 && (
                <>
                  <h3 className="wizard-step-title">Set up your profile</h3>
                  <p className="wallet-hint">Choose a display name. No email or password required.</p>
                  {error && <div className="alert-error" style={{ marginBottom: '0.5rem' }}>{error}</div>}
                  <label className="wallet-input-label" htmlFor="wallet-display-name">Display name</label>
                  <input
                    id="wallet-display-name"
                    type="text"
                    placeholder="e.g. TraderAlex"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setStep(2)}
                    className="party-id-input"
                    style={{ width: '100%', marginBottom: '1rem' }}
                    maxLength={32}
                    autoComplete="username"
                  />
                  <div className="wallet-modal-actions">
                    <button type="button" className="btn-primary" onClick={() => setStep(2)}>Next</button>
                    <button type="button" className="btn-secondary" onClick={handleGuest} disabled={loading}>
                      {loading ? '…' : 'Continue as guest'}
                    </button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h3 className="wizard-step-title">Fund your account</h3>
                  <p className="wallet-hint">Add Credits to trade. You can also do this later from your Portfolio.</p>
                  {error && <div className="alert-error" style={{ marginBottom: '0.5rem' }}>{error}</div>}
                  <div className="wizard-finance-options">
                    <button
                      type="button"
                      className={`wizard-option ${financeChoice === 'blockchain' ? 'selected' : ''}`}
                      onClick={() => setFinanceChoice('blockchain')}
                    >
                      <span className="wizard-option-icon" aria-hidden>⛓</span>
                      <span className="wizard-option-text">
                        <span className="wizard-option-label">Blockchain</span>
                        <span className="wizard-option-desc">Connect wallet &amp; deposit</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`wizard-option ${financeChoice === 'stripe' ? 'selected' : ''}`}
                      onClick={() => setFinanceChoice('stripe')}
                    >
                      <span className="wizard-option-icon" aria-hidden>💳</span>
                      <span className="wizard-option-text">
                        <span className="wizard-option-label">Stripe</span>
                        <span className="wizard-option-desc">Pay with card</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`wizard-option ${financeChoice === 'skip' ? 'selected' : ''}`}
                      onClick={() => setFinanceChoice('skip')}
                    >
                      <span className="wizard-option-icon" aria-hidden>⏭</span>
                      <span className="wizard-option-text">
                        <span className="wizard-option-label">Add funds later</span>
                        <span className="wizard-option-desc">Skip for now</span>
                      </span>
                    </button>
                  </div>
                  <div className="wallet-modal-actions wizard-actions">
                    <button type="button" className="btn-secondary" onClick={() => setStep(1)}>Back</button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleComplete}
                      disabled={loading}
                    >
                      {loading ? 'Creating…' : 'Complete'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
