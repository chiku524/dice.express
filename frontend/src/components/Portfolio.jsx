import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { encodeFunctionData } from 'viem'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { useWallet } from '../contexts/WalletContext'
import { useAccountModal } from '../contexts/AccountModalContext'
import { useWeb3Wallet } from '../contexts/Web3WalletContext'
import { ContractStorage } from '../utils/contractStorage'
import { SkeletonList } from './SkeletonLoader'
import MultiDiceLoader from './MultiDiceLoader'
import LoadingDiceProgress from './LoadingDiceProgress'
import SubmitDiceLabel from './SubmitDiceLabel'
import UserHubNav from './UserHubNav'
import ErrorState from './ErrorState'
import { formatPips, PLATFORM_CURRENCY_SYMBOL } from '../constants/currency'
import {
  EVM_USDC_CONTRACT,
  EVM_CHAIN_ID,
  EVM_NETWORK_LABEL,
  evmTxExplorerUrl,
  WITHDRAW_EVM_USDC_NETWORKS,
  WITHDRAW_EVM_NATIVE_NETWORKS,
  SOLANA_MAINNET_USDC_MINT,
} from '../constants/chainConfig'
import { apiUrl } from '../services/apiBase'
import './Portfolio.css'

const USDC_ABI = [{ type: 'function', name: 'transfer', inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ type: 'bool' }] }]

const SOLANA_RPC_BROWSER = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOLANA_RPC_URL
  ? String(import.meta.env.VITE_SOLANA_RPC_URL)
  : 'https://api.mainnet-beta.solana.com'

function uint8ToBase64(u8) {
  let s = ''
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i])
  return btoa(s)
}

