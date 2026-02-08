/**
 * Market categories and prediction styles for the platform.
 * Used in Create Market and for filtering/browsing.
 */

export const MARKET_CATEGORIES = [
  { value: 'Finance', label: 'Finance' },
  { value: 'Crypto', label: 'Crypto' },
  { value: 'Sports', label: 'Sports' },
  { value: 'Politics', label: 'Politics' },
  { value: 'Weather', label: 'Weather' },
  { value: 'Entertainment', label: 'Entertainment' },
  { value: 'Science', label: 'Science' },
  { value: 'Other', label: 'Other' },
]

/** Market sources: automated (global events, industry, VR) vs user-created */
export const MARKET_SOURCES = [
  { value: 'all', label: 'All Markets' },
  { value: 'global_events', label: 'Global Events' },
  { value: 'industry', label: 'Industry Topics' },
  { value: 'virtual_realities', label: 'Virtual Realities' },
  { value: 'user', label: 'User-Created' },
]

export function getSourceLabel(value) {
  const s = MARKET_SOURCES.find(x => x.value === value)
  return s ? s.label : value
}

/** Binary-style variants (all use contract MarketType Binary under the hood) */
export const PREDICTION_STYLES = [
  { value: 'yesNo', label: 'Yes / No', marketType: 'Binary', outcomes: ['Yes', 'No'] },
  { value: 'trueFalse', label: 'True / False', marketType: 'Binary', outcomes: ['True', 'False'] },
  { value: 'happensDoesnt', label: "Happens / Doesn't", marketType: 'Binary', outcomes: ['Happens', "Doesn't"] },
  { value: 'multiOutcome', label: 'Multi-Outcome', marketType: 'MultiOutcome', outcomes: null },
]

export function getStyleByValue(value) {
  return PREDICTION_STYLES.find(s => s.value === value) || PREDICTION_STYLES[0]
}

export function getDefaultOutcomesForStyle(styleValue) {
  const style = getStyleByValue(styleValue)
  return style?.outcomes ? [...style.outcomes] : []
}
