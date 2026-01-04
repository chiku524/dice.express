import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLedger } from '../hooks/useLedger'
import { useWallet } from '../contexts/WalletContext'
import { ContractStorage } from '../utils/contractStorage'
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
  
  // Reset position type when market changes
  useEffect(() => {
    if (market?.payload) {
      const marketData = market.payload
      // For binary markets, default to 'Yes'
      // For multi-outcome markets, default to first outcome
      if (marketData.marketType === 'MultiOutcome' && marketData.outcomes && marketData.outcomes.length > 0) {
        setPositionType(marketData.outcomes[0])
      } else {
        setPositionType('Yes')
      }
    }
  }, [market])

  useEffect(() => {
    const fetchMarket = async () => {
      if (!wallet) return

      try {
        setLoading(true)
        setError(null)
        
        // DATABASE-FIRST APPROACH: Query database for approved MarketCreationRequest by marketId
        // Since Canton endpoints don't reliably return Market contracts, we use approved MarketCreationRequest from database
        console.log('[MarketDetail] 💾 Querying database for market:', marketId)
        
        try {
          // Query database for approved MarketCreationRequest contracts
          const databaseMarkets = await ContractStorage.getContractsByType(
            'MarketCreationRequest',
            null, // No party filter - show all approved markets
            'Approved'
          )
          
          // Find the market with matching marketId
          const matchingMarket = databaseMarkets.find(m => m.payload?.marketId === marketId)
          
          if (matchingMarket) {
            // Transform database contract to match Market format
            const transformedMarket = {
              contractId: matchingMarket.contractId,
              templateId: matchingMarket.templateId,
              payload: {
                ...matchingMarket.payload,
                status: 'Active' // Approved MarketCreationRequest contracts are active markets
              }
            }
            console.log('[MarketDetail] ✅ Found market in database:', marketId)
            setMarket(transformedMarket)
          } else {
            console.warn('[MarketDetail] ⚠️ Market not found in database:', marketId)
            setError('Market not found')
          }
        } catch (databaseError) {
          console.error('[MarketDetail] ⚠️ Database query failed:', databaseError)
          setError('Failed to fetch market from database')
        }
      } catch (err) {
        console.error('[MarketDetail] Error:', err)
        setError(err.message || 'Failed to fetch market')
      } finally {
        setLoading(false)
      }
    }

    fetchMarket()
  }, [marketId, wallet])

  const handleCreatePosition = async () => {
    // Position creation is disabled due to Canton API limitations
    // We're using a database-first approach and don't have actual Market contracts on the blockchain
    alert('Position creation is currently disabled due to Canton API limitations. We are using a database-first approach for market management.')
    return
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
              {marketData.marketType === 'MultiOutcome' && marketData.outcomes && marketData.outcomes.length > 0 ? (
                // Multi-outcome markets: show outcomes
                marketData.outcomes.map((outcome, index) => (
                  <option key={index} value={outcome}>
                    {outcome}
                  </option>
                ))
              ) : (
                // Binary markets: show Yes/No
                <>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </>
              )}
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
          <button className="btn-primary" onClick={handleCreatePosition} disabled>
            Create Position (Disabled)
          </button>
        </div>
      )}
    </div>
  )
}

