import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { useAccountModal } from '../contexts/AccountModalContext'
import { getVirtualBalance } from '../services/balance'
import { ContractStorage } from '../utils/contractStorage'
import { formatCredits, PLATFORM_CURRENCY_SYMBOL } from '../constants/currency'
import { BRAND_TAGLINE } from '../constants/brand'
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
          setBalanceFormatted(formatCredits('0'))
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

  if (!wallet) {
    return (
      <div className="card dashboard-gate" style={{ maxWidth: '420px', margin: '2rem auto', textAlign: 'center' }}>
        <h1>Your Dashboard</h1>
        <p className="text-secondary mt-sm">
          Sign in or create an account to get your own dashboard, profile, and portfolio.
        </p>
        <p className="wallet-hint mt-md" style={{ fontSize: 'var(--font-size-sm)' }}>
          {BRAND_TAGLINE} — trade with virtual Credits. No password required.
        </p>
        <button type="button" className="btn-primary mt-lg" onClick={openAccountModal}>
          Get started
        </button>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <nav className="breadcrumb mb-md" aria-label="Breadcrumb" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
        <span>Dashboard</span>
      </nav>
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="dashboard-welcome">
          Welcome back, <strong>{wallet.party}</strong>
          {wallet.createdAt && (
            <span className="dashboard-member-since"> · Member since {formatMemberSince(wallet.createdAt)}</span>
          )}
        </p>
      </header>

      <div className="dashboard-cards">
        <div className="card dashboard-card">
          <h2 className="dashboard-card-title">Balance</h2>
          <p className="dashboard-card-value">
            {loading ? '…' : (balanceFormatted ?? formatCredits(balanceRaw))}
          </p>
          <p className="dashboard-card-hint">{PLATFORM_CURRENCY_SYMBOL} — platform Credits</p>
          <Link to="/portfolio" className="btn-primary dashboard-card-action">
            View portfolio
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

        <div className="card dashboard-card dashboard-card-actions">
          <h2 className="dashboard-card-title">Quick actions</h2>
          <div className="dashboard-quick-links">
            <Link to="/" className="btn-secondary">Browse markets</Link>
            <Link to="/create" className="btn-primary">Create market</Link>
            <Link to="/profile" className="btn-secondary">Profile</Link>
          </div>
        </div>
      </div>

      <div className="card dashboard-profile-teaser">
        <h2 className="mb-sm">Your account</h2>
        <p className="text-secondary" style={{ marginBottom: 'var(--spacing-md)' }}>
          Update your display name and view account details on your profile.
        </p>
        <Link to="/profile" className="btn-secondary">Go to profile</Link>
      </div>
    </div>
  )
}
