import { useMemo, useState } from 'react'
import { resolveUserMarket } from '../services/marketsApi'
import { useWallet } from '../contexts/WalletContext'
import { formatResolutionDeadline, getResolutionDeadlineMs } from '../constants/marketConfig'
import SubmitDiceLabel from './SubmitDiceLabel'

/**
 * Creator controls to settle a user-created market (manual resolution).
 * Shown only to the creator on market detail.
 */
export default function UserMarketResolve({ market, onResolved }) {
  const { wallet } = useWallet()
  const payload = market?.payload || {}
  const [outcome, setOutcome] = useState(payload.outcomes?.[0] || 'Yes')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isCreator =
    wallet?.accountId &&
    payload.source === 'user' &&
    payload.creatorAccountId === wallet.accountId

  const deadlineMs = getResolutionDeadlineMs(payload)
  const pastDeadline = deadlineMs == null ? true : Date.now() >= deadlineMs

  const outcomes = useMemo(() => {
    const list = Array.isArray(payload.outcomes) ? payload.outcomes.map(String) : ['Yes', 'No']
    return [...list, 'Void']
  }, [payload.outcomes])

  if (!isCreator || payload.status === 'Settled') return null

  const handleResolve = async () => {
    setError(null)
    setLoading(true)
    try {
      await resolveUserMarket({
        marketId: market.contractId || payload.marketId,
        accountId: wallet.accountId,
        resolvedOutcome: outcome,
      })
      if (onResolved) onResolved()
    } catch (err) {
      setError(err?.message || 'Resolve failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card user-market-resolve" style={{ marginTop: '1.5rem' }}>
      <h2 style={{ marginTop: 0 }}>Resolve your market</h2>
      <p className="text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
        You created this market. Pick the winning outcome (or Void to refund stakes) using the
        criteria you published
        {payload.resolutionDeadline
          ? ` · deadline ${formatResolutionDeadline(payload.resolutionDeadline, true)}`
          : ''}
        .
      </p>
      {!pastDeadline && (
        <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
          Deadline has not passed yet — settle early only if the outcome is already clear.
        </p>
      )}
      {error && (
        <div className="error" role="alert" style={{ marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}
      <div className="form-group">
        <label htmlFor="user-resolve-outcome">Winning outcome</label>
        <select
          id="user-resolve-outcome"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          disabled={loading}
        >
          {outcomes.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className="btn-primary"
        onClick={handleResolve}
        disabled={loading}
        style={{ width: '100%' }}
      >
        {loading ? <SubmitDiceLabel busyLabel="Settling…" /> : `Settle as ${outcome}`}
      </button>
    </section>
  )
}
