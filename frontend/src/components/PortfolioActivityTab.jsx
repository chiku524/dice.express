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
        <p className="text-secondary">No activity yet. Trades and positions show up here.</p>
      ) : (
        <div className="portfolio-activity-list">
          {activityLog.map((activity) => {
            const mid = activity.position?.marketId
            const title = marketTitles[mid] || mid || 'Unknown market'
            return (
              <div key={activity.id} className="activity-item">
                <div className="activity-content">
                  <strong>Opened position</strong>
                  {activity.position?.depositAmount ? (
                    <span className="activity-badge">
                      {formatPips(activity.position.depositAmount)}
                    </span>
                  ) : null}
                  <p className="text-secondary portfolio-activity-meta">
                    <Link to={`/market/${mid}`}>{title}</Link>
                    {' · '}
                    {formatPositionType(activity.position?.positionType)}
                    {' · '}
                    {activity.position?.amount || '0'} @ {activity.position?.price || '0'}
                    {' · '}
                    {formatDate(activity.timestamp)}
                  </p>
                </div>
                <Link to={`/market/${mid}`}>
                  <button type="button" className="btn-secondary">View</button>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
