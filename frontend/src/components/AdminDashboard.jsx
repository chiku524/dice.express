import { useState, useEffect, useRef } from 'react'
import { useLedger } from '../hooks/useLedger'
import { useWallet } from '../contexts/WalletContext'
import { ContractStorage } from '../utils/contractStorage'
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
  const MAX_RETRIES = 3 // Maximum number of retry attempts

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
    if (!ledger || !wallet) return

    try {
      setLoading(true)
      console.log(`[AdminDashboard] Fetching requests (attempt ${retryCount + 1})...`)
      console.log(`[AdminDashboard] Querying for admin: ${wallet.party}`)
      console.log(`[AdminDashboard] Template ID: ${PACKAGE_ID}:PredictionMarkets:MarketCreationRequest`)
      console.log(`[AdminDashboard] Query filters: { admin: ${wallet.party} }`)
      
      // DATABASE-FIRST APPROACH: Query database first (primary), blockchain as fallback
      // Since Canton endpoints don't reliably return contracts, database is now primary
      let databaseRequests = []
      let blockchainRequests = []
      let databaseQuerySucceeded = false
      let blockchainQuerySucceeded = false
      
      // Step 1: Query database first (primary source)
      try {
        console.log('[AdminDashboard] 💾 Querying database for contracts...')
        databaseRequests = await ContractStorage.getContractsByType(
          'MarketCreationRequest',
          wallet.party,
          'PendingApproval'
        )
        // Filter by admin (client-side filter)
        databaseRequests = databaseRequests.filter(c => 
          c.payload?.admin === wallet.party
        )
        databaseQuerySucceeded = true
        console.log(`[AdminDashboard] ✅ Database query succeeded: ${databaseRequests.length} contracts found`)
      } catch (databaseError) {
        console.warn('[AdminDashboard] ⚠️ Database query failed:', databaseError)
        console.warn('[AdminDashboard] 🔄 Falling back to blockchain...')
        databaseQuerySucceeded = false
      }
      
      // Step 2: Query blockchain as fallback/supplement (only if database has no results or failed)
      // This helps sync contracts that might exist on blockchain but not in database yet
      if (!databaseQuerySucceeded || databaseRequests.length === 0) {
        try {
          console.log('[AdminDashboard] 🔗 Querying blockchain as fallback...')
          
          // Check token before querying
          const { isTokenExpiredOrExpiringSoon, refreshToken } = await import('../utils/tokenManager')
          if (isTokenExpiredOrExpiringSoon()) {
            console.log('[AdminDashboard] ⚠️ Token expired, refreshing before query...')
            try {
              await refreshToken()
              console.log('[AdminDashboard] ✅ Token refreshed successfully')
            } catch (refreshError) {
              console.warn('[AdminDashboard] ⚠️ Token refresh failed:', refreshError.message)
            }
          }
          
          // Try active-contracts endpoint
          const fetchedRequests = await ledger.query(
            [`${PACKAGE_ID}:PredictionMarkets:MarketCreationRequest`],
            { admin: wallet.party },
            { forceRefresh: true, walletParty: wallet.party }
          )
          blockchainRequests = Array.isArray(fetchedRequests) ? fetchedRequests : []
          
          // If no contracts found, try completions endpoint as additional fallback
          if (blockchainRequests.length === 0 && retryCount >= 2) {
            console.log('[AdminDashboard] 🔄 No contracts in active-contracts, trying completions endpoint...')
            try {
              const token = localStorage.getItem('canton_token')
              const completionsResponse = await fetch('/api/get-contracts-from-completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify({
                  party: wallet.party,
                  applicationId: 'prediction-markets',
                  offset: '0',
                  templateId: `${PACKAGE_ID}:PredictionMarkets:MarketCreationRequest`
                })
              })
              
              if (completionsResponse.ok) {
                const completionsData = await completionsResponse.json()
                const completionsContracts = completionsData.contracts || []
                const filteredCompletions = completionsContracts.filter(c => 
                  c.payload?.admin === wallet.party
                )
                
                if (filteredCompletions.length > 0) {
                  console.log(`[AdminDashboard] ✅ Found ${filteredCompletions.length} contracts from completions endpoint`)
                  blockchainRequests = filteredCompletions
                }
              }
            } catch (completionsError) {
              console.warn('[AdminDashboard] ⚠️ Completions endpoint query failed:', completionsError.message)
            }
          }
          
          blockchainQuerySucceeded = true
          console.log(`[AdminDashboard] ✅ Blockchain query succeeded: ${blockchainRequests.length} contracts found`)
        } catch (blockchainError) {
          console.warn('[AdminDashboard] ⚠️ Blockchain query failed:', blockchainError)
          blockchainQuerySucceeded = false
        }
      }
      
      // Step 3: Merge database and blockchain results
      // Database is primary, blockchain supplements it
      let allRequests = [...databaseRequests]
      const databaseContractIds = new Set(databaseRequests.map(r => r.contractId))
      
      // Add blockchain contracts that aren't in database
      blockchainRequests.forEach(blockchainContract => {
        if (!databaseContractIds.has(blockchainContract.contractId)) {
          allRequests.push({
            ...blockchainContract,
            _fromBlockchain: true,
            _needsDatabaseSync: true // Flag to indicate this should be stored in database
          })
        }
      })
      
      console.log(`[AdminDashboard] 📊 Total requests: ${allRequests.length} (${databaseRequests.length} from database, ${blockchainRequests.length} from blockchain)`)
      
      console.log(`[AdminDashboard] 📊 Total requests: ${allRequests.length} (${blockchainRequests.length} from blockchain, ${allRequests.length - blockchainRequests.length} from cloud storage)`)
      if (Array.isArray(allRequests) && allRequests.length > 0) {
        console.log('[AdminDashboard] Contract details:', allRequests.map(r => ({
          contractId: r.contractId,
          title: r.payload?.title,
          admin: r.payload?.admin,
          creator: r.payload?.creator,
          fromCloudStorage: r._fromCloudStorage || false
        })))
      }

      if (!isMountedRef.current) return

      const requestsArray = allRequests || []
      setRequests(requestsArray)
      setError(null)
      apiRoutesWorkingRef.current = true
      
      // If no requests found and blockchain query succeeded (but returned empty), retry multiple times
      // This handles the case where contracts are created but not yet visible due to synchronization
      // Only retry if blockchain query succeeded (don't retry if it failed - we already have cloud storage fallback)
      // Use longer delays to account for blockchain synchronization time
      if (requestsArray.length === 0 && blockchainQuerySucceeded && retryCount < 5) {
        const delays = [2000, 5000, 10000, 15000, 20000] // Longer delays for blockchain sync
        const delay = delays[retryCount] || 20000
        console.log(`[AdminDashboard] ⏳ No contracts found. Retrying after ${delay / 1000} seconds (attempt ${retryCount + 1}/5)...`)
        console.log(`[AdminDashboard] 💡 This may be due to blockchain synchronization delay. Contracts created with updateId can take time to appear.`)
        setTimeout(() => {
          if (isMountedRef.current && apiRoutesWorkingRef.current) {
            fetchRequests(retryCount + 1)
          }
        }, delay)
        return
      } else if (requestsArray.length === 0 && blockchainQuerySucceeded && retryCount >= 5) {
        console.warn('[AdminDashboard] ⚠️ No contracts found after 5 blockchain retries. This could mean:')
        console.warn('[AdminDashboard]   1. No contracts exist for this admin party on the blockchain')
        console.warn('[AdminDashboard]   2. Contracts were created with updateId and need more time to synchronize (can take 30+ seconds)')
        console.warn('[AdminDashboard]   3. Contracts exist but party does not have visibility (check signatories in DAML template)')
        console.warn('[AdminDashboard]   4. Check the explorer link from market creation to verify the contract exists')
        console.warn('[AdminDashboard]   5. Template ID might be incorrect or package not deployed')
        console.warn('[AdminDashboard]   6. activeAtOffset: 0 might miss contracts - contracts may be at a later offset')
        console.warn('[AdminDashboard]   💡 Note: If blockchain query failed, cloud storage contracts are shown as fallback')
        console.warn('[AdminDashboard]   💡 Tip: Try refreshing the page after waiting 30+ seconds for blockchain sync')
      } else if (requestsArray.length === 0 && !blockchainQuerySucceeded) {
        console.warn('[AdminDashboard] ⚠️ Blockchain query failed and no contracts found in cloud storage')
        console.warn('[AdminDashboard]   This may indicate:')
        console.warn('[AdminDashboard]   1. No contracts have been created yet')
        console.warn('[AdminDashboard]   2. Contracts were created but not stored in cloud database')
        console.warn('[AdminDashboard]   3. Blockchain connectivity issues')
        console.warn('[AdminDashboard]   4. Cloud storage not configured (check SUPABASE_URL environment variable)')
      } else if (requestsArray.length > 0) {
        // Show success message if we found contracts (from either source)
        const localCount = requestsArray.filter(r => r._fromLocalStorage).length
        const blockchainCount = requestsArray.length - localCount
        if (localCount > 0) {
          console.log(`[AdminDashboard] ✅ Showing ${requestsArray.length} requests (${localCount} from local storage, ${blockchainCount} from blockchain)`)
        }
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
      if (isMountedRef.current && (retryCount >= 3 || requestsArray.length > 0)) {
        // Set loading to false after all retries are complete OR if we found contracts
        setLoading(false)
      }
      // If retrying, don't set loading to false yet
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
          <h3>No Pending Requests</h3>
          <p style={{ marginTop: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            There are currently no market creation requests awaiting approval.
          </p>
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem' }}>
              <strong>Note:</strong> If you just created a market, it may take a few seconds to appear here due to synchronization delays.
            </p>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              Contracts created with <code>updateId</code> (async submission) may take 10-30 seconds to become visible in queries.
            </p>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.5rem' }}>
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


