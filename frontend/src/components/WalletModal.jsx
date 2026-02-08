import { useState } from 'react'
import { useWallet } from '../contexts/WalletContext'
import './WalletModal.css'

export default function WalletModal({ isOpen, onClose }) {
  const { wallet, connectWallet, disconnectWallet } = useWallet()
  const [userId, setUserId] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleConnect = async () => {
    setError(null)
    setLoading(true)
    try {
      await connectWallet(userId.trim() || undefined)
      setUserId('')
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
              <p><strong>User ID</strong></p>
              <code className="party-id">{wallet.party}</code>
              <p className="wallet-hint">Your activity and balance are stored under this ID. No password required.</p>
              <button className="btn-secondary" onClick={() => { disconnectWallet(); onClose() }}>
                Switch account
              </button>
            </div>
          ) : (
            <div className="wallet-disconnected">
              <p style={{ marginBottom: '0.75rem' }}>Enter a name to trade with virtual Credits. No signup required.</p>
              {error && <div className="alert-error" style={{ marginBottom: '0.5rem' }}>{error}</div>}
              <input
                type="text"
                placeholder="Your name or guest"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="party-id-input"
                style={{ width: '100%', marginBottom: '0.75rem' }}
              />
              <button
                className="btn-primary"
                onClick={handleConnect}
                disabled={loading}
              >
                {loading ? 'Connecting...' : 'Continue'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
