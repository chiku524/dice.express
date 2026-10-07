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
        <p className="text-secondary">No positions yet. Browse markets and buy Yes or No.</p>
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
      <h2 className="mb-md">Positions</h2>
      {exposureByMarket.length > 0 && (
        <p className="text-secondary mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
          Top exposure:{' '}
          {exposureByMarket.slice(0, 3).map(([mid, sum], i) => (
            <span key={mid}>
              {i > 0 ? ' · ' : ''}
              <Link to={`/market/${mid}`}>{marketTitles[mid] || mid}</Link>
              {' '}({sum.toFixed(1)})
            </span>
          ))}
        </p>
      )}
      {positions.map((position) => {
        const mid = position.payload?.marketId
        const title = marketTitles[mid] || mid || 'Unknown market'
        return (
          <div key={position.contractId} className="card mb-md portfolio-position-card">
            <div className="portfolio-position-row">
              <div className="portfolio-position-main">
                <h3>
                  <Link to={`/market/${mid}`}>{title}</Link>
                </h3>
                <p className="portfolio-position-meta text-secondary">
                  {formatPositionType(position.payload?.positionType)}
                  {' · '}
                  {formatPips(position.payload?.amount ?? 0)}
                  {' · '}
                  @{position.payload?.price || '0'}
                  {' · '}
                  {formatDate(position.createdAt || position.created_at)}
                </p>
              </div>
              <Link to={`/market/${mid}`}>
                <button type="button" className="btn-secondary">View</button>
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
