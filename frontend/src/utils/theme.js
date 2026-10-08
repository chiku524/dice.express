/** Theme preference — dark is product default (current design). */

export const THEME_STORAGE_KEY = 'dice.theme'
export const THEMES = /** @type {const} */ (['dark', 'light'])

/**
 * @param {unknown} value
 * @returns {'dark' | 'light' | null}
 */
export function normalizeTheme(value) {
  if (value === 'light' || value === 'dark') return value
  return null
}

/** @returns {'dark' | 'light'} */
export function readStoredTheme() {
  try {
    return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY)) ?? 'dark'
  } catch {
    return 'dark'
  }
}

/** @param {'dark' | 'light'} theme */
export function writeStoredTheme(theme) {
  const next = normalizeTheme(theme) ?? 'dark'
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // private mode / quota
  }
  return next
}

/**
 * Apply theme to document (html[data-theme], color-scheme, theme-color meta).
 * @param {'dark' | 'light'} theme
 */
export function applyThemeToDocument(theme) {
  const next = normalizeTheme(theme) ?? 'dark'
  const root = document.documentElement
  root.dataset.theme = next
  root.style.colorScheme = next

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', next === 'light' ? '#e6ebf2' : '#0a0f14')
  }

  return next
}
