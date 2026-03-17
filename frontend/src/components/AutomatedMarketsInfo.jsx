import { Link } from 'react-router-dom'

/**
 * Shown when users hit /create. Markets are automated; no user-created markets.
 */
export default function AutomatedMarketsInfo() {
  return (
    <div className="card" style={{ maxWidth: '560px', margin: '2rem auto', textAlign: 'center' }}>
      <h1>Markets are automated</h1>
      <p className="text-secondary mt-sm">
        Prediction markets on this platform are created and managed automatically from real-world events. You can browse all markets and trade using the AMM — no need to create a market yourself.
      </p>
      <p className="text-muted mt-sm" style={{ fontSize: 'var(--font-size-sm)' }}>
        New markets are added on a schedule from sports, crypto, stocks, weather, and news via our integrated APIs. You only browse and trade.
      </p>
      <Link to="/" className="btn-primary mt-lg" style={{ display: 'inline-block', textDecoration: 'none' }}>
        Browse markets
      </Link>
    </div>
  )
}
