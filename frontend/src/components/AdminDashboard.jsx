import { useState, useEffect, useRef } from 'react'
import { useLedger } from '../hooks/useLedger'
import { useWallet } from '../contexts/WalletContext'
import { SkeletonList } from './SkeletonLoader'
import './AdminDashboard.css'

const PACKAGE_ID = 'b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0'

export default function AdminDashboard() {
  const { ledger } = useLedger()
  const { wallet } = useWallet()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processing, setProcessing] = useState(null)
  const isMountedRef = useRef(true)
  const apiRoutesWorkingRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    fetchRequests()

    // Poll for new requests every 30 seconds
    const pollInterval = setInterval(() => {
      if (apiRoutesWorkingRef.current && !document.hidden) {
        fetchRequests()
      }
    }, 30000)

    return () => {
      isMountedRef.current = false
      clearInterval(pollInterval)
    }
  }, [ledger, wallet])

  const fetchRequests = async (retryCount = 0) => {
    if (!ledger || !wallet || !apiRoutesWorkingRef.current) return

    try {
      setLoading(true)
      console.log(`[AdminDashboard] Fetching requests (attempt ${retryCount + 1})...`)
      console.log(`[AdminDashboard] Querying for admin: ${wallet.party}`)
      
      // Query MarketCreationRequest contracts where admin matches wallet party
      const fetchedRequests = await ledger.query(
        [`${PACKAGE_ID}:PredictionMarkets:MarketCreationRequest`],
        { admin: wallet.party },
        { forceRefresh: true, walletParty: wallet.party }
      )
      
      console.log(`[AdminDashboard] Received ${Array.isArray(fetchedRequests) ? fetchedRequests.length : 0} contracts`)
      if (Array.isArray(fetchedRequests) && fetchedRequests.length > 0) {
        console.log('[AdminDashboard] Contract details:', fetchedRequests.map(r => ({
          contractId: r.contractId,
          title: r.payload?.title,
          admin: r.payload?.admin,
          creator: r.payload?.creator
        })))
      }

      if (!isMountedRef.current) return

      // Check if endpoints are unavailable
      if (fetchedRequests && fetchedRequests._endpointsUnavailable) {
        apiRoutesWorkingRef.current = false
        setRequests([])
        setError(null)
        setLoading(false)
        return
      }

      const requestsArray = Array.isArray(fetchedRequests) ? fetchedRequests : []
      setRequests(requestsArray)
      setError(null)
      apiRoutesWorkingRef.current = true
      
      // If no requests found and this is the first attempt, retry multiple times with increasing delays
      // This handles the case where contracts are created but not yet visible due to synchronization
      if (requestsArray.length === 0 && retryCount < 3) {
        const delays = [3000, 5000, 10000] // 3s, 5s, 10s
        const delay = delays[retryCount] || 10000
        console.log(`[AdminDashboard] No contracts found. Retrying after ${delay/1000} seconds (attempt ${retryCount + 1}/3)...`)
        setTimeout(() => {
          if (isMountedRef.current && apiRoutesWorkingRef.current) {
            fetchRequests(retryCount + 1) // Retry with incremented count
          }
        }, delay)
        return // Don't set loading to false yet
      } else if (requestsArray.length === 0 && retryCount >= 3) {
        console.warn('[AdminDashboard] No contracts found after multiple retries. This could mean:')
        console.warn('[AdminDashboard]   1. No contracts exist for this admin party')
        console.warn('[AdminDashboard]   2. Contracts were created with updateId and need more time to synchronize')
        console.warn('[AdminDashboard]   3. Contracts exist but party does not have visibility')
        console.warn('[AdminDashboard]   4. Check the explorer link from market creation to verify the contract exists')
      }
    } catch (err) {
      if (!isMountedRef.current) return
      
      console.error('[AdminDashboard] Error fetching requests:', err)
      
      if (err.message?.includes('404') || err.response?.status === 404) {
        apiRoutesWorkingRef.current = false
        setRequests([])
        setError(null)
      } else {
        setError(err.message)
      }
    } finally {
      if (isMountedRef.current && retryCount === 0) {
        // Only set loading to false on first attempt (not retry)
        setLoading(false)
      }
    }
  }

  const approveMarket = async (contractId) => {
    if (!ledger || !wallet || processing) return

    setProcessing(contractId)
    setError(null)

    try {
      // Exercise ApproveMarket choice
      // The choice will fetch configCid from the contract's payload
      await ledger.exerciseChoice(
        contractId,
        'PredictionMarkets:MarketCreationRequest:ApproveMarket',
        {}, // Empty argument - the choice will fetch configCid from the contract
        wallet.party,
        PACKAGE_ID
      )

      // Refresh requests after approval
      setTimeout(() => {
        fetchRequests()
      }, 1000)
    } catch (err) {
      setError(err.message || 'Failed to approve market')
      console.error('Approve error:', err)
    } finally {
      setProcessing(null)
    }
  }

  const rejectMarket = async (contractId) => {
    if (!ledger || !wallet || processing) return

    if (!confirm('Are you sure you want to reject this market creation request?')) {
      return
    }

    setProcessing(contractId)
    setError(null)

    try {
      // Exercise RejectMarket choice
      await ledger.exerciseChoice(
        contractId,
        'PredictionMarkets:MarketCreationRequest:RejectMarket',
        {},
        wallet.party,
        PACKAGE_ID
      )

      // Refresh requests after rejection
      setTimeout(() => {
        fetchRequests()
      }, 1000)
    } catch (err) {
      setError(err.message || 'Failed to reject market')
      console.error('Reject error:', err)
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
        </div>
        <SkeletonList count={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="error">
          <strong>Error loading requests:</strong> {error}
        </div>
        <button className="btn-primary" onClick={fetchRequests} style={{ marginTop: '1rem' }}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button className="btn-secondary" onClick={fetchRequests}>
          Refresh
        </button>
      </div>

      {!apiRoutesWorkingRef.current ? (
        <div className="card">
          <div className="alert-warning">
            <h3>ℹ️ Contract Querying Not Available in JSON API</h3>
            <p>
              Query endpoints do not exist in the Canton JSON API per the official OpenAPI documentation. 
              This means we cannot query contracts to display market creation requests, even though they exist on the ledger.
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
              <li>✅ Approve/reject markets via command submission (when you have contract IDs)</li>
              <li>✅ View created contracts in the <Link to="/history">History page</Link></li>
              <li>✅ Verify contracts on the <a href="https://devnet.ccexplorer.io/" target="_blank" rel="noopener noreferrer">block explorer</a></li>
              <li>✅ Use gRPC or WebSocket APIs for contract queries (requires different implementation)</li>
            </ul>
            <p>
              <strong>Note:</strong> Market creation requests are stored locally when created. 
              Check the <Link to="/history">History page</Link> to see contracts you've created.
            </p>
          </div>
        </div>
      ) : requests.length === 0 ? (
        <div className="card">
          <p>No pending market creation requests.</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map((request) => {
            const payload = request.payload || request
            const contractId = request.contractId || request.contract_id
            
            return (
              <div key={contractId} className="request-card">
                <div className="request-header">
                  <h3>{payload.title || 'Untitled Market'}</h3>
                  <div className="request-actions">
                    <button
                      className="btn-success"
                      onClick={() => approveMarket(contractId)}
                      disabled={processing === contractId}
                    >
                      {processing === contractId ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => rejectMarket(contractId)}
                      disabled={processing === contractId}
                    >
                      {processing === contractId ? 'Processing...' : 'Reject'}
                    </button>
                  </div>
                </div>
                
                <div className="request-details">
                  <p><strong>Market ID:</strong> {payload.marketId}</p>
                  <p><strong>Creator:</strong> {payload.creator}</p>
                  <p><strong>Description:</strong> {payload.description}</p>
                  <p><strong>Market Type:</strong> {payload.marketType || 'Binary'}</p>
                  <p><strong>Deposit Amount:</strong> {payload.depositAmount || '0.0'}</p>
                  {payload.outcomes && payload.outcomes.length > 0 && (
                    <p><strong>Outcomes:</strong> {payload.outcomes.join(', ')}</p>
                  )}
                  <p><strong>Resolution Criteria:</strong> {payload.resolutionCriteria}</p>
                  {payload.settlementTrigger && (
                    <p>
                      <strong>Settlement Trigger:</strong>{' '}
                      {payload.settlementTrigger.tag === 'TimeBased'
                        ? `Time-based: ${new Date(payload.settlementTrigger.value).toLocaleString()}`
                        : payload.settlementTrigger.tag === 'EventBased'
                        ? `Event-based: ${payload.settlementTrigger.value}`
                        : 'Manual'}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


