import { Link } from 'react-router-dom'
import './ErrorState.css'

/**
 * Consistent error state: title, message, optional "Try again" and secondary action.
 */
export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  secondaryLabel,
  secondaryTo,
  secondaryHref,
  onSecondaryClick,
  className = '',
}) {
  return (
    <div className={`error-state ${className}`.trim()} role="alert">
      <div className="error-state-icon" aria-hidden>⚠️</div>
      <h3 className="error-state-title">{title}</h3>
      {message && <p className="error-state-message">{message}</p>}
      <div className="error-state-actions">
        {onRetry && (
          <button type="button" className="btn-primary error-state-btn" onClick={onRetry}>
            {retryLabel}
          </button>
        )}
        {secondaryLabel && (
          secondaryTo ? (
            <Link to={secondaryTo} className="btn-secondary error-state-btn" style={{ textDecoration: 'none' }}>
              {secondaryLabel}
            </Link>
          ) : secondaryHref ? (
            <a href={secondaryHref} className="btn-secondary error-state-btn" style={{ textDecoration: 'none' }} target="_blank" rel="noopener noreferrer">
              {secondaryLabel}
            </a>
          ) : (
            <button type="button" className="btn-secondary error-state-btn" onClick={onSecondaryClick}>
              {secondaryLabel}
            </button>
          )
        )}
      </div>
    </div>
  )
}
