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

  const fetchRequests = async () => {
    if (!ledger || !wallet || !apiRoutesWorkingRef.current) return

    try {
      setLoading(true)
      // Query MarketCreationRequest contracts where admin matches wallet party
      const fetchedRequests = await ledger.query(
        [`${PACKAGE_ID}:PredictionMarkets:MarketCreationRequest`],
        { admin: wallet.party },
        { forceRefresh: true }
      )

      if (!isMountedRef.current) return

      // Check if endpoints are unavailable
      if (fetchedRequests && fetchedRequests._endpointsUnavailable) {
        apiRoutesWorkingRef.current = false
        setRequests([])
        setError(null)
        setLoading(false)
        return
      }

      setRequests(Array.isArray(fetchedRequests) ? fetchedRequests : [])
      setError(null)
      apiRoutesWorkingRef.current = true
    } catch (err) {
      if (!isMountedRef.current) return
      
      if (err.message?.includes('404') || err.response?.status === 404) {
        apiRoutesWorkingRef.current = false
        setRequests([])
        setError(null)
      } else {
        setError(err.message)
      }
    } finally {
      if (isMountedRef.current) {
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
            <h3>⚠️ Query Endpoints Unavailable</h3>
            <p>
              The Canton query endpoints are not currently available (returning 404 errors). 
              This means we cannot display market creation requests even though they may exist on the ledger.
            </p>
            <p>
              <strong>Possible solutions:</strong>
            </p>
            <ul>
              <li>Query endpoints may need to be enabled on the Canton participant</li>
              <li>Check with your Canton administrator to enable the JSON API query endpoints</li>
              <li>You can verify contracts were created using the block explorer</li>
            </ul>
            <p>
              <strong>Note:</strong> Market creation requests that were successfully created will appear here once query endpoints are enabled.
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

