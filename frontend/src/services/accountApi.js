/**
 * Account/onboarding persistence — save and load from API (remote) with local fallback.
 * Display name -> accountId map is stored locally for sign-in lookup.
 */
import { apiUrl } from './apiBase'

const DISPLAY_NAME_MAP_KEY = 'account_display_name_map'

function getDisplayNameMap() {
  try {
    const raw = localStorage.getItem(DISPLAY_NAME_MAP_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/** Get accountId for a display name from local map (used after registration). */
export function getAccountIdByDisplayName(displayName) {
  const key = (displayName || '').trim().toLowerCase()
  if (!key) return null
  const map = getDisplayNameMap()
  return map[key] || null
}

/** Record displayName -> accountId for sign-in lookup. */
export function recordDisplayNameForAccount(displayName, accountId) {
  const key = (displayName || '').trim().toLowerCase()
  if (!key || !accountId) return
  const map = getDisplayNameMap()
  map[key] = accountId
  localStorage.setItem(DISPLAY_NAME_MAP_KEY, JSON.stringify(map))
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
  recordDisplayNameForAccount(displayName, accountId)
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

/**
 * Register with email/password. Persists to D1 and returns account for session.
 * @returns {Promise<{ success: true, account: { accountId, displayName, fundChoice, createdAt } }>}
 */
export async function register({ email, password, displayName, fundChoice }) {
  const res = await fetch(apiUrl('register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: String(email).trim().toLowerCase(),
      password,
      displayName: String(displayName).trim(),
      fundChoice: fundChoice || null,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Registration failed')
  if (data.account) recordDisplayNameForAccount(data.account.displayName, data.account.accountId)
  return data
}

/**
 * Sign in with email/password. Returns account for session restore.
 * @returns {Promise<{ success: true, account: { accountId, displayName, fundChoice, createdAt } }>}
 */
export async function signIn({ email, password }) {
  const res = await fetch(apiUrl('sign-in'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: String(email).trim().toLowerCase(),
      password,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Sign in failed')
  if (data.account) recordDisplayNameForAccount(data.account.displayName, data.account.accountId)
  return data
}
