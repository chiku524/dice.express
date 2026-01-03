// Automatic token refresh utility
// Checks token expiration and refreshes automatically

import { isTokenExpiredOrExpiringSoon, refreshToken, getTimeUntilExpiry } from './tokenManager'

let refreshInterval = null
let expirationCheckInterval = null

/**
 * Start automatic token refresh monitoring
 * Checks every 15 seconds and refreshes proactively (before expiration)
 * This ensures tokens are refreshed well before they expire, preventing expiration issues
 */
export function startTokenRefreshMonitoring() {
  // Clear any existing intervals
  stopTokenRefreshMonitoring()
  
  // Check every 15 seconds (more frequent for better reliability)
  expirationCheckInterval = setInterval(async () => {
    const timeUntilExpiry = getTimeUntilExpiry()
    
    // Refresh if expired, expiring soon (within 2 minutes), or if we don't know expiration
    const shouldRefresh = isTokenExpiredOrExpiringSoon() || 
                         (timeUntilExpiry !== null && timeUntilExpiry < 120) || // Refresh if less than 2 minutes left
                         (timeUntilExpiry === null && getToken()) // Refresh if we have a token but no expiration info
    
    if (shouldRefresh) {
      try {
        if (timeUntilExpiry !== null && timeUntilExpiry > 0) {
          console.log(`[TokenRefresh] Token expiring in ${Math.floor(timeUntilExpiry / 60)}m ${timeUntilExpiry % 60}s, refreshing proactively...`)
        } else {
          console.log('[TokenRefresh] Token expired or expiring soon, refreshing...')
        }
        
        await refreshToken()
        console.log('[TokenRefresh] ✅ Token refreshed successfully')
      } catch (error) {
        console.error('[TokenRefresh] ❌ Failed to refresh token:', error)
        // Don't clear token - user might want to manually refresh
        // But show a warning
        window.dispatchEvent(new CustomEvent('canton_token_refresh_failed', { 
          detail: { error: error.message } 
        }))
      }
    }
  }, 15000) // Check every 15 seconds (more frequent for better reliability)
}

/**
 * Stop automatic token refresh monitoring
 */
export function stopTokenRefreshMonitoring() {
  if (expirationCheckInterval) {
    clearInterval(expirationCheckInterval)
    expirationCheckInterval = null
  }
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

/**
 * Get token expiration status for UI display
 */
export function getTokenExpirationStatus() {
  const timeUntilExpiry = getTimeUntilExpiry()
  if (timeUntilExpiry === null) {
    return { status: 'unknown', message: 'Token expiration unknown' }
  }
  
  if (timeUntilExpiry <= 0) {
    return { status: 'expired', message: 'Token expired' }
  }
  
  const minutes = Math.floor(timeUntilExpiry / 60)
  const seconds = timeUntilExpiry % 60
  
  if (timeUntilExpiry <= 60) {
    return { 
      status: 'expiring_soon', 
      message: `Token expires in ${seconds} seconds`,
      timeUntilExpiry 
    }
  }
  
  return { 
    status: 'valid', 
    message: `Token expires in ${minutes} minute${minutes !== 1 ? 's' : ''}`,
    timeUntilExpiry 
  }
}
