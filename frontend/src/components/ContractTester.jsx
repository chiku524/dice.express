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

      const contractId = data.result?.created?.[0]?.contractId || data.contractId || data.created?.[0]?.contractId || 'N/A'
      
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

      const contractId = data.result?.created?.[0]?.contractId || data.contractId || data.created?.[0]?.contractId
      if (contractId) {
        localStorage.setItem('tokenBalanceContractId', contractId)
        return contractId
      }
      throw new Error('TokenBalance created but no contract ID returned')
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
      const tokenBalanceCid = await ensureTokenBalance()
      
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
          stablecoinCid: tokenBalanceCid // Use the auto-created TokenBalance contract ID
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
        instrumentId: { unpack: 'USDC' }, // InstrumentId newtype - DAML expects {"unpack": "value"} format
        quantity: '1000.0',
        status: { tag: 'Pending' },
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
        requiredAllocations: [],
        actualAllocations: [],
        status: { tag: 'WaitingForAllocations' },
        deadline: new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date().toISOString()
      }
    )
  }

  const createLiquidityPool = () => {
    createContract(
      'LiquidityPool',
      getTemplateId('AMM', 'LiquidityPool'),
      {
        poolId: `pool-${Date.now()}`,
        poolParty: PARTY_ID,
        tokenA: {
          id: { unpack: 'USDC' }, // TokenId newtype - DAML expects {"unpack": "value"} format
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          description: 'USDC token'
        },
        tokenB: {
          id: { unpack: 'YES' }, // TokenId newtype - DAML expects {"unpack": "value"} format
          symbol: 'YES',
          name: 'Yes Shares',
          decimals: 6,
          description: 'Yes shares token'
        },
        reserveA: '10000.0',
        reserveB: '10000.0',
        totalSupply: '10000.0',
        feeRate: '0.003', // 0.3%
        createdAt: new Date().toISOString()
      }
    )
  }

  const createPoolFactory = () => {
    createContract(
      'PoolFactory',
      getTemplateId('AMM', 'PoolFactory'),
      {
        factoryParty: PARTY_ID,
        defaultFeeRate: '0.003',
        pools: []
      }
    )
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
          <div className="contract-info">
            <p><strong>Contract ID:</strong> <code>{result.contractId}</code></p>
            <p><strong>Template ID:</strong> <code>{result.templateId}</code></p>
          </div>
          <details>
            <summary>Full Response</summary>
            <pre>{JSON.stringify(result.details, null, 2)}</pre>
          </details>
          <a 
            href={`https://devnet.ccexplorer.io/contracts/${result.contractId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-link"
          >
            View in Block Explorer →
          </a>
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
