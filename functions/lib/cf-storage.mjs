/**
 * Cloudflare storage layer: D1 (primary), KV (optional cache), R2 (optional backup).
 * env: { DB, KV?, R2? }
 */

const CONTRACTS_TABLE = 'contracts'
const BALANCES_TABLE = 'user_balances'
const USERS_TABLE = 'users'
const KV_CACHE_TTL = 60 // seconds for markets list cache

function safeJsonParse(str, fallback = {}) {
  if (typeof str !== 'string') return fallback
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

/** @param {D1Database} db */
export async function getContracts(db, { party, templateType, status, limit = 100 } = {}) {
  let query = `SELECT * FROM ${CONTRACTS_TABLE} ORDER BY created_at DESC LIMIT ?`
  const params = [limit]
  const conditions = []
  if (party) {
    conditions.push('party = ?')
    params.push(party)
  }
  if (templateType) {
    conditions.push('(template_id = ? OR template_id LIKE ?)')
    params.push(templateType, `%${templateType}%`)
  }
  if (status) {
    conditions.push('status = ?')
    params.push(status)
  }
  if (conditions.length) {
    query = `SELECT * FROM ${CONTRACTS_TABLE} WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT ?`
    params.push(limit)
  }
  const stmt = db.prepare(query).bind(...params)
  const { results } = await stmt.all()
  return (results || []).map((row) => ({
    contractId: row.contract_id,
    templateId: row.template_id,
    payload: safeJsonParse(row.payload),
    party: row.party,
    status: row.status,
    updateId: row.update_id,
    completionOffset: row.completion_offset,
    explorerUrl: row.explorer_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

/** @param {D1Database} db */
export async function getContractById(db, contractId) {
  const row = await db.prepare(`SELECT * FROM ${CONTRACTS_TABLE} WHERE contract_id = ?`).bind(contractId).first()
  if (!row) return null
  return {
    contractId: row.contract_id,
    templateId: row.template_id,
    payload: safeJsonParse(row.payload),
    party: row.party,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** @param {D1Database} db */
export async function upsertContract(db, { contract_id, template_id, payload, party, status, update_id, completion_offset, explorer_url }) {
  const now = new Date().toISOString()
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload || {})
  await db.prepare(
    `INSERT INTO ${CONTRACTS_TABLE} (contract_id, template_id, payload, party, status, update_id, completion_offset, explorer_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(contract_id) DO UPDATE SET
       template_id = excluded.template_id,
       payload = excluded.payload,
       party = excluded.party,
       status = excluded.status,
       update_id = excluded.update_id,
       completion_offset = excluded.completion_offset,
       explorer_url = excluded.explorer_url,
       updated_at = excluded.updated_at`
  ).bind(contract_id, template_id, payloadStr, party, status || 'Active', update_id || null, completion_offset || null, explorer_url || null, now, now).run()
}

/** @param {D1Database} db */
export async function updateContractPayload(db, contractId, payload) {
  const now = new Date().toISOString()
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload)
  const r = await db.prepare(`UPDATE ${CONTRACTS_TABLE} SET payload = ?, updated_at = ? WHERE contract_id = ?`).bind(payloadStr, now, contractId).run()
  return r.meta.changes > 0
}

/** @param {D1Database} db */
export async function updateContractStatus(db, contractId, status) {
  const now = new Date().toISOString()
  const r = await db.prepare(`UPDATE ${CONTRACTS_TABLE} SET status = ?, updated_at = ? WHERE contract_id = ?`).bind(status, now, contractId).run()
  return r.meta.changes > 0
}

/** @param {D1Database} db - resolve contract_id from update_id for status updates */
export async function getContractIdByUpdateId(db, updateId) {
  const row = await db.prepare(`SELECT contract_id FROM ${CONTRACTS_TABLE} WHERE update_id = ?`).bind(updateId).first()
  return row ? row.contract_id : null
}

/** @param {D1Database} db */
export async function getBalance(db, party) {
  const row = await db.prepare(`SELECT balance FROM ${BALANCES_TABLE} WHERE party = ?`).bind(party).first()
  return row ? parseFloat(row.balance) || 0 : 0
}

/** @param {D1Database} db */
export async function setBalance(db, party, balance) {
  const now = new Date().toISOString()
  const balanceStr = typeof balance === 'number' ? String(balance) : String(balance)
  await db.prepare(
    `INSERT INTO ${BALANCES_TABLE} (party, balance, created_at, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(party) DO UPDATE SET balance = excluded.balance, updated_at = excluded.updated_at`
  ).bind(party, balanceStr, now, now).run()
}

/** Optional: get markets list from KV cache. */
export async function getMarketsCache(kv, source) {
  if (!kv) return null
  const key = source && source !== 'all' ? `markets:${source}` : 'markets:all'
  const raw = await kv.get(key)
  return raw ? JSON.parse(raw) : null
}

/** Optional: set markets list in KV cache. */
export async function setMarketsCache(kv, source, list, ttlSeconds = KV_CACHE_TTL) {
  if (!kv) return
  const key = source && source !== 'all' ? `markets:${source}` : 'markets:all'
  await kv.put(key, JSON.stringify(list), { expirationTtl: ttlSeconds })
}

/** Optional: write contract payload to R2 for backup (key = contract_id). bucketName is for reference; R2 put uses the binding. */
export async function backupContractToR2(r2, _bucketName, contractId, payload) {
  if (!r2) return
  const key = `contracts/${contractId}.json`
  await r2.put(key, JSON.stringify(payload), { httpMetadata: { contentType: 'application/json' } })
}

// --- Users (email/password auth) ---

/** @param {D1Database} db */
export async function getUserByEmail(db, email) {
  const row = await db.prepare(`SELECT * FROM ${USERS_TABLE} WHERE email = ?`).bind(String(email).trim().toLowerCase()).first()
  return row ? { id: row.id, email: row.email, password_hash: row.password_hash, salt: row.salt, account_id: row.account_id, display_name: row.display_name, fund_choice: row.fund_choice, onboarding_completed: row.onboarding_completed, created_at: row.created_at, updated_at: row.updated_at } : null
}

/** @param {D1Database} db */
export async function createUser(db, { email, passwordHash, salt, accountId, displayName, fundChoice, onboardingCompleted }) {
  const now = new Date().toISOString()
  const emailNorm = String(email).trim().toLowerCase()
  await db.prepare(
    `INSERT INTO ${USERS_TABLE} (email, password_hash, salt, account_id, display_name, fund_choice, onboarding_completed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(emailNorm, passwordHash, salt, accountId, String(displayName).trim(), fundChoice || null, onboardingCompleted !== undefined ? (onboardingCompleted ? 1 : 0) : 1, now, now).run()
}
