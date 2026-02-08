import { useState } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { oracleService } from '../services/oracleService'

/**
 * Virtual market resolution: update market status via API (no blockchain).
 */
export default function MarketResolution({ market, onResolved }) {
  const { wallet } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [oracleSymbol, setOracleSymbol] = useState('BTC')
  const [oracleData, setOracleData] = useState(null)

  const fetchOracleData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await oracleService.fetchPrice(oracleSymbol)
      setOracleData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const startResolution = async () => {
    if (!market?.contractId || !wallet) return

    try {
      setLoading(true)
      setError(null)
      const marketId = market.payload?.marketId || market.contractId
      const res = await fetch('/api/update-market-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketId, status: 'Resolving' }),
      })
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to update status')
      if (onResolved) onResolved()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!market || market.payload.status !== 'Active') {
    return null
  }

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <h2>Market Resolution (Admin Only)</h2>
      <p style={{ marginBottom: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
        Use RedStone oracle to resolve this market. Enter the symbol to fetch current price data.
      </p>

      {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="form-group">
        <label>Oracle Symbol (e.g., BTC, ETH, AAPL)</label>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <input
            type="text"
            value={oracleSymbol}
            onChange={(e) => setOracleSymbol(e.target.value.toUpperCase())}
            placeholder="BTC"
            style={{ flex: 1 }}
          />
          <button 
            className="btn-secondary" 
            onClick={fetchOracleData}
            disabled={loading}
          >
            {loading ? 'Fetching...' : 'Fetch Oracle Data'}
          </button>
        </div>
      </div>

      {oracleData && (
        <div style={{ 
          background: 'rgba(100, 108, 255, 0.1)', 
          padding: '1rem', 
          borderRadius: '8px',
          marginTop: '1rem'
        }}>
          <h3>Oracle Data</h3>
          <p><strong>Symbol:</strong> {oracleData.symbol}</p>
          <p><strong>Price:</strong> {oracleData.price !== null ? oracleData.price : 'N/A'}</p>
          <p><strong>Timestamp:</strong> {new Date(oracleData.timestamp).toLocaleString()}</p>
          <p><strong>Source:</strong> {oracleData.source}</p>
        </div>
      )}

      {oracleData && (
        <button
          className="btn-primary"
          onClick={startResolution}
          disabled={loading || !oracleData.price}
          style={{ marginTop: '1rem', width: '100%' }}
        >
          {loading ? 'Resolving Market...' : 'Start Market Resolution'}
        </button>
      )}
    </div>
  )
}

