import { useState, useEffect } from 'react'
import { checkApiHealth } from '../utils/healthCheck'

/**
 * Banner to inform users about API route status
 */
export default function ApiStatusBanner() {
  const [apiWorking, setApiWorking] = useState(null) // null = checking, true = working, false = not working
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const check = async () => {
      const isWorking = await checkApiHealth()
      setApiWorking(isWorking)
    }
    check()
    
    // Recheck every minute
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [])

  // Don't show if dismissed or if API is working
  if (dismissed || apiWorking === null || apiWorking) {
    return null
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      color: 'white',
      padding: '1rem',
      textAlign: 'center',
      position: 'relative',
      zIndex: 1000,
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <strong>⚠️ API Routes Not Configured</strong>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', opacity: 0.9 }}>
            Vercel API routes are not configured. Queries will return empty results and commands will fail.
            <br />
            <small>
              <strong>To fix:</strong> Ensure API routes at project root <code>/api/</code> are deployed, or enable CORS on the Canton participant.
              <br />
              See <a href="https://github.com/chiku524/upwork-canton-daml-project/blob/main/docs/README.md" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'underline' }}>documentation</a> for details.
            </small>
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '1rem',
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

