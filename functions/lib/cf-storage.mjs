/**
 * Cloudflare storage layer: D1 (primary), KV (optional cache), R2 (optional backup).
 * env: { DB, KV?, R2? }
 */

const CONTRACTS_TABLE = 'contracts'
const BALANCES_TABLE = 'user_balances'
const USERS_TABLE = 'users'
const ORDERS_TABLE = 'p2p_orders'
const DEPOSIT_RECORDS_TABLE = 'deposit_records'
const WITHDRAWAL_REQUESTS_TABLE = 'withdrawal_requests'
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

/** Returns raw balance string from DB for precise arithmetic (avoids float). @param {D1Database} db */
export async function getBalanceRaw(db, party) {
  const row = await db.prepare(`SELECT balance FROM ${BALANCES_TABLE} WHERE party = ?`).bind(party).first()
  if (!row || row.balance == null || row.balance === '') return '0'
  const s = String(row.balance).trim()
  return s || '0'
}

/** @param {D1Database} db - balance: number or string (stored as-is, use 2-decimal string for precision) */
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

// --- P2P orders ---

/** @param {D1Database} db */
export async function createOrder(db, { orderId, marketId, outcome, side, amountReal, priceReal, owner }) {
  const now = new Date().toISOString()
  await db.prepare(
    `INSERT INTO ${ORDERS_TABLE} (order_id, market_id, outcome, side, amount_real, price_real, owner, status, amount_remaining, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`
  ).bind(orderId, marketId, outcome, side, amountReal, priceReal, owner, amountReal, now, now).run()
}

/** @param {D1Database} db */
export async function getOpenOrdersByMarket(db, marketId, outcome = null) {
  let query = `SELECT * FROM ${ORDERS_TABLE} WHERE market_id = ? AND status = 'open' AND (amount_remaining IS NULL OR amount_remaining > 0) ORDER BY created_at ASC`
  const params = [marketId]
  if (outcome) {
    query = `SELECT * FROM ${ORDERS_TABLE} WHERE market_id = ? AND outcome = ? AND status = 'open' AND (amount_remaining IS NULL OR amount_remaining > 0) ORDER BY created_at ASC`
    params.push(outcome)
  }
  const { results } = await db.prepare(query).bind(...params).all()
  return (results || []).map((r) => {
    const amountReal = parseFloat(r.amount_real)
    const amountRemaining = r.amount_remaining != null ? parseFloat(r.amount_remaining) : amountReal
    return {
      orderId: r.order_id,
      marketId: r.market_id,
      outcome: r.outcome,
      side: r.side,
      amountReal,
      amountRemaining: amountRemaining > 0 ? amountRemaining : amountReal,
      priceReal: parseFloat(r.price_real),
      owner: r.owner,
      status: r.status,
      createdAt: r.created_at,
    }
  })
}

/** @param {D1Database} db */
export async function getOrderById(db, orderId) {
  const row = await db.prepare(`SELECT * FROM ${ORDERS_TABLE} WHERE order_id = ?`).bind(orderId).first()
  if (!row) return null
  const amountReal = parseFloat(row.amount_real)
  const amountRemaining = row.amount_remaining != null ? parseFloat(row.amount_remaining) : amountReal
  return {
    orderId: row.order_id,
    marketId: row.market_id,
    outcome: row.outcome,
    side: row.side,
    amountReal,
    amountRemaining: amountRemaining > 0 ? amountRemaining : amountReal,
    priceReal: parseFloat(row.price_real),
    owner: row.owner,
    status: row.status,
    counterpartyOrderId: row.counterparty_order_id,
    positionId: row.position_id,
    createdAt: row.created_at,
  }
}

/** @param {D1Database} db */
export async function updateOrderMatched(db, orderId, counterpartyOrderId, positionId) {
  const now = new Date().toISOString()
  await db.prepare(
    `UPDATE ${ORDERS_TABLE} SET status = 'matched', amount_remaining = 0, counterparty_order_id = ?, position_id = ?, updated_at = ? WHERE order_id = ?`
  ).bind(counterpartyOrderId, positionId, now, orderId).run()
}

/** Partial fill: set amount_remaining; if <= 0 set status = 'matched'. Optional last counterparty/position for the final fill. */
export async function updateOrderPartialFill(db, orderId, amountRemaining, { counterpartyOrderId, positionId } = {}) {
  const now = new Date().toISOString()
  const status = amountRemaining <= 0 ? 'matched' : 'open'
  const rem = Math.max(0, amountRemaining)
  if (counterpartyOrderId != null && positionId != null) {
    await db.prepare(
      `UPDATE ${ORDERS_TABLE} SET amount_remaining = ?, status = ?, counterparty_order_id = ?, position_id = ?, updated_at = ? WHERE order_id = ?`
    ).bind(rem, status, counterpartyOrderId, positionId, now, orderId).run()
  } else {
    await db.prepare(
      `UPDATE ${ORDERS_TABLE} SET amount_remaining = ?, status = ?, updated_at = ? WHERE order_id = ?`
    ).bind(rem, status, now, orderId).run()
  }
}

