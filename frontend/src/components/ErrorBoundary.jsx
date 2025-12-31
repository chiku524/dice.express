import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null, isChunkError: false }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console and state
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Check if it's a chunk loading error
    const isChunkError = 
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Loading CSS chunk') ||
      error.name === 'ChunkLoadError' ||
      error.code === 'CHUNK_LOAD_ERROR'
    
    this.setState({
      error,
      errorInfo,
      isChunkError
    })
    
    // For chunk errors, try to clear cache
    if (isChunkError && 'caches' in window) {
      console.warn('[ErrorBoundary] Chunk loading error detected, clearing relevant caches...')
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('assets') || name.includes('chunk')) {
            console.log('[ErrorBoundary] Clearing cache:', name)
            caches.delete(name)
          }
        })
      })
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <div className="card" style={{ 
            background: 'rgba(255, 0, 0, 0.1)',
            border: '2px solid #ff4444',
            borderRadius: '8px',
            padding: '2rem'
          }}>
            <h2 style={{ color: '#ff4444', marginBottom: '1rem' }}>
              ⚠️ Something went wrong
            </h2>
            <p style={{ marginBottom: '1.5rem', color: 'rgba(255, 255, 255, 0.9)' }}>
              {this.state.isChunkError ? (
                <>
                  Failed to load page component. This may be due to a network issue or outdated cache.
                  <br />
                  <strong>Try refreshing the page or clearing your browser cache.</strong>
                </>
              ) : (
                'An unexpected error occurred. This has been logged to the console.'
              )}
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ 
                marginTop: '1rem', 
                textAlign: 'left',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '1rem',
                borderRadius: '4px',
                marginBottom: '1rem'
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                  Error Details (Development Only)
                </summary>
                <pre style={{ 
                  fontSize: '0.85rem',
                  overflow: 'auto',
                  maxHeight: '300px',
                  color: '#ffaaaa'
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo && (
                    <>
                      {'\n\n'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                className="btn-primary" 
                onClick={this.handleReset}
                style={{ marginTop: '1rem' }}
              >
                Try Again
              </button>
              {this.state.isChunkError && (
                <button 
                  className="btn-primary" 
                  onClick={() => window.location.reload()}
                  style={{ marginTop: '1rem' }}
                >
                  Refresh Page
                </button>
              )}
              <button 
                className="btn-secondary" 
                onClick={() => window.location.href = '/'}
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

