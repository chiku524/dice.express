import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { encodeFunctionData } from 'viem'
import { useWallet } from '../contexts/WalletContext'
import { useAccountModal } from '../contexts/AccountModalContext'
import { useWeb3Wallet } from '../contexts/Web3WalletContext'
import { ContractStorage } from '../utils/contractStorage'
import { SkeletonList } from './SkeletonLoader'
import UserHubNav from './UserHubNav'
import ErrorState from './ErrorState'
import { formatPips, PLATFORM_CURRENCY_SYMBOL } from '../constants/currency'
import './Portfolio.css'
import { PIPS_PACKAGES } from '../constants/stripeProducts'

const USDC_ABI = [{ type: 'function', name: 'transfer', inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ type: 'bool' }] }]
const USDC_ETHEREUM = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const CHAIN_ID_ETHEREUM = 1
const CHAIN_ID_POLYGON = 137

export default function Portfolio() {
  const { wallet } = useWallet()
  const openAccountModal = useAccountModal()
  const { address: web3Address, chainId: web3ChainId, client: web3Client, connect: web3Connect, disconnect: web3Disconnect, isConnected: web3Connected, error: web3Error } = useWeb3Wallet()
  const [positions, setPositions] = useState([])
  const [walletDepositAmount, setWalletDepositAmount] = useState('')
  const [walletDepositToken, setWalletDepositToken] = useState('usdc')
  const [walletDepositLoading, setWalletDepositLoading] = useState(false)
  const [walletDepositError, setWalletDepositError] = useState(null)
  const [walletDepositSuccess, setWalletDepositSuccess] = useState(false)
  const [activityLog, setActivityLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stripeAmount, setStripeAmount] = useState('')
  const [stripeLoading, setStripeLoading] = useState(false)
  const [stripeError, setStripeError] = useState(null)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [withdrawNetwork, setWithdrawNetwork] = useState('ethereum')
  const [withdrawToken, setWithdrawToken] = useState('usdc')
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [withdrawError, setWithdrawError] = useState(null)
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)
  const [withdrawTxHash, setWithdrawTxHash] = useState(null)
  const [withdrawTxNetwork, setWithdrawTxNetwork] = useState(null)
  const [withdrawalRequests, setWithdrawalRequests] = useState([])
  const [depositRecords, setDepositRecords] = useState([])
  const [depositAddresses, setDepositAddresses] = useState(null)
  const [userBalance, setUserBalance] = useState('0')
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [marketTitles, setMarketTitles] = useState({}) // Map of marketId -> title
  const [activeTab, setActiveTab] = useState('balance') // 'balance' | 'positions' | 'activity'
  const [stripeReturnMessage, setStripeReturnMessage] = useState(null) // 'success' | 'cancel' | null
  const [stripePackages, setStripePackages] = useState(PIPS_PACKAGES) // from API (wrangler vars) or fallback to build-time
  const [retryCount, setRetryCount] = useState(0)
  const isMountedRef = useRef(true)
  const depositCardRef = useRef(null)

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
  }, [wallet, retryCount])

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

  // Fetch Stripe package config from API (wrangler [vars]); fallback to PIPS_PACKAGES (build-time)
  useEffect(() => {
    let cancelled = false
    fetch('/api/stripe-packages')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!cancelled && data?.packages?.length) setStripePackages(data.packages)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Fetch withdrawal requests and deposit records when on balance tab (must run before any early return so hook count is stable)
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
  const fetchDepositRecords = async () => {
    if (!wallet) return
    try {
      const res = await fetch(`/api/deposit-records?userParty=${encodeURIComponent(wallet.party)}&limit=20`)
      const data = await res.json()
      if (data.records) setDepositRecords(data.records)
    } catch {
      setDepositRecords([])
    }
  }
  const fetchDepositAddresses = async () => {
    try {
      const res = await fetch('/api/deposit-addresses')
      const data = await res.json()
      if (data.addresses) setDepositAddresses(data.addresses)
    } catch {
      setDepositAddresses(null)
    }
  }
  useEffect(() => {
    if (activeTab === 'balance' && wallet) {
      fetchWithdrawalRequests()
      fetchDepositRecords()
      fetchDepositAddresses()
    }
  }, [activeTab, wallet])

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

  if (loading) {
    return (
      <div className="portfolio-page">
        <UserHubNav />
        <header className="portfolio-header">
          <h1>Portfolio</h1>
          <p className="portfolio-header-desc">Balance, positions, deposit & withdraw.</p>
        </header>
        <SkeletonList count={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="portfolio-page">
        <UserHubNav />
        <header className="portfolio-header">
          <h1>Portfolio</h1>
        </header>
        <div className="card">
          <ErrorState
            title="Error loading portfolio"
            message={error}
            onRetry={() => { setError(null); setLoading(true); setRetryCount((c) => c + 1) }}
            retryLabel="Try again"
            secondaryLabel="Back to Dashboard"
            secondaryTo="/dashboard"
          />
        </div>
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
    const token = withdrawToken === 'native_eth' || withdrawToken === 'native_matic' ? 'native' : 'usdc'
    const networkId = withdrawToken === 'native_matic' ? 'polygon' : withdrawNetwork
    setWithdrawLoading(true)
    setWithdrawError(null)
    setWithdrawSuccess(false)
    setWithdrawTxHash(null)
    try {
      const res = await fetch('/api/withdraw-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userParty: wallet.party,
          accountId: wallet.accountId,
          amount,
          destinationAddress: withdrawAddress.trim(),
          networkId,
          token,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Withdrawal request failed')
      setWithdrawSuccess(true)
      if (data.txHash) {
        setWithdrawTxHash(data.txHash)
        setWithdrawTxNetwork(data.networkId || 'ethereum')
      }
      setWithdrawAmount('')
      setWithdrawAddress('')
      await fetchUserBalance()
      await fetchWithdrawalRequests()
    } catch (err) {
      setWithdrawError(err.message)
    } finally {
      setWithdrawLoading(false)
      setTimeout(() => {
        setWithdrawSuccess(false)
        setWithdrawTxHash(null)
        setWithdrawTxNetwork(null)
      }, 10000)
    }
  }

  const handleWalletDeposit = async () => {
    if (!wallet?.party || !web3Address || !depositAddresses?.evm?.address) {
      setWalletDepositError('Connect your Web3 wallet and ensure platform address is loaded.')
      return
    }
    const amount = parseFloat(walletDepositAmount)
    const isNative = walletDepositToken === 'native_eth' || walletDepositToken === 'native_matic'
    const minAmount = isNative ? 0.0001 : 0.01
    if (!walletDepositAmount || isNaN(amount) || amount < minAmount) {
      setWalletDepositError(isNative ? 'Enter a valid amount.' : 'Enter a valid amount (min 0.01 PP).')
      return
    }
    const ethereum = typeof window !== 'undefined' && window.ethereum
    if (!ethereum) {
      setWalletDepositError('No Web3 wallet found.')
      return
    }
    setWalletDepositLoading(true)
    setWalletDepositError(null)
    setWalletDepositSuccess(false)
    try {
      const targetChainId = walletDepositToken === 'native_matic' ? CHAIN_ID_POLYGON : CHAIN_ID_ETHEREUM
      if (Number(web3ChainId) !== targetChainId) {
        const hexChain = '0x' + targetChainId.toString(16)
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: hexChain }],
        })
      }
      const platformAddress = depositAddresses.evm.address
      let txHash
      if (isNative) {
        const valueWei = BigInt(Math.floor(amount * 1e18))
        txHash = await ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: web3Address,
            to: platformAddress,
            value: '0x' + valueWei.toString(16),
            data: '0x',
          }],
        })
      } else {
        const usdcContract = USDC_ETHEREUM
        const amountRaw = BigInt(Math.floor(amount * 1e6))
        const data = encodeFunctionData({
          abi: USDC_ABI,
          functionName: 'transfer',
          args: [platformAddress, amountRaw],
        })
        txHash = await ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: web3Address,
            to: usdcContract,
            data,
            value: '0x0',
          }],
        })
      }
      if (!txHash) throw new Error('No transaction hash returned')
      const message = `deposit:${wallet.party}:${txHash}`
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [message, web3Address],
      })
      const networkId = walletDepositToken === 'native_matic' ? 'polygon' : 'ethereum'
      const res = await fetch('/api/deposit-with-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userParty: wallet.party,
          txHash,
          fromAddress: web3Address,
          amountPips: String(amount),
          signature,
          depositType: isNative ? 'native' : 'usdc',
          networkId,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || result.message || 'Deposit failed')
      setWalletDepositSuccess(true)
      setWalletDepositAmount('')
      await fetchUserBalance()
      await fetchDepositRecords()
    } catch (err) {
      setWalletDepositError(err?.message || 'Deposit failed')
    } finally {
      setWalletDepositLoading(false)
      setTimeout(() => setWalletDepositSuccess(false), 5000)
    }
  }

  const tabs = [
    { id: 'balance', label: 'Balance' },
    { id: 'positions', label: 'Positions', count: positions.length },
    { id: 'activity', label: 'Activity', count: activityLog.length },
  ]

  const tabLabels = { balance: 'Balance', positions: 'Positions', activity: 'Activity' }

  return (
    <div className="portfolio-page">
      <UserHubNav />
      <nav className="portfolio-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Markets</Link>
        <span className="portfolio-breadcrumb-sep" aria-hidden>→</span>
        <span>Portfolio</span>
      </nav>
      <header className="portfolio-header">
        <h1>Portfolio</h1>
        <p className="portfolio-header-desc">Balance, positions, add credits & withdraw.</p>
      </header>

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
          Add credits (deposit via wallet, card, or crypto); withdraw earnings when ready (fee applies).
        </p>
      </div>

      {/* Deposit from connected wallet — first */}
      <div className="card mb-xl">
        <h2 className="mb-md">Deposit from wallet</h2>
        <p className="text-secondary mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
          Connect your Web3 wallet and send USDC or native tokens (ETH, MATIC). Your Pips are credited after the transaction confirms and you sign the verification message.
        </p>
        {!web3Connected ? (
          <div>
            <button type="button" className="btn-primary" onClick={web3Connect}>
              Connect Web3 wallet
            </button>
            {web3Error && <p className="error mt-sm" style={{ fontSize: 'var(--font-size-sm)' }}>{web3Error}</p>}
          </div>
        ) : (
          <div>
            <p className="text-muted mb-sm" style={{ fontSize: 'var(--font-size-sm)' }}>
              Connected: <code>{web3Address.slice(0, 6)}…{web3Address.slice(-4)}</code>
              {(walletDepositToken === 'native_matic' ? Number(web3ChainId) !== CHAIN_ID_POLYGON : Number(web3ChainId) !== CHAIN_ID_ETHEREUM) && (
                <span style={{ marginLeft: 'var(--spacing-sm)', color: 'var(--color-warning, #eab308)' }}>
                  Switch to {walletDepositToken === 'native_matic' ? 'Polygon' : 'Ethereum'} for this token.
                </span>
              )}
            </p>
            <div className="form-group" style={{ maxWidth: '280px' }}>
              <label>Token</label>
              <select value={walletDepositToken} onChange={(e) => setWalletDepositToken(e.target.value)} disabled={walletDepositLoading}>
                <option value="usdc">USDC (Ethereum)</option>
                <option value="native_eth">ETH (Ethereum native)</option>
                <option value="native_matic">MATIC (Polygon native)</option>
              </select>
            </div>
            <div className="form-group" style={{ maxWidth: '280px' }}>
              <label>
                {walletDepositToken === 'usdc' ? 'Amount (PP, in USDC)' : walletDepositToken === 'native_eth' ? 'Amount (ETH)' : 'Amount (MATIC)'}
              </label>
              <input
                type="number"
                value={walletDepositAmount}
                onChange={(e) => setWalletDepositAmount(e.target.value)}
                placeholder={walletDepositToken === 'usdc' ? 'e.g. 10' : 'e.g. 0.1'}
                min={walletDepositToken === 'usdc' ? '0.01' : '0.0001'}
                step={walletDepositToken === 'usdc' ? '0.01' : '0.0001'}
                disabled={walletDepositLoading}
              />
            </div>
            {walletDepositError && <p className="error mt-sm" style={{ fontSize: 'var(--font-size-sm)' }}>{walletDepositError}</p>}
            {walletDepositSuccess && <p className="success-message mt-sm">Deposit credited. Your balance has been updated.</p>}
            <button
              type="button"
              className="btn-primary"
              onClick={handleWalletDeposit}
              disabled={
                walletDepositLoading ||
                !walletDepositAmount ||
                parseFloat(walletDepositAmount) < (walletDepositToken === 'usdc' ? 0.01 : 0.0001) ||
                (walletDepositToken === 'native_matic' ? Number(web3ChainId) !== CHAIN_ID_POLYGON : Number(web3ChainId) !== CHAIN_ID_ETHEREUM)
              }
              style={{ marginTop: 'var(--spacing-sm)' }}
            >
              {walletDepositLoading ? 'Sending & verifying…' : walletDepositToken === 'usdc' ? 'Send USDC' : walletDepositToken === 'native_eth' ? 'Send ETH' : 'Send MATIC'}
            </button>
            <button type="button" className="btn-secondary" onClick={web3Disconnect} style={{ marginTop: 'var(--spacing-sm)', marginLeft: 'var(--spacing-sm)' }}>
              Disconnect Web3 wallet
            </button>
          </div>
        )}
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
          {stripePackages.map((pkg) => (
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

      {/* Deposit with crypto (platform addresses) */}
      <div className="card mb-xl">
        <h2 className="mb-md">Deposit with crypto</h2>
        <p className="text-secondary mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
          Send USDC (or supported asset) to the platform wallet below. Include your account ID in the memo if the network supports it. After confirmation we credit your Pips (1:1 for stablecoins).
        </p>
        <p className="text-muted mb-sm" style={{ fontSize: 'var(--font-size-xs)' }}>
          Your account ID (use in memo when possible): <code style={{ wordBreak: 'break-all' }}>{wallet?.accountId || wallet?.party}</code>
        </p>
        {depositAddresses && (
          <div className="mt-md" style={{ fontSize: 'var(--font-size-sm)' }}>
            {depositAddresses.evm && (
              <div className="mb-md">
                <strong>EVM (Ethereum, Polygon, Arbitrum, Optimism, Base, etc.)</strong>
                <p className="mt-xs mb-xs text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{depositAddresses.evm.networks?.join(', ')}</p>
                <code style={{ wordBreak: 'break-all', display: 'block', padding: 'var(--spacing-sm)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)' }}>{depositAddresses.evm.address}</code>
              </div>
            )}
            {depositAddresses.solana && (
              <div>
                <strong>Solana</strong>
                <code style={{ wordBreak: 'break-all', display: 'block', padding: 'var(--spacing-sm)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)' }}>{depositAddresses.solana.address}</code>
              </div>
            )}
          </div>
        )}
        {depositRecords.length > 0 && (
          <div className="mt-md">
            <h3 className="mb-sm">Deposit history</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 'var(--font-size-sm)' }}>
              {depositRecords.slice(0, 10).map((r) => (
                <li key={r.id} className="mb-xs">
                  {formatPips(r.amountPips ?? r.amountGuap)} · {r.source} {r.referenceId ? `· ${String(r.referenceId).slice(0, 12)}…` : ''} · {formatDate(r.createdAt)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Withdraw */}
      <div className="card mb-xl">
        <h2 className="mb-md">Withdraw</h2>
        <p className="text-secondary mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
          Withdraw USDC or native tokens (ETH, MATIC) to your EVM address. USDC: 2% fee (min 1 PP). Native: 1 PP fee. Sent immediately from the platform wallet.
        </p>
        <div className="form-group" style={{ maxWidth: '280px' }}>
          <label>Token</label>
          <select value={withdrawToken} onChange={(e) => setWithdrawToken(e.target.value)} disabled={withdrawLoading}>
            <option value="usdc">USDC (stablecoin)</option>
            <option value="native_eth">ETH (Ethereum native)</option>
            <option value="native_matic">MATIC (Polygon native)</option>
          </select>
        </div>
        <div className="form-group" style={{ maxWidth: '320px' }}>
          <label>
            {withdrawToken === 'usdc' ? 'Amount (PP)' : withdrawToken === 'native_eth' ? 'Amount (ETH)' : 'Amount (MATIC)'}
          </label>
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder={withdrawToken === 'usdc' ? '0' : '0.00'}
            min="0"
            step={withdrawToken === 'usdc' ? '0.01' : '0.0001'}
            disabled={withdrawLoading}
          />
        </div>
        {withdrawToken === 'usdc' && (
          <div className="form-group" style={{ maxWidth: '200px' }}>
            <label>Network</label>
            <select value={withdrawNetwork} onChange={(e) => setWithdrawNetwork(e.target.value)} disabled={withdrawLoading}>
              <option value="ethereum">Ethereum</option>
              <option value="polygon">Polygon</option>
            </select>
          </div>
        )}
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
        {withdrawError && <div className="error mt-sm" style={{ fontSize: 'var(--font-size-sm)' }}>{withdrawError}</div>}
        {withdrawSuccess && (
          <div className="success-message mt-sm">
            {withdrawTxHash ? (
              <>Withdrawal sent. <a href={withdrawTxNetwork === 'polygon' ? `https://polygonscan.com/tx/${withdrawTxHash}` : `https://etherscan.io/tx/${withdrawTxHash}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>View transaction</a></>
            ) : (
              'Withdrawal queued; it will be processed shortly.'
            )}
          </div>
        )}
        <button
          className="btn-primary"
          onClick={handleWithdraw}
          disabled={withdrawLoading || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || !withdrawAddress?.trim()}
          style={{ marginTop: 'var(--spacing-sm)' }}
        >
          {withdrawLoading ? 'Sending…' : 'Withdraw'}
        </button>
        {withdrawalRequests.length > 0 && (
          <div className="mt-xl">
            <h3 className="mb-sm">Your withdrawal requests</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 'var(--font-size-sm)' }}>
              {withdrawalRequests.slice(0, 10).map((r) => (
                <li key={r.requestId} className="mb-xs">
                  {formatPips(r.netPips ?? r.netGuap)} → {r.destination.slice(0, 10)}… ({r.status})
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
                    <h3>
                      <Link to={`/market/${position.payload?.marketId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {marketTitles[position.payload?.marketId] || position.payload?.marketId || 'Unknown Market'}
                      </Link>
                    </h3>
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