/** @param {D1Database} db */
export async function cancelOrder(db, orderId, owner) {
  const now = new Date().toISOString()
  const r = await db.prepare(
    `UPDATE ${ORDERS_TABLE} SET status = 'cancelled', updated_at = ? WHERE order_id = ? AND owner = ? AND status = 'open'`
  ).bind(now, orderId, owner).run()
  return r.meta.changes > 0
}

// --- Deposits & withdrawals ---

/** Get deposit record by reference_id (e.g. txHash) for idempotency. @param {D1Database} db */
export async function getDepositRecordByReferenceId(db, referenceId) {
  if (!referenceId || String(referenceId).trim() === '') return null
  const row = await db.prepare(
    `SELECT id, party, amount_guap, source, reference_id, created_at FROM ${DEPOSIT_RECORDS_TABLE} WHERE reference_id = ? LIMIT 1`
  ).bind(String(referenceId).trim()).first()
  return row ? { id: row.id, party: row.party, amountPips: row.amount_guap, source: row.source, referenceId: row.reference_id, createdAt: row.created_at } : null
}

/** List deposit records for a party (audit/transparency). @param {D1Database} db */
export async function getDepositRecordsByParty(db, party, limit = 50) {
  const { results } = await db.prepare(
    `SELECT id, party, amount_guap, source, reference_id, created_at FROM ${DEPOSIT_RECORDS_TABLE} WHERE party = ? ORDER BY created_at DESC LIMIT ?`
  ).bind(party, limit).all()
  return (results || []).map((r) => ({
    id: r.id,
    party: r.party,
    amountPips: r.amount_guap,
    source: r.source,
    referenceId: r.reference_id,
    createdAt: r.created_at,
  }))
}

/** @param {D1Database} db */
export async function insertDepositRecord(db, { party, amountPips, source, referenceId }) {
  await db.prepare(
    `INSERT INTO ${DEPOSIT_RECORDS_TABLE} (party, amount_guap, source, reference_id) VALUES (?, ?, ?, ?)`
  ).bind(party, amountPips, source, referenceId || null).run()
}

/** @param {D1Database} db */
export async function insertWithdrawalRequest(db, { requestId, party, amountPips, feePips, netPips, destination, networkId, token }) {
  const now = new Date().toISOString()
  const tok = token === 'native' ? 'native' : 'usdc'
  await db.prepare(
    `INSERT INTO ${WITHDRAWAL_REQUESTS_TABLE} (request_id, party, amount_guap, fee_guap, net_guap, destination, network_id, token, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).bind(requestId, party, amountPips, feePips, netPips, destination, networkId || 'ethereum', tok, now, now).run()
}

/** Count pending withdrawals for a party (for rate limiting). @param {D1Database} db */
export async function countPendingWithdrawalsByParty(db, party) {
  const row = await db.prepare(
    `SELECT COUNT(*) as n FROM ${WITHDRAWAL_REQUESTS_TABLE} WHERE party = ? AND status = 'pending'`
  ).bind(party).first()
  return row ? (row.n || 0) : 0
}

/** @param {D1Database} db */
export async function getWithdrawalRequestsByParty(db, party, limit = 50) {
  const { results } = await db.prepare(
    `SELECT * FROM ${WITHDRAWAL_REQUESTS_TABLE} WHERE party = ? ORDER BY created_at DESC LIMIT ?`
  ).bind(party, limit).all()
  return (results || []).map((r) => ({
    requestId: r.request_id,
    party: r.party,
    amountPips: r.amount_guap,
    feePips: r.fee_guap,
    netPips: r.net_guap,
    destination: r.destination,
    networkId: r.network_id,
    token: r.token || 'usdc',
    status: r.status,
    txHash: r.tx_hash,
    createdAt: r.created_at,
  }))
}

/** Get pending withdrawal requests (oldest first) for processing. @param {D1Database} db */
export async function getPendingWithdrawalRequests(db, limit = 10) {
  const { results } = await db.prepare(
    `SELECT * FROM ${WITHDRAWAL_REQUESTS_TABLE} WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`
  ).bind(limit).all()
  return (results || []).map((r) => ({
    requestId: r.request_id,
    party: r.party,
    amountPips: r.amount_guap,
    feePips: r.fee_guap,
    netPips: r.net_guap,
    destination: r.destination,
    networkId: r.network_id,
    token: r.token || 'usdc',
    status: r.status,
    txHash: r.tx_hash,
    createdAt: r.created_at,
  }))
}

/** Update withdrawal request with tx hash and status. @param {D1Database} db */
export async function updateWithdrawalRequestWithTx(db, requestId, txHash, status = 'sent') {
  const now = new Date().toISOString()
  await db.prepare(
    `UPDATE ${WITHDRAWAL_REQUESTS_TABLE} SET tx_hash = ?, status = ?, updated_at = ? WHERE request_id = ?`
  ).bind(txHash, status, now, requestId).run()
}

/** @param {D1Database} db */
export async function updateWithdrawalStatus(db, requestId, status, txHash = null) {
  const now = new Date().toISOString()
  await db.prepare(
    `UPDATE ${WITHDRAWAL_REQUESTS_TABLE} SET status = ?, tx_hash = ?, updated_at = ? WHERE request_id = ?`
  ).bind(status, txHash || null, now, requestId).run()
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
