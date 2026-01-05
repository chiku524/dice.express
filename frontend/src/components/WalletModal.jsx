import { useState, useEffect } from 'react'
import { useWallet } from '../contexts/WalletContext'
import './WalletModal.css'

const DEFAULT_PARTY_ID = 'ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292'

export default function WalletModal({ isOpen, onClose }) {
  const { wallet, connectWallet, disconnectWallet } = useWallet()
  const [tokenInput, setTokenInput] = useState('')
  const [showTokenForm, setShowTokenForm] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenError, setTokenError] = useState(null)
  const [tokenSuccess, setTokenSuccess] = useState(false)
  const [partyIdInput, setPartyIdInput] = useState('')
  const [walletError, setWalletError] = useState(null)
  const [walletLoading, setWalletLoading] = useState(false)

  // Load token from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('canton_token')
    if (stored) {
      setTokenInput(stored)
    }
  }, [])

  // Get token from Keycloak
  const getTokenFromKeycloak = async () => {
    if (!username || !password) {
      setTokenError('Please enter both username and password')
      return
    }

    setTokenLoading(true)
    setTokenError(null)
    setTokenSuccess(false)

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

      // Store token with expiration info
      setTokenInput(data.access_token)
      const { storeToken } = await import('../utils/tokenManager')
      storeToken(data)
      
      // Clear password for security
      setPassword('')
      setShowTokenForm(false)
      setTokenSuccess(true)
      setTimeout(() => setTokenSuccess(false), 2000)
      // Dispatch custom event to notify ledger client of token update
      window.dispatchEvent(new CustomEvent('canton_token_updated', { 
        detail: { token: data.access_token } 
      }))
    } catch (err) {
      setTokenError(err.message)
    } finally {
      setTokenLoading(false)
    }
  }

  const saveToken = async () => {
    if (tokenInput.trim()) {
      // Store token (without expiration info if manually entered)
      localStorage.setItem('canton_token', tokenInput.trim())
      setTokenSuccess(true)
      setTimeout(() => setTokenSuccess(false), 2000)
      // Dispatch custom event to notify ledger client of token update
      window.dispatchEvent(new CustomEvent('canton_token_updated', { 
        detail: { token: tokenInput.trim() } 
      }))
    }
  }

  const clearToken = async () => {
    const { clearToken } = await import('../utils/tokenManager')
    clearToken()
    setTokenInput('')
    setTokenSuccess(true)
    setTimeout(() => setTokenSuccess(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="wallet-modal-overlay" onClick={onClose}>
      <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-modal-header">
          <h2>Wallet & Authentication</h2>
          <button className="wallet-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="wallet-modal-content">
          {/* Wallet Connection Section */}
          <section className="wallet-section">
            <h3>Wallet Connection</h3>
            {wallet ? (
              <div className="wallet-connected">
                <div className="wallet-info">
                  <p><strong>Party ID:</strong></p>
                  <code className="party-id">{wallet.party}</code>
                  <p className="wallet-hint">Connected at: {new Date(wallet.connectedAt).toLocaleString()}</p>
                </div>
                <button className="btn-secondary" onClick={disconnectWallet}>
                  Disconnect Wallet
                </button>
              </div>
            ) : (
              <div className="wallet-disconnected">
                <div className="wallet-format-info-compact">
                  <strong>Format:</strong> <code>{'{user-id}'}::{'{party-id}'}</code>
                </div>
                
                {walletError && (
                  <div className="alert-error">{walletError}</div>
                )}
                
                <div className="wallet-input-group">
                  <input
                    type="text"
                    placeholder="Enter Party ID (required)"
                    value={partyIdInput}
                    onChange={(e) => setPartyIdInput(e.target.value)}
                    className="party-id-input"
                    required
                  />
                  <button
                    className="btn-primary"
                    onClick={async () => {
                      setWalletError(null)
                      if (!partyIdInput.trim()) {
                        setWalletError('Party ID is required')
                        return
                      }
                      setWalletLoading(true)
                      try {
                        await connectWallet(partyIdInput.trim())
                        setPartyIdInput('')
                      } catch (err) {
                        setWalletError(err.message)
                      } finally {
                        setWalletLoading(false)
                      }
                    }}
                    disabled={walletLoading || !partyIdInput.trim()}
                  >
                    {walletLoading ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                </div>
                
              </div>
            )}
          </section>

          {/* Token Management Section */}
          <section className="token-section">
            <h3>Authentication Token</h3>
            
            {tokenSuccess && (
              <div className="alert-success">Token saved successfully!</div>
            )}
            
            {tokenError && (
              <div className="alert-error">{tokenError}</div>
            )}

            {!showTokenForm ? (
              <>
                <div className="token-input-group">
                  <input
                    type="password"
                    placeholder="Enter your JWT token"
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
                    onClick={saveToken}
                    className="btn-primary"
                    disabled={!tokenInput.trim()}
                  >
                    Save Token
                  </button>
                  <button
                    onClick={clearToken}
                    className="btn-secondary"
                    disabled={!localStorage.getItem('canton_token')}
                  >
                    Clear Token
                  </button>
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
                {localStorage.getItem('canton_token') && (
                  <p className="token-status">
                    ✓ Token is saved and will be used for API calls
                  </p>
                )}
              </>
            ) : (
              <div className="token-form">
                <h4>Get Token from Keycloak</h4>
                <div className="form-group">
                  <label>Username:</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                  />
                </div>
                <div className="form-group">
                  <label>Password:</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
                <div className="form-actions">
                  <button
                    onClick={getTokenFromKeycloak}
                    className="btn-primary"
                    disabled={tokenLoading || !username || !password}
                  >
                    {tokenLoading ? 'Getting Token...' : 'Get Token'}
                  </button>
                  <button
                    onClick={() => {
                      setShowTokenForm(false)
                      setTokenError(null)
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Status Section */}
          <section className="status-section">
            <h3>Connection Status</h3>
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">Wallet:</span>
                <span className={wallet ? 'status-connected' : 'status-disconnected'}>
                  {wallet ? '✓ Connected' : '✗ Not Connected'}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Token:</span>
                <span className={localStorage.getItem('canton_token') ? 'status-connected' : 'status-disconnected'}>
                  {localStorage.getItem('canton_token') ? '✓ Saved' : '✗ Not Saved'}
                </span>
              </div>
            </div>
            {wallet && localStorage.getItem('canton_token') && (
              <p className="status-ready">
                ✓ Ready to create markets and trade!
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

