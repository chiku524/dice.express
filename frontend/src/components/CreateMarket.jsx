import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { useToastContext } from '../contexts/ToastContext'
import { usePublicConfig } from '../hooks/usePublicConfig'
import {
  MARKET_CATEGORIES,
  PREDICTION_STYLES,
  getDefaultOutcomesForStyle,
} from '../constants/marketConfig'
import { formatPips } from '../constants/currency'
import { createMarket } from '../services/marketsApi'
import SubmitDiceLabel from './SubmitDiceLabel'
import './CreateMarket.css'

const CREATE_STYLES = PREDICTION_STYLES.filter((s) =>
  ['yesNo', 'trueFalse', 'happensDoesnt', 'multiOutcome'].includes(s.value)
)

function defaultDeadlineLocal() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * User market creation — shared by web and Tauri desktop (/create).
 * Requires a registered signed-in account (accountId).
 */
export default function CreateMarket() {
  const { wallet } = useWallet()
  const { showToast } = useToastContext()
  const navigate = useNavigate()
  const { userMarketCreationStakePips } = usePublicConfig()
  const creationStake =
    typeof userMarketCreationStakePips === 'number' && userMarketCreationStakePips >= 0
      ? userMarketCreationStakePips
      : 10

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [resolutionCriteria, setResolutionCriteria] = useState('')
  const [category, setCategory] = useState('Other')
  const [styleValue, setStyleValue] = useState('yesNo')
  const [outcomesText, setOutcomesText] = useState('Alice\nBob\nOther')
  const [deadline, setDeadline] = useState(defaultDeadlineLocal)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const style = useMemo(
    () => CREATE_STYLES.find((s) => s.value === styleValue) || CREATE_STYLES[0],
    [styleValue]
  )
  const isMulti = style?.value === 'multiOutcome'

  useEffect(() => {
    if (!wallet) return
    // Focus title when signed in
    const el = document.getElementById('create-market-title')
    if (el) el.focus()
  }, [wallet])

  if (!wallet) {
    return (
      <div className="create-market card hub-info-card">
        <h1>Create a market</h1>
        <p className="text-secondary mt-sm">
          Sign in to open a prediction question for the community. Keep the title punchy and the
          resolution rule crystal clear.
        </p>
        <div className="create-market__actions mt-lg">
          <Link to="/sign-in" state={{ from: { pathname: '/create' } }} className="btn-primary">
            Sign in
          </Link>
          <Link to="/register" className="btn-secondary">
            Create account
          </Link>
        </div>
        <p className="text-muted mt-lg" style={{ fontSize: 'var(--font-size-sm)' }}>
          Prefer automated feeds?{' '}
          <Link to="/">Browse markets</Link> seeded from sports, crypto, weather, and news.
        </p>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!wallet?.accountId) {
      setError('Your session is missing an account id. Sign out and sign in again.')
      return
    }

    let outcomes = getDefaultOutcomesForStyle(styleValue)
    if (isMulti) {
      outcomes = outcomesText
        .split(/\n|,/)
        .map((o) => o.trim())
        .filter(Boolean)
    }

    setLoading(true)
    try {
      const result = await createMarket({
        source: 'user',
        accountId: wallet.accountId,
        creator: wallet.party,
        title: title.trim(),
        description: description.trim(),
        resolutionCriteria: resolutionCriteria.trim(),
        category,
        styleLabel: styleValue,
        marketType: style.marketType,
        outcomes,
        resolutionDeadline: deadline,
        settlementTrigger: 'Manual',
      })
      const id = result?.market?.contractId || result?.market?.payload?.marketId
      showToast('Market live — share it and start trading.', 'success')
      if (id) navigate(`/market/${encodeURIComponent(id)}`)
      else navigate('/')
    } catch (err) {
      setError(err?.message || 'Could not create market')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-market card hub-info-card">
      <header className="create-market__header">
        <h1>Create a market</h1>
        <p className="text-secondary mt-sm">
          Ask a clear question. You resolve it when the deadline hits — traders read your criteria
          first.
        </p>
      </header>

      <form className="create-market__form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="error create-market__error" role="alert">
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="create-market-title">Question</label>
          <input
            id="create-market-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Will it rain in NYC on Friday?"
            maxLength={140}
            required
            disabled={loading}
          />
          <p className="create-market__hint">{title.trim().length}/140</p>
        </div>

        <div className="form-group">
          <label htmlFor="create-market-desc">Short description</label>
          <textarea
            id="create-market-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are people trading on? One or two sentences."
            rows={3}
            maxLength={1000}
            required
            disabled={loading}
          />
        </div>

        <div className="create-market__grid">
          <div className="form-group">
            <label htmlFor="create-market-category">Category</label>
            <select
              id="create-market-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={loading}
            >
              {MARKET_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="create-market-style">Style</label>
            <select
              id="create-market-style"
              value={styleValue}
              onChange={(e) => setStyleValue(e.target.value)}
              disabled={loading}
            >
              {CREATE_STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="create-market-deadline">Resolves by</label>
            <input
              id="create-market-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </div>

        {isMulti && (
          <div className="form-group">
            <label htmlFor="create-market-outcomes">Outcomes (one per line, 2–8)</label>
            <textarea
              id="create-market-outcomes"
              value={outcomesText}
              onChange={(e) => setOutcomesText(e.target.value)}
              rows={4}
              disabled={loading}
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="create-market-criteria">How it resolves</label>
          <textarea
            id="create-market-criteria"
            value={resolutionCriteria}
            onChange={(e) => setResolutionCriteria(e.target.value)}
            placeholder="Exact rule you’ll use when settling (source of truth, what counts as Yes, when you’d Void)."
            rows={4}
            maxLength={2000}
            required
            disabled={loading}
          />
        </div>

        <p className="create-market__notes text-muted">
          Stake <strong>{formatPips(creationStake)}</strong> when you publish (non-refundable). You resolve the outcome. 5 markets/day · 2% settlement fee.
        </p>

        <div className="create-market__actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <SubmitDiceLabel busyLabel="Publishing…" /> : 'Publish market'}
          </button>
          <Link to="/" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
