// Token management utility
// Handles token storage, expiration detection, and automatic refresh

const TOKEN_STORAGE_KEY = 'canton_token'
const REFRESH_TOKEN_STORAGE_KEY = 'canton_refresh_token'
const TOKEN_EXPIRY_STORAGE_KEY = 'canton_token_expires_at'

/**
 * Store token with expiration info
 */
export function storeToken(tokenData) {
  if (tokenData.access_token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, tokenData.access_token)
    
    // Calculate expiration time
    const expiresIn = tokenData.expires_in || 300 // Default 5 minutes if not provided
    const expiresAt = Date.now() + (expiresIn * 1000)
    localStorage.setItem(TOKEN_EXPIRY_STORAGE_KEY, expiresAt.toString())
    
    // Store refresh token if provided
    if (tokenData.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokenData.refresh_token)
    }
    
    return { expiresAt, expiresIn }
  }
  return null
}

/**
 * Get stored token
 */
export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

/**
 * Get refresh token
 */
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
}

/**
 * Check if token is expired or will expire soon (within 1 minute)
 */
export function isTokenExpiredOrExpiringSoon() {
  const expiresAt = localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY)
  if (!expiresAt) {
    // No expiration info - assume expired if token exists
    return !!getToken()
  }
  
  const expiresAtTime = parseInt(expiresAt, 10)
  const oneMinuteFromNow = Date.now() + 60000 // 1 minute buffer
  
  return Date.now() >= expiresAtTime || oneMinuteFromNow >= expiresAtTime
}

/**
 * Get time until token expires (in seconds)
 */
export function getTimeUntilExpiry() {
  const expiresAt = localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY)
  if (!expiresAt) {
    return null
  }
  
  const expiresAtTime = parseInt(expiresAt, 10)
  const timeUntilExpiry = Math.max(0, Math.floor((expiresAtTime - Date.now()) / 1000))
  return timeUntilExpiry
}

/**
 * Refresh token using refresh_token
 */
export async function refreshToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token available. Please get a new token using username/password.')
  }
  
  try {
    const response = await fetch('/api/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
        clientId: 'Prediction-Market'
      })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || `Failed to refresh token: ${response.status}`)
    }
    
    if (!data.access_token) {
      throw new Error('No access token in refresh response')
    }
    
    // Store new token
    const expiryInfo = storeToken(data)
    
    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('canton_token_updated', { 
      detail: { token: data.access_token } 
    }))
    
    return {
      access_token: data.access_token,
      expiresAt: expiryInfo?.expiresAt,
      expiresIn: expiryInfo?.expiresIn
    }
  } catch (error) {
    console.error('Token refresh failed:', error)
    throw error
  }
}

/**
 * Clear all token data
 */
export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
  localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY)
}
