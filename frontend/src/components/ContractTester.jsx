/**
 * Contract Tester Component
 * 
 * Test all deployed contracts on Canton devnet
 * Uses Vercel API proxy to avoid CORS issues
 */

import { useState } from 'react'
import './ContractTester.css'

const PARTY_ID = 'ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292'
const PACKAGE_ID = 'b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0'
const PACKAGE_NAME = 'prediction-markets' // DAR file name from daml.yaml

// Use explicit package ID format to bypass package vetting requirement
// Format: packageId:moduleName:templateName
const getTemplateId = (module, template) => `${PACKAGE_ID}:${module}:${template}`

export default function ContractTester() {
  const [loading, setLoading] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [tokenInput, setTokenInput] = useState('')
  const [showTokenForm, setShowTokenForm] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [tokenLoading, setTokenLoading] = useState(false)
  const [diagnostics, setDiagnostics] = useState(null)
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false)

  // Get token from input or localStorage
  const getToken = () => {
    if (tokenInput.trim()) {
      localStorage.setItem('canton_token', tokenInput.trim())
      return tokenInput.trim()
    }
    return localStorage.getItem('canton_token') || ''
  }

  // Get token from Keycloak
  const getTokenFromKeycloak = async () => {
    if (!username || !password) {
      setError({
        contractType: 'Token',
        message: 'Please enter both username and password',
        details: 'Username and password are required to get a token'
      })
      return
    }

    setTokenLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/get-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          clientId: 'Prediction-Market'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${data.message || 'Failed to get token'}`)
      }

      if (!data.access_token) {
        throw new Error('No access token in response')
      }

      // Store token
      setTokenInput(data.access_token)
      localStorage.setItem('canton_token', data.access_token)
      
      // Clear password for security
      setPassword('')
      setShowTokenForm(false)

      setResult({
        contractType: 'Token',
        success: true,
        message: 'Token obtained successfully!',
        contractId: 'N/A',
        templateId: 'Authentication',
        details: {
          token_type: data.token_type,
          expires_in: data.expires_in,
          scope: data.scope,
          token_preview: `${data.access_token.substring(0, 50)}...`
        }
      })
    } catch (err) {
      setError({
        contractType: 'Token',
        message: err.message,
        details: err.toString()
      })
    } finally {
      setTokenLoading(false)
    }
  }

  const createContract = async (contractType, templateId, createArguments) => {
    setLoading(contractType)
    setResult(null)
    setError(null)

    try {
      const token = getToken()
      if (!token) {
        throw new Error('Please enter your authentication token above')
      }

      // Use Vercel API proxy to avoid CORS
      const requestPayload = {
        actAs: [PARTY_ID],
        commandId: `test-${contractType.toLowerCase()}-${Date.now()}`,
        applicationId: 'prediction-markets',
        commands: [{
          CreateCommand: {
            templateId: templateId,
            createArguments: createArguments
          }
        }]
      }

      const response = await fetch('/api/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestPayload)
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}: ${JSON.stringify(data)}`)
      }

      // Try multiple response formats to extract contract ID
      let contractId = data.result?.created?.[0]?.contractId || 
                        data.result?.created?.[0]?.contract_id ||
                        data.contractId || 
                        data.contract_id ||
                        data.created?.[0]?.contractId ||
                        data.created?.[0]?.contract_id ||
                        data.result?.contractId ||
                        data.result?.contract_id ||
                        (data.result?.events && data.result.events[0]?.created?.contractId) ||
                        (data.result?.events && data.result.events[0]?.created?.contract_id)
      
      // If we got updateId and completionOffset, the contract was created but we need to query for it
      // This happens with some Canton endpoints that return async submission results
      if (!contractId && data.updateId) {
        // The contract was created successfully, but we need to extract the contract ID
        // For now, we'll use the updateId as a reference
        console.log('Contract created with updateId:', data.updateId)
        contractId = `updateId:${data.updateId}`
        // Note: In production, you'd query the ledger using the updateId to get the actual contract ID
      }
      
      contractId = contractId || 'N/A'
      
      // Log contract ID to console for easy access
      if (contractId && contractId !== 'N/A') {
        console.log('✅ Contract created successfully!')
        console.log('📋 Contract ID:', contractId)
        console.log('🔗 View in explorer:', `https://devnet.ccexplorer.io/?q=${contractId}`)
      }
      
      setResult({
        contractType,
        success: true,
        message: `${contractType} contract created successfully!`,
        contractId: contractId,
        templateId: templateId,
        details: data
      })
      
      // Store TokenBalance contract ID for use in other contracts
      if (contractType === 'TokenBalance' && contractId !== 'N/A') {
        localStorage.setItem('tokenBalanceContractId', contractId)
      }
      
      return contractId
    } catch (err) {
      setError({
        contractType,
        message: err.message,
        details: err.toString()
      })
      throw err
    } finally {
      setLoading(null)
    }
  }
  
  // Helper to create TokenBalance if needed and return its contract ID
  const ensureTokenBalance = async () => {
    // Check if we already have a TokenBalance contract ID stored
    const existingCid = localStorage.getItem('tokenBalanceContractId')
    if (existingCid && existingCid !== 'N/A') {
      return existingCid
    }
    
    // Create TokenBalance first
    setLoading('TokenBalance (auto)')
    try {
      const token = getToken()
      if (!token) {
        throw new Error('Please enter your authentication token above')
      }

      const requestPayload = {
        actAs: [PARTY_ID],
        commandId: `auto-tokenbalance-${Date.now()}`,
        applicationId: 'prediction-markets',
        commands: [{
          CreateCommand: {
            templateId: getTemplateId('Token', 'TokenBalance'),
            createArguments: {
              owner: PARTY_ID,
              token: {
                id: { unpack: 'USDC' }, // TokenId newtype - DAML expects {"unpack": "value"} format
                symbol: 'USDC',
                name: 'USD Coin',
                decimals: 6,
                description: 'Auto-created USDC token for prediction markets'
              },
              amount: 1000000.0
            }
          }
        }]
      }

      const response = await fetch('/api/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestPayload)
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || data.error || `Failed to create TokenBalance: ${response.status}`)
      }

      // Try multiple response formats to extract contract ID
      let contractId = data.result?.created?.[0]?.contractId || 
                        data.result?.created?.[0]?.contract_id ||
                        data.contractId || 
                        data.contract_id ||
                        data.created?.[0]?.contractId ||
                        data.created?.[0]?.contract_id ||
                        data.result?.contractId ||
                        data.result?.contract_id ||
                        (data.result?.events && data.result.events[0]?.created?.contractId) ||
                        (data.result?.events && data.result.events[0]?.created?.contract_id)
      
      // If we got updateId and completionOffset, the contract was created but we need to query for it
      // This happens with some Canton endpoints that return async submission results
      if (!contractId && data.updateId) {
        // The contract was created successfully, but we need to extract the contract ID
        // Try to get it from the updateId or query for it
        // For now, we'll use the updateId as a reference and note that the contract was created
        console.log('Contract created with updateId:', data.updateId)
        // Store updateId temporarily - in production, you'd query for the contract using this
        contractId = `updateId:${data.updateId}`
        // Note: In a real scenario, you'd query the ledger using the updateId to get the actual contract ID
        // For now, we'll accept this as success since the contract was created
      }
      
      if (contractId && contractId !== 'N/A') {
        localStorage.setItem('tokenBalanceContractId', contractId)
        // If it's an updateId format, also store the raw updateId
        if (contractId.startsWith('updateId:')) {
          localStorage.setItem('tokenBalanceUpdateId', data.updateId)
        }
        return contractId
      }
      
      // Log the full response for debugging
      console.error('TokenBalance response structure:', JSON.stringify(data, null, 2))
      throw new Error('TokenBalance created but no contract ID returned. Response: ' + JSON.stringify(data).substring(0, 200))
    } catch (err) {
      setError({
        contractType: 'TokenBalance (auto)',
        message: `Failed to auto-create TokenBalance: ${err.message}`,
        details: err.toString()
      })
      throw err
    } finally {
      setLoading(null)
    }
  }

  // Token Module Contracts
  const createTokenBalance = () => {
    createContract(
      'TokenBalance',
      getTemplateId('Token', 'TokenBalance'),
      {
        owner: PARTY_ID,
        token: {
          id: { unpack: 'USDC' }, // TokenId newtype - DAML expects {"unpack": "value"} format
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          description: 'Test USDC token for prediction markets'
        },
        amount: 1000000.0 // Decimal type - use number, not string
      }
    )
  }

  // Prediction Markets Contracts
  const createMarketConfig = async () => {
    setLoading('MarketConfig')
    setResult(null)
    setError(null)
    
    // Automatically create TokenBalance first if needed
    try {
      let tokenBalanceCid = await ensureTokenBalance()
      
      // If tokenBalanceCid is in updateId format, the contract was created but we need the actual ID
      // For now, we'll use it as-is since the contract exists on the ledger
      if (tokenBalanceCid && tokenBalanceCid.startsWith('updateId:')) {
        console.log('Using TokenBalance with updateId format:', tokenBalanceCid)
        // Note: In production, you'd query the ledger using the updateId to get the actual contract ID
      }
      
      await createContract(
        'MarketConfig',
        getTemplateId('PredictionMarkets', 'MarketConfig'),
        {
          admin: PARTY_ID,
          marketCreationDeposit: '100.0',
          marketCreationFee: '0.0',
          positionChangeFee: '0.0',
          partialCloseFee: '0.0',
          settlementFee: '0.0',
          oracleParty: PARTY_ID,
          stablecoinCid: tokenBalanceCid // Use the auto-created TokenBalance contract ID (or updateId reference)
        }
      )
    } catch (err) {
      // Error already set by ensureTokenBalance or createContract
      console.error('Failed to create MarketConfig:', err)
      if (!error) {
        setError({
          contractType: 'MarketConfig',
          message: err.message || 'Failed to create MarketConfig',
          details: err.toString()
        })
      }
    } finally {
      setLoading(null)
    }
  }

  const createMarketCreationRequest = () => {
    createContract(
      'MarketCreationRequest',
      getTemplateId('PredictionMarkets', 'MarketCreationRequest'),
      {
        creator: PARTY_ID,
        admin: PARTY_ID,
        marketId: `market-${Date.now()}`,
        title: 'Test Market: Will Bitcoin reach $100k?',
        description: 'A test market to verify contract creation',
        marketType: 'Binary', // MarketType is an enum - use string directly
        outcomes: [],
        settlementTrigger: {
          tag: 'TimeBased',
          value: new Date(Date.now() + 86400000).toISOString()
        },
        resolutionCriteria: 'Based on CoinGecko price at settlement time',
        depositAmount: '100.0',
        depositCid: null,
        configCid: null,
        creatorBalance: null,
        adminBalance: null
      }
    )
  }

  const createOracleDataFeed = () => {
    createContract(
      'OracleDataFeed',
      getTemplateId('PredictionMarkets', 'OracleDataFeed'),
      {
        oracleParty: PARTY_ID,
        marketId: `market-${Date.now()}`,
        dataSource: 'RedStone',
        oracleData: JSON.stringify({ price: 50000, timestamp: new Date().toISOString() }),
        timestamp: new Date().toISOString(),
        signature: null
      }
    )
  }

  // AMM Contracts
  const createAllocationRequirement = () => {
    createContract(
      'AllocationRequirement',
      getTemplateId('AMM', 'AllocationRequirement'),
      {
        settlementRequestId: `settlement-${Date.now()}`,
        party: PARTY_ID,
        instrumentId: { 
          id: { unpack: 'USDC' }  // Instrument is { id: InstrumentId }, InstrumentId is newtype
        },
        quantity: '1000.0',
        status: 'Pending', // AllocationStatus enum - use string directly (not { tag: 'Pending' })
        deadline: new Date(Date.now() + 86400000).toISOString(),
        poolId: `pool-${Date.now()}`
      }
    )
  }

  const createSettlementRequest = () => {
    createContract(
      'SettlementRequest',
      getTemplateId('AMM', 'SettlementRequest'),
      {
        settlementRequestId: `settlement-${Date.now()}`,
        poolId: `pool-${Date.now()}`,
        poolParty: PARTY_ID,
        requiredAllocations: [], // Map (Party, Text) (ContractId AllocationRequirement) - DAML Maps are arrays of [key, value] pairs, empty map is []
        actualAllocations: [], // Map (Party, Text) (ContractId Allocation) - DAML Maps are arrays, empty map is []
        status: 'WaitingForAllocations', // SettlementStatus enum - use string directly
        deadline: new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date().toISOString()
      }
    )
  }

  const createLiquidityPool = () => {
    // Note: LiquidityPool requires a Market contract (marketCid field)
    // Market contracts are created by approving a MarketCreationRequest
    // For testing, we'll attempt to create the pool but it will fail without a valid Market
    // In production, you would create a MarketCreationRequest, approve it to get a Market, then create the pool
    
    setError({
      contractType: 'LiquidityPool',
      message: 'LiquidityPool requires a Market contract',
      details: 'To create a LiquidityPool, you must first:\n1. Create a MarketCreationRequest\n2. Approve it to create a Market contract\n3. Use the Market contract ID as marketCid when creating the LiquidityPool\n\nThis contract cannot be created standalone for testing.'
    })
    setLoading(null)
    
    // Uncomment below to attempt creation (will fail without valid marketCid):
    /*
    createContract(
      'LiquidityPool',
      getTemplateId('AMM', 'LiquidityPool'),
      {
        poolId: `pool-${Date.now()}`,
        marketId: `test-market-${Date.now()}`,
        poolOperator: PARTY_ID, // Note: field is poolOperator, not poolParty
        marketCid: 'REQUIRED_MARKET_CONTRACT_ID', // Must be a valid ContractId Market
        yesReserve: '10000.0',
        noReserve: '10000.0',
        outcomeReserves: [], // Map Text Decimal - DAML Maps are arrays of [key, value] pairs, empty map is []
        totalLPShares: '10000.0',
        feeRate: '0.003', // 0.3%
        minLiquidity: '100.0',
        createdAt: new Date().toISOString()
      }
    )
    */
  }

  const createPoolFactory = () => {
    createContract(
      'PoolFactory',
      getTemplateId('AMM', 'PoolFactory'),
      {
        factoryOperator: PARTY_ID, // Note: field is factoryOperator, not factoryParty
        defaultFeeRate: '0.003',
        defaultMinLiquidity: '100.0' // Required field that was missing
      }
    )
  }

  // Diagnostic function to check party status
  const checkPartyStatus = async () => {
    setDiagnosticsLoading(true)
    setDiagnostics(null)
    setError(null)
    
    try {
      const token = getToken()
      if (!token) {
        throw new Error('Please enter your authentication token above')
      }

      const response = await fetch('/api/party-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ party: PARTY_ID })
      })

      const data = await response.json()
      setDiagnostics(data)
      
      if (!response.ok) {
        setError({
          contractType: 'Diagnostics',
          message: 'Failed to check party status',
          details: JSON.stringify(data, null, 2)
        })
      }
    } catch (err) {
      setError({
        contractType: 'Diagnostics',
        message: 'Error checking party status',
        details: err.message
      })
    } finally {
      setDiagnosticsLoading(false)
    }
  }

  const contracts = [
    {
      category: 'Token Module',
      contracts: [
        { name: 'TokenBalance', description: 'Token balance management', action: createTokenBalance }
      ]
    },
    {
      category: 'Prediction Markets',
      contracts: [
        { name: 'MarketConfig', description: 'Global market configuration', action: createMarketConfig },
        { name: 'MarketCreationRequest', description: 'Market creation request (pending approval)', action: createMarketCreationRequest },
        { name: 'OracleDataFeed', description: 'Oracle data feed for market resolution', action: createOracleDataFeed }
      ]
    },
    {
      category: 'AMM (Automated Market Maker)',
      contracts: [
        { name: 'AllocationRequirement', description: 'DVP allocation requirement', action: createAllocationRequirement },
        { name: 'SettlementRequest', description: 'Settlement request tracking', action: createSettlementRequest },
        { name: 'LiquidityPool', description: 'AMM liquidity pool', action: createLiquidityPool },
        { name: 'PoolFactory', description: 'Pool factory for creating pools', action: createPoolFactory }
      ]
    }
  ]

  return (
    <div className="contract-tester">
      <div className="contract-tester-header">
        <h1>Contract Tester</h1>
        <p>Test all deployed contracts on Canton devnet</p>
        <p className="package-info">
          <strong>Package ID:</strong> <code>{PACKAGE_ID}</code>
        </p>
      </div>

      <div className="token-section">
        <h2>Authentication Token</h2>
        
        {!showTokenForm ? (
          <>
            <div className="token-input-group">
              <input
                type="password"
                placeholder="Enter your JWT token (or click 'Get Token' below)"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="token-input"
              />
              <button
                onClick={() => {
                  const stored = localStorage.getItem('canton_token')
                  if (stored) setTokenInput(stored)
                }}
                className="btn-secondary"
                disabled={!localStorage.getItem('canton_token')}
              >
                Load Saved
              </button>
            </div>
            <div className="token-actions">
              <button
                onClick={() => setShowTokenForm(true)}
                className="btn-get-token"
              >
                🔑 Get Token from Keycloak
              </button>
            </div>
            <p className="token-hint">
              Token is saved in browser localStorage. You can get a token by clicking "Get Token" above or using: <code>scripts/get-keycloak-token.ps1</code>
            </p>
          </>
        ) : (
          <div className="token-form">
            <h3>Get Token from Keycloak</h3>
            <div className="form-group">
              <label>Username (Email)</label>
              <input
                type="text"
                placeholder="your-email@example.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                disabled={tokenLoading}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                disabled={tokenLoading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !tokenLoading) {
                    getTokenFromKeycloak()
                  }
                }}
              />
            </div>
            <div className="form-actions">
              <button
                onClick={getTokenFromKeycloak}
                disabled={tokenLoading || !username || !password}
                className="btn-primary"
              >
                {tokenLoading ? '⏳ Getting Token...' : 'Get Token'}
              </button>
              <button
                onClick={() => {
                  setShowTokenForm(false)
                  setUsername('')
                  setPassword('')
                }}
                className="btn-secondary"
                disabled={tokenLoading}
              >
                Cancel
              </button>
            </div>
            <p className="token-hint">
              Your password is never stored. It's only used to authenticate with Keycloak.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <h3>❌ Error: {error.contractType || 'Unknown'}</h3>
          <p>{error.message}</p>
          <details>
            <summary>Error Details</summary>
            <pre>{error.details}</pre>
          </details>
        </div>
      )}

      {result && (
        <div className="alert alert-success">
          <h3>✅ Success: {result.contractType}</h3>
          <p>{result.message}</p>
          <div className="contract-info" style={{ marginTop: '1rem' }}>
            <p><strong>Template ID:</strong> <code>{result.templateId}</code></p>
            {result.contractId && result.contractId !== 'N/A' ? (
              <div style={{ marginTop: '1rem' }}>
                <p><strong>Contract ID:</strong></p>
                <code style={{ 
                  display: 'block', 
                  padding: '0.5rem', 
                  background: '#f5f5f5', 
                  borderRadius: '4px',
                  wordBreak: 'break-all',
                  marginTop: '0.5rem',
                  fontSize: '0.9rem'
                }}>
                  {result.contractId}
                </code>
                <div style={{ marginTop: '1rem' }}>
                  <a 
                    href={`https://devnet.ccexplorer.io/?q=${encodeURIComponent(result.contractId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      background: '#646cff',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      marginTop: '0.5rem',
                      fontWeight: '500'
                    }}
                  >
                    🔗 View Contract in Block Explorer →
                  </a>
                </div>
                <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                  <strong>Tip:</strong> Click the link above to view your contract details on the block explorer. You can also copy the Contract ID and search for it manually.
                </p>
              </div>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>
                  <em>Contract ID not available in response. Check the full response below for details.</em>
                </p>
              </div>
            )}
          </div>
          <details style={{ marginTop: '1rem' }}>
            <summary>Full Response</summary>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '1rem', 
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '400px',
              fontSize: '0.85rem'
            }}>
              {JSON.stringify(result.details, null, 2)}
            </pre>
          </details>
        </div>
      )}

      <div className="contracts-grid">
        {contracts.map((category, catIdx) => (
          <div key={catIdx} className="contract-category">
            <h2>{category.category}</h2>
            <div className="contracts-list">
              {category.contracts.map((contract, idx) => (
                <div key={idx} className="contract-card">
                  <h3>{contract.name}</h3>
                  <p>{contract.description}</p>
                  <button
                    onClick={contract.action}
                    disabled={loading === contract.name}
                    className="btn-primary"
                  >
                    {loading === contract.name ? '⏳ Creating...' : `Create ${contract.name}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="info-section">
        <h2>🔍 Party Diagnostics</h2>
        <p>Check if your party can read/write contracts and diagnose synchronizer issues:</p>
        <button
          onClick={checkPartyStatus}
          disabled={diagnosticsLoading}
          className="btn-primary"
          style={{ marginBottom: '1rem' }}
        >
          {diagnosticsLoading ? '⏳ Checking...' : '🔍 Check Party Status'}
        </button>
        
        {diagnostics && (
          <div className="alert" style={{ 
            backgroundColor: diagnostics.summary?.canWrite ? '#d4edda' : '#f8d7da',
            border: `1px solid ${diagnostics.summary?.canWrite ? '#c3e6cb' : '#f5c6cb'}`,
            padding: '1rem',
            borderRadius: '4px',
            marginTop: '1rem'
          }}>
            <h3>{diagnostics.summary?.canWrite ? '✅ Party Can Submit Commands' : '❌ Party Cannot Submit Commands'}</h3>
            <p><strong>Read Access:</strong> {diagnostics.summary?.canRead ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Write Access:</strong> {diagnostics.summary?.canWrite ? '✅ Yes' : '❌ No'}</p>
            {diagnostics.summary?.synchronizerIssue && (
              <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                <strong>⚠️ Synchronizer Issue Detected:</strong>
                <p>{diagnostics.summary.recommendation}</p>
              </div>
            )}
            <details style={{ marginTop: '1rem' }}>
              <summary>Full Diagnostics</summary>
              <pre style={{ marginTop: '0.5rem', fontSize: '0.875rem', overflow: 'auto' }}>
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>

      <div className="info-section">
        <h2>Testing Notes</h2>
        <ul>
          <li>All contracts use template IDs with explicit package ID format: <code>{PACKAGE_ID}:Module:Template</code></li>
          <li>This bypasses package vetting requirements (package name lookup not needed)</li>
          <li>Some contracts require dependencies (e.g., MarketConfig needs TokenBalance contract ID)</li>
          <li>Verify contracts in block explorer: <a href="https://devnet.ccexplorer.io" target="_blank" rel="noopener noreferrer">devnet.ccexplorer.io</a></li>
          <li>Package Name: <code>{PACKAGE_NAME}</code></li>
          <li>Package ID: <code>{PACKAGE_ID}</code></li>
          <li>Party ID: <code>{PARTY_ID.substring(0, 50)}...</code></li>
        </ul>
      </div>
    </div>
  )
}
