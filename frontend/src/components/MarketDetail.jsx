import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLedger } from '../hooks/useLedger'
import { useWallet } from '../hooks/useWallet'
import MarketResolution from './MarketResolution'

export default function MarketDetail() {
  const { marketId } = useParams()
  const navigate = useNavigate()
  const { ledger } = useLedger()
  const { wallet } = useWallet()
  const [market, setMarket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [positionAmount, setPositionAmount] = useState('')
  const [positionType, setPositionType] = useState('Yes')
  const [positionPrice, setPositionPrice] = useState('0.5')

  useEffect(() => {
    const fetchMarket = async () => {
      if (!ledger || !wallet) return

      try {
        setLoading(true)
        // Fetch market details
        const markets = await ledger.query(['#prediction-markets:PredictionMarkets:Market'], { marketId: marketId })
        if (markets && markets.length > 0) {
          setMarket(markets[0])
        } else {
          setError('Market not found')
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMarket()
  }, [marketId, ledger, wallet])

  const handleCreatePosition = async () => {
    if (!wallet || !market || !ledger) return

    try {
      await ledger.exercise(
        'PredictionMarkets:Market',
        market.contractId,
        'CreatePosition',
        {
          positionId: `pos-${Date.now()}`,
          owner: wallet.party,
          positionType: positionType === 'Yes' ? { tag: 'Yes' } : { tag: 'No' },
          amount: parseFloat(positionAmount),
          price: parseFloat(positionPrice),
        },
        wallet.party
      )

      alert('Position created successfully!')
      // Refresh market data
      window.location.reload()
    } catch (err) {
      alert('Error creating position: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <p>Loading market...</p>
        <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.5rem' }}>
          Fetching market details...
        </p>
      </div>
    )
  }

  if (error || !market) {
    return (
      <div>
        <div className="error">
          <strong>Error:</strong> {error || 'Market not found'}
          <br />
          <small style={{ marginTop: '0.5rem', display: 'block' }}>
            The market may not exist or there was a connection error.
          </small>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          <button className="btn-secondary" onClick={() => navigate('/')}>
            Back to Markets
          </button>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const marketData = market.payload

  return (
    <div>
      <button className="btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        ← Back to Markets
      </button>

      <div className="card">
        <h1>{marketData.title}</h1>
        <span className={`status status-${marketData.status.toLowerCase()}`}>
          {marketData.status}
        </span>
        <p style={{ marginTop: '1rem' }}>{marketData.description}</p>

        <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <h3>Total Volume</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{marketData.totalVolume}</p>
          </div>
          <div>
            <h3>Yes Volume</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{marketData.yesVolume}</p>
          </div>
          <div>
            <h3>No Volume</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{marketData.noVolume}</p>
          </div>
        </div>
      </div>

      {/* Market Resolution Component (for admins) */}
      {marketData.status === 'Active' && wallet?.party === 'Admin' && (
        <MarketResolution market={market} onResolved={() => window.location.reload()} />
      )}

      {marketData.status === 'Active' && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h2>Create Position</h2>
          <div className="form-group">
            <label>Position Type</label>
            <select
              value={positionType}
              onChange={(e) => setPositionType(e.target.value)}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              value={positionAmount}
              onChange={(e) => setPositionAmount(e.target.value)}
              placeholder="Enter amount"
              min="0"
              step="0.01"
            />
          </div>
          <div className="form-group">
            <label>Price per Share (0.0 - 1.0)</label>
            <input
              type="number"
              value={positionPrice}
              onChange={(e) => setPositionPrice(e.target.value)}
              placeholder="0.5"
              min="0"
              max="1"
              step="0.01"
            />
          </div>
          <button className="btn-primary" onClick={handleCreatePosition}>
            Create Position
          </button>
        </div>
      )}
    </div>
  )
}

