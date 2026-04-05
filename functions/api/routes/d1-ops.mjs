/**
 * D1 API: d1-ops
 */
import * as storage from '../../lib/cf-storage.mjs'
import * as d1 from '../lib/d1-shared.mjs'
import { addPips, pipsToCents } from '../../lib/pips-precision.mjs'

export async function tryD1OpsRoutes(ctx) {
  const { db, kv, r2, env, request, path, method, query, body, requestId, jsonResponse } = ctx

// POST /api/add-credits — virtual top-up (Pips added to balance; no blockchain)
if (path === 'add-credits' && method === 'POST') {
  const ops = d1.checkOpsSecret(request, body, env, requestId)
  if (!ops.ok) return ops.response
  const { userParty, accountId, amount } = body
  const party = userParty || accountId
  if (!party || amount === undefined) {
    return jsonResponse({ error: 'userParty or accountId and amount are required' }, 400)
  }
  const amountPipsStr = addPips('0', amount)
  if (pipsToCents(amountPipsStr) <= 0) return jsonResponse({ error: 'amount must be a positive number' }, 400)
  const currentRaw = await storage.getBalanceRaw(db, party)
  const newBalStr = addPips(currentRaw, amountPipsStr)
  await storage.setBalance(db, party, newBalStr)
  return jsonResponse({
    success: true,
    balance: newBalStr,
    previousBalance: currentRaw,
    added: amountPipsStr,
  })
}
  return null
}
