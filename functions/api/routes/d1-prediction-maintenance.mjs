/**
 * D1 API: d1-prediction-maintenance
 */
import * as storage from '../../lib/cf-storage.mjs'
import * as d1 from '../lib/d1-shared.mjs'
import {
  backfillVirtualMarketsEmbeddingsChunk,
  deleteMarketEmbeddings,
} from '../../lib/market-embeddings.mjs'
import { predictionLog } from '../../lib/prediction-observability.mjs'

export async function tryD1PredictionMaintenanceRoutes(ctx) {
  const { db, kv, r2, env, request, path, method, query, body, requestId, jsonResponse } = ctx
  void requestId


// POST /api/prediction-maintenance — Vectorize backfill / prune (requires X-Maintenance-Secret or shared cron secret)
if (path === 'prediction-maintenance' && method === 'POST') {
  if (!d1.checkPredictionMaintenanceAuth(request, env, body)) {
    return jsonResponse(
      {
        error: 'Unauthorized',
        message:
          'Set PREDICTION_MAINTENANCE_SECRET or AUTO_MARKETS_CRON_SECRET on Pages, then send X-Maintenance-Secret or X-Cron-Secret (or body.maintenanceSecret / cronSecret).',
      },
      401
    )
  }
  if (!env?.VECTORIZE || !env?.AI) {
    return jsonResponse({ error: 'Bindings missing', message: 'VECTORIZE and AI must be bound for embedding maintenance.' }, 503)
  }
  const action = body.action || query.action
  if (action === 'backfill_embeddings') {
    const limit = Math.min(100, Math.max(1, parseInt(String(body.limit ?? '30'), 10) || 30))
    const afterContractId = body.afterContractId != null ? String(body.afterContractId) : ''
    const rows = await storage.listVirtualMarketsPageForBackfill(db, { afterContractId, limit })
    const lastId = rows.length ? String(rows[rows.length - 1].contract_id) : afterContractId
    const nextAfter = rows.length >= limit ? lastId : null
    const stats = await backfillVirtualMarketsEmbeddingsChunk(env, rows)
    predictionLog('prediction_maintenance.backfill_embeddings', {
      limit,
      afterContractId,
      rowCount: rows.length,
      ...stats,
      nextAfter,
    })
    return jsonResponse({
      success: true,
      action: 'backfill_embeddings',
      ...stats,
      pageRowCount: rows.length,
      nextAfter,
      done: nextAfter == null,
    })
  }
  if (action === 'prune_settled_embeddings') {
    const limit = Math.min(200, Math.max(1, parseInt(String(body.limit ?? '80'), 10) || 80))
    const afterContractId = body.afterContractId != null ? String(body.afterContractId) : ''
    const ids = await storage.listSettledVirtualMarketIdsPage(db, { afterContractId, limit })
    const del = await deleteMarketEmbeddings(env, ids)
    const nextAfter = ids.length >= limit ? ids[ids.length - 1] : null
    predictionLog('prediction_maintenance.prune_settled_embeddings', {
      limit,
      afterContractId,
      idCount: ids.length,
      ...del,
      nextAfter,
    })
    return jsonResponse({
      success: true,
      action: 'prune_settled_embeddings',
      idsProcessed: ids.length,
      ...del,
      nextAfter,
      done: nextAfter == null,
    })
  }
  if (action === 'delete_embeddings_by_ids') {
    const raw = body.contractIds
    const ids = Array.isArray(raw) ? raw.map((x) => String(x)).filter(Boolean) : []
    if (ids.length === 0) {
      return jsonResponse({ error: 'contractIds array required' }, 400)
    }
    const del = await deleteMarketEmbeddings(env, ids.slice(0, 500))
    predictionLog('prediction_maintenance.delete_embeddings_by_ids', { requested: ids.length, ...del })
    return jsonResponse({ success: true, action: 'delete_embeddings_by_ids', ...del })
  }
  return jsonResponse(
    {
      error: 'Unknown action',
      actions: ['backfill_embeddings', 'prune_settled_embeddings', 'delete_embeddings_by_ids'],
    },
    400
  )
}
  return null
}
