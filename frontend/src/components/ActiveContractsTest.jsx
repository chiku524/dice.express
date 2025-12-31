/**
 * Active Contracts Test Component
 * 
 * Test the /v2/state/active-contracts endpoint
 */

import { useState } from 'react'
import { useWallet } from '../contexts/WalletContext'
import './ActiveContractsTest.css'

const PACKAGE_ID = 'b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0'
const getTemplateId = (module, template) => `${PACKAGE_ID}:${module}:${template}`

export default function ActiveContractsTest() {
  const { wallet } = useWallet()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [templateId, setTemplateId] = useState(getTemplateId('PredictionMarkets', 'Market'))
  const [partyFilter, setPartyFilter] = useState('')

  const testActiveContracts = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const token = localStorage.getItem('canton_token')
      if (!token) {
        throw new Error('No authentication token found. Please set a token in the Wallet modal.')
      }

      // Use the party from wallet or the party filter input
      const filterParty = partyFilter.trim() || wallet?.party || ''

      // Build request body
      const requestBody = {
        filter: {
          filtersByParty: {
            [filterParty]: {
              inclusive: {
                templateIds: [templateId]
              }
            }
          }
        },
        verbose: false,
        activeAtOffset: null,
        eventFormat: null
      }

      console.log('Testing /v2/state/active-contracts endpoint')
      console.log('Request body:', JSON.stringify(requestBody, null, 2))

      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          templateIds: [templateId],
          party: filterParty,
          query: {}
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`)
      }

      setResult({
        endpoint: '/v2/state/active-contracts',
        request: requestBody,
        response: data,
        contracts: data.result || []
      })

      console.log('✅ Success! Response:', data)
    } catch (err) {
      setError(err.message)
      console.error('❌ Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="active-contracts-test">
      <h1>Test Active Contracts Endpoint</h1>
      <p style={{ marginBottom: '2rem', color: 'rgba(255, 255, 255, 0.6)' }}>
        Test the <code>/v2/state/active-contracts</code> endpoint to query contracts by template ID.
      </p>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>Configuration</h2>
        
        <div className="form-group">
          <label>Template ID</label>
          <input
            type="text"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            placeholder="packageId:module:template"
            style={{ width: '100%', padding: '0.75rem' }}
          />
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              className="btn-secondary"
              onClick={() => setTemplateId(getTemplateId('PredictionMarkets', 'Market'))}
            >
              Market
            </button>
            <button 
              className="btn-secondary"
              onClick={() => setTemplateId(getTemplateId('PredictionMarkets', 'MarketCreationRequest'))}
            >
              MarketCreationRequest
            </button>
            <button 
              className="btn-secondary"
              onClick={() => setTemplateId(getTemplateId('PredictionMarkets', 'Position'))}
            >
              Position
            </button>
            <button 
              className="btn-secondary"
              onClick={() => setTemplateId(getTemplateId('PredictionMarkets', 'MarketConfig'))}
            >
              MarketConfig
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Party Filter (optional - leave empty to use wallet party)</label>
          <input
            type="text"
            value={partyFilter}
            onChange={(e) => setPartyFilter(e.target.value)}
            placeholder={wallet?.party || 'Enter party ID'}
            style={{ width: '100%', padding: '0.75rem' }}
          />
          {wallet?.party && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              Current wallet party: {wallet.party}
            </p>
          )}
        </div>

        <button
          className="btn-primary"
          onClick={testActiveContracts}
          disabled={loading || !templateId}
          style={{ width: '100%', marginTop: '1rem' }}
        >
          {loading ? 'Testing...' : 'Test Active Contracts Endpoint'}
        </button>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: '2rem', background: '#ff4444', color: 'white' }}>
          <h3>❌ Error</h3>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3>✅ Success!</h3>
          
          <div style={{ marginTop: '1rem' }}>
            <h4>Endpoint Used:</h4>
            <code style={{ display: 'block', padding: '0.5rem', background: '#f5f5f5', borderRadius: '4px' }}>
              {result.endpoint}
            </code>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <h4>Contracts Found: {result.contracts.length}</h4>
            {result.contracts.length === 0 ? (
              <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                No contracts found matching the template ID and party filter.
              </p>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                {result.contracts.map((contract, index) => (
                  <div 
                    key={contract.contractId || index}
                    style={{ 
                      marginBottom: '1rem', 
                      padding: '1rem', 
                      background: '#f5f5f5', 
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}
                  >
                    <h5>Contract {index + 1}</h5>
                    <p><strong>Contract ID:</strong></p>
                    <code style={{ display: 'block', wordBreak: 'break-all', marginBottom: '0.5rem' }}>
                      {contract.contractId}
                    </code>
                    <p><strong>Template ID:</strong> {contract.templateId}</p>
                    <details style={{ marginTop: '0.5rem' }}>
                      <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Contract Data</summary>
                      <pre style={{ 
                        marginTop: '0.5rem', 
                        padding: '0.5rem', 
                        background: '#fff', 
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '300px'
                      }}>
                        {JSON.stringify(contract.payload, null, 2)}
                      </pre>
                    </details>
                    {contract.contractId && (
                      <a
                        href={`https://devnet.ccexplorer.io/?q=${encodeURIComponent(contract.contractId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          marginTop: '0.5rem',
                          padding: '0.5rem 1rem',
                          background: '#646cff',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '4px'
                        }}
                      >
                        View in Block Explorer →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Full Request/Response</summary>
            <div style={{ marginTop: '0.5rem' }}>
              <h5>Request:</h5>
              <pre style={{ 
                padding: '0.5rem', 
                background: '#f5f5f5', 
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                {JSON.stringify(result.request, null, 2)}
              </pre>
              <h5 style={{ marginTop: '1rem' }}>Response:</h5>
              <pre style={{ 
                padding: '0.5rem', 
                background: '#f5f5f5', 
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '400px'
              }}>
                {JSON.stringify(result.response, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
