import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLedger } from '../hooks/useLedger'
import { useWallet } from '../contexts/WalletContext'
import { ContractStorage } from '../utils/contractStorage'

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
  const [contractId, setContractId] = useState(null)
  const [explorerUrl, setExplorerUrl] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!wallet || !ledger) {
      setError('Wallet not connected')
      return
    }

    // Validate form
    const validationSchema = {
      title: [validators.required, validators.minLength(5), validators.maxLength(200)],
      description: [validators.required, validators.minLength(20), validators.maxLength(1000)],
      outcomes: formData.marketType === 'MultiOutcome' 
        ? [validators.required, validators.outcomes]
        : [],
      settlementTime: formData.settlementType === 'TimeBased'
        ? [validators.required, validators.date]
        : [],
      resolutionCriteria: [validators.required, validators.minLength(10)]
    }
    
    const validation = validateForm(formData, validationSchema)
    if (!validation.isValid) {
      setFieldErrors(validation.errors)
      setError('Please fix the errors in the form')
      return
    }

    setLoading(true)
    setError(null)
    setFieldErrors({})

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

      const result = await ledger.create(
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

      // Extract contract ID or updateId from response
      // Canton may return either a contractId directly or an updateId that needs to be used to query for the contract
      let contractId = null
      let updateId = null
      let updateTimestamp = null
      let explorerUrl = null
      
      if (result) {
        // Try to extract contract ID first
        contractId = result.result?.created?.[0]?.contractId || 
                     result.result?.created?.[0]?.contract_id ||
                     result.contractId || 
                     result.contract_id ||
                     result.created?.[0]?.contractId ||
                     result.created?.[0]?.contract_id ||
                     (result.result?.events && result.result.events[0]?.created?.contractId) ||
                     (result.result?.events && result.result.events[0]?.created?.contract_id)
        
        // If no contract ID, check for updateId (async submission)
        if (!contractId) {
          updateId = result.updateId || result.update_id || result.result?.updateId
          // completionOffset is a number, not a timestamp - use it directly
          // The explorer URL format is: /updates/{updateId}/{completionOffset}
          updateTimestamp = result.completionOffset || result.completion_offset
          
          // If completionOffset is not available, try timestamp (but this is less common)
          if (!updateTimestamp) {
            updateTimestamp = result.timestamp || result.result?.timestamp
            // If it's a string timestamp, keep it as-is (don't convert)
            // The explorer may accept ISO timestamps in some cases
          }
        }
      }

      // Build explorer URL
      if (contractId) {
        explorerUrl = `https://devnet.ccexplorer.io/?q=${encodeURIComponent(contractId)}`
      } else if (updateId && updateTimestamp !== undefined && updateTimestamp !== null) {
        // Use the correct format: /updates/{updateId}/{completionOffset}
        // completionOffset is typically a number, not a timestamp
        // Don't encode if it's a number, encode if it's a string
        const offsetPart = typeof updateTimestamp === 'number' 
          ? updateTimestamp.toString() 
          : encodeURIComponent(updateTimestamp)
        explorerUrl = `https://devnet.ccexplorer.io/updates/${updateId}/${offsetPart}`
      }

      // Store display ID (contractId or updateId format)
      const displayId = contractId || (updateId ? `updateId:${updateId}` : null)

      setSuccess(true)
      setContractId(displayId) // Store for display
      setExplorerUrl(explorerUrl) // Store explorer URL separately
      
      // Store contract in local storage for history
      if (displayId && displayId !== 'N/A' && !displayId.startsWith('updateId:')) {
        ContractStorage.storeContract(
          displayId,
          getTemplateId('PredictionMarkets', 'MarketCreationRequest'),
          {
            title: formData.title,
            description: formData.description,
            marketType: formData.marketType,
            marketId: `market-${Date.now()}`,
            status: 'PendingApproval'
          },
          wallet.party
        )
      }
      
      // Log to console for easy access
      if (contractId) {
        console.log('✅ Market created successfully!')
        console.log('📋 Contract ID:', contractId)
        console.log('🔗 View in explorer:', explorerUrl)
      } else if (updateId) {
        console.log('✅ Market created successfully!')
        console.log('📋 Update ID:', updateId)
        console.log('📅 Timestamp:', updateTimestamp)
        console.log('🔗 View in explorer:', explorerUrl)
        console.log('ℹ️ Note: Using updateId format. The contract was created but contract ID will be available after the transaction is processed.')
      } else {
        console.log('⚠️ Market created but contract ID/updateId not found in response')
        console.log('Full response:', JSON.stringify(result, null, 2))
      }
      
      // Reset form after successful creation
      setFormData({
        title: '',
        description: '',
        marketType: 'Binary',
        outcomes: '',
        settlementType: 'TimeBased',
        settlementTime: '',
        resolutionCriteria: '',
      })
      
      // DO NOT redirect - let user see the success message and contract details
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
    
    // Real-time validation
    const validationSchema = {
      title: [validators.required, validators.minLength(5), validators.maxLength(200)],
      description: [validators.required, validators.minLength(20), validators.maxLength(1000)],
      outcomes: formData.marketType === 'MultiOutcome' 
        ? [validators.required, validators.outcomes]
        : [],
      settlementTime: formData.settlementType === 'TimeBased'
        ? [validators.required, validators.date]
        : [],
      resolutionCriteria: [validators.required, validators.minLength(10)]
    }
    
    if (validationSchema[name]) {
      const fieldError = validateForm({ [name]: value }, { [name]: validationSchema[name] })
      setFieldErrors(prev => ({
        ...prev,
        [name]: fieldError.errors[name] || null
      }))
    }
  }
  
  const handleBlur = (e) => {
    // Validate on blur for better UX
    handleChange(e)
  }

  return (
    <div>
      <h1>Create New Market</h1>
      <p style={{ marginBottom: '2rem', color: 'rgba(255, 255, 255, 0.6)' }}>
        Create a new prediction market. A 100 CC deposit is required and will be returned after admin approval.
      </p>

      {error && <div className="error">{error}</div>}
      {success && (
        <div className="success" style={{ marginBottom: '2rem' }}>
          <h3>✅ Market Creation Request Submitted Successfully!</h3>
          <p style={{ marginTop: '0.5rem' }}>
            Your market creation request has been submitted and is pending admin approval.
          </p>
          
          {contractId ? (
            <div style={{ marginTop: '1.5rem' }}>
              <p><strong>Contract ID:</strong></p>
              <code style={{ 
                display: 'block', 
                padding: '0.75rem', 
                background: '#f5f5f5', 
                borderRadius: '4px',
                wordBreak: 'break-all',
                marginTop: '0.5rem',
                fontSize: '0.9rem',
                border: '1px solid #ddd'
              }}>
                {contractId}
              </code>
              {explorerUrl && (
                <div style={{ marginTop: '1rem' }}>
                  <a 
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '0.75rem 1.5rem',
                      background: '#646cff',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      marginTop: '0.5rem',
                      fontWeight: '500',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#535bf2'}
                    onMouseOut={(e) => e.target.style.background = '#646cff'}
                  >
                    🔗 View Contract in Block Explorer →
                  </a>
                </div>
              )}
              <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                <strong>Tip:</strong> Click the link above to view your market contract details (title, description, etc.) on the block explorer. 
                You can also copy the Contract ID and search for it manually.
              </p>
            </div>
          ) : (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
              <p style={{ margin: 0, color: '#856404' }}>
                <strong>⚠️ Note:</strong> Contract ID not found in response. Check the browser console (F12) for full response details.
              </p>
            </div>
          )}
          
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#e7f3ff', borderRadius: '4px', border: '1px solid #b3d9ff' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#004085' }}>
              <strong>📋 Next Steps:</strong> Your market creation request is now pending admin approval. 
              Once approved, it will appear in the Markets page. You can view the contract details using the link above.
            </p>
          </div>
        </div>
      )}

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
            onBlur={handleBlur}
            required
            placeholder="Describe the market and resolution criteria..."
            className={fieldErrors.description ? 'error' : ''}
            aria-invalid={!!fieldErrors.description}
            aria-describedby={fieldErrors.description ? 'description-error' : undefined}
          />
          {fieldErrors.description && (
            <span id="description-error" className="field-error" role="alert">
              {fieldErrors.description}
            </span>
          )}
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

