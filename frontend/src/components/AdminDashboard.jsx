import { useState, useEffect, useRef } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { ContractStorage } from '../utils/contractStorage'
import { SkeletonList } from './SkeletonLoader'
import { apiUrl } from '../services/apiBase'
import './AdminDashboard.css'

export default function AdminDashboard() {
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
    const pollInterval = setInterval(() => {
      if (apiRoutesWorkingRef.current && !document.hidden) fetchRequests()
    }, 30000)
    return () => {
      isMountedRef.current = false
      clearInterval(pollInterval)
    }
  }, [wallet])

  const fetchRequests = async () => {
    if (!wallet) return
    try {
      setLoading(true)
      const databaseRequests = await ContractStorage.getContractsByType(
        'MarketCreationRequest',
        wallet.party,
        'PendingApproval'
      )
      const filtered = databaseRequests.filter(c => c.payload?.admin === wallet.party)
      if (isMountedRef.current) {
        setRequests(filtered)
        setError(null)
      }
      apiRoutesWorkingRef.current = true
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err.message)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }

  const resolveContractId = async (contractId) => contractId

  const approveMarket = async (contractId) => {
    if (!wallet || processing) return

    setProcessing(contractId)
    setError(null)

    try {
      // Strategy: Update database status first (since blockchain interaction is unreliable)
      // This ensures the UI reflects the approval even if blockchain interaction fails
      const updateId = contractId.startsWith('updateId:') ? contractId.replace('updateId:', '') : null
      
      console.log('[AdminDashboard] 📝 Updating database status to Approved...')
      
      // Update status in database
      const updateResponse = await fetch(apiUrl('update-contract-status'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contractId: contractId,
          updateId: updateId,
          status: 'Approved'
        })
      })

      if (!updateResponse.ok) {
        let errorMessage = 'Failed to update contract status in database'
        try {
          const errorData = await updateResponse.json()
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch (parseError) {
          const errorText = await updateResponse.text()
          errorMessage = errorText || errorMessage
        }
        console.error('[AdminDashboard] ❌ Database update failed:', errorMessage)
        throw new Error(errorMessage)
      }
      
      const updateData = await updateResponse.json()
      console.log('[AdminDashboard] ✅ Database update response:', updateData)

      console.log('[AdminDashboard] ✅ Database status updated to Approved')

      // Virtual-only: database is the source of truth
      console.log('[AdminDashboard] ✅ Status updated - UI will reflect the approval')

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
    if (!wallet || processing) return

    if (!confirm('Are you sure you want to reject this market creation request?')) {
      return
    }

    setProcessing(contractId)
    setError(null)

    try {
      // Strategy: Update database status first (since blockchain interaction is unreliable)
      // This ensures the UI reflects the rejection even if blockchain interaction fails
      const updateId = contractId.startsWith('updateId:') ? contractId.replace('updateId:', '') : null
      
      console.log('[AdminDashboard] 📝 Updating database status to Rejected...')
      
      // Update status in database
      const updateResponse = await fetch(apiUrl('update-contract-status'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contractId: contractId,
          updateId: updateId,
          status: 'Rejected'
        })
      })

      if (!updateResponse.ok) {
        let errorMessage = 'Failed to update contract status in database'
        try {
          const errorData = await updateResponse.json()
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch (parseError) {
          const errorText = await updateResponse.text()
          errorMessage = errorText || errorMessage
        }
        console.error('[AdminDashboard] ❌ Database update failed:', errorMessage)
        throw new Error(errorMessage)
      }
      
      const updateData = await updateResponse.json()
      console.log('[AdminDashboard] ✅ Database update response:', updateData)

      console.log('[AdminDashboard] ✅ Database status updated to Rejected')

      console.log('[AdminDashboard] ✅ Status updated - UI will reflect the rejection')

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
        <button className="btn-primary mt-md" onClick={fetchRequests}>
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
              Pending requests are loaded from the database. If none appear, create a market (user-created flow) or ensure the database is configured.
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
          <h3>No Pending Requests</h3>
          <p className="text-secondary mt-md">
            There are currently no market creation requests awaiting approval.
          </p>
          <div className="info-message mt-lg">
            <p style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-sm)' }}>
              <strong>Note:</strong> If you just created a market, it may take a few seconds to appear here due to synchronization delays.
            </p>
            <p style={{ fontSize: 'var(--font-size-sm)' }}>
              Contracts created with <code>updateId</code> (async submission) may take 10-30 seconds to become visible in queries.
            </p>
            <p style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-sm)' }}>
              You can verify contracts were created by checking the explorer link provided after market creation.
            </p>
          </div>
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


