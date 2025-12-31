// Utility to create lazy-loaded components with retry logic
// Handles network failures and chunk loading errors

import { lazy } from 'react'

/**
 * Create a lazy component with retry logic for failed chunk loads
 * @param {Function} importFunc - Function that returns a dynamic import
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} retryDelay - Delay between retries in ms (default: 1000)
 * @returns {React.LazyExoticComponent} Lazy component with retry logic
 */
export function lazyWithRetry(importFunc, maxRetries = 3, retryDelay = 1000) {
  return lazy(() => {
    return new Promise((resolve, reject) => {
      let retries = 0

      const attemptImport = () => {
        importFunc()
          .then(resolve)
          .catch((error) => {
            // Check if it's a chunk loading error
            const isChunkError = 
              error.message?.includes('Failed to fetch dynamically imported module') ||
              error.message?.includes('Loading chunk') ||
              error.message?.includes('Loading CSS chunk') ||
              error.name === 'ChunkLoadError' ||
              error.code === 'CHUNK_LOAD_ERROR'

            if (isChunkError && retries < maxRetries) {
              retries++
              console.warn(`[lazyWithRetry] Chunk load failed, retrying (${retries}/${maxRetries})...`, error.message)
              
              // Clear cache and retry
              if ('caches' in window) {
                caches.keys().then(names => {
                  names.forEach(name => {
                    if (name.includes('CreateMarket') || name.includes('assets')) {
                      caches.delete(name)
                    }
                  })
                })
              }
              
              // Retry after delay
              setTimeout(attemptImport, retryDelay * retries) // Exponential backoff
            } else {
              // Max retries reached or not a chunk error
              console.error('[lazyWithRetry] Failed to load chunk after retries:', error)
              
              // Try to reload the page as last resort for chunk errors
              if (isChunkError) {
                console.warn('[lazyWithRetry] Attempting page reload to fix chunk loading issue...')
                // Don't auto-reload, let user decide
                reject(new Error(
                  'Failed to load page component. This may be due to a network issue or outdated cache. ' +
                  'Please refresh the page or clear your browser cache.'
                ))
              } else {
                reject(error)
              }
            }
          })
      }

      attemptImport()
    })
  })
}
