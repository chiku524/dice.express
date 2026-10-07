import { useState, useEffect } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { useAccountModal } from '../contexts/AccountModalContext'
import { useToastContext } from '../contexts/ToastContext'
import { formatMemberSince } from '../utils/formatDate'
import UserHubNav from './UserHubNav'
import MarketAlertSettings from './MarketAlertSettings'
import './Profile.css'

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
      <div className="card profile-gate">
        <h1>Profile</h1>
        <p className="text-secondary mt-sm">Sign in to edit your profile.</p>
        <button type="button" className="btn-primary mt-lg" onClick={openAccountModal}>
          Sign in
        </button>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <UserHubNav />
      <header className="profile-header">
        <h1>Profile &amp; settings</h1>
        <p className="profile-header-desc">Display name and alerts.</p>
      </header>

      <div className="card profile-card">
        <h2 className="profile-section-title">Display name</h2>
        <p className="profile-hint">Shown in the nav and when you trade.</p>
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
        {saved && <p className="profile-success">Updated.</p>}
      </div>

      <div className="card profile-card" id="notification-settings">
        <h2 className="profile-section-title">Notifications</h2>
        <MarketAlertSettings />
      </div>

      <div className="card profile-card">
        <h2 className="profile-section-title">Account</h2>
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
                  showToast('Account ID copied', 'success')
                } catch {
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
              <dd>{formatMemberSince(wallet.createdAt, { includeDay: true })}</dd>
            </>
          )}
        </dl>
        <button
          type="button"
          className="btn-secondary mt-md"
          onClick={() => { disconnectWallet(); openAccountModal(); }}
        >
          Switch account
        </button>
      </div>
    </div>
  )
}
