/**
 * Shared API base URL for all frontend API calls.
 * In the desktop app (Tauri), relative URLs hit the asset origin; use a default API base when VITE_API_ORIGIN is unset.
 */
const ENV_ORIGIN = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_ORIGIN
  ? String(import.meta.env.VITE_API_ORIGIN).replace(/\/$/, '')
  : ''
const IS_TAURI = typeof window !== 'undefined' && window.__TAURI__
const DEFAULT_DESKTOP_API = 'https://dice-express.pages.dev'
export const API_ORIGIN = ENV_ORIGIN || (IS_TAURI ? DEFAULT_DESKTOP_API : '')

/**
 * @param {string} path - e.g. 'sign-in', 'markets', 'account'
 * @returns {string} Full URL for the API path (e.g. https://dice-express.pages.dev/api/sign-in or /api/sign-in when same origin)
 */
export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  const suffix = p.startsWith('/api') ? p.slice(4) : p
  const base = API_ORIGIN || ''
  return base ? `${base}/api${suffix}` : `/api${suffix}`
}
