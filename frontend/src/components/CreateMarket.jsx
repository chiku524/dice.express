import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLedger } from '../hooks/useLedger'
import { useWallet } from '../contexts/WalletContext'
import { ContractStorage } from '../utils/contractStorage'
import { validators, validateForm } from '../utils/formValidation'

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
          
          // Try to get record_time from API response first
          updateTimestamp = result.recordTime || 
                           result.record_time || 
                           result.timestamp || 
                           result.result?.recordTime ||
                           result.result?.record_time ||
                           result.result?.timestamp
          
          // If not in response, try to fetch it from update details
          if (!updateTimestamp && updateId) {
            console.log('[CreateMarket] No timestamp in response, fetching update details...')
            try {
              const updateDetailsResponse = await fetch('/api/get-update-details', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('canton_token')}`
                },
                body: JSON.stringify({
                  updateId: updateId,
                  completionOffset: result.completionOffset || result.completion_offset,
                  party: wallet.party,
                  applicationId: 'prediction-markets'
                })
              })
              
              if (updateDetailsResponse.ok) {
                const updateDetails = await updateDetailsResponse.json()
                if (updateDetails.recordTime) {
                  updateTimestamp = updateDetails.recordTime
                  console.log('[CreateMarket] ✅ Retrieved record_time from update details:', updateTimestamp)
                }
              }
            } catch (updateError) {
              console.warn('[CreateMarket] Failed to fetch update details:', updateError.message)
            }
          }
          
          // If we still don't have a timestamp, wait a moment and try again
          // This handles the case where the update hasn't been processed yet
          if (!updateTimestamp) {
            console.warn('[CreateMarket] No timestamp available yet, waiting 1 second and retrying...')
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            try {
              const retryResponse = await fetch('/api/get-update-details', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('canton_token')}`
                },
                body: JSON.stringify({
                  updateId: updateId,
                  completionOffset: result.completionOffset || result.completion_offset,
                  party: wallet.party,
                  applicationId: 'prediction-markets'
                })
              })
              
              if (retryResponse.ok) {
                const retryDetails = await retryResponse.json()
                if (retryDetails.recordTime) {
                  updateTimestamp = retryDetails.recordTime
                  console.log('[CreateMarket] ✅ Retrieved record_time on retry:', updateTimestamp)
                }
              }
            } catch (retryError) {
              console.warn('[CreateMarket] Retry also failed:', retryError.message)
            }
          }
          
          // Last resort: use current time (but this may not work correctly)
          if (!updateTimestamp) {
            console.warn('[CreateMarket] ⚠️ Using current time as fallback - explorer URL may not work correctly')
            updateTimestamp = new Date().toISOString()
          }
        }
      }

      // Build explorer URL
      if (contractId) {
        explorerUrl = `https://devnet.ccexplorer.io/?q=${encodeURIComponent(contractId)}`
      } else if (updateId) {
        // Use the correct format: /updates/{updateId}/{record_time}
        // The explorer expects the record_time (ISO timestamp), not completionOffset
        // Format should be ISO timestamp like: 2025-12-31T19:45:35.056Z
        
        let timePart = updateTimestamp
        
        // Ensure it's a string and in ISO format
        if (typeof timePart === 'string') {
          // Remove extra precision if present (explorer expects format like: 2025-12-31T19:45:35.056Z)
          // Keep milliseconds but limit to 3 digits
          timePart = timePart.replace(/\.(\d{3})\d+Z$/, '.$1Z')
        } else {
          // Should not happen, but handle it
          console.error('[CreateMarket] Invalid timestamp format:', timePart)
          timePart = new Date().toISOString().replace(/\.(\d{3})\d+Z$/, '.$1Z')
        }
        
        // URL encode the timestamp
        const encodedTime = encodeURIComponent(timePart)
        explorerUrl = `https://devnet.ccexplorer.io/updates/${updateId}/${encodedTime}`
        
        console.log('[CreateMarket] 🔗 Built explorer URL with record_time:', timePart)
      }

      // Store display ID (contractId or updateId format)
      const displayId = contractId || (updateId ? `updateId:${updateId}` : null)

      setSuccess(true)
      setContractId(displayId) // Store for display
      setExplorerUrl(explorerUrl) // Store explorer URL separately
      
      // ALWAYS store contract in local storage immediately after creation
      // This ensures AdminDashboard can display it even if blockchain query fails
      // Store with full form data so AdminDashboard can show all details
      const contractPayload = {
        creator: wallet.party,
        admin: wallet.party, // Same as creator for now
        marketId: `market-${Date.now()}`,
        title: formData.title,
        description: formData.description,
        marketType: formData.marketType,
        outcomes: outcomes,
        settlementTrigger: settlementTrigger,
        resolutionCriteria: formData.resolutionCriteria,
        depositAmount: formData.depositAmount || '100.0',
        depositCid: null,
        configCid: null,
        creatorBalance: null,
        adminBalance: null,
        status: 'PendingApproval',
        // Store metadata
        updateId: updateId,
        completionOffset: result.completionOffset || result.completion_offset,
        explorerUrl: explorerUrl,
        createdAt: new Date().toISOString()
      }
      
      // Store in cloud database (with local storage fallback)
      // Use updateId as contractId if we don't have a real one
      // This ensures we can track it even before blockchain sync
      const storageContractId = contractId || (updateId ? `updateId:${updateId}` : `pending-${Date.now()}`)
      
      await ContractStorage.storeContract(
        storageContractId,
        getTemplateId('PredictionMarkets', 'MarketCreationRequest'),
        contractPayload,
        wallet.party,
        {
          updateId: updateId,
          completionOffset: result.completionOffset || result.completion_offset,
          explorerUrl: explorerUrl,
          status: 'PendingApproval'
        }
      )
      
      console.log('[CreateMarket] ✅ Contract stored in cloud database:', storageContractId)
      console.log('[CreateMarket] 📦 Stored payload:', contractPayload)
      
      // Log to console for easy access
      console.log('📦 Full creation response:', JSON.stringify(result, null, 2))
      
      if (contractId) {
        console.log('✅ Market created successfully!')
        console.log('📋 Contract ID:', contractId)
        console.log('🔗 View in explorer:', explorerUrl)
        console.log('⏳ Note: Contract may take a few seconds to appear in queries due to synchronization.')
      } else if (updateId) {
        console.log('✅ Market creation submitted successfully!')
        console.log('📋 Update ID:', updateId)
        console.log('📅 Completion Offset:', updateTimestamp)
        console.log('🔗 View in explorer:', explorerUrl)
        console.log('⏳ Note: Contract is being processed. It may take a few seconds to appear in queries.')
        console.log('💡 Tip: Wait a few seconds and refresh the Admin Dashboard to see the new request.')
      } else {
        console.log('⚠️ Market created but contract ID/updateId not found in response')
        console.log('Full response:', JSON.stringify(result, null, 2))
        console.log('⚠️ This may indicate the contract was not actually created on the ledger.')
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
            className={fieldErrors.title ? 'error' : ''}
            aria-invalid={!!fieldErrors.title}
            aria-describedby={fieldErrors.title ? 'title-error' : undefined}
          />
          {fieldErrors.title && (
            <span id="title-error" className="field-error" role="alert">
              {fieldErrors.title}
            </span>
          )}
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
              onBlur={handleBlur}
              required
              placeholder="e.g., Option A, Option B, Option C"
              className={fieldErrors.outcomes ? 'error' : ''}
              aria-invalid={!!fieldErrors.outcomes}
              aria-describedby={fieldErrors.outcomes ? 'outcomes-error' : undefined}
            />
            {fieldErrors.outcomes && (
              <span id="outcomes-error" className="field-error" role="alert">
                {fieldErrors.outcomes}
              </span>
            )}
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
              onBlur={handleBlur}
              required
              className={fieldErrors.settlementTime ? 'error' : ''}
              aria-invalid={!!fieldErrors.settlementTime}
              aria-describedby={fieldErrors.settlementTime ? 'settlementTime-error' : undefined}
            />
            {fieldErrors.settlementTime && (
              <span id="settlementTime-error" className="field-error" role="alert">
                {fieldErrors.settlementTime}
              </span>
            )}
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
            className={fieldErrors.resolutionCriteria ? 'error' : ''}
            aria-invalid={!!fieldErrors.resolutionCriteria}
            aria-describedby={fieldErrors.resolutionCriteria ? 'resolutionCriteria-error' : undefined}
          />
          {fieldErrors.resolutionCriteria && (
            <span id="resolutionCriteria-error" className="field-error" role="alert">
              {fieldErrors.resolutionCriteria}
            </span>
          )}
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

