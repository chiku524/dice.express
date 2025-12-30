import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLedger } from '../hooks/useLedger'
import { useWallet } from '../contexts/WalletContext'

const PACKAGE_ID = 'b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0'
const getTemplateId = (module, template) => `${PACKAGE_ID}:${module}:${template}`

export default function CreateMarket() {
  const navigate = useNavigate()
  const { ledger } = useLedger()
  const { wallet } = useWallet()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    marketType: 'Binary',
    outcomes: '',
    settlementType: 'TimeBased',
    settlementTime: '',
    resolutionCriteria: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!wallet || !ledger) {
      setError('Wallet not connected')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create market creation request
      // This requires a 100 CC deposit
      const outcomes = formData.marketType === 'MultiOutcome' 
        ? formData.outcomes.split(',').map(o => o.trim()).filter(o => o)
        : []

      // SettlementTrigger is a variant type - needs { tag, value } format
      // For TimeBased, value should be ISO timestamp
      const settlementTrigger = formData.settlementType === 'TimeBased'
        ? { tag: 'TimeBased', value: new Date(formData.settlementTime).toISOString() }
        : formData.settlementType === 'EventBased'
        ? { tag: 'EventBased', value: formData.resolutionCriteria }
        : { tag: 'Manual' }

      await ledger.create(
        getTemplateId('PredictionMarkets', 'MarketCreationRequest'),
        {
          creator: wallet.party,
          admin: wallet.party, // Use same party as admin for testing (would be fetched from config in production)
          marketId: `market-${Date.now()}`,
          title: formData.title,
          description: formData.description,
          marketType: formData.marketType === 'Binary' ? 'Binary' : 'MultiOutcome', // MarketType enum - use plain string, not { tag: '...' }
          outcomes: outcomes,
          settlementTrigger: settlementTrigger, // SettlementTrigger is a variant, so { tag: '...', value: '...' } is correct
          resolutionCriteria: formData.resolutionCriteria,
          depositAmount: '100.0', // Decimal type - use string
          depositCid: null, // Would need to create holding first
          configCid: null, // Would need to fetch from config
          creatorBalance: null, // Fixed: was creatorAccount
          adminBalance: null, // Fixed: was adminAccount
        },
        wallet.party
      )

      setSuccess(true)
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (err) {
      let errorMessage = err.message
      
      // Provide helpful error messages for common issues
      if (err.message?.includes('401') || err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please check your token in the Wallet modal. The token may have expired - try getting a new token from Keycloak.'
      } else if (err.message?.includes('token') || err.message?.includes('unauthorized')) {
        errorMessage = 'Authentication required. Please ensure you have a valid token saved in the Wallet modal.'
      }
      
      setError(errorMessage)
      console.error('Create market error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  return (
    <div>
      <h1>Create New Market</h1>
      <p style={{ marginBottom: '2rem', color: 'rgba(255, 255, 255, 0.6)' }}>
        Create a new prediction market. A 100 CC deposit is required and will be returned after admin approval.
      </p>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">Market creation request submitted! Redirecting...</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>Market Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="e.g., Will Bitcoin reach $100k by 2025?"
          />
        </div>

        <div className="form-group">
          <label>Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            placeholder="Describe the market and resolution criteria..."
          />
        </div>

        <div className="form-group">
          <label>Market Type *</label>
          <select
            name="marketType"
            value={formData.marketType}
            onChange={handleChange}
            required
          >
            <option value="Binary">Binary (Yes/No)</option>
            <option value="MultiOutcome">Multi-Outcome</option>
          </select>
        </div>

        {formData.marketType === 'MultiOutcome' && (
          <div className="form-group">
            <label>Outcomes (comma-separated) *</label>
            <input
              type="text"
              name="outcomes"
              value={formData.outcomes}
              onChange={handleChange}
              required
              placeholder="e.g., Option A, Option B, Option C"
            />
          </div>
        )}

        <div className="form-group">
          <label>Settlement Type *</label>
          <select
            name="settlementType"
            value={formData.settlementType}
            onChange={handleChange}
            required
          >
            <option value="TimeBased">Time-Based</option>
            <option value="EventBased">Event-Based</option>
            <option value="Manual">Manual</option>
          </select>
        </div>

        {formData.settlementType === 'TimeBased' && (
          <div className="form-group">
            <label>Settlement Time *</label>
            <input
              type="datetime-local"
              name="settlementTime"
              value={formData.settlementTime}
              onChange={handleChange}
              required
            />
          </div>
        )}

        <div className="form-group">
          <label>Resolution Criteria *</label>
          <textarea
            name="resolutionCriteria"
            value={formData.resolutionCriteria}
            onChange={handleChange}
            required
            placeholder="Describe how this market will be resolved..."
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Creating Market...' : 'Create Market (100 CC deposit required)'}
        </button>
      </form>
    </div>
  )
}

