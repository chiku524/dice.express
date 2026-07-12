/**
 * Runtime environment helpers shared by web and Tauri shells.
 */

/** True when running inside the Tauri desktop webview. */
export function isTauriApp() {
  return typeof window !== 'undefined' && !!window.__TAURI__
}
