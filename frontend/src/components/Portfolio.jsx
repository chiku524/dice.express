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
  const [userBalance, setUserBalance] = useState('0')
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [marketTitles, setMarketTitles] = useState({}) // Map of marketId -> title
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    
    // Set a timeout to ensure loading doesn't stay true forever
    const loadingTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }, 10000) // 10 second timeout
    
    const fetchUserBalance = async () => {
      if (!wallet) return

      try {
        const response = await fetch('/api/get-user-balance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userParty: wallet.party
          })
        })

        if (response.ok) {
          const data = await response.json()
          setUserBalance(data.balance || '0')
        } else {
          console.warn('[Portfolio] ⚠️ Failed to fetch user balance')
          setUserBalance('0')
        }
      } catch (err) {
        console.warn('[Portfolio] ⚠️ Error fetching user balance:', err)
        setUserBalance('0')
      } finally {
        setBalanceLoading(false)
      }
    }

    const fetchMarketTitles = async (marketIds) => {
      if (!marketIds || marketIds.length === 0) return {}

      try {
        // Fetch all approved markets
        const markets = await ContractStorage.getContractsByType(
          'MarketCreationRequest',
          null,
          'Approved'
        )

        // Create a map of marketId -> title
        const titlesMap = {}
        markets.forEach(market => {
          if (market.payload?.marketId && market.payload?.title) {
            titlesMap[market.payload.marketId] = market.payload.title
          }
        })

        return titlesMap
      } catch (err) {
        console.warn('[Portfolio] ⚠️ Error fetching market titles:', err)
        return {}
      }
    }

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
          
          // Get unique market IDs
          const marketIds = [...new Set(userPositions.map(p => p.payload?.marketId).filter(Boolean))]
          
          // Fetch market titles
          const titles = await fetchMarketTitles(marketIds)
          setMarketTitles(titles)
          
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

    // Fetch user balance
    fetchUserBalance()

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
          <small className="mt-sm" style={{ display: 'block' }}>
            Please check your connection and try again.
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
      
      // Refresh balance and positions after deposit
      await fetchUserBalance()
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
      
      // Refresh balance and positions after withdrawal
      await fetchUserBalance()
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
      <div className="page-header">
        <h1>My Portfolio</h1>
        <p>Manage your positions, deposits, and trading activity</p>
      </div>
      
      {/* User Balance Display */}
      <div className="card balance-card mb-xl">
        <h2 className="mb-sm">Virtual CC Balance</h2>
        <p className="balance-amount">
          {balanceLoading ? 'Loading...' : `${parseFloat(userBalance).toFixed(2)} CC`}
        </p>
        <p className="balance-hint">
          This is your virtual CC balance tracked in the database. Deposit CC to increase your balance.
        </p>
      </div>
      
      {/* Deposit/Withdraw Section */}
      <div className="card mb-xl">
        <h2 className="mb-md">Deposit / Withdraw CC</h2>
        <div className="grid-auto-fit-sm">
          {/* Deposit */}
          <div>
            <h3 className="mb-sm">Deposit CC</h3>
            <p className="text-secondary mb-sm" style={{ fontSize: 'var(--font-size-sm)' }}>
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
              <div className="error mt-sm" style={{ fontSize: 'var(--font-size-sm)' }}>
                {depositError}
              </div>
            )}
            {depositSuccess && (
              <div className="success-message mt-sm">
                ✅ Deposit successful! Transaction submitted to blockchain.
              </div>
            )}
            <button 
              className="btn-primary" 
              onClick={handleDeposit}
              disabled={depositLoading || !depositAmount}
              style={{ marginTop: 'var(--spacing-sm)', width: '100%' }}
            >
              {depositLoading ? 'Processing...' : 'Deposit'}
            </button>
            <p className="text-muted mt-sm" style={{ fontSize: 'var(--font-size-xs)' }}>
              Note: Requires TokenBalance contract. Use /test page to create one.
            </p>
          </div>

          {/* Withdraw */}
          <div>
            <h3 className="mb-sm">Withdraw CC</h3>
            <p className="text-secondary mb-sm" style={{ fontSize: 'var(--font-size-sm)' }}>
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
              <div className="error mt-sm" style={{ fontSize: 'var(--font-size-sm)' }}>
                {withdrawError}
              </div>
            )}
            {withdrawSuccess && (
              <div className="success-message mt-sm">
                ✅ Withdrawal successful! Transaction submitted to blockchain.
              </div>
            )}
            <button 
              className="btn-primary" 
              onClick={handleWithdraw}
              disabled={withdrawLoading || !withdrawAmount}
              style={{ marginTop: 'var(--spacing-sm)', width: '100%' }}
            >
              {withdrawLoading ? 'Processing...' : 'Withdraw'}
            </button>
            <p className="text-muted mt-sm" style={{ fontSize: 'var(--font-size-xs)' }}>
              Note: Requires platform wallet TokenBalance contract ID.
            </p>
          </div>
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="card">
          <p>You don't have any positions yet. Start trading to see your portfolio here!</p>
          <Link to="/">
            <button className="btn-primary mt-md">
              Browse Markets
            </button>
          </Link>
        </div>
      ) : (
        <div>
          {/* Positions Section */}
          <div className="mb-xl">
            <h2 className="mb-md">My Positions</h2>
            {positions.map((position) => (
              <div key={position.contractId} className="card mb-md">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h3>{marketTitles[position.payload?.marketId] || position.payload?.marketId || 'Unknown Market'}</h3>
                    {marketTitles[position.payload?.marketId] && (
                      <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)' }}>
                        Market ID: {position.payload?.marketId}
                      </p>
                    )}
                    <div className="grid-auto-fit-xs mt-sm">
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
            <h2 className="mb-md">Activity Log</h2>
            {activityLog.length === 0 ? (
              <p className="text-secondary">No activity to display</p>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {activityLog.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="activity-item"
                  >
                    <div className="activity-content">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                        <strong>Position Created</strong>
                        {activity.position?.depositAmount && (
                          <span className="activity-badge">
                            {activity.position.depositAmount} {activity.position.depositCurrency || 'CC'} deposited
                          </span>
                        )}
                      </div>
                      <div className="text-secondary" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>
                        Market: {marketTitles[activity.position?.marketId] || activity.position?.marketId || 'Unknown'}
                      </div>
                      <div className="text-secondary" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>
                        Type: {formatPositionType(activity.position?.positionType)} | Amount: {activity.position?.amount || '0'} | Price: {activity.position?.price || '0'}
                      </div>
                      <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                        {formatDate(activity.timestamp)}
                      </div>
                    </div>
                    <Link to={`/market/${activity.position?.marketId}`} style={{ marginLeft: 'var(--spacing-md)' }}>
                      <button className="btn-secondary" style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-sm) var(--spacing-md)' }}>
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
