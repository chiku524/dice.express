/**
 * Minimal Contract Tester Component
 * 
 * Simple 2-button interface to test Milestone 1 contracts:
 * 1. Create TokenBalance Contract
 * 2. Create MarketConfig Contract
 * 
 * No CSS styling - minimal implementation as requested
 */

import { useState } from 'react'

const JSON_API_URL = 'https://participant.dev.canton.wolfedgelabs.com/json-api'
const PARTY_ID = 'ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292'
const PACKAGE_ID = 'b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0'

export default function ContractTester() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Load token from token.txt or token.json
  const getToken = async () => {
    try {
      // Try to load from token.txt first
      const tokenTxtResponse = await fetch('/token.txt')
      if (tokenTxtResponse.ok) {
        const token = await tokenTxtResponse.text()
        return token.trim()
      }
      
      // Try token.json
      const tokenJsonResponse = await fetch('/token.json')
      if (tokenJsonResponse.ok) {
        const tokenData = await tokenJsonResponse.json()
        return tokenData.access_token || tokenData.token
      }
      
      throw new Error('Token not found. Please ensure token.txt or token.json exists in the public folder.')
    } catch (err) {
      throw new Error(`Failed to load token: ${err.message}`)
    }
  }

  const createTokenBalance = async () => {
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const token = await getToken()
      
      // Note: Template ID format may need adjustment based on client response
      const templateId = `Token:TokenBalance:${PACKAGE_ID}`
      
      const response = await fetch(`${JSON_API_URL}/v2/commands/submit-and-wait`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          actAs: [PARTY_ID],
          commandId: `test-tokenbalance-${Date.now()}`,
          applicationId: 'prediction-markets',
          commands: [{
            CreateCommand: {
              templateId: templateId,
              createArguments: {
                owner: PARTY_ID,
                token: {
                  id: {
                    symbol: 'USDC',
                    issuer: PARTY_ID
                  },
                  symbol: 'USDC',
                  name: 'USD Coin',
                  decimals: 6,
                  description: 'Test USDC token'
                },
                amount: '1000000.0' // 1M USDC
              }
            }
          }]
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`)
      }

      setResult({
        success: true,
        message: 'TokenBalance contract created successfully!',
        contractId: data.result?.created?.[0]?.contractId || 'N/A',
        details: data
      })
    } catch (err) {
      setError({
        message: err.message,
        details: err.toString()
      })
    } finally {
      setLoading(false)
    }
  }

  const createMarketConfig = async () => {
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const token = await getToken()
      
      // Note: Template ID format may need adjustment based on client response
      const templateId = `PredictionMarkets:MarketConfig:${PACKAGE_ID}`
      
      // Note: This requires a TokenBalance contract ID - would need to be provided
      // For testing, we'll use a placeholder
      const stablecoinCid = 'PLACEHOLDER_CONTRACT_ID' // Would need actual TokenBalance contract ID
      
      const response = await fetch(`${JSON_API_URL}/v2/commands/submit-and-wait`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          actAs: [PARTY_ID],
          commandId: `test-marketconfig-${Date.now()}`,
          applicationId: 'prediction-markets',
          commands: [{
            CreateCommand: {
              templateId: templateId,
              createArguments: {
                admin: PARTY_ID,
                marketCreationDeposit: '100.0',
                marketCreationFee: '0.0',
                positionChangeFee: '0.0',
                partialCloseFee: '0.0',
                settlementFee: '0.0',
                oracleParty: PARTY_ID,
                stablecoinCid: stablecoinCid
              }
            }
          }]
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`)
      }

      setResult({
        success: true,
        message: 'MarketConfig contract created successfully!',
        contractId: data.result?.created?.[0]?.contractId || 'N/A',
        details: data
      })
    } catch (err) {
      setError({
        message: err.message,
        details: err.toString()
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>Milestone 1 Contract Tester</h2>
      <p>Test core contracts deployment (no CSS styling - minimal as requested)</p>
      
      <div>
        <button 
          onClick={createTokenBalance} 
          disabled={loading}
        >
          {loading ? 'Creating...' : '1. Create TokenBalance Contract'}
        </button>
        
        <button 
          onClick={createMarketConfig} 
          disabled={loading}
        >
          {loading ? 'Creating...' : '2. Create MarketConfig Contract'}
        </button>
      </div>

      {result && (
        <div>
          <h3>Success</h3>
          <p>{result.message}</p>
          <p>Contract ID: {result.contractId}</p>
          <details>
            <summary>Full Response</summary>
            <pre>{JSON.stringify(result.details, null, 2)}</pre>
          </details>
        </div>
      )}

      {error && (
        <div>
          <h3>Error</h3>
          <p>{error.message}</p>
          <details>
            <summary>Error Details</summary>
            <pre>{error.details}</pre>
          </details>
        </div>
      )}

      <div>
        <h3>Testing Notes</h3>
        <ul>
          <li>Token must be available in token.txt or token.json</li>
          <li>Template ID format may need adjustment (awaiting client confirmation)</li>
          <li>MarketConfig requires a TokenBalance contract ID</li>
          <li>Verify contracts in block explorer: https://devnet.ccexplorer.io</li>
        </ul>
      </div>
    </div>
  )
}

