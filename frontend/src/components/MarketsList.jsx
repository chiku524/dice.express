import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLedger } from '../hooks/useLedger'
import { useWallet } from '../contexts/WalletContext'
import { SkeletonMarketGrid } from './SkeletonLoader'
import { ContractStorage } from '../utils/contractStorage'

export default function MarketsList() {
  const { ledger } = useLedger()
  const { wallet } = useWallet()
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pollIntervalRef = useRef(null)
  const apiRoutesWorkingRef = useRef(true)
  const isMountedRef = useRef(true)

  const PACKAGE_ID = 'b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0'

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
        
        // DATABASE-FIRST APPROACH: Query database for approved MarketCreationRequest contracts
        // Since Canton endpoints don't reliably return Market contracts, we use approved MarketCreationRequest from database
        console.log('[MarketsList] 💾 Querying database for approved markets...')
        
        let databaseMarkets = []
        try {
          // Query database for approved MarketCreationRequest contracts
          databaseMarkets = await ContractStorage.getContractsByType(
            'MarketCreationRequest',
            null, // No party filter - show all approved markets
            'Approved'
          )
          console.log(`[MarketsList] ✅ Retrieved ${databaseMarkets.length} approved markets from database`)
        } catch (databaseError) {
          console.warn('[MarketsList] ⚠️ Database query failed:', databaseError)
        }
        
        if (!isMountedRef.current) return
        
        // Use database results (database is primary source)
        // Transform database contracts to match Market format
        const transformedMarkets = databaseMarkets.map(contract => ({
          contractId: contract.contractId,
          templateId: contract.templateId,
          payload: {
            ...contract.payload,
            status: 'Active' // Approved MarketCreationRequest contracts are active markets
          }
        }))
        
        setMarkets(transformedMarkets)
        setError(null)
        apiRoutesWorkingRef.current = true // Mark API as working
      } catch (err) {
        if (!isMountedRef.current) return
        
        // Don't set error if it's just empty results - show empty state instead
        if (err.message?.includes('Resource not found') || 
            err.message?.includes('404') || 
            err.response?.status === 404 ||
            (Array.isArray(fetchedMarkets) && fetchedMarkets.length === 0 && err.message?.includes('endpoint'))) {
          // API route not found - stop polling to prevent excessive requests
          apiRoutesWorkingRef.current = false
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          setMarkets([]) // Show empty markets list
          setError(null) // Don't show error, just empty state
          setLoading(false) // Make sure loading is false
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
    // Use a flag to prevent setting up polling if API routes are already known to be broken
    const setupPolling = () => {
      if (apiRoutesWorkingRef.current && !pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          // Only poll if tab is visible and API routes are still working
          if (!document.hidden && ledger && wallet && apiRoutesWorkingRef.current) {
            fetchMarkets()
          } else if (!apiRoutesWorkingRef.current) {
            // Stop polling if API routes are broken
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
          }
        }, 30000) // 30 seconds
      }
    }
    
    // Delay polling setup to allow initial fetch to complete and check if it succeeded
    // Only start polling if we got a successful response (even if empty)
    const pollingTimeout = setTimeout(() => {
      // Only start polling if we haven't detected that API routes are broken
      // and if we have markets or if we got a successful empty response
      if (apiRoutesWorkingRef.current && markets.length >= 0) {
        setupPolling()
      }
    }, 3000) // Wait 3 seconds before starting to poll

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
          setupPolling()
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
      if (pollingTimeout) {
        clearTimeout(pollingTimeout)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [ledger, wallet]) // Only depend on ledger and wallet

  // WebSocket support removed - using polling instead

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
      <div>
        <h1>Prediction Markets</h1>
        <SkeletonMarketGrid count={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="error">
          <strong>Error loading markets:</strong> {error}
          <br />
          <small className="mt-sm" style={{ display: 'block' }}>
            Please check your connection and try again. If the problem persists, the ledger may be temporarily unavailable.
          </small>
        </div>
        <button 
          className="btn-primary mt-md" 
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1>Prediction Markets</h1>
        <p>Discover and trade on prediction markets built on Canton blockchain</p>
      </div>
      {!apiRoutesWorkingRef.current ? (
        <div className="card">
          <div className="alert-warning">
            <h3>ℹ️ Contract Querying Not Available in JSON API</h3>
            <p>
              Query endpoints do not exist in the Canton JSON API per the official OpenAPI documentation. 
              This means we cannot query contracts to display markets, even though they exist on the ledger.
            </p>
            <p>
              <strong>Why this happens:</strong>
            </p>
            <ul>
              <li>JSON API only supports command submission, not contract queries</li>
              <li>Contract querying requires gRPC API or WebSocket connections</li>
              <li>This is by design, not a configuration issue</li>
            </ul>
            <p>
              <strong>What you can do:</strong>
            </p>
            <ul>
              <li>✅ Create new markets (command submission works)</li>
              <li>✅ View your created contracts in the <Link to="/history">History page</Link></li>
              <li>✅ Verify markets on the <a href="https://devnet.ccexplorer.io/" target="_blank" rel="noopener noreferrer">block explorer</a></li>
              <li>✅ Use gRPC or WebSocket APIs for contract queries (requires different implementation)</li>
            </ul>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
              <Link to="/create">
                <button className="btn-primary">
                  Create Market
                </button>
              </Link>
              <Link to="/history">
                <button className="btn-secondary">
                  View Contract History
                </button>
              </Link>
            </div>
          </div>
        </div>
      ) : markets.length === 0 ? (
        <div className="card">
          <p>No markets found. Create your first market to get started!</p>
          <Link to="/create">
            <button className="btn-primary mt-md">
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
                <p className="mt-md" style={{ fontSize: 'var(--font-size-sm)' }}>
                  {market.payload.description.substring(0, 100)}...
                </p>
                <div className="mt-md" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-secondary">
                    Volume: {market.payload.totalVolume}
                  </span>
                  <span className="text-secondary">
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

