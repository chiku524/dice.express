/**
 * Form Validation Utilities
 * Provides real-time validation feedback
 */

export const validators = {
  required: (value, fieldName) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return `${fieldName} is required`
    }
    return null
  },

  minLength: (min) => (value, fieldName) => {
    if (value && value.length < min) {
      return `${fieldName} must be at least ${min} characters`
    }
    return null
  },

  maxLength: (max) => (value, fieldName) => {
    if (value && value.length > max) {
      return `${fieldName} must be no more than ${max} characters`
    }
    return null
  },

  email: (value, fieldName) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return `${fieldName} must be a valid email address`
    }
    return null
  },

  date: (value, fieldName) => {
    if (value) {
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        return `${fieldName} must be a valid date`
      }
      if (date < new Date()) {
        return `${fieldName} must be in the future`
      }
    }
    return null
  },

  outcomes: (value, fieldName) => {
    if (value) {
      const outcomes = value.split(',').map(o => o.trim()).filter(o => o)
      if (outcomes.length < 2) {
        return `${fieldName} must have at least 2 outcomes`
      }
      if (outcomes.length > 10) {
        return `${fieldName} must have no more than 10 outcomes`
      }
    }
    return null
  }
}

/**
 * Validate a form field
 * @param {string} value - Field value
 * @param {Array} rules - Array of validation rules
 * @param {string} fieldName - Name of the field for error messages
 * @returns {string|null} Error message or null if valid
 */
export function validateField(value, rules, fieldName) {
  for (const rule of rules) {
    if (typeof rule === 'function') {
      const error = rule(value, fieldName)
      if (error) return error
    } else if (typeof rule === 'object' && rule.validator) {
      const error = rule.validator(value, fieldName)
      if (error) return error
    }
  }
  return null
}

/**
 * Validate entire form
 * @param {object} formData - Form data object
 * @param {object} schema - Validation schema { fieldName: [rules] }
 * @returns {object} { isValid: boolean, errors: { fieldName: error } }
 */
export function validateForm(formData, schema) {
  const errors = {}
  
  for (const [fieldName, rules] of Object.entries(schema)) {
    const value = formData[fieldName]
    const error = validateField(value, rules, fieldName)
    if (error) {
      errors[fieldName] = error
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

