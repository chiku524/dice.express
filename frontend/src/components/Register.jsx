import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { register as apiRegister } from '../services/accountApi'
import { BRAND_NAME } from '../constants/brand'
import './AuthPages.css'

const STEPS = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Fund your account' },
  { id: 3, label: 'Complete' },
]

const MIN_PASSWORD_LENGTH = 8
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Register() {
  const { restoreWallet, wallet } = useWallet()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [financeChoice, setFinanceChoice] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const emailInputRef = useRef(null)

  useEffect(() => {
    if (wallet) navigate('/dashboard', { replace: true })
  }, [wallet, navigate])

  useEffect(() => {
    if (step === 1 && emailInputRef.current) emailInputRef.current.focus()
  }, [step])

  if (wallet) return null

  const canProceedStep1 = () => {
    const e = email.trim().toLowerCase()
    const d = displayName.trim()
    if (!e || !d) return false
    if (!EMAIL_RE.test(e)) return false
    if (password.length < MIN_PASSWORD_LENGTH) return false
    if (password !== confirmPassword) return false
    return true
  }

  const handleComplete = async () => {
    setError(null)
    const e = email.trim().toLowerCase()
    const d = displayName.trim()
    if (!EMAIL_RE.test(e)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!d) {
      setError('Please enter a display name.')
      return
    }
    setLoading(true)
    try {
      const result = await apiRegister({
        email: e,
        password,
        displayName: d,
        fundChoice: financeChoice || null,
      })
      const account = result?.account
      if (account) {
        restoreWallet({
          accountId: account.accountId,
          displayName: account.displayName,
          fundChoice: account.fundChoice ?? null,
          createdAt: account.createdAt,
        })
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <h2 className="auth-brand-title">Join {BRAND_NAME}</h2>
          <p className="auth-brand-tagline">
            Create an account in a few steps. Trade on prediction markets with Pips — deposit with crypto.
          </p>
          <ul className="auth-brand-features">
            <li>One account for all your trading</li>
            <li>Fund with crypto (wallet or platform address)</li>
            <li>Withdraw earnings from your portfolio</li>
          </ul>
        </div>
      </div>
      <div className="auth-form-panel">
        <div className="auth-card auth-wizard">
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Set up your {BRAND_NAME} account in a few steps.</p>

          <div className="wizard-progress-bar" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3} aria-label={`Step ${step} of 3`}>
          {STEPS.map((s, i) => (
            <span key={s.id} className={`wizard-step ${step >= s.id ? 'active' : ''}`}>
              <span className="wizard-step-dot" />
              <span className="wizard-step-label">{s.label}</span>
              {i < STEPS.length - 1 && <span className="wizard-step-line" />}
            </span>
          ))}
        </div>

        {step === 1 && (
          <div className="wizard-panel">
            <h2 className="wizard-panel-title">Create your account</h2>
            <p className="wizard-panel-desc">Use your email and a password to sign in later from any device.</p>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <label className="auth-label" htmlFor="register-email">Email</label>
            <input
              ref={emailInputRef}
              id="register-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              autoComplete="email"
              disabled={loading}
            />
            <label className="auth-label" htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              disabled={loading}
            />
            {password.length > 0 && password.length < MIN_PASSWORD_LENGTH && (
              <p className="auth-hint auth-hint-error">Password must be at least {MIN_PASSWORD_LENGTH} characters</p>
            )}
            <label className="auth-label" htmlFor="register-confirm-password">Confirm password</label>
            <input
              id="register-confirm-password"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`auth-input ${confirmPassword && password !== confirmPassword ? 'auth-input-invalid' : ''}`}
              autoComplete="new-password"
              disabled={loading}
              aria-invalid={!!(confirmPassword && password !== confirmPassword)}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="auth-hint auth-hint-error">Passwords do not match</p>
            )}
            <label className="auth-label" htmlFor="register-display-name">Display name</label>
            <input
              id="register-display-name"
              type="text"
              placeholder="e.g. TraderAlex"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="auth-input"
              autoComplete="username"
              maxLength={32}
              disabled={loading}
            />
            <div className="wizard-actions">
              <Link to="/sign-in" className="auth-link-button">Already have an account? Sign in</Link>
              <button type="button" className="auth-submit" onClick={() => setStep(2)} disabled={!canProceedStep1() || loading}>
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-panel">
            <h2 className="wizard-panel-title">Fund your account</h2>
            <p className="wizard-panel-desc">Add Pips to trade. Choose how you&apos;ll add funds; you can deposit later from Portfolio.</p>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <div className="wizard-options">
              <button
                type="button"
                className={`wizard-option ${financeChoice === 'blockchain' ? 'selected' : ''}`}
                onClick={() => setFinanceChoice('blockchain')}
              >
                <span className="wizard-option-icon" aria-hidden>⛓</span>
                <span className="wizard-option-text">
                  <span className="wizard-option-label">Crypto</span>
                  <span className="wizard-option-desc">Deposit from wallet later</span>
                </span>
              </button>
              <button
                type="button"
                className={`wizard-option ${financeChoice === 'skip' ? 'selected' : ''}`}
                onClick={() => setFinanceChoice('skip')}
              >
                <span className="wizard-option-icon" aria-hidden>⏭</span>
                <span className="wizard-option-text">
                  <span className="wizard-option-label">Add funds later</span>
                  <span className="wizard-option-desc">Skip for now</span>
                </span>
              </button>
            </div>
            <div className="wizard-actions">
              <button type="button" className="auth-secondary" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="auth-submit" onClick={() => setStep(3)}>Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-panel">
            <h2 className="wizard-panel-title">You&apos;re all set</h2>
            <p className="wizard-panel-desc">Review and complete to create your account.</p>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <div className="wizard-summary">
              <p><strong>Email:</strong> {email.trim() ? (() => { const s = email.trim(); const i = s.indexOf('@'); return i > 0 ? s.slice(0, 2) + '***' + s.slice(i) : s; })() : '—'}</p>
              <p><strong>Display name:</strong> {displayName.trim() || '—'}</p>
              <p><strong>Funding:</strong> {financeChoice === 'blockchain' ? 'Crypto (later)' : 'Add later'}</p>
            </div>
            <div className="wizard-actions">
              <button type="button" className="auth-secondary" onClick={() => setStep(2)}>Back</button>
              <button type="button" className="auth-submit" onClick={handleComplete} disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </div>
          </div>
        )}

          <p className="auth-footer">
            Already have an account? <Link to="/sign-in">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
