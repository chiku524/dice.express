import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { useAccountModal } from '../contexts/AccountModalContext'
import { ContractStorage } from '../utils/contractStorage'
import { SkeletonList } from './SkeletonLoader'
import { formatPips, PLATFORM_CURRENCY_SYMBOL } from '../constants/currency'
import { PIPS_PACKAGES } from '../constants/stripeProducts'

export default function Portfolio() {
  const { wallet } = useWallet()
  const openAccountModal = useAccountModal()
  const [positions, setPositions] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositLoading, setDepositLoading] = useState(false)
  const [depositError, setDepositError] = useState(null)
  const [depositSuccess, setDepositSuccess] = useState(false)
  const [stripeAmount, setStripeAmount] = useState('')
  const [stripeLoading, setStripeLoading] = useState(false)
  const [stripeError, setStripeError] = useState(null)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [withdrawNetwork, setWithdrawNetwork] = useState('ethereum')
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [withdrawError, setWithdrawError] = useState(null)
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)
  const [withdrawalRequests, setWithdrawalRequests] = useState([])
  const [userBalance, setUserBalance] = useState('0')
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [marketTitles, setMarketTitles] = useState({}) // Map of marketId -> title
  const [activeTab, setActiveTab] = useState('balance') // 'balance' | 'positions' | 'activity'
  const [stripeReturnMessage, setStripeReturnMessage] = useState(null) // 'success' | 'cancel' | null
  const isMountedRef = useRef(true)
  const depositCardRef = useRef(null)

  if (!wallet) {
    return (
      <div className="card" style={{ maxWidth: '420px', margin: '2rem auto', textAlign: 'center' }}>
        <h2>My Portfolio</h2>
        <p className="text-secondary mt-sm">Sign in to view your balance and positions.</p>
        <button type="button" className="btn-primary mt-lg" onClick={openAccountModal}>
          Sign in
        </button>
      </div>
    )
  }

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

  // Handle return from Stripe Checkout (success or cancel)
  useEffect(() => {
    if (!wallet) return
    const params = new URLSearchParams(window.location.search)
    const stripe = params.get('stripe')
    if (stripe === 'success') {
      setStripeReturnMessage('success')
      window.history.replaceState({}, '', window.location.pathname)
      const refetchBalance = async () => {
        try {
          const res = await fetch('/api/get-user-balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userParty: wallet.party }),
          })
          if (res.ok) {
            const data = await res.json()
            setUserBalance(String(data.balance ?? '0'))
          }
        } catch {}
      }
      refetchBalance()
      setTimeout(refetchBalance, 2500)
      const t = setTimeout(() => setStripeReturnMessage(null), 8000)
      return () => clearTimeout(t)
    }
    if (stripe === 'cancel') {
      setStripeReturnMessage('cancel')
      window.history.replaceState({}, '', window.location.pathname)
      const t = setTimeout(() => setStripeReturnMessage(null), 5000)
      return () => clearTimeout(t)
    }
  }, [wallet])

  // Scroll to deposit card when landing with ?deposit=card (e.g. after registration)
  useEffect(() => {
    if (!wallet) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('deposit') === 'card') {
      setActiveTab('balance')
      window.history.replaceState({}, '', window.location.pathname)
      requestAnimationFrame(() => {
        depositCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
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

  const handleAddCredits = async () => {
    if (!wallet) {
      setDepositError('Please sign in first')
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
      const response = await fetch('/api/add-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userParty: wallet.party,
          accountId: wallet.accountId,
          amount: depositAmount,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Add credits failed')
      }

      setDepositSuccess(true)
      setDepositAmount('')
      await fetchUserBalance()
    } catch (err) {
      setDepositError(err.message)
    } finally {
      setDepositLoading(false)
      setTimeout(() => setDepositSuccess(false), 5000)
    }
  }

  const startStripeCheckout = async (body) => {
    const base = window.location.origin
    const res = await fetch('/api/stripe-create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        userParty: wallet.party,
        successUrl: `${base}/portfolio?stripe=success`,
        cancelUrl: `${base}/portfolio?stripe=cancel`,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.hint || 'Could not start checkout')
    if (data.url) window.location.href = data.url
    else setStripeError('No checkout URL returned')
  }

  const handleStripeDeposit = async () => {
    if (!wallet) return
    const amount = parseFloat(stripeAmount)
    if (!stripeAmount || isNaN(amount) || amount < 1) {
      setStripeError('Enter at least 1 PP (charged in USD)')
      return
    }
    setStripeLoading(true)
    setStripeError(null)
    try {
      await startStripeCheckout({ amount })
    } catch (err) {
      setStripeError(err.message)
    } finally {
      setStripeLoading(false)
    }
  }

  const handleStripePackage = async (pkg) => {
    if (!wallet) return
    setStripeLoading(true)
    setStripeError(null)
    try {
      const body = (pkg.productId && pkg.productId.startsWith('prod_'))
        ? { productId: pkg.productId }
        : { amount: pkg.amount }
      await startStripeCheckout(body)
    } catch (err) {
      setStripeError(err.message)
    } finally {
      setStripeLoading(false)
    }
  }

  const fetchWithdrawalRequests = async () => {
    if (!wallet) return
    try {
      const res = await fetch(`/api/withdrawal-requests?userParty=${encodeURIComponent(wallet.party)}`)
      const data = await res.json()
      if (data.requests) setWithdrawalRequests(data.requests)
    } catch {
      setWithdrawalRequests([])
    }
  }

  const handleWithdraw = async () => {
    if (!wallet) return
    const amount = parseFloat(withdrawAmount)
    if (!withdrawAmount || isNaN(amount) || amount <= 0) {
      setWithdrawError('Enter a valid amount')
      return
    }
    if (!withdrawAddress || !withdrawAddress.trim()) {
      setWithdrawError('Enter destination address')
      return
    }
    setWithdrawLoading(true)
    setWithdrawError(null)
    setWithdrawSuccess(false)
    try {
      const res = await fetch('/api/withdraw-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userParty: wallet.party,
          accountId: wallet.accountId,
          amount: amount,
          destinationAddress: withdrawAddress.trim(),
          networkId: withdrawNetwork,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Withdrawal request failed')
      setWithdrawSuccess(true)
      setWithdrawAmount('')
      setWithdrawAddress('')
      await fetchUserBalance()
      await fetchWithdrawalRequests()
    } catch (err) {
      setWithdrawError(err.message)
    } finally {
      setWithdrawLoading(false)
      setTimeout(() => setWithdrawSuccess(false), 5000)
    }
  }

  useEffect(() => {
    if (activeTab === 'balance' && wallet) fetchWithdrawalRequests()
  }, [activeTab, wallet])

  const tabs = [
    { id: 'balance', label: 'Balance' },
    { id: 'positions', label: 'Positions', count: positions.length },
    { id: 'activity', label: 'Activity', count: activityLog.length },
  ]

  const tabLabels = { balance: 'Balance', positions: 'Positions', activity: 'Activity' }

  return (
    <div>
      <nav className="breadcrumb mb-md" aria-label="Breadcrumb" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
        <Link to="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ margin: '0 var(--spacing-sm)' }} aria-hidden>→</span>
        <span>Portfolio</span>
        <span style={{ margin: '0 var(--spacing-sm)' }} aria-hidden>→</span>
        <span>{tabLabels[activeTab] || activeTab}</span>
      </nav>
      <div className="page-header">
        <h1>My Portfolio</h1>
        <p>Balance, positions, and activity</p>
      </div>

      <div className="portfolio-tabs mb-xl" role="tablist" aria-label="Portfolio sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveTab(tab.id)}
            style={{ marginRight: 'var(--spacing-sm)' }}
          >
            {tab.label}
            {typeof tab.count === 'number' && tab.count > 0 && (
              <span style={{ marginLeft: 'var(--spacing-sm)', opacity: 0.9 }}>({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'balance' && (
        <>
      {/* Balance (Pips) */}
      <div className="card balance-card mb-xl">
        <h2 className="mb-sm">Balance ({PLATFORM_CURRENCY_SYMBOL})</h2>
        <p className="balance-amount">
          {balanceLoading ? 'Loading...' : formatPips(userBalance)}
        </p>
        <p className="balance-hint">
          Deposit via crypto or card to get Pips; use it to trade. Withdraw earnings (fee applies).
        </p>
      </div>
      
      {/* Add Pips (top-up for testing; production uses Deposit) */}
      <div className="card mb-xl">
        <h2 className="mb-md">Add Pips</h2>
        <p className="text-secondary mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
          Add Pips to your balance to trade. In production you’ll deposit via crypto or card to receive Pips.
        </p>
        <div className="form-group" style={{ maxWidth: '280px' }}>
          <label>Amount</label>
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="e.g. 100"
            min="0"
            step="1"
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
            Pips added. Your balance has been updated.
          </div>
        )}
        <button
          className="btn-primary"
          onClick={handleAddCredits}
          disabled={depositLoading || !depositAmount}
          style={{ marginTop: 'var(--spacing-sm)' }}
        >
          {depositLoading ? 'Adding...' : 'Add Pips'}
        </button>
        <p className="text-muted mt-md" style={{ fontSize: 'var(--font-size-xs)' }}>
          Withdraw your Pips anytime; a withdrawal fee applies.
        </p>
      </div>

      {stripeReturnMessage === 'success' && (
        <div className="card mb-md" style={{ background: 'var(--color-teal)', color: 'var(--color-bg)', padding: 'var(--spacing-md)' }}>
          Payment successful. Your Pips balance will update in a moment (or refresh the page).
        </div>
      )}
      {stripeReturnMessage === 'cancel' && (
        <div className="card mb-md" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          Checkout cancelled. You can try again when ready.
        </div>
      )}

      {/* Deposit with card (Stripe) */}
      <div ref={depositCardRef} className="card mb-xl">
        <h2 className="mb-md">Deposit with card</h2>
        <p className="text-secondary mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
          Pay with card via Stripe. You receive 1 PP per $1 USD. Pick a package below or enter any custom amount (min 1 PP).
        </p>
        <div className="stripe-packages mb-md">
          <span className="text-secondary" style={{ fontSize: 'var(--font-size-sm)', marginRight: 'var(--spacing-sm)' }}>Packages:</span>
          {PIPS_PACKAGES.map((pkg) => (
            <button
              key={pkg.amount}
              type="button"
              className="btn-secondary"
              disabled={stripeLoading}
              onClick={() => handleStripePackage(pkg)}
              style={{ marginRight: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}
            >
              {pkg.label}
            </button>
          ))}
        </div>
        <div className="form-group" style={{ maxWidth: '280px' }}>
          <label>Custom amount (PP)</label>
          <input
            type="number"
            value={stripeAmount}
            onChange={(e) => setStripeAmount(e.target.value)}
            placeholder="e.g. 50"
            min="1"
            step="1"
            disabled={stripeLoading}
          />
          <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--spacing-xs)' }}>Any amount from 1 PP; charged in USD at 1:1.</p>
        </div>
        {stripeError && <div className="error mt-sm" style={{ fontSize: 'var(--font-size-sm)' }}>{stripeError}</div>}
        <button
          className="btn-primary"
          onClick={handleStripeDeposit}
          disabled={stripeLoading || !stripeAmount || parseFloat(stripeAmount) < 1}
          style={{ marginTop: 'var(--spacing-sm)' }}
        >
          {stripeLoading ? 'Redirecting…' : 'Pay custom amount'}
        </button>
      </div>

      {/* Deposit with crypto */}
      <div className="card mb-xl">
        <h2 className="mb-md">Deposit with crypto</h2>
        <p className="text-secondary mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
          Send USDC (or supported asset) to the platform wallet. Include your account ID in the memo if the network supports it. After confirmation we credit your Pips (1:1 for stablecoins). Contact support for the deposit address and supported networks.
        </p>
        <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
          Your account ID: <code style={{ wordBreak: 'break-all' }}>{wallet?.accountId || wallet?.party}</code>
        </p>
      </div>

      {/* Withdraw */}
      <div className="card mb-xl">
        <h2 className="mb-md">Withdraw Pips</h2>
        <p className="text-secondary mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
          Request a withdrawal to your crypto address. A 2% fee (min 1 PP) applies. Funds are sent from the platform wallet.
        </p>
        <div className="form-group" style={{ maxWidth: '320px' }}>
          <label>Amount (PP)</label>
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="0"
            min="0"
            step="0.01"
            disabled={withdrawLoading}
          />
        </div>
        <div className="form-group" style={{ maxWidth: '320px' }}>
          <label>Destination address</label>
          <input
            type="text"
            value={withdrawAddress}
            onChange={(e) => setWithdrawAddress(e.target.value)}
            placeholder="0x..."
            disabled={withdrawLoading}
          />
        </div>
        <div className="form-group" style={{ maxWidth: '200px' }}>
          <label>Network</label>
          <select value={withdrawNetwork} onChange={(e) => setWithdrawNetwork(e.target.value)} disabled={withdrawLoading}>
            <option value="ethereum">Ethereum</option>
            <option value="polygon">Polygon</option>
          </select>
        </div>
        {withdrawError && <div className="error mt-sm" style={{ fontSize: 'var(--font-size-sm)' }}>{withdrawError}</div>}
        {withdrawSuccess && <div className="success-message mt-sm">Withdrawal requested. You will receive funds after processing.</div>}
        <button
          className="btn-primary"
          onClick={handleWithdraw}
          disabled={withdrawLoading || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || !withdrawAddress?.trim()}
          style={{ marginTop: 'var(--spacing-sm)' }}
        >
          {withdrawLoading ? 'Requesting…' : 'Request withdrawal'}
        </button>
        {withdrawalRequests.length > 0 && (
          <div className="mt-xl">
            <h3 className="mb-sm">Your withdrawal requests</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 'var(--font-size-sm)' }}>
              {withdrawalRequests.slice(0, 10).map((r) => (
                <li key={r.requestId} className="mb-xs">
                  {formatPips(r.netGuap ?? r.netPips)} → {r.destination.slice(0, 10)}… ({r.status})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
        </>
      )}

      {activeTab === 'positions' && (
        positions.length === 0 ? (
        <div className="card">
          <h2 className="mb-md">Positions</h2>
          <p className="text-secondary">No positions yet. Browse markets and buy Yes or No to get started.</p>
          <Link to="/">
            <button className="btn-primary mt-md">
              Browse markets
            </button>
          </Link>
        </div>
      ) : (
        <div>
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
                        <strong>Amount:</strong> {formatPips(position.payload?.amount ?? 0)}
                      </div>
                      <div>
                        <strong>Price:</strong> {position.payload?.price || '0'}
                      </div>
                      {position.payload?.depositAmount && (
                        <div>
                          <strong>Deposit:</strong> {formatPips(position.payload.depositAmount)}
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
      ) )}

      {activeTab === 'activity' && (
          <div className="card">
            <h2 className="mb-md">Activity</h2>
            {activityLog.length === 0 ? (
              <p className="text-secondary">No activity yet. Your trades and positions will appear here.</p>
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
                            {formatPips(activity.position.depositAmount)} deposited
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
      )}
    </div>
  )
}
