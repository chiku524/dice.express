/**
 * Utility functions for error handling
 */

/**
 * Format error message for display
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
export function formatError(error) {
  if (!error) return 'An unknown error occurred'
  
  // Network errors
  if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
    return 'Network error: Unable to connect. Please check your connection.'
  }
  
  // CORS errors
  if (error.message?.includes('CORS') || error.message?.includes('Access-Control')) {
    return 'Connection blocked: Please contact support if this issue persists.'
  }
  
  // HTTP errors
  if (error.response) {
    const status = error.response.status
    const message = error.response.data?.error || error.response.data?.message
    
    switch (status) {
      case 404:
        return 'Resource not found. The requested item may not exist.'
      case 403:
        return 'Access denied. You may not have permission to perform this action.'
      case 401:
        return 'Authentication required. Please connect your wallet.'
      case 500:
        return 'Server error: The server encountered an issue. Please try again later.'
      default:
        return message || `Error ${status}: ${error.message}`
    }
  }
  
  // Default to error message
  return error.message || 'An unexpected error occurred'
}

/**
 * Log error with context
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 */
export function logError(error, context = 'Unknown') {
  console.error(`[${context}]`, error)
  
  // Track error with analytics
  if (typeof window !== 'undefined') {
    import('./analytics').then(({ analytics }) => {
      analytics.trackError(error, { context })
    })
  }
}

