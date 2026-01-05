/**
 * Standardized Error Handling
 * 
 * Provides consistent error messages and handling across the application
 */

export const ErrorTypes = {
  NETWORK: 'NETWORK',
  VALIDATION: 'VALIDATION',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN'
}

/**
 * Standard error messages
 */
export const ErrorMessages = {
  NETWORK: {
    DEFAULT: 'Network error. Please check your connection and try again.',
    TIMEOUT: 'Request timed out. Please try again.',
    OFFLINE: 'You are offline. Please check your internet connection.'
  },
  VALIDATION: {
    DEFAULT: 'Please check your input and try again.',
    REQUIRED: 'This field is required.',
    INVALID_FORMAT: 'Invalid format. Please check your input.',
    TOO_SHORT: 'This field is too short.',
    TOO_LONG: 'This field is too long.'
  },
  AUTHENTICATION: {
    DEFAULT: 'Authentication failed. Please log in again.',
    TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
    INVALID_TOKEN: 'Invalid authentication token. Please log in again.'
  },
  AUTHORIZATION: {
    DEFAULT: 'You do not have permission to perform this action.',
    ADMIN_REQUIRED: 'This action requires admin privileges.'
  },
  NOT_FOUND: {
    DEFAULT: 'The requested resource was not found.',
    MARKET: 'Market not found.',
    CONTRACT: 'Contract not found.'
  },
  SERVER: {
    DEFAULT: 'Server error. Please try again later.',
    INTERNAL: 'Internal server error. Please contact support if the problem persists.'
  },
  UNKNOWN: {
    DEFAULT: 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Parse error and return standardized format
 */
export function parseError(error) {
  if (!error) {
    return {
      type: ErrorTypes.UNKNOWN,
      message: ErrorMessages.UNKNOWN.DEFAULT,
      originalError: null
    }
  }

  // If already parsed
  if (error.type && error.message) {
    return error
  }

  const errorMessage = error.message || error.toString()
  const statusCode = error.response?.status || error.status

  // Network errors
  if (error.code === 'ERR_NETWORK' || error.code === 'ERR_INTERNET_DISCONNECTED') {
    return {
      type: ErrorTypes.NETWORK,
      message: ErrorMessages.NETWORK.OFFLINE,
      originalError: error
    }
  }

  if (error.code === 'ECONNABORTED' || errorMessage.includes('timeout')) {
    return {
      type: ErrorTypes.NETWORK,
      message: ErrorMessages.NETWORK.TIMEOUT,
      originalError: error
    }
  }

  // HTTP status codes
  if (statusCode === 401 || statusCode === 403) {
    return {
      type: statusCode === 401 ? ErrorTypes.AUTHENTICATION : ErrorTypes.AUTHORIZATION,
      message: statusCode === 401 
        ? ErrorMessages.AUTHENTICATION.DEFAULT
        : ErrorMessages.AUTHORIZATION.DEFAULT,
      originalError: error,
      statusCode
    }
  }

  if (statusCode === 404) {
    return {
      type: ErrorTypes.NOT_FOUND,
      message: ErrorMessages.NOT_FOUND.DEFAULT,
      originalError: error,
      statusCode
    }
  }

  if (statusCode >= 500) {
    return {
      type: ErrorTypes.SERVER,
      message: ErrorMessages.SERVER.DEFAULT,
      originalError: error,
      statusCode
    }
  }

  if (statusCode >= 400) {
    // Try to extract validation errors
    const errorData = error.response?.data
    if (errorData?.errors || errorData?.message) {
      return {
        type: ErrorTypes.VALIDATION,
        message: errorData.message || ErrorMessages.VALIDATION.DEFAULT,
        originalError: error,
        statusCode,
        validationErrors: errorData.errors
      }
    }
    return {
      type: ErrorTypes.VALIDATION,
      message: ErrorMessages.VALIDATION.DEFAULT,
      originalError: error,
      statusCode
    }
  }

  // Default: unknown error
  return {
    type: ErrorTypes.UNKNOWN,
    message: errorMessage || ErrorMessages.UNKNOWN.DEFAULT,
    originalError: error
  }
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(error) {
  const parsed = parseError(error)
  return parsed.message
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error) {
  const parsed = parseError(error)
  return parsed.type === ErrorTypes.NETWORK || 
         parsed.type === ErrorTypes.SERVER ||
         parsed.statusCode >= 500
}
