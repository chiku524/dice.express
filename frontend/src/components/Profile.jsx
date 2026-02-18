import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { useAccountModal } from '../contexts/AccountModalContext'
import { useToastContext } from '../contexts/ToastContext'
import './Profile.css'

function formatMemberSince(isoString) {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function Profile() {
  const { wallet, updateDisplayName, disconnectWallet } = useWallet()
  const openAccountModal = useAccountModal()
  const { showToast } = useToastContext()
  const [displayName, setDisplayName] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (wallet?.party) setDisplayName(wallet.party)
  }, [wallet?.party])

  const handleSave = () => {
    setError(null)
    const trimmed = displayName.trim()
    if (!trimmed) {
      setError('Display name cannot be empty')
      return
    }
    if (trimmed.length > 32) {
      setError('Display name must be 32 characters or less')
      return
    }
    if (trimmed === wallet?.party) {
      setSaved(false)
      return
    }
    try {
      updateDisplayName(trimmed)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update')
    }
  }

  if (!wallet) {
    return (
      <div className="card profile-gate" style={{ maxWidth: '420px', margin: '2rem auto', textAlign: 'center' }}>
        <h1>Profile</h1>
        <p className="text-secondary mt-sm">Sign in to view and edit your profile.</p>
        <button type="button" className="btn-primary mt-lg" onClick={openAccountModal}>
          Sign in
        </button>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <nav className="breadcrumb mb-md" aria-label="Breadcrumb" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
        <Link to="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ margin: '0 var(--spacing-sm)' }} aria-hidden>→</span>
        <span>Profile</span>
      </nav>
      <header className="profile-header">
        <h1>Profile</h1>
        <p className="text-secondary">Your account details and display name.</p>
      </header>

      <div className="card profile-card">
        <h2 className="profile-section-title">Display name</h2>
        <p className="profile-hint">This name is shown in the navbar and on your account. Other users see it when you trade.</p>
        <div className="profile-form-row">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            className="profile-input"
            maxLength={32}
            autoComplete="username"
          />
          <button type="button" className="btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
        {error && <p className="profile-error">{error}</p>}
        {saved && <p className="profile-success">Display name updated.</p>}
      </div>

      <div className="card profile-card">
        <h2 className="profile-section-title">Account info</h2>
        <dl className="profile-dl">
          <dt>Account ID</dt>
          <dd>
            <code className="profile-code" title={wallet.accountId}>{wallet.accountId}</code>
            <button
              type="button"
              className="profile-copy-btn"
              onClick={() => {
                try {
                  navigator.clipboard.writeText(wallet.accountId)
                  showToast('Account ID copied to clipboard', 'success')
                } catch (_) {
                  showToast('Copy failed', 'error')
                }
              }}
              aria-label="Copy account ID"
            >
              Copy
            </button>
          </dd>
          {wallet.createdAt && (
            <>
              <dt>Member since</dt>
              <dd>{formatMemberSince(wallet.createdAt)}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="card profile-card">
        <h2 className="profile-section-title">Account actions</h2>
        <div className="profile-actions">
          <Link to="/dashboard" className="btn-primary">Dashboard</Link>
          <Link to="/portfolio" className="btn-secondary">Portfolio</Link>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { disconnectWallet(); openAccountModal(); }}
          >
            Switch account
          </button>
        </div>
      </div>
    </div>
  )
}
