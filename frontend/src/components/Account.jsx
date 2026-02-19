import { Link, useNavigate } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { getVirtualBalance } from '../services/balance'
import { useState, useEffect } from 'react'
import './Account.css'

function formatMemberSince(isoString) {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function Account() {
  const { wallet, disconnectWallet } = useWallet()
  const navigate = useNavigate()
  const [balanceFormatted, setBalanceFormatted] = useState(null)

  useEffect(() => {
    if (!wallet) navigate('/sign-in', { replace: true })
  }, [wallet, navigate])

  useEffect(() => {
    if (!wallet?.party) return
    let cancelled = false
    getVirtualBalance(wallet.party).then(({ formatted }) => {
      if (!cancelled) setBalanceFormatted(formatted)
    })
    return () => { cancelled = true }
  }, [wallet?.party])

  if (!wallet) return null

  return (
    <div className="account-page">
      <div className="account-card">
        <h1 className="account-title">Account</h1>
        <div className="account-section">
          <p className="account-label">Display name</p>
          <code className="account-party">{wallet.party}</code>
        </div>
        {wallet.accountId && (
          <div className="account-section">
            <p className="account-label">Account ID</p>
            <code className="account-id">{wallet.accountId}</code>
          </div>
        )}
        {wallet.createdAt && (
          <div className="account-section">
            <p className="account-meta">Member since {formatMemberSince(wallet.createdAt)}</p>
          </div>
        )}
        {balanceFormatted != null && (
          <div className="account-section account-balance">
            <p className="account-label">Balance</p>
            <p className="account-balance-value">{balanceFormatted}</p>
            <Link to="/portfolio" className="account-link">View portfolio</Link>
          </div>
        )}
        <div className="account-actions">
          <Link to="/dashboard" className="account-btn primary">Dashboard</Link>
          <Link to="/profile" className="account-btn secondary">Profile</Link>
          <Link to="/portfolio" className="account-btn secondary">Portfolio</Link>
        </div>
        <button type="button" className="account-disconnect" onClick={() => { disconnectWallet(); navigate('/'); }}>
          Switch account
        </button>
      </div>
    </div>
  )
}
