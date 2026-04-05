/**
 * D1 API: d1-contracts
 */
import * as storage from '../../lib/cf-storage.mjs'
import * as d1 from '../lib/d1-shared.mjs'
import { consumeRateLimitBucket, contractsListingClientKey } from '../../lib/api-rate-limit.mjs'
import { predictionLog } from '../../lib/prediction-observability.mjs'

export async function tryD1ContractRoutes(ctx) {
  const { db, kv, r2, env, request, path, method, query, body, requestId, jsonResponse } = ctx

// GET /api/get-contracts, POST /api/get-contracts
if (path === 'get-contracts' && (method === 'GET' || method === 'POST')) {
  try {
    const params = method === 'GET' ? query : body
    const { party, templateType, status, limit, marketId: marketIdFilter } = params
    if (party) {
      const rlGc = await consumeRateLimitBucket(kv, `get-contracts:${party}`, 120, 60)
      if (!rlGc.ok) {
        predictionLog('api.get_contracts.rate_limited', { party, backend: rlGc.backend })
        return jsonResponse({ error: 'Too many requests', retryAfterSec: 60 }, 429)
      }
    } else {
      const ipKey = contractsListingClientKey(request)
      const maxUnscoped = ipKey === 'local-dev' ? 400 : ipKey === 'unknown' ? 180 : 90
      const rlIp = await consumeRateLimitBucket(kv, `get-contracts-ip:${ipKey}`, maxUnscoped, 60)
      if (!rlIp.ok) {
        predictionLog('api.get_contracts.rate_limited', { unscoped: true, ipBucket: ipKey, backend: rlIp.backend })
        return jsonResponse({ error: 'Too many requests', retryAfterSec: 60 }, 429)
      }
    }
    const limRaw = limit ? parseInt(limit, 10) : 100
    const lim = Number.isFinite(limRaw) ? Math.min(500, Math.max(1, limRaw)) : 100
    const list = await storage.getContracts(db, {
      party: party || undefined,
      templateType: templateType || undefined,
      status: status || undefined,
      marketId: marketIdFilter || undefined,
      limit: lim,
    })
    const contracts = (list || []).map((c) => ({
      ...c,
      _fromCloudStorage: true,
    }))
    return jsonResponse({ success: true, contracts, count: contracts.length })
  } catch (err) {
    console.error('[api] get-contracts', err)
    return jsonResponse({ success: true, contracts: [], count: 0 })
  }
}

// POST /api/store-contract
if (path === 'store-contract' && method === 'POST') {
  const ops = d1.checkOpsSecret(request, body, env, requestId)
  if (!ops.ok) return ops.response
  const { contractId, templateId, payload, party, updateId, completionOffset, explorerUrl, status } = body
  if (!contractId || !templateId || !party) {
    return jsonResponse({
      error: 'Missing required fields',
      required: ['contractId', 'templateId', 'party'],
    }, 400)
  }
  const contractPayload = payload || {}
  await storage.upsertContract(db, {
    contract_id: contractId,
    template_id: templateId,
    payload: contractPayload,
    party,
    status: status || 'PendingApproval',
    update_id: updateId || null,
    completion_offset: completionOffset || null,
    explorer_url: explorerUrl || null,
  })
  await d1.backupToR2(r2, undefined, contractId, contractPayload)
  return jsonResponse({ success: true, contract: { contract_id: contractId, template_id: templateId, party, status: status || 'PendingApproval' } })
}

// PUT/PATCH /api/update-contract-status
if (path === 'update-contract-status' && (method === 'PUT' || method === 'PATCH')) {
  const { contractId, status, updateId } = body
  const validStatuses = ['PendingApproval', 'Approved', 'Rejected', 'Active', 'Archived']
  if (!status || !validStatuses.includes(status)) {
    return jsonResponse({ error: 'Missing or invalid status', validStatuses }, 400)
  }
  let targetId = contractId
  if (contractId?.startsWith('updateId:')) {
    targetId = await storage.getContractIdByUpdateId(db, contractId.replace('updateId:', ''))
  } else if (!targetId && updateId) {
    targetId = await storage.getContractIdByUpdateId(db, updateId)
  }
  if (!targetId) {
    return jsonResponse({ error: 'Contract not found', contractId: contractId || updateId }, 404)
  }
  const ok = await storage.updateContractStatus(db, targetId, status)
  if (!ok) return jsonResponse({ error: 'Contract not found' }, 404)
  return jsonResponse({ success: true, contract: { contract_id: targetId, status }, message: `Contract status updated to ${status}` })
}
  return null
}
