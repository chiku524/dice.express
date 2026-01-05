import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { ContractStorage } from '../utils/contractStorage'
import { SkeletonList } from './SkeletonLoader'

export default function Portfolio() {
  const { wallet } = useWallet()
  const [positions, setPositions] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [depositLoading, setDepositLoading] = useState(false)
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [depositError, setDepositError] = useState(null)
  const [withdrawError, setWithdrawError] = useState(null)
  const [depositSuccess, setDepositSuccess] = useState(false)
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    
    // Set a timeout to ensure loading doesn't stay true forever
    const loadingTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }, 10000) // 10 second timeout
    
    const fetchPositions = async () => {
      if (!wallet || !isMountedRef.current) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // DATABASE-FIRST APPROACH: Query database for positions
        console.log('[Portfolio] 💾 Querying database for positions...')
        
        try {
          // Query database for Position contracts owned by user
          const databasePositions = await ContractStorage.getContractsByType(
            'Position',
            wallet.party,
            'Active'
          )
          
          // Filter by owner (client-side filter for safety)
          const userPositions = databasePositions.filter(p => 
            p.payload?.owner === wallet.party
          )
          
          console.log(`[Portfolio] ✅ Retrieved ${userPositions.length} positions from database`)
          
          if (!isMountedRef.current) return
          
          // Sort by creation date (newest first)
          const sortedPositions = userPositions.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.created_at || 0)
            const dateB = new Date(b.createdAt || b.created_at || 0)
            return dateB - dateA
          })
          
          setPositions(sortedPositions)
          
          // Build activity log from positions (sorted by date, newest first)
          const activities = sortedPositions.map(position => ({
            id: position.contractId,
            type: 'position_created',
            timestamp: position.createdAt || position.created_at || new Date().toISOString(),
            position: {
              positionId: position.payload?.positionId,
              marketId: position.payload?.marketId,
              positionType: position.payload?.positionType,
              amount: position.payload?.amount,
              price: position.payload?.price,
              depositAmount: position.payload?.depositAmount,
              depositCurrency: position.payload?.depositCurrency || 'CC',
              platformWallet: position.payload?.platformWallet
            }
          }))
          
          setActivityLog(activities)
          setError(null)
        } catch (databaseError) {
          console.warn('[Portfolio] ⚠️ Database query failed:', databaseError)
          setPositions([])
          setActivityLog([])
          setError(null) // Don't show error, just empty state
        }
      } catch (err) {
        if (!isMountedRef.current) return
        
        console.error('[Portfolio] Error fetching positions:', err)
        setError(err.message)
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    fetchPositions()

    return () => {
      isMountedRef.current = false
      clearTimeout(loadingTimeout)
    }
  }, [wallet])

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

  const handleDeposit = async () => {
    if (!wallet) {
      setDepositError('Please connect a wallet')
      return
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setDepositError('Please enter a valid amount')
      return
    }

    setDepositLoading(true)
    setDepositError(null)
    setDepositSuccess(false)

    try {
      // TODO: Get user's TokenBalance contract ID
      // For now, we'll need it from localStorage or user input
      const userTokenBalanceContractId = localStorage.getItem('userTokenBalanceContractId')
      
      if (!userTokenBalanceContractId) {
        throw new Error('TokenBalance contract ID not found. Please create a TokenBalance contract first using the Contract Tester (/test page).')
      }

      const token = localStorage.getItem('canton_token')
      if (!token) {
        throw new Error('Authentication token not found. Please connect your wallet.')
      }

      const response = await fetch('/api/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: depositAmount,
          userParty: wallet.party,
          userTokenBalanceContractId: userTokenBalanceContractId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Deposit failed')
      }

      console.log('[Portfolio] ✅ Deposit successful:', result)
      setDepositSuccess(true)
      setDepositAmount('')
      
      // Refresh positions after deposit
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err) {
      console.error('[Portfolio] Deposit error:', err)
      setDepositError(err.message)
    } finally {
      setDepositLoading(false)
      setTimeout(() => {
        setDepositSuccess(false)
      }, 5000)
    }
  }

  const handleWithdraw = async () => {
    if (!wallet) {
      setWithdrawError('Please connect a wallet')
      return
    }

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setWithdrawError('Please enter a valid amount')
      return
    }

    setWithdrawLoading(true)
    setWithdrawError(null)
    setWithdrawSuccess(false)

    try {
      // TODO: Get platform wallet's TokenBalance contract ID
      // This should be configured as an environment variable or stored in database
      const platformTokenBalanceContractId = localStorage.getItem('platformTokenBalanceContractId')
      
      if (!platformTokenBalanceContractId) {
        throw new Error('Platform TokenBalance contract ID not found. Please configure the platform wallet TokenBalance contract ID.')
      }

      const token = localStorage.getItem('canton_token')
      if (!token) {
        throw new Error('Authentication token not found. Please connect your wallet.')
      }

      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: withdrawAmount,
          userParty: wallet.party,
          platformTokenBalanceContractId: platformTokenBalanceContractId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Withdrawal failed')
      }

      console.log('[Portfolio] ✅ Withdrawal successful:', result)
      setWithdrawSuccess(true)
      setWithdrawAmount('')
      
      // Refresh positions after withdrawal
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err) {
      console.error('[Portfolio] Withdrawal error:', err)
      setWithdrawError(err.message)
    } finally {
      setWithdrawLoading(false)
      setTimeout(() => {
        setWithdrawSuccess(false)
      }, 5000)
    }
  }

  return (
    <div>
      <h1>My Portfolio</h1>
      
      {/* Deposit/Withdraw Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Deposit / Withdraw CC</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {/* Deposit */}
          <div>
            <h3 style={{ marginBottom: '0.5rem' }}>Deposit CC</h3>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem' }}>
              Transfer CC from your wallet to the platform wallet (on-chain)
            </p>
            <div className="form-group">
              <label>Amount</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Enter amount"
                min="0"
                step="0.01"
                disabled={depositLoading}
              />
            </div>
            {depositError && (
              <div className="error" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                {depositError}
              </div>
            )}
            {depositSuccess && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50', borderRadius: '4px', fontSize: '0.9rem' }}>
                ✅ Deposit successful! Transaction submitted to blockchain.
              </div>
            )}
            <button 
              className="btn-primary" 
              onClick={handleDeposit}
              disabled={depositLoading || !depositAmount}
              style={{ marginTop: '0.5rem', width: '100%' }}
            >
              {depositLoading ? 'Processing...' : 'Deposit'}
            </button>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.5rem' }}>
              Note: Requires TokenBalance contract. Use /test page to create one.
            </p>
          </div>

          {/* Withdraw */}
          <div>
            <h3 style={{ marginBottom: '0.5rem' }}>Withdraw CC</h3>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem' }}>
              Transfer CC from platform wallet to your wallet (on-chain)
            </p>
            <div className="form-group">
              <label>Amount</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount"
                min="0"
                step="0.01"
                disabled={withdrawLoading}
              />
            </div>
            {withdrawError && (
              <div className="error" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                {withdrawError}
              </div>
            )}
            {withdrawSuccess && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50', borderRadius: '4px', fontSize: '0.9rem' }}>
                ✅ Withdrawal successful! Transaction submitted to blockchain.
              </div>
            )}
            <button 
              className="btn-primary" 
              onClick={handleWithdraw}
              disabled={withdrawLoading || !withdrawAmount}
              style={{ marginTop: '0.5rem', width: '100%' }}
            >
              {withdrawLoading ? 'Processing...' : 'Withdraw'}
            </button>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.5rem' }}>
              Note: Requires platform wallet TokenBalance contract ID.
            </p>
          </div>
        </div>
      </div>

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
