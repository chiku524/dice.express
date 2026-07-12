/**
 * Runtime environment helpers shared by web and Tauri shells.
 */

/**
 * True when running inside the Tauri desktop webview.
 * Prefer `__TAURI_INTERNALS__` (Tauri 2); fall back to `withGlobalTauri` `__TAURI__`.
 */
export function isTauriApp() {
  if (typeof window === 'undefined') return false
  return !!(window.__TAURI_INTERNALS__ || window.__TAURI__)
}
