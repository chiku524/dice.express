import { useState } from 'react'
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

export default function WalletModal({ isOpen, onClose }) {
  const { wallet, connectWallet, disconnectWallet } = useWallet()
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleCreateAccount = async () => {
    setError(null)
    setLoading(true)
    try {
      await connectWallet(displayName.trim() || undefined)
      setDisplayName('')
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
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="wallet-modal-overlay" onClick={onClose}>
      <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-modal-header">
          <h2>Account</h2>
          <button className="wallet-modal-close" onClick={onClose} aria-label="Close">×</button>
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
            <div className="wallet-disconnected onboarding-block">
              <p className="onboarding-lead">Create your account to get your own dashboard and profile.</p>
              <p className="wallet-hint">Choose a display name to trade with virtual Credits. No email or password required.</p>
              {error && <div className="alert-error" style={{ marginBottom: '0.5rem' }}>{error}</div>}
              <label className="wallet-input-label" htmlFor="wallet-display-name">Display name</label>
              <input
                id="wallet-display-name"
                type="text"
                placeholder="e.g. TraderAlex"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateAccount()}
                className="party-id-input"
                style={{ width: '100%', marginBottom: '0.75rem' }}
                maxLength={32}
                autoComplete="username"
              />
              <div className="wallet-modal-actions">
                <button
                  className="btn-primary"
                  onClick={handleCreateAccount}
                  disabled={loading}
                >
                  {loading ? 'Creating…' : 'Create account'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleGuest}
                  disabled={loading}
                >
                  Continue as guest
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
