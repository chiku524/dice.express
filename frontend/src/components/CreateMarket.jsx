import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { useAccountModal } from '../contexts/AccountModalContext'
import { createMarket } from '../services/marketsApi'
import { validators, validateForm } from '../utils/formValidation'
import { MARKET_CATEGORIES, PREDICTION_STYLES, getStyleByValue, getDefaultOutcomesForStyle } from '../constants/marketConfig'

const INITIAL_FORM_DATA = {
  title: '',
  description: '',
  category: 'Other',
  predictionStyle: 'yesNo',
  marketType: 'Binary',
  outcomes: '',
  parentMarketId: '',
  scalarMin: '',
  scalarMax: '',
  scalarUnit: '',
  settlementType: 'TimeBased',
  settlementTime: '',
  resolutionCriteria: '',
}

export default function CreateMarket() {
  const navigate = useNavigate()
  const { wallet } = useWallet()
  const openAccountModal = useAccountModal()
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [marketId, setMarketId] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  if (!wallet) {
    return (
      <div className="card" style={{ maxWidth: '420px', margin: '2rem auto', textAlign: 'center' }}>
        <h2>Create a market</h2>
        <p className="text-secondary mt-sm">Sign in to create your own prediction market.</p>
        <button type="button" className="btn-primary mt-lg" onClick={openAccountModal}>
          Sign in
        </button>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!wallet) {
      setError('Please connect your account')
      return
    }

    // Validate form
    const validationSchema = {
      title: [validators.required, validators.minLength(5), validators.maxLength(200)],
      description: [validators.required, validators.minLength(20), validators.maxLength(1000)],
      outcomes: getStyleByValue(formData.predictionStyle).marketType === 'MultiOutcome'
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
      const style = getStyleByValue(formData.predictionStyle)
      const marketType = style.marketType
      const outcomes = marketType === 'MultiOutcome'
        ? formData.outcomes.split(',').map(o => o.trim()).filter(o => o)
        : getDefaultOutcomesForStyle(formData.predictionStyle)

      const settlementTrigger = formData.settlementType === 'TimeBased'
        ? 'TimeBased'
        : formData.settlementType === 'EventBased'
        ? 'EventBased'
        : 'Manual'

      const scalarSpec =
        formData.predictionStyle === 'scalarBuckets'
          ? (() => {
              const min = formData.scalarMin?.trim() ? parseFloat(formData.scalarMin) : null
              const max = formData.scalarMax?.trim() ? parseFloat(formData.scalarMax) : null
              const unit = formData.scalarUnit?.trim() || null
              if ((min == null || Number.isNaN(min)) && (max == null || Number.isNaN(max)) && !unit) return undefined
              return {
                ...(min != null && !Number.isNaN(min) ? { min } : {}),
                ...(max != null && !Number.isNaN(max) ? { max } : {}),
                ...(unit ? { unit } : {}),
              }
            })()
          : undefined

      const result = await createMarket({
        title: formData.title,
        description: formData.description,
        marketType: marketType === 'Binary' ? 'Binary' : 'MultiOutcome',
        outcomes,
        settlementTrigger,
        resolutionCriteria: formData.resolutionCriteria,
        category: formData.category || null,
        styleLabel: formData.predictionStyle || null,
        source: 'user',
        creator: wallet.party,
        ...(formData.predictionStyle === 'conditional' && formData.parentMarketId?.trim()
          ? { parentMarketId: formData.parentMarketId.trim() }
          : {}),
        ...(scalarSpec && Object.keys(scalarSpec).length > 0 ? { scalarSpec } : {}),
      })

      const id = result.market?.contractId || result.market?.payload?.marketId || `market-${Date.now()}`
      setSuccess(true)
      setMarketId(id)

      // Reset form after successful creation
      setFormData({ ...INITIAL_FORM_DATA })
      
      // DO NOT redirect - let user see the success message and contract details
    } catch (err) {
      let errorMessage = err.message
      
      // Provide helpful error messages for common issues
      if (err.message?.includes('401') || err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please sign in or create an account and try again.'
      } else if (err.message?.includes('token') || err.message?.includes('unauthorized')) {
        errorMessage = 'Please sign in to create a market.'
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
      outcomes: getStyleByValue(formData.predictionStyle).marketType === 'MultiOutcome'
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
      <p className="text-secondary mb-xl">
        Create a new prediction market. Trading uses Pips. Add Pips in Portfolio or deposit via crypto/card to get started.
      </p>

      {error && <div className="error">{error}</div>}
      {success && (
        <div className="success mb-xl">
          <h3>Market created</h3>
          <p className="mt-sm">
            Your market is live. Share it or start trading.
          </p>

          {marketId ? (
            <div className="mt-lg">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                <Link to={`/market/${marketId}`} className="btn-primary">
                  View market
                </Link>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setSuccess(false)
                    setMarketId(null)
                    setFormData(INITIAL_FORM_DATA)
                    setFieldErrors({})
                    setError(null)
                  }}
                >
                  Create another
                </button>
              </div>
              <p className="text-muted mt-md" style={{ fontSize: 'var(--font-size-sm)' }}>
                Market ID: <code>{marketId}</code>
              </p>
            </div>
          ) : (
            <div className="warning-message mt-lg">
              <p style={{ margin: 0 }}>
                <strong>Note:</strong> Market ID not found in response. Check the browser console (F12) for details.
              </p>
            </div>
          )}
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
          <label>Category *</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            {MARKET_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Prediction style *</label>
          <select
            name="predictionStyle"
            value={formData.predictionStyle}
            onChange={(e) => {
              const style = getStyleByValue(e.target.value)
              setFormData(prev => ({
                ...prev,
                predictionStyle: e.target.value,
                marketType: style.marketType,
                outcomes: style.outcomes ? style.outcomes.join(', ') : prev.outcomes,
                parentMarketId: e.target.value === 'conditional' ? prev.parentMarketId : '',
                scalarMin: e.target.value === 'scalarBuckets' ? prev.scalarMin : '',
                scalarMax: e.target.value === 'scalarBuckets' ? prev.scalarMax : '',
                scalarUnit: e.target.value === 'scalarBuckets' ? prev.scalarUnit : '',
              }))
            }}
            required
          >
            {PREDICTION_STYLES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {formData.predictionStyle === 'conditional' && (
          <div className="form-group">
            <label htmlFor="parentMarketId">Related market ID (optional)</label>
            <input
              id="parentMarketId"
              type="text"
              name="parentMarketId"
              value={formData.parentMarketId}
              onChange={handleChange}
              placeholder="e.g. market-abc123 or contract id"
            />
            <p className="text-muted mt-xs" style={{ fontSize: 'var(--font-size-sm)' }}>
              Use when this question is explicitly tied to another market; helps operators and resolution notes. Still a standard Yes/No market for trading.
            </p>
          </div>
        )}

        {formData.predictionStyle === 'scalarBuckets' && (
          <div className="form-group">
            <p className="text-muted mb-sm" style={{ fontSize: 'var(--font-size-sm)' }}>
              Define <strong>outcomes</strong> as ordered buckets (e.g. <code>&lt;2M, 2M–5M, &gt;5M</code>). Optional numeric hints for the template:
            </p>
            <div style={{ display: 'grid', gap: 'var(--spacing-sm)', maxWidth: '420px' }}>
              <label className="text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                Min (optional){' '}
                <input type="text" name="scalarMin" value={formData.scalarMin} onChange={handleChange} placeholder="e.g. 0" />
              </label>
              <label className="text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                Max (optional){' '}
                <input type="text" name="scalarMax" value={formData.scalarMax} onChange={handleChange} placeholder="e.g. 100" />
              </label>
              <label className="text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                Unit (optional){' '}
                <input type="text" name="scalarUnit" value={formData.scalarUnit} onChange={handleChange} placeholder="e.g. USD, %, °C" />
              </label>
            </div>
          </div>
        )}

        {getStyleByValue(formData.predictionStyle).marketType === 'MultiOutcome' && (
          <div className="form-group">
            <label>Outcomes (comma-separated) *</label>
            <input
              type="text"
              name="outcomes"
              value={formData.outcomes}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              placeholder={
                formData.predictionStyle === 'scalarBuckets'
                  ? 'e.g. Under $100k, $100k–$150k, Over $150k'
                  : 'e.g., Option A, Option B, Option C'
              }
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
          style={{ width: '100%', marginTop: 'var(--spacing-md)' }}
        >
          {loading ? 'Creating Market...' : 'Create Market'}
        </button>
      </form>
    </div>
  )
}

