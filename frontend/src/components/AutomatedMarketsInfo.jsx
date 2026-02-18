import { Link } from 'react-router-dom'

/**
 * Shown when users hit /create. Markets are automated; no user-created markets.
 */
export default function AutomatedMarketsInfo() {
  return (
    <div className="card" style={{ maxWidth: '520px', margin: '2rem auto', textAlign: 'center' }}>
      <h1>Markets are automated</h1>
      <p className="text-secondary mt-sm">
        Prediction markets on this platform are created and managed automatically. You can browse all markets and trade using the AMM — no need to create a market yourself.
      </p>
      <Link to="/" className="btn-primary mt-lg" style={{ display: 'inline-block', textDecoration: 'none' }}>
        Browse markets
      </Link>
    </div>
  )
}
