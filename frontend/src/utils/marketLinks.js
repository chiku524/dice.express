/** Canonical path segment for a market (no leading slash). */
export function marketPathForId(marketId) {
  if (marketId == null || marketId === '') return ''
  return `market/${encodeURIComponent(String(marketId))}`
}

/** Full URL for sharing / clipboard (browser only). */
export function getAbsoluteMarketUrl(marketId) {
  if (typeof window === 'undefined' || marketId == null || marketId === '') return ''
  return `${window.location.origin}/${marketPathForId(marketId)}`
}

export async function copyTextToClipboard(text) {
  if (!text) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** True when the browser exposes the Web Share API (common on mobile). */
export function canUseWebShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

/**
 * Opens the system share sheet when supported.
 * @returns {Promise<{ ok: boolean, cancelled?: boolean, reason?: 'unsupported' | 'error' }>}
 */
export async function shareMarketNative({ title, text, url }) {
  if (!canUseWebShare()) return { ok: false, reason: 'unsupported' }
  try {
    await navigator.share({
      title: (title && String(title).slice(0, 200)) || '',
      text: (text && String(text).slice(0, 280)) || '',
      url: url || '',
    })
    return { ok: true }
  } catch (e) {
    if (e?.name === 'AbortError') return { ok: true, cancelled: true }
    return { ok: false, reason: 'error' }
  }
}
