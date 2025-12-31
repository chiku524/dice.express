// Automatic token refresh utility
// Checks token expiration and refreshes automatically

import { isTokenExpiredOrExpiringSoon, refreshToken, getTimeUntilExpiry } from './tokenManager'

let refreshInterval = null
let expirationCheckInterval = null

/**
 * Start automatic token refresh monitoring
 * Checks every 30 seconds and refreshes if needed
 */
export function startTokenRefreshMonitoring() {
  // Clear any existing intervals
  stopTokenRefreshMonitoring()
  
  // Check every 30 seconds
  expirationCheckInterval = setInterval(async () => {
    if (isTokenExpiredOrExpiringSoon()) {
      try {
        console.log('[TokenRefresh] Token expired or expiring soon, refreshing...')
        await refreshToken()
        console.log('[TokenRefresh] Token refreshed successfully')
      } catch (error) {
        console.error('[TokenRefresh] Failed to refresh token:', error)
        // Don't clear token - user might want to manually refresh
        // But show a warning
        window.dispatchEvent(new CustomEvent('canton_token_refresh_failed', { 
          detail: { error: error.message } 
        }))
      }
    }
  }, 30000) // Check every 30 seconds
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
