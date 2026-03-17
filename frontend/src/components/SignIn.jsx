import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { signIn as apiSignIn } from '../services/accountApi'
import { BRAND_NAME } from '../constants/brand'
import './AuthPages.css'

export default function SignIn() {
  const { restoreWallet, wallet } = useWallet()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const emailInputRef = useRef(null)

  const redirectTo = location.state?.from?.pathname || '/dashboard'

  useEffect(() => {
    if (wallet) navigate(redirectTo, { replace: true })
  }, [wallet, redirectTo, navigate])

  useEffect(() => {
    emailInputRef.current?.focus()
  }, [])

  if (wallet) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const eTrim = email.trim().toLowerCase()
    if (!eTrim || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    try {
      const result = await apiSignIn({ email: eTrim, password })
      const account = result?.account
      if (account) {
        restoreWallet({
          accountId: account.accountId,
          displayName: account.displayName,
          fundChoice: account.fundChoice ?? null,
          createdAt: account.createdAt,
        })
        navigate(redirectTo, { replace: true })
      } else {
        setError('Sign in failed. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password. Create an account if you don’t have one.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <h2 className="auth-brand-title">Welcome back</h2>
          <p className="auth-brand-tagline">
            Sign in to access your dashboard, portfolio, and prediction markets on {BRAND_NAME}.
          </p>
          <ul className="auth-brand-features">
            <li>Trade on real-world outcomes with Pips</li>
            <li>Deposit via crypto or card, withdraw anytime</li>
            <li>Your choice. Your chance.</li>
          </ul>
        </div>
      </div>
      <div className="auth-form-panel">
        <div className="auth-card">
          <h1 className="auth-title">Sign in</h1>
        <p className="auth-subtitle">Use your email and password to continue to {BRAND_NAME}.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error" role="alert">{error}</div>}
          <label className="auth-label" htmlFor="signin-email">Email</label>
          <input
            ref={emailInputRef}
            id="signin-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            autoComplete="email"
            disabled={loading}
          />
          <label className="auth-label" htmlFor="signin-password">Password</label>
          <input
            id="signin-password"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            autoComplete="current-password"
            disabled={loading}
          />
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
          <p className="auth-footer">
            New to {BRAND_NAME}? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
