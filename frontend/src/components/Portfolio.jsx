import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLedger } from '../hooks/useLedger'
import { useWallet } from '../contexts/WalletContext'
import { SkeletonList } from './SkeletonLoader'

export default function Portfolio() {
  const { ledger } = useLedger()
  const { wallet } = useWallet()
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isMountedRef = useRef(true)
  const isFetchingRef = useRef(false)
  const apiRoutesWorkingRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    
    // Set a timeout to ensure loading doesn't stay true forever
    const loadingTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }, 10000) // 10 second timeout
    
    const fetchPositions = async () => {
      // Prevent multiple simultaneous requests
      if (isFetchingRef.current || !ledger || !wallet || !isMountedRef.current) {
        setLoading(false) // Make sure loading is false if we can't fetch
        return
      }
      
      // Stop if API routes are not working
      if (!apiRoutesWorkingRef.current) {
        setPositions([])
        setLoading(false)
        return
      }

      isFetchingRef.current = true

      try {
        setLoading(true)
        // Query user's positions
        const PACKAGE_ID = 'b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0'
        const fetchedPositions = await ledger.query([`${PACKAGE_ID}:PredictionMarkets:Position`], { owner: wallet.party }, { walletParty: wallet.party })
        
        if (!isMountedRef.current) return
        
        // Check if endpoints are unavailable
        if (fetchedPositions && fetchedPositions._endpointsUnavailable) {
          // Query endpoints don't exist - stop retrying
          apiRoutesWorkingRef.current = false
          setPositions([])
          setError(null)
          setLoading(false)
          return
        }
        
        // Handle results
        if (Array.isArray(fetchedPositions)) {
          setPositions(fetchedPositions)
        } else {
          setPositions([])
        }
        setError(null)
        apiRoutesWorkingRef.current = true
      } catch (err) {
        if (!isMountedRef.current) return
        
        // Don't set error if it's just empty results or 404
        if (err.message?.includes('Resource not found') || 
            err.message?.includes('404') || 
            err.response?.status === 404) {
          // API route not found - stop retrying to prevent excessive requests
          apiRoutesWorkingRef.current = false
          setPositions([]) // Show empty portfolio
          setError(null)
          setLoading(false) // Make sure loading is false so page renders
        } else {
          setError(err.message)
          setLoading(false) // Make sure loading is false even on error
        }
      } finally {
        isFetchingRef.current = false
        if (isMountedRef.current) {
          setLoading(false) // Always set loading to false
        }
      }
    }

    fetchPositions()

    return () => {
      isMountedRef.current = false
      isFetchingRef.current = false
      clearTimeout(loadingTimeout)
    }
  }, [ledger, wallet])

  if (loading) {
    return (
      <div>
        <h1>My Portfolio</h1>
        <SkeletonList count={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="error">
          <strong>Error loading portfolio:</strong> {error}
          <br />
          <small style={{ marginTop: '0.5rem', display: 'block' }}>
            Please check your connection and try again.
          </small>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => window.location.reload()}
          style={{ marginTop: '1rem' }}
        >
          Retry
        </button>
      </div>
    )
  }

  const formatPositionType = (positionType) => {
    if (!positionType) return 'Unknown'
    if (typeof positionType === 'string') {
      // Handle string format: "Yes", "No", or "Outcome:OutcomeName"
      if (positionType.startsWith('Outcome:')) {
        return positionType.replace('Outcome:', '')
      }
      return positionType
    }
    // Handle object format: { tag: 'Yes' } or { tag: 'Outcome', value: 'OutcomeName' }
    if (positionType.tag === 'Yes') return 'Yes'
    if (positionType.tag === 'No') return 'No'
    if (positionType.tag === 'Outcome') return positionType.value || 'Unknown Outcome'
    return positionType.value || 'Unknown'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    try {
      const date = new Date(dateString)
      return date.toLocaleString()
    } catch {
      return dateString
    }
  }

  return (
    <div>
      <h1>My Portfolio</h1>
      
      {positions.length === 0 ? (
        <div className="card">
          <p>You don't have any positions yet. Start trading to see your portfolio here!</p>
          <Link to="/">
            <button className="btn-primary" style={{ marginTop: '1rem' }}>
              Browse Markets
            </button>
          </Link>
        </div>
      ) : (
        <div>
          {/* Positions Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>My Positions</h2>
            {positions.map((position) => (
              <div key={position.contractId} className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h3>Market: {position.payload?.marketId || 'Unknown'}</h3>
                    <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
                      <div>
                        <strong>Type:</strong> {formatPositionType(position.payload?.positionType)}
                      </div>
                      <div>
                        <strong>Amount:</strong> {position.payload?.amount || '0'}
                      </div>
                      <div>
                        <strong>Price:</strong> {position.payload?.price || '0'}
                      </div>
                      {position.payload?.depositAmount && (
                        <div>
                          <strong>Deposit:</strong> {position.payload?.depositAmount} {position.payload?.depositCurrency || 'CC'}
                        </div>
                      )}
                      <div>
                        <strong>Created:</strong> {formatDate(position.createdAt || position.created_at)}
                      </div>
                    </div>
                  </div>
                  <Link to={`/market/${position.payload?.marketId}`} style={{ marginLeft: '1rem' }}>
                    <button className="btn-secondary">View Market</button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Activity Log Section */}
          <div className="card">
            <h2 style={{ marginBottom: '1rem' }}>Activity Log</h2>
            {activityLog.length === 0 ? (
              <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>No activity to display</p>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {activityLog.map((activity) => (
                  <div 
                    key={activity.id} 
                    style={{ 
                      padding: '1rem', 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <strong>Position Created</strong>
                        {activity.position?.depositAmount && (
                          <span style={{ 
                            background: 'rgba(76, 175, 80, 0.2)', 
                            color: '#4CAF50',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                          }}>
                            {activity.position.depositAmount} {activity.position.depositCurrency || 'CC'} deposited
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem' }}>
                        Market: {activity.position?.marketId || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem' }}>
                        Type: {formatPositionType(activity.position?.positionType)} | Amount: {activity.position?.amount || '0'} | Price: {activity.position?.price || '0'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                        {formatDate(activity.timestamp)}
                      </div>
                    </div>
                    <Link to={`/market/${activity.position?.marketId}`} style={{ marginLeft: '1rem' }}>
                      <button className="btn-secondary" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                        View
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

