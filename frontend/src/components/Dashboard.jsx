import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { useAccountModal } from '../contexts/AccountModalContext'
import { getVirtualBalance, transferPips } from '../services/balance'
import { BRAND_TAGLINE } from '../constants/brand'
import { formatMemberSince } from '../utils/formatDate'
import UserHubNav from './UserHubNav'
import SubmitDiceLabel from './SubmitDiceLabel'
import './Dashboard.css'

export default function Dashboard() {
  const { wallet } = useWallet()
  const openAccountModal = useAccountModal()
  const [tipToParty, setTipToParty] = useState('')
  const [tipAmount, setTipAmount] = useState('')
  const [tipStatus, setTipStatus] = useState(null)
  const [tipLoading, setTipLoading] = useState(false)
  const [copiedId, setCopiedId] = useState(false)

  const refreshBalance = async () => {
    if (!wallet?.party) return
    await getVirtualBalance(wallet.party)
  }

  const handleCopyAccountId = () => {
    if (!wallet?.accountId) return
    navigator.clipboard.writeText(wallet.accountId).then(() => {
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    })
  }

  const handleTipSubmit = async (e) => {
    e.preventDefault()
    setTipStatus(null)
    const to = tipToParty.trim()
    const amount = tipAmount.trim()
    if (!to || !amount) {
      setTipStatus({ error: 'Enter recipient and amount' })
      return
    }
    const num = parseFloat(amount)
    if (!Number.isFinite(num) || num <= 0) {
      setTipStatus({ error: 'Amount must be a positive number' })
      return
    }
    setTipLoading(true)
    try {
      await transferPips(wallet.party, to, amount)
      setTipStatus({ success: true })
      setTipToParty('')
      setTipAmount('')
      await refreshBalance()
    } catch (err) {
      setTipStatus({ error: err.message || 'Transfer failed' })
    } finally {
      setTipLoading(false)
    }
  }

  if (!wallet) {
    return (
      <div className="card dashboard-gate">
        <h1>Dashboard</h1>
        <p className="text-secondary mt-sm">
          Sign in for your hub, portfolio, and tips.
        </p>
        <p className="wallet-hint mt-md" style={{ fontSize: 'var(--font-size-sm)' }}>
          {BRAND_TAGLINE}
        </p>
        <button type="button" className="btn-primary mt-lg" onClick={openAccountModal}>
          Get started
        </button>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <UserHubNav />
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="dashboard-welcome">
          Hi, <strong>{wallet.party}</strong>
          {wallet.createdAt && (
            <span className="dashboard-member-since"> · since {formatMemberSince(wallet.createdAt)}</span>
          )}
        </p>
      </header>

      <p className="dashboard-subtitle">
        Deposit crypto → trade with Pips → withdraw from Portfolio.
      </p>

      <div className="dashboard-profile-card card">
        <h2 className="dashboard-card-title">Account</h2>
        <div className="dashboard-profile-row">
          <span className="dashboard-profile-label">Display name</span>
          <code className="dashboard-profile-value">{wallet.party}</code>
        </div>
        {wallet.accountId && (
          <div className="dashboard-profile-row">
            <span className="dashboard-profile-label">Account ID</span>
            <div className="dashboard-profile-id-wrap">
              <code className="dashboard-profile-value dashboard-profile-id">{wallet.accountId}</code>
              <button type="button" className="dashboard-copy-btn" onClick={handleCopyAccountId} title="Copy">
                {copiedId ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
        <div className="dashboard-quick-links">
          <Link to="/portfolio" className="dashboard-quick-link primary">Portfolio</Link>
          <Link to="/profile" className="dashboard-quick-link secondary">Settings</Link>
          <Link to="/watchlist" className="dashboard-quick-link secondary">Watchlist</Link>
        </div>
      </div>

      <div className="dashboard-cards">
        <div className="card dashboard-card dashboard-tip-card">
          <h2 className="dashboard-card-title">Tip Pips</h2>
          <p className="dashboard-card-hint">Send Pips by display name</p>
          <form className="dashboard-tip-form" onSubmit={handleTipSubmit}>
            <input
              type="text"
              className="dashboard-tip-input"
              placeholder="Recipient"
              value={tipToParty}
              onChange={(e) => setTipToParty(e.target.value)}
              disabled={tipLoading}
            />
            <input
              type="text"
              inputMode="decimal"
              className="dashboard-tip-input"
              placeholder="Amount"
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
              disabled={tipLoading}
            />
            <button type="submit" className="btn-primary dashboard-tip-submit" disabled={tipLoading}>
              {tipLoading ? <SubmitDiceLabel busyLabel="Sending…" /> : 'Send'}
            </button>
          </form>
          {tipStatus?.error && <p className="dashboard-tip-error">{tipStatus.error}</p>}
          {tipStatus?.success && <p className="dashboard-tip-success">Tip sent.</p>}
        </div>
      </div>
    </div>
  )
}
