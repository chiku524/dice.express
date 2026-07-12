// Utility to create lazy-loaded components with retry logic
// Handles network failures and chunk loading errors

import { lazy } from 'react'

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
            if (isChunkLoadError(error) && retries < maxRetries) {
              retries++
              console.warn(`[lazyWithRetry] Chunk load failed, retrying (${retries}/${maxRetries})...`, error.message)

              if ('caches' in window) {
                caches.keys().then((names) => {
                  names.forEach((name) => {
                    if (name.includes('vite') || name.includes('workbox') || name.includes('assets')) {
                      caches.delete(name)
                    }
                  })
                })
              }

              setTimeout(attemptImport, retryDelay * retries)
            } else {
              console.error('[lazyWithRetry] Failed to load chunk after retries:', error)
              if (isChunkLoadError(error)) {
                const wrapped = new Error(
                  'Failed to load page component. This may be due to a network issue or outdated cache. ' +
                    'Please refresh the page or clear your browser cache.'
                )
                wrapped.name = 'ChunkLoadError'
                wrapped.code = 'CHUNK_LOAD_ERROR'
                wrapped.cause = error
                reject(wrapped)
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
