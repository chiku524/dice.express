import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLedger } from '../hooks/useLedger'
import { useWallet } from '../contexts/WalletContext'
import { ContractStorage } from '../utils/contractStorage'
import MarketResolution from './MarketResolution'
import { formatCredits } from '../constants/currency'
import { PREDICTION_STYLES } from '../constants/marketConfig'

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
      if (marketData.marketType === 'MultiOutcome' && marketData.outcomes?.length > 0) {
        setPositionType(marketData.outcomes[0])
      } else if (marketData.outcomes?.length >= 2) {
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
    if (!wallet) {
      alert('Please connect a wallet to create a position')
      return
    }

    if (!positionAmount || parseFloat(positionAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (!positionPrice || parseFloat(positionPrice) < 0 || parseFloat(positionPrice) > 1) {
      alert('Please enter a valid price between 0.0 and 1.0')
      return
    }

    if (!market?.payload?.marketId) {
      alert('Market ID not found. Please refresh the page.')
      return
    }

    try {
      console.log('[MarketDetail] Creating position:', {
        marketId: market.payload.marketId,
        positionType,
        amount: positionAmount,
        price: positionPrice,
        owner: wallet.party
      })

      // Call API to create position in database
      const response = await fetch('/api/create-position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          marketId: market.payload.marketId,
          positionType,
          amount: positionAmount,
          price: positionPrice,
          owner: wallet.party
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Failed to create position')
      }

      const result = await response.json()
      console.log('[MarketDetail] ✅ Position created successfully:', result)

      // Update market data with new volumes
      if (result.market && result.market.payload) {
        setMarket({
          ...market,
          payload: {
            ...market.payload,
            totalVolume: result.volumes.totalVolume.toString(),
            yesVolume: result.volumes.yesVolume.toString(),
            noVolume: result.volumes.noVolume.toString(),
            outcomeVolumes: result.volumes.outcomeVolumes
          }
        })
      }

      // Reset form
      setPositionAmount('')
      setPositionPrice('0.5')

      // Redirect to markets page after successful position creation
      console.log('[MarketDetail] ✅ Position created successfully:', result.position.contract_id)
      console.log('[MarketDetail] 💰 CC Deposit:', result.deposit)
      navigate('/')
    } catch (error) {
      console.error('[MarketDetail] Error creating position:', error)
      alert(`Failed to create position: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <p>Loading market...</p>
        <p className="text-secondary mt-sm" style={{ fontSize: 'var(--font-size-sm)' }}>
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
          <small className="mt-sm" style={{ display: 'block' }}>
            The market may not exist or there was a connection error.
          </small>
        </div>
        <div className="mt-md" style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
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
      <button className="btn-secondary mb-xl" onClick={() => navigate('/')}>
        ← Back to Markets
      </button>

      <div className="card">
        {(marketData.category || marketData.styleLabel) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
            {marketData.category && (
              <span className="filter-chip" style={{ margin: 0 }}>{marketData.category}</span>
            )}
            {marketData.styleLabel && (
              <span className="status-badge status-pending">
                {PREDICTION_STYLES.find(s => s.value === marketData.styleLabel)?.label || marketData.styleLabel}
              </span>
            )}
          </div>
        )}
        <h1>{marketData.title}</h1>
        <span className={`status status-${marketData.status?.toLowerCase() || 'active'}`}>
          {marketData.status}
        </span>
        <p className="mt-md">{marketData.description}</p>

        <div className="grid-auto-fit-md mt-xl">
          <div>
            <h3>Total Volume</h3>
            <p className="volume-display">{formatCredits(marketData.totalVolume ?? 0)}</p>
          </div>
          {marketData.marketType === 'Binary' && (
            <>
              <div>
                <h3>{marketData.outcomes?.[0] || 'Yes'} Volume</h3>
                <p className="volume-display">{formatCredits(marketData.yesVolume ?? 0)}</p>
              </div>
              <div>
                <h3>{marketData.outcomes?.[1] || 'No'} Volume</h3>
                <p className="volume-display">{formatCredits(marketData.noVolume ?? 0)}</p>
              </div>
            </>
          )}
          {marketData.marketType === 'MultiOutcome' && marketData.outcomeVolumes && Object.keys(marketData.outcomeVolumes).length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <h3>Outcome Volumes</h3>
              <div className="grid-auto-fit-xs mt-sm">
                {Object.entries(marketData.outcomeVolumes).map(([outcome, volume]) => (
                  <div key={outcome} className="outcome-item">
                    <strong>{outcome}:</strong> {formatCredits(volume)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Market Resolution Component (for admins) */}
      {marketData.status === 'Active' && wallet?.party === 'Admin' && (
        <MarketResolution market={market} onResolved={() => window.location.reload()} />
      )}

      {marketData.status === 'Active' && (
        <div className="card mt-xl">
          <h2>Create Position</h2>
          <div className="alert-info mb-md">
            <strong>Note:</strong> Amounts are in platform Credits. Positions are stored in the database and market volumes are updated immediately.
          </div>
          <div className="form-group">
            <label>Position Type</label>
            <select
              value={positionType}
              onChange={(e) => setPositionType(e.target.value)}
            >
              {marketData.marketType === 'MultiOutcome' && marketData.outcomes && marketData.outcomes.length > 0 ? (
                marketData.outcomes.map((outcome, index) => (
                  <option key={index} value={outcome}>{outcome}</option>
                ))
              ) : (
                // Binary: use market outcomes if set (True/False, Happens/Doesn't), else Yes/No
                (marketData.outcomes && marketData.outcomes.length >= 2)
                  ? marketData.outcomes.map((outcome, index) => (
                      <option key={index} value={outcome}>{outcome}</option>
                    ))
                  : (
                    <>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </>
                  )
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
          <button className="btn-primary" onClick={handleCreatePosition}>
            Create Position
          </button>
        </div>
      )}
    </div>
  )
}

