/**
 * Account/onboarding persistence — save and load from API (remote) with local fallback.
 */
const API_ORIGIN = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_ORIGIN
  ? import.meta.env.VITE_API_ORIGIN.replace(/\/$/, '')
  : ''

function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_ORIGIN}/api${p.startsWith('/api') ? p.slice(4) : p}`
}

export async function getAccount(accountId) {
  if (!accountId) return null
  try {
    const res = await fetch(`${apiUrl('account')}?accountId=${encodeURIComponent(accountId)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.account || null
  } catch {
    return null
  }
}

export async function saveAccount({ accountId, displayName, onboardingCompleted, fundChoice }) {
  if (!accountId || !displayName) return { success: false }
  try {
    const res = await fetch(apiUrl('account'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId,
        displayName: String(displayName).trim(),
        onboardingCompleted: Boolean(onboardingCompleted),
        fundChoice: fundChoice || null,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to save account')
    }
    return await res.json()
  } catch (err) {
    console.warn('[accountApi] saveAccount failed', err?.message)
    return { success: false }
  }
}
