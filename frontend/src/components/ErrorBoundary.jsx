import React from 'react'
import { isTauriApp } from '../utils/platform'

const RELOAD_ONCE_KEY = 'dice.errorBoundary.chunkReload'

function isChunkLoadError(error) {
  if (!error) return false
  const msg = String(error.message || '')
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('Failed to load page component') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    error.name === 'ChunkLoadError' ||
    error.code === 'CHUNK_LOAD_ERROR'
  )
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null, isChunkError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    const chunkError = isChunkLoadError(error)
    this.setState({
      error,
      errorInfo,
      isChunkError: chunkError,
    })

    if (chunkError && 'caches' in window) {
      console.warn('[ErrorBoundary] Chunk loading error detected, clearing relevant caches...')
      caches.keys().then((names) => {
        names.forEach((name) => {
          if (name.includes('assets') || name.includes('chunk') || name.includes('vite')) {
            caches.delete(name)
          }
        })
      })
    }

    // Desktop: one automatic reload after a failed update/asset mismatch
    if (chunkError && isTauriApp()) {
      try {
        if (!sessionStorage.getItem(RELOAD_ONCE_KEY)) {
          sessionStorage.setItem(RELOAD_ONCE_KEY, '1')
          window.location.reload()
        }
      } catch {
        /* ignore */
      }
    }
  }

  handleReset = () => {
    try {
      sessionStorage.removeItem(RELOAD_ONCE_KEY)
    } catch {
      /* ignore */
    }
    this.setState({ hasError: false, error: null, errorInfo: null, isChunkError: false })
  }

  render() {
    if (this.state.hasError) {
      const detail = this.state.error?.message || this.state.error?.toString?.() || ''
      return (
        <div
          style={{
            padding: '2rem',
            maxWidth: '800px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <div
            className="card"
            style={{
              background: 'rgba(255, 0, 0, 0.1)',
              border: '2px solid #ff4444',
              borderRadius: '8px',
              padding: '2rem',
            }}
          >
            <h2 style={{ color: '#ff4444', marginBottom: '1rem' }}>⚠️ Something went wrong</h2>
            <p style={{ marginBottom: '1.5rem', color: 'rgba(255, 255, 255, 0.9)' }}>
              {this.state.isChunkError ? (
                <>
                  Failed to load page component. This may be due to a network issue or outdated cache.
                  <br />
                  <strong>Try refreshing the page or reinstalling the desktop app.</strong>
                </>
              ) : (
                'An unexpected error occurred. This has been logged to the console.'
              )}
            </p>

            {detail ? (
              <details
                style={{
                  marginTop: '1rem',
                  textAlign: 'left',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '1rem',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                }}
                open={isTauriApp()}
              >
                <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>Error details</summary>
                <pre
                  style={{
                    fontSize: '0.85rem',
                    overflow: 'auto',
                    maxHeight: '300px',
                    color: '#ffaaaa',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {detail}
                  {this.state.errorInfo?.componentStack ? `\n\n${this.state.errorInfo.componentStack}` : ''}
                </pre>
              </details>
            ) : null}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn-primary" onClick={this.handleReset} style={{ marginTop: '1rem' }}>
                Try Again
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => window.location.reload()}
                style={{ marginTop: '1rem' }}
              >
                Refresh Page
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  window.location.href = '/'
                }}
                style={{ marginTop: '1rem' }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
