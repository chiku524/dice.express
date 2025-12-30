import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLedger } from '../hooks/useLedger'
import { useWallet } from '../hooks/useWallet'
import { useWebSocket } from '../hooks/useWebSocket'

export default function MarketsList() {
  const { ledger } = useLedger()
  const { wallet } = useWallet()
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pollIntervalRef = useRef(null)
  const apiRoutesWorkingRef = useRef(true)
  const isMountedRef = useRef(true)

  // WebSocket disabled by default (falls back to polling)
  // Enable in useWebSocket.js if WebSocket support is needed
  const PACKAGE_ID = 'b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0'
  const { data: wsMarkets, connected: wsConnected } = useWebSocket(
    [`${PACKAGE_ID}:PredictionMarkets:Market`],
    {},
    false // Disabled - using polling instead
  )

  useEffect(() => {
    isMountedRef.current = true
    
    const fetchMarkets = async () => {
      if (!ledger || !wallet || !isMountedRef.current) return

      // Stop polling if API routes are not working
      if (!apiRoutesWorkingRef.current) {
        return
      }

      // Check if tab is visible before making request
      if (document.hidden) {
        return
      }

      try {
        // Only set loading on initial load
        setLoading(prev => {
          // Only show loading if we're currently loading or have no markets
          return prev
        })
        
        // Query active markets from the ledger
        // Force refresh to get latest data
        const PACKAGE_ID = 'b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0'
        const fetchedMarkets = await ledger.query([`${PACKAGE_ID}:PredictionMarkets:Market`], {}, { forceRefresh: true })
        
        if (!isMountedRef.current) return
        
        setMarkets(fetchedMarkets)
        setError(null)
        apiRoutesWorkingRef.current = true // Mark API as working
      } catch (err) {
        if (!isMountedRef.current) return
        
        // Don't set error if it's just empty results - show empty state instead
        if (err.message?.includes('Resource not found') || err.message?.includes('404')) {
          // API route not found - stop polling to prevent excessive requests
          apiRoutesWorkingRef.current = false
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          setMarkets([]) // Show empty markets list
          setError(null) // Don't show error, just empty state
        } else {
          setError(err.message)
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    // Initial fetch
    fetchMarkets()

    // Only poll if API routes are working and tab is visible
    // Poll for updates every 30 seconds (increased to reduce load)
    if (apiRoutesWorkingRef.current) {
      pollIntervalRef.current = setInterval(() => {
        // Only poll if tab is visible
        if (!document.hidden && ledger && wallet && apiRoutesWorkingRef.current) {
          fetchMarkets()
        }
      }, 30000) // Increased to 30 seconds
    }

    // Handle visibility change - pause/resume polling
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden, pause polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      } else {
        // Tab is visible, resume polling if API routes are working
        if (apiRoutesWorkingRef.current && ledger && wallet && !pollIntervalRef.current) {
          fetchMarkets() // Fetch immediately when tab becomes visible
          pollIntervalRef.current = setInterval(() => {
            if (!document.hidden && ledger && wallet && apiRoutesWorkingRef.current) {
              fetchMarkets()
            }
          }, 30000)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMountedRef.current = false
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [ledger, wallet]) // Only depend on ledger and wallet

  // Update markets when WebSocket data arrives
  useEffect(() => {
    if (wsMarkets && wsMarkets.length > 0) {
      setMarkets(wsMarkets)
      setLoading(false)
    }
  }, [wsMarkets])

  const getStatusClass = useMemo(() => {
    const statusMap = {
      Active: 'status-active',
      Resolving: 'status-resolving',
      Settled: 'status-settled',
      PendingApproval: 'status-pending',
    }
    return (status) => statusMap[status] || 'status-pending'
  }, [])

  // Memoize filtered/sorted markets for performance
  const sortedMarkets = useMemo(() => {
    return [...markets].sort((a, b) => {
      // Sort by status (Active first) then by volume
      const statusOrder = { Active: 0, Resolving: 1, PendingApproval: 2, Settled: 3 }
      const statusDiff = (statusOrder[a.payload.status] || 99) - (statusOrder[b.payload.status] || 99)
      if (statusDiff !== 0) return statusDiff
      return (b.payload.totalVolume || 0) - (a.payload.totalVolume || 0)
    })
  }, [markets])

  if (loading) {
    return (
      <div className="loading">
        <p>Loading markets...</p>
        <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.5rem' }}>
          Connecting to Canton ledger...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="error">
          <strong>Error loading markets:</strong> {error}
          <br />
          <small style={{ marginTop: '0.5rem', display: 'block' }}>
            Please check your connection and try again. If the problem persists, the ledger may be temporarily unavailable.
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
      <h1>Prediction Markets</h1>
      {markets.length === 0 ? (
        <div className="card">
          <p>No markets found. Create your first market to get started!</p>
          <Link to="/create">
            <button className="btn-primary" style={{ marginTop: '1rem' }}>
              Create Market
            </button>
          </Link>
        </div>
      ) : (
        <div className="market-grid">
          {sortedMarkets.map((market) => (
            <Link
              key={market.contractId}
              to={`/market/${market.payload.marketId}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="market-card">
                <h3>{market.payload.title}</h3>
                <span className={`status ${getStatusClass(market.payload.status)}`}>
                  {market.payload.status}
                </span>
                <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                  {market.payload.description.substring(0, 100)}...
                </p>
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Volume: {market.payload.totalVolume}
                  </span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    {market.payload.marketType === 'Binary' ? 'Binary' : 'Multi-Outcome'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

