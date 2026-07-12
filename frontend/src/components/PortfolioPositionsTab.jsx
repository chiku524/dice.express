import { Link } from 'react-router-dom'
import { formatPips } from '../constants/currency'

/**
 * Portfolio → Positions tab.
 */
export default function PortfolioPositionsTab({
  positions,
  exposureByMarket,
  marketTitles,
  formatPositionType,
  formatDate,
}) {
  if (positions.length === 0) {
    return (
      <div className="card">
        <h2 className="mb-md">Positions</h2>
        <p className="text-secondary">No positions yet. Browse markets and buy Yes or No to get started.</p>
        <Link to="/">
          <button type="button" className="btn-primary mt-md">
            Browse markets
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-md">My Positions</h2>
      {exposureByMarket.length > 0 && (
        <div className="card mb-md">
          <h3 className="mb-sm">Open exposure by market</h3>
          <p className="text-secondary" style={{ fontSize: 'var(--font-size-sm)', marginBottom: '0.75rem' }}>
            Sum of position sizes (shares) per market — quick view of where you have prediction risk.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {exposureByMarket.slice(0, 12).map(([mid, sum]) => (
              <li key={mid} className="mb-xs" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <Link to={`/market/${mid}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                  {marketTitles[mid] || mid}
                </Link>
                <span>{sum.toFixed(2)} shares</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {positions.map((position) => (
        <div key={position.contractId} className="card mb-md">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div style={{ flex: 1 }}>
              <h3>
                <Link to={`/market/${position.payload?.marketId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {marketTitles[position.payload?.marketId] || position.payload?.marketId || 'Unknown Market'}
                </Link>
              </h3>
              {marketTitles[position.payload?.marketId] && (
                <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)' }}>
                  Market ID: {position.payload?.marketId}
                </p>
              )}
              <div className="grid-auto-fit-xs mt-sm">
                <div>
                  <strong>Type:</strong> {formatPositionType(position.payload?.positionType)}
                </div>
                <div>
                  <strong>Amount:</strong> {formatPips(position.payload?.amount ?? 0)}
                </div>
                <div>
                  <strong>Price:</strong> {position.payload?.price || '0'}
                </div>
                {position.payload?.depositAmount && (
                  <div>
                    <strong>Deposit:</strong> {formatPips(position.payload.depositAmount)}
                  </div>
                )}
                <div>
                  <strong>Created:</strong> {formatDate(position.createdAt || position.created_at)}
                </div>
              </div>
            </div>
            <Link to={`/market/${position.payload?.marketId}`} style={{ marginLeft: '1rem' }}>
              <button type="button" className="btn-secondary">View Market</button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
