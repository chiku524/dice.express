import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLedger } from '../hooks/useLedger'
import { useWallet } from '../hooks/useWallet'

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
      if (isMountedRef.current && loading) {
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
        const fetchedPositions = await ledger.query([`${PACKAGE_ID}:PredictionMarkets:Position`], { owner: wallet.party })
        
        if (!isMountedRef.current) return
        
        setPositions(fetchedPositions)
        setError(null)
        apiRoutesWorkingRef.current = true
      } catch (err) {
        if (!isMountedRef.current) return
        
        // Don't set error if it's just empty results or 404
        if (err.message?.includes('Resource not found') || 
            err.message?.includes('404') || 
            err.response?.status === 404 ||
            (Array.isArray(fetchedPositions) && fetchedPositions.length === 0)) {
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
      <div className="loading">
        <p>Loading portfolio...</p>
        <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.5rem' }}>
          Fetching your positions...
        </p>
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
          {positions.map((position) => (
            <div key={position.contractId} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3>
                    Market: {position.payload.marketId}
                  </h3>
                  <p>
                    Type: {position.payload.positionType.tag === 'Yes' 
                      ? 'Yes' 
                      : position.payload.positionType.tag === 'No'
                      ? 'No'
                      : position.payload.positionType.value}
                  </p>
                  <p>Amount: {position.payload.amount}</p>
                  <p>Price: {position.payload.price}</p>
                </div>
                <Link to={`/market/${position.payload.marketId}`}>
                  <button className="btn-secondary">View Market</button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

