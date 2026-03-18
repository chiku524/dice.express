import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { useAccountModal } from '../contexts/AccountModalContext'
import { getVirtualBalance, transferPips } from '../services/balance'
import { ContractStorage } from '../utils/contractStorage'
import { formatPips, PLATFORM_CURRENCY_SYMBOL } from '../constants/currency'
import { BRAND_TAGLINE } from '../constants/brand'
import UserHubNav from './UserHubNav'
import './Dashboard.css'

function formatMemberSince(isoString) {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function Dashboard() {
  const { wallet } = useWallet()
  const openAccountModal = useAccountModal()
  const [balanceFormatted, setBalanceFormatted] = useState(null)
  const [balanceRaw, setBalanceRaw] = useState('0')
  const [positionsCount, setPositionsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tipToParty, setTipToParty] = useState('')
  const [tipAmount, setTipAmount] = useState('')
  const [tipStatus, setTipStatus] = useState(null)
  const [tipLoading, setTipLoading] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    if (!wallet?.party) {
      setLoading(false)
      return
    }
    let cancelled = false

    const load = async () => {
      try {
        const [balResult, contracts] = await Promise.all([
          getVirtualBalance(wallet.party),
          ContractStorage.getContractsByType('Position', null, null),
        ])
        if (!isMountedRef.current || cancelled) return
        setBalanceFormatted(balResult.formatted)
        setBalanceRaw(balResult.balance ?? '0')
        const userPositions = (contracts || []).filter(
          (p) => (p.party || p.payload?.owner) === wallet.party
        )
        setPositionsCount(userPositions.length)
      } catch (err) {
        if (isMountedRef.current && !cancelled) {
          setBalanceFormatted(formatPips('0'))
          setBalanceRaw('0')
          setPositionsCount(0)
        }
      } finally {
        if (isMountedRef.current && !cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [wallet?.party])

  const refreshBalance = async () => {
    if (!wallet?.party) return
    const result = await getVirtualBalance(wallet.party)
    if (isMountedRef.current) {
      setBalanceFormatted(result.formatted)
      setBalanceRaw(result.balance ?? '0')
    }
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
      <div className="card dashboard-gate" style={{ maxWidth: '420px', margin: '2rem auto', textAlign: 'center' }}>
        <h1>Your Dashboard</h1>
        <p className="text-secondary mt-sm">
          Sign in or create an account to get your own dashboard, profile, and portfolio.
        </p>
        <p className="wallet-hint mt-md" style={{ fontSize: 'var(--font-size-sm)' }}>
          {BRAND_TAGLINE} — trade with Pips. No password required.
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
          Welcome back, <strong>{wallet.party}</strong>
          {wallet.createdAt && (
            <span className="dashboard-member-since"> · Member since {formatMemberSince(wallet.createdAt)}</span>
          )}
        </p>
      </header>

      <p className="dashboard-subtitle">
        Deposit with card or crypto to get Pips, trade on prediction markets, and withdraw from Portfolio.
      </p>

      <div className="dashboard-profile-card card">
        <h2 className="dashboard-card-title">Your profile</h2>
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
        {wallet.createdAt && (
          <p className="dashboard-profile-meta">Member since {formatMemberSince(wallet.createdAt)}</p>
        )}
        <div className="dashboard-quick-links">
          <Link to="/profile" className="dashboard-quick-link primary">Profile & settings</Link>
          <Link to="/portfolio" className="dashboard-quick-link secondary">Portfolio & currency exchange</Link>
        </div>
      </div>

      <div className="dashboard-cards">
        <div className="card dashboard-card">
          <h2 className="dashboard-card-title">Balance</h2>
          <p className="dashboard-card-value">
            {loading ? '…' : (balanceFormatted ?? formatPips(balanceRaw))}
          </p>
          <p className="dashboard-card-hint">{PLATFORM_CURRENCY_SYMBOL} — your balance</p>
          <Link to="/portfolio" className="btn-primary dashboard-card-action">
            View portfolio & add Pips
          </Link>
        </div>

        <div className="card dashboard-card">
          <h2 className="dashboard-card-title">Positions</h2>
          <p className="dashboard-card-value">{loading ? '…' : positionsCount}</p>
          <p className="dashboard-card-hint">Active positions</p>
          <Link to="/portfolio" className="btn-secondary dashboard-card-action">
            My positions
          </Link>
        </div>

        <div className="card dashboard-card dashboard-tip-card">
          <h2 className="dashboard-card-title">Tip Pips</h2>
          <p className="dashboard-card-hint">Send Pips to another user by their display name</p>
          <form className="dashboard-tip-form" onSubmit={handleTipSubmit}>
            <input
              type="text"
              className="dashboard-tip-input"
              placeholder="Recipient display name"
              value={tipToParty}
              onChange={(e) => setTipToParty(e.target.value)}
              disabled={tipLoading}
            />
            <input
              type="text"
              inputMode="decimal"
              className="dashboard-tip-input"
              placeholder="Amount (Pips)"
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
              disabled={tipLoading}
            />
            <button type="submit" className="btn-primary dashboard-tip-submit" disabled={tipLoading}>
              {tipLoading ? 'Sending…' : 'Send tip'}
            </button>
          </form>
          {tipStatus?.error && <p className="dashboard-tip-error">{tipStatus.error}</p>}
          {tipStatus?.success && <p className="dashboard-tip-success">Tip sent successfully.</p>}
        </div>
      </div>
    </div>
  )
}