export default function Portfolio() {
  const { wallet } = useWallet()
  const openAccountModal = useAccountModal()
  const { address: web3Address, chainId: web3ChainId, connect: web3Connect, disconnect: web3Disconnect, isConnected: web3Connected, error: web3Error } = useWeb3Wallet()
  const [positions, setPositions] = useState([])
  const [walletDepositAmount, setWalletDepositAmount] = useState('')
  const [walletDepositToken, setWalletDepositToken] = useState('usdc')
  const [walletDepositEvmNetwork, setWalletDepositEvmNetwork] = useState('ethereum')
  const [phantomPub, setPhantomPub] = useState(null)
  const [walletDepositLoading, setWalletDepositLoading] = useState(false)
  const [walletDepositError, setWalletDepositError] = useState(null)
  const [walletDepositSuccess, setWalletDepositSuccess] = useState(false)
  const [activityLog, setActivityLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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
  const [retryCount, setRetryCount] = useState(0)
  const isMountedRef = useRef(true)
  const depositCardRef = useRef(null)

  const exposureByMarket = useMemo(() => {
    const map = new Map()
    for (const p of positions) {
      const mid = p.payload?.marketId
      if (!mid) continue
      const amt = parseFloat(p.payload?.amount) || 0
      if (amt <= 0) continue
      map.set(mid, (map.get(mid) || 0) + amt)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [positions])

  const refreshUserBalance = useCallback(async () => {
    if (!wallet) return

    try {
      const response = await fetch(apiUrl('get-user-balance'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userParty: wallet.party,
        }),
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
  }, [wallet])

  useEffect(() => {
    const sol = typeof window !== 'undefined' && window.solana?.isPhantom ? window.solana : null
    if (!sol) return undefined
    const syncPhantom = () => setPhantomPub(sol.publicKey?.toBase58?.() || null)
    syncPhantom()
    sol.on?.('accountChanged', syncPhantom)
    return () => sol.removeListener?.('accountChanged', syncPhantom)
  }, [])

  useEffect(() => {
    if (withdrawNetwork === 'solana') setWithdrawToken('usdc')
  }, [withdrawNetwork])

  useEffect(() => {
    if (withdrawToken === 'native' && withdrawNetwork === 'solana') setWithdrawNetwork('ethereum')
  }, [withdrawToken, withdrawNetwork])

  useEffect(() => {
    isMountedRef.current = true
    
    // Set a timeout to ensure loading doesn't stay true forever
    const loadingTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }, 10000) // 10 second timeout
    
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

    refreshUserBalance()

    fetchPositions()

    return () => {
      isMountedRef.current = false
      clearTimeout(loadingTimeout)
    }
  }, [wallet, retryCount, refreshUserBalance])

  // Scroll to deposit section when landing with ?deposit=1 (e.g. after registration)
  useEffect(() => {
    if (!wallet) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('deposit') === '1' || params.get('deposit') === 'card') {
      setActiveTab('balance')
      window.history.replaceState({}, '', window.location.pathname)
      requestAnimationFrame(() => {
        depositCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [wallet])

  // Fetch withdrawal requests and deposit records when on balance tab (must run before any early return so hook count is stable)
  const fetchWithdrawalRequests = useCallback(async () => {
    if (!wallet) return
    try {
      const res = await fetch(`${apiUrl('withdrawal-requests')}?userParty=${encodeURIComponent(wallet.party)}`)
      const data = await res.json()
      if (data.requests) setWithdrawalRequests(data.requests)
    } catch {
      setWithdrawalRequests([])
    }
  }, [wallet])

  const fetchDepositRecords = useCallback(async () => {
    if (!wallet) return
    try {
      const res = await fetch(`${apiUrl('deposit-records')}?userParty=${encodeURIComponent(wallet.party)}&limit=20`)
      const data = await res.json()
      if (data.records) setDepositRecords(data.records)
    } catch {
      setDepositRecords([])
    }
  }, [wallet])

  const fetchDepositAddresses = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('deposit-addresses'))
      const data = await res.json()
      if (data.addresses) setDepositAddresses(data.addresses)
    } catch {
      setDepositAddresses(null)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'balance' && wallet) {
      fetchWithdrawalRequests()
      fetchDepositRecords()
      fetchDepositAddresses()
    }
  }, [activeTab, wallet, fetchWithdrawalRequests, fetchDepositRecords, fetchDepositAddresses])

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
        <div className="portfolio-loading-dice">
          <LoadingDiceProgress
            size="md"
            message="Loading portfolio…"
            sublabel="Balance, positions, and activity."
            progressSteps={['Rolling the dice…', 'Loading balances…', 'Fetching positions…', 'Almost ready…']}
          />
        </div>
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

  const connectPhantom = async () => {
    setWalletDepositError(null)
    const sol = typeof window !== 'undefined' && window.solana?.isPhantom ? window.solana : null
    if (!sol) {
      setWalletDepositError('Install Phantom (https://phantom.app) for Solana USDC deposits.')
      return
    }
    try {
      const { publicKey } = await sol.connect()
      setPhantomPub(publicKey?.toBase58?.() || null)
    } catch (e) {
      setWalletDepositError(e?.message || 'Could not connect Phantom')
    }
  }

  const disconnectPhantom = async () => {
    try {
      const sol = typeof window !== 'undefined' && window.solana?.isPhantom ? window.solana : null
      await sol?.disconnect?.()
    } catch {
      /* ignore disconnect errors */
    }
    setPhantomPub(null)
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
    const netLower = withdrawNetwork.toLowerCase()
    if (netLower === 'solana') {
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,48}$/.test(withdrawAddress.trim())) {
        setWithdrawError('Enter a valid Solana address')
        return
      }
    } else if (!/^0x[a-fA-F0-9]{40}$/i.test(withdrawAddress.trim())) {
      setWithdrawError('Enter a valid EVM address (0x + 40 hex characters)')
      return
    }
    const networkId = netLower
    const token = netLower === 'solana' ? 'usdc' : withdrawToken === 'native' ? 'native' : 'usdc'
    setWithdrawLoading(true)
    setWithdrawError(null)
    setWithdrawSuccess(false)
    setWithdrawTxHash(null)
    try {
      const res = await fetch(apiUrl('withdraw-request'), {
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
      await refreshUserBalance()
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
    if (!wallet?.party) return
    const amount = parseFloat(walletDepositAmount)
    const isSol = walletDepositToken === 'usdc_solana'
    const isNative = walletDepositToken === 'native'
    const minAmount = isNative ? 0.0001 : 0.01
    if (!walletDepositAmount || isNaN(amount) || amount < minAmount) {
      setWalletDepositError(isNative ? 'Enter a valid native amount.' : 'Enter a valid amount (min 0.01 PP for USDC).')
      return
    }

    if (isSol) {
      if (!depositAddresses?.solana?.address) {
        setWalletDepositError('Solana deposit address not configured.')
        return
      }
      const sol = typeof window !== 'undefined' && window.solana?.isPhantom ? window.solana : null
      if (!sol?.publicKey) {
        setWalletDepositError('Connect Phantom first (Solana USDC).')
        return
      }
      setWalletDepositLoading(true)
      setWalletDepositError(null)
      setWalletDepositSuccess(false)
      try {
        const connection = new Connection(SOLANA_RPC_BROWSER, 'confirmed')
        const mint = new PublicKey(SOLANA_MAINNET_USDC_MINT)
        const platformPk = new PublicKey(depositAddresses.solana.address)
        const userPk = sol.publicKey
        const userAta = getAssociatedTokenAddressSync(mint, userPk, false, TOKEN_PROGRAM_ID)
        const platformAta = getAssociatedTokenAddressSync(mint, platformPk, false, TOKEN_PROGRAM_ID)
        const amountRaw = BigInt(Math.floor(amount * 1e6))
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
        const tx = new Transaction()
        tx.add(
          createAssociatedTokenAccountIdempotentInstruction(userPk, platformAta, platformPk, mint, TOKEN_PROGRAM_ID)
        )
        tx.add(createTransferInstruction(userAta, platformAta, userPk, amountRaw, [], TOKEN_PROGRAM_ID))
        tx.recentBlockhash = blockhash
        tx.feePayer = userPk
        const signed = await sol.signTransaction(tx)
        const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false })
        await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
        const msgBytes = new TextEncoder().encode(`deposit:${wallet.party}:${sig}`)
        const signedMsg = await sol.signMessage(msgBytes)
        const sigBytes =
          signedMsg instanceof Uint8Array
            ? signedMsg
            : signedMsg?.signature instanceof Uint8Array
              ? signedMsg.signature
              : new Uint8Array(signedMsg?.signature || [])
        const sigB64 = uint8ToBase64(sigBytes)
        const res = await fetch(apiUrl('deposit-with-tx'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userParty: wallet.party,
            txHash: sig,
            fromAddress: userPk.toBase58(),
            amountPips: String(amount),
            signature: sigB64,
            depositType: 'usdc',
            networkId: 'solana',
          }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || result.message || 'Deposit failed')
        setWalletDepositSuccess(true)
        setWalletDepositAmount('')
        await refreshUserBalance()
        await fetchDepositRecords()
      } catch (err) {
        setWalletDepositError(err?.message || 'Deposit failed')
      } finally {
        setWalletDepositLoading(false)
        setTimeout(() => setWalletDepositSuccess(false), 5000)
      }
      return
    }

    if (!web3Address || !depositAddresses?.evm?.address) {
      setWalletDepositError('Connect your EVM wallet and ensure platform address is loaded.')
      return
    }
    const evmNet = walletDepositEvmNetwork
    const targetChainId = EVM_CHAIN_ID[evmNet]
    if (targetChainId == null) {
      setWalletDepositError('Unsupported EVM network.')
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
      if (Number(web3ChainId) !== targetChainId) {
        const hexChain = '0x' + targetChainId.toString(16)
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: hexChain }],
          })
        } catch (e) {
          setWalletDepositError(
            e?.message || `Switch your wallet to ${EVM_NETWORK_LABEL[evmNet] || evmNet} (chain ${targetChainId}) and try again.`
          )
          setWalletDepositLoading(false)
          return
        }
      }
      const platformAddress = depositAddresses.evm.address
      const usdcContract = EVM_USDC_CONTRACT[evmNet]
      if (!isNative && !usdcContract) {
        setWalletDepositError('USDC contract unknown for this network.')
        setWalletDepositLoading(false)
        return
      }
      let txHash
      if (isNative) {
        const valueWei = BigInt(Math.floor(amount * 1e18))
        txHash = await ethereum.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: web3Address,
              to: platformAddress,
              value: '0x' + valueWei.toString(16),
              data: '0x',
            },
          ],
        })
      } else {
        const amountRaw = BigInt(Math.floor(amount * 1e6))
        const data = encodeFunctionData({
          abi: USDC_ABI,
          functionName: 'transfer',
          args: [platformAddress, amountRaw],
        })
        txHash = await ethereum.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: web3Address,
              to: usdcContract,
              data,
              value: '0x0',
            },
          ],
        })
      }
      if (!txHash) throw new Error('No transaction hash returned')
      const message = `deposit:${wallet.party}:${txHash}`
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [message, web3Address],
      })
      const res = await fetch(apiUrl('deposit-with-tx'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userParty: wallet.party,
          txHash,
          fromAddress: web3Address,
          amountPips: String(amount),
          signature,
          depositType: isNative ? 'native' : 'usdc',
          networkId: evmNet,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || result.message || 'Deposit failed')
      setWalletDepositSuccess(true)
      setWalletDepositAmount('')
      await refreshUserBalance()
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
        <p className="balance-amount balance-amount--with-loader">
          {balanceLoading ? (
            <span className="balance-loading-inline">
              <MultiDiceLoader size="xs" decorative inline />
              <span className="balance-loading-text">Loading…</span>
            </span>
          ) : (
            formatPips(userBalance)
          )}
        </p>
        <p className="balance-hint">
          Add credits (deposit via wallet or crypto); withdraw earnings when ready (fee applies).
        </p>
      </div>

      {/* Deposit from connected wallet — first */}
      <div className="card mb-xl">
        <h2 className="mb-md">Deposit from wallet</h2>
        <p className="text-secondary mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
          Use an EVM wallet for USDC or native gas tokens on the chain you select, or Phantom for Solana USDC. Pips credit after confirmation and you sign the verification step (EVM: personal_sign; Solana: message signature).
        </p>
        <p className="text-muted mb-md" style={{ fontSize: 'var(--font-size-xs)' }}>
          <strong>Solana USDC:</strong> SPL token (6 decimals). You need a small amount of SOL in Phantom for network fees. Deposits use at least 0.01 PP (USDC) in the form below; withdrawals to Solana are USDC-only (see Withdraw).
        </p>
        <div className="form-group" style={{ maxWidth: '320px' }}>
          <label>Asset</label>
          <select
            value={walletDepositToken}
            onChange={(e) => setWalletDepositToken(e.target.value)}
            disabled={walletDepositLoading}
          >
            <option value="usdc">USDC (EVM)</option>
            <option value="native">Native gas token (EVM)</option>
            <option value="usdc_solana">USDC (Solana)</option>
          </select>
        </div>
        {(walletDepositToken === 'usdc' || walletDepositToken === 'native') && (
          <div className="form-group" style={{ maxWidth: '320px' }}>
            <label>EVM network</label>
            <select
              value={walletDepositEvmNetwork}
              onChange={(e) => setWalletDepositEvmNetwork(e.target.value)}
              disabled={walletDepositLoading}
            >
              {(walletDepositToken === 'native' ? WITHDRAW_EVM_NATIVE_NETWORKS : WITHDRAW_EVM_USDC_NETWORKS).map((id) => (
                <option key={id} value={id}>
                  {EVM_NETWORK_LABEL[id] || id}
                </option>
              ))}
            </select>
          </div>
        )}
        {walletDepositToken === 'usdc_solana' ? (
          <div className="mb-md">
            {phantomPub ? (
              <div>
                <p className="text-muted mb-sm" style={{ fontSize: 'var(--font-size-sm)' }}>
                  Phantom: <code>{phantomPub.slice(0, 6)}…{phantomPub.slice(-4)}</code>
                </p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={disconnectPhantom}
                  disabled={walletDepositLoading}
                >
                  Disconnect Phantom
                </button>
              </div>
            ) : (
              <button type="button" className="btn-primary" onClick={connectPhantom}>
                Connect Phantom
              </button>
            )}
          </div>
        ) : !web3Connected ? (
          <div className="mb-md">
            <button type="button" className="btn-primary" onClick={web3Connect}>
              Connect Web3 wallet
            </button>
            {web3Error && <p className="error mt-sm" style={{ fontSize: 'var(--font-size-sm)' }}>{web3Error}</p>}
          </div>
        ) : (
          <div className="mb-md">
            <p className="text-muted mb-sm" style={{ fontSize: 'var(--font-size-sm)' }}>
              Connected: <code>{web3Address.slice(0, 6)}…{web3Address.slice(-4)}</code>
              {EVM_CHAIN_ID[walletDepositEvmNetwork] != null &&
                Number(web3ChainId) !== EVM_CHAIN_ID[walletDepositEvmNetwork] && (
                  <span style={{ marginLeft: 'var(--spacing-sm)', color: 'var(--color-warning, #eab308)' }}>
                    Switch wallet to {EVM_NETWORK_LABEL[walletDepositEvmNetwork] || walletDepositEvmNetwork} (chain {EVM_CHAIN_ID[walletDepositEvmNetwork]}).
                  </span>
                )}
            </p>
            <button type="button" className="btn-secondary" onClick={web3Disconnect}>
              Disconnect Web3 wallet
            </button>
          </div>
        )}
        <div className="form-group" style={{ maxWidth: '280px' }}>
          <label>
            {walletDepositToken === 'native'
              ? `Amount (native ${EVM_NETWORK_LABEL[walletDepositEvmNetwork] || ''})`
              : walletDepositToken === 'usdc_solana'
                ? 'Amount (PP, in USDC)'
                : 'Amount (PP, in USDC)'}
          </label>
          <input
            type="number"
            value={walletDepositAmount}
            onChange={(e) => setWalletDepositAmount(e.target.value)}
            placeholder={walletDepositToken === 'native' ? 'e.g. 0.1' : 'e.g. 10'}
            min={walletDepositToken === 'native' ? '0.0001' : '0.01'}
            step={walletDepositToken === 'native' ? '0.0001' : '0.01'}
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
            parseFloat(walletDepositAmount) <
              (walletDepositToken === 'native' ? 0.0001 : 0.01) ||
            (walletDepositToken === 'usdc_solana'
              ? !phantomPub
              : !web3Connected ||
                (EVM_CHAIN_ID[walletDepositEvmNetwork] != null &&
                  Number(web3ChainId) !== EVM_CHAIN_ID[walletDepositEvmNetwork]))
          }
          style={{ marginTop: 'var(--spacing-sm)' }}
        >
          {walletDepositLoading ? (
            <SubmitDiceLabel busyLabel="Sending & verifying…" />
          ) : walletDepositToken === 'usdc_solana' ? (
            'Send Solana USDC'
          ) : walletDepositToken === 'native' ? (
            'Send native token'
          ) : (
            'Send USDC'
          )}
        </button>
      </div>

      {/* Deposit with crypto (platform addresses) — ref for ?deposit= scroll */}
      <div ref={depositCardRef} className="card mb-xl">
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
                <strong>EVM</strong>
                {depositAddresses.evm.asset && (
                  <p className="mt-xs mb-0 text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{depositAddresses.evm.asset}</p>
                )}
                <p className="mt-xs mb-xs text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{depositAddresses.evm.networks?.join(', ')}</p>
                <code style={{ wordBreak: 'break-all', display: 'block', padding: 'var(--spacing-sm)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)' }}>{depositAddresses.evm.address}</code>
                {depositAddresses.evm.note && (
                  <p className="mt-xs text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{depositAddresses.evm.note}</p>
                )}
              </div>
            )}
            {depositAddresses.solana && (
              <div>
                <strong>Solana</strong>
                {depositAddresses.solana.asset && (
                  <p className="mt-xs mb-0 text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{depositAddresses.solana.asset}</p>
                )}
                <code style={{ wordBreak: 'break-all', display: 'block', padding: 'var(--spacing-sm)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)', marginTop: 'var(--spacing-xs)' }}>{depositAddresses.solana.address}</code>
                {depositAddresses.solana.note && (
                  <p className="mt-xs text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{depositAddresses.solana.note}</p>
                )}
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
          Withdraw USDC (EVM or Solana) or native EVM gas tokens to your address. USDC: 2% fee (min 1 PP). Native: 1 PP fee. Processing is immediate when the platform wallet sends on-chain.
        </p>
        <div className="form-group" style={{ maxWidth: '280px' }}>
          <label>Token</label>
          <select
            value={withdrawToken}
            onChange={(e) => {
              const v = e.target.value
              setWithdrawToken(v)
              if (v === 'native' && withdrawNetwork === 'solana') setWithdrawNetwork('ethereum')
            }}
            disabled={withdrawLoading || withdrawNetwork === 'solana'}
          >
            <option value="usdc">USDC</option>
            <option value="native">Native (EVM gas token)</option>
          </select>
        </div>
        <div className="form-group" style={{ maxWidth: '320px' }}>
          <label>{withdrawToken === 'usdc' ? 'Amount (PP)' : 'Amount (native token)'}</label>
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
        <div className="form-group" style={{ maxWidth: '280px' }}>
          <label>Network</label>
          <select value={withdrawNetwork} onChange={(e) => setWithdrawNetwork(e.target.value)} disabled={withdrawLoading}>
            {withdrawToken === 'usdc' && <option value="solana">Solana</option>}
            {(withdrawToken === 'usdc' ? WITHDRAW_EVM_USDC_NETWORKS : WITHDRAW_EVM_NATIVE_NETWORKS).map((id) => (
              <option key={id} value={id}>
                {EVM_NETWORK_LABEL[id] || id}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ maxWidth: '320px' }}>
          <label>Destination address</label>
          <input
            type="text"
            value={withdrawAddress}
            onChange={(e) => setWithdrawAddress(e.target.value)}
            placeholder={withdrawNetwork === 'solana' ? 'Solana address…' : '0x…'}
            disabled={withdrawLoading}
          />
        </div>
        {withdrawError && <div className="error mt-sm" style={{ fontSize: 'var(--font-size-sm)' }}>{withdrawError}</div>}
        {withdrawSuccess && (
          <div className="success-message mt-sm">
            {withdrawTxHash ? (
              <>
                Withdrawal sent.{' '}
                <a
                  href={evmTxExplorerUrl(withdrawTxNetwork || withdrawNetwork, withdrawTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'inherit', textDecoration: 'underline' }}
                >
                  View transaction
                </a>
              </>
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
          {withdrawLoading ? <SubmitDiceLabel busyLabel="Sending…" /> : 'Withdraw'}
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
          {exposureByMarket.length > 0 && (
            <div className="card mb-md">
              <h3 className="mb-sm">Open exposure by market</h3>
              <p className="text-secondary" style={{ fontSize: 'var(--font-size-sm)', marginBottom: '0.75rem' }}>
                Sum of position sizes (shares) per market — quick view of where you have prediction risk.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {exposureByMarket.slice(0, 12).map(([mid, sum]) => (
                  <li key={mid} className="mb-xs" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    <Link to={`/market/${mid}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                      {marketTitles[mid] || mid}
                    </Link>
                    <span>{sum.toFixed(2)} shares</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
