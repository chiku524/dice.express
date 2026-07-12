import { Link } from 'react-router-dom'
import { formatPips } from '../constants/currency'

/**
 * Portfolio → Activity tab.
 */
export default function PortfolioActivityTab({
  activityLog,
  marketTitles,
  formatPositionType,
  formatDate,
}) {
  return (
    <div className="card">
      <h2 className="mb-md">Activity</h2>
      {activityLog.length === 0 ? (
        <p className="text-secondary">No activity yet. Your trades and positions will appear here.</p>
      ) : (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {activityLog.map((activity) => (
            <div key={activity.id} className="activity-item">
              <div className="activity-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                  <strong>Position Created</strong>
                  {activity.position?.depositAmount && (
                    <span className="activity-badge">
                      {formatPips(activity.position.depositAmount)} deposited
                    </span>
                  )}
                </div>
                <div className="text-secondary" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>
                  Market: {marketTitles[activity.position?.marketId] || activity.position?.marketId || 'Unknown'}
                </div>
                <div className="text-secondary" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>
                  Type: {formatPositionType(activity.position?.positionType)} | Amount: {activity.position?.amount || '0'} | Price: {activity.position?.price || '0'}
                </div>
                <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                  {formatDate(activity.timestamp)}
                </div>
              </div>
              <Link to={`/market/${activity.position?.marketId}`} style={{ marginLeft: 'var(--spacing-md)' }}>
                <button type="button" className="btn-secondary" style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                  View
                </button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
