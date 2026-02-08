import { useState } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { BRAND_NAME, BRAND_TAGLINE } from '../constants/brand'

export default function WalletConnect({ onConnect }) {
  const { connectWallet } = useWallet()
  const [userId, setUserId] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await connectWallet(userId.trim() || undefined)
      onConnect?.()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="card" style={{ textAlign: 'center', maxWidth: '500px', margin: '4rem auto' }}>
      <p className="wallet-connect-slogan" style={{ marginBottom: '0.5rem', fontSize: '1rem', opacity: 0.9 }}>{BRAND_TAGLINE}</p>
      <h2>Get started</h2>
      <p style={{ marginBottom: '2rem', color: 'rgba(255, 255, 255, 0.6)' }}>
        Pick a name to trade with virtual Credits. No signup required. No crypto.
      </p>
      <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Your name or leave blank for guest"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="filter-input"
          style={{ width: '100%', maxWidth: '320px', marginBottom: '0.75rem' }}
        />
        {error && <p style={{ color: 'var(--color-error)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{error}</p>}
        <button type="submit" className="btn-primary" style={{ fontSize: '1rem', padding: '0.6rem 1.5rem' }}>
          Continue
        </button>
      </form>
      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
        Leave blank to use the default guest account.
      </p>
    </div>
  )
}
