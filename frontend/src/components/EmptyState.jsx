import { Link } from 'react-router-dom'
import './EmptyState.css'

/**
 * Consistent empty state: icon/illustration area, title, description, optional CTA.
 */
export default function EmptyState({
  icon = '📋',
  title = 'Nothing here yet',
  description,
  actionLabel = 'Get started',
  actionTo = '/',
  onActionClick,
  secondaryLabel,
  secondaryTo,
  onSecondaryClick,
  className = '',
}) {
  return (
    <div className={`empty-state ${className}`.trim()} role="status">
      <div className="empty-state-icon" aria-hidden>{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      <div className="empty-state-actions">
        {actionTo && (
          <Link to={actionTo}>
            <button type="button" className="btn-primary empty-state-btn" onClick={onActionClick}>
              {actionLabel}
            </button>
          </Link>
        )}
        {onActionClick && !actionTo && (
          <button type="button" className="btn-primary empty-state-btn" onClick={onActionClick}>
            {actionLabel}
          </button>
        )}
        {(secondaryTo || onSecondaryClick) && secondaryLabel && (
          secondaryTo ? (
            <Link to={secondaryTo}>
              <button type="button" className="btn-secondary empty-state-btn" onClick={onSecondaryClick}>
                {secondaryLabel}
              </button>
            </Link>
          ) : (
            <button type="button" className="btn-secondary empty-state-btn" onClick={onSecondaryClick}>
              {secondaryLabel}
            </button>
          )
        )}
      </div>
    </div>
  )
}
