/**
 * Human-readable “member since” / calendar date from an ISO string.
 * @param {string} isoString
 * @param {{ includeDay?: boolean, month?: 'long' | 'short' }} [opts]
 */
export function formatMemberSince(isoString, { includeDay = false, month = 'long' } = {}) {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString(undefined, {
      month,
      ...(includeDay ? { day: 'numeric' } : {}),
      year: 'numeric',
    })
  } catch {
    return ''
  }
}
