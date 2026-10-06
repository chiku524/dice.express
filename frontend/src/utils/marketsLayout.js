/** Browse/detail layout preference: Gallery, List, Grid (persisted). */

export const MARKETS_LAYOUT_STORAGE_KEY = 'dice.markets.layout.v2'
const MARKETS_LAYOUT_LEGACY_KEY = 'dice.markets.layout.v1'

export const VALID_MARKETS_LAYOUTS = new Set(['gallery', 'list', 'grid'])
export const DEFAULT_MARKETS_LAYOUT = 'gallery'

/** Control order: Gallery, then List, then Grid. */
export const MARKETS_LAYOUT_OPTIONS = [
  { value: 'gallery', label: 'Gallery', title: 'Immersive tiles' },
  { value: 'list', label: 'List', title: 'Compact rows' },
  { value: 'grid', label: 'Grid', title: 'Card tiles' },
]

const LEGACY_LAYOUT_MAP = {
  cards: 'grid',
  compact: 'list',
  list: 'list',
  gallery: 'gallery',
  grid: 'grid',
}

export function marketStatusClass(status) {
  const statusMap = {
    Active: 'status-active',
    Resolving: 'status-resolving',
    Settled: 'status-settled',
    PendingApproval: 'status-pending',
    AutoPending: 'status-pending',
    AutoRejected: 'status-pending',
  }
  return statusMap[status] || 'status-pending'
}

function normalizeLayout(value) {
  if (!value) return null
  if (VALID_MARKETS_LAYOUTS.has(value)) return value
  const mapped = LEGACY_LAYOUT_MAP[value]
  return mapped && VALID_MARKETS_LAYOUTS.has(mapped) ? mapped : null
}

export function readMarketsLayout() {
  try {
    const current = localStorage.getItem(MARKETS_LAYOUT_STORAGE_KEY)
    const fromCurrent = normalizeLayout(current)
    if (fromCurrent) return fromCurrent
    const legacy = localStorage.getItem(MARKETS_LAYOUT_LEGACY_KEY)
    const fromLegacy = normalizeLayout(legacy)
    if (fromLegacy) return fromLegacy
  } catch {
    /* ignore */
  }
  return DEFAULT_MARKETS_LAYOUT
}

export function writeMarketsLayout(layout) {
  const next = normalizeLayout(layout) || DEFAULT_MARKETS_LAYOUT
  try {
    localStorage.setItem(MARKETS_LAYOUT_STORAGE_KEY, next)
  } catch {
    /* ignore */
  }
  return next
}

export function layoutContainerClass(layout) {
  if (layout === 'gallery') return 'market-gallery market-gallery--below-toolbar'
  if (layout === 'grid') return 'market-grid market-grid--below-toolbar'
  return 'market-list market-list--below-toolbar'
}
