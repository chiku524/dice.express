/**
 * D1 API: d1-markets
 */
import * as storage from '../../lib/cf-storage.mjs'
import * as d1 from '../lib/d1-shared.mjs'
import {
  createPoolState,
  createPoolStateMulti,
} from '../../lib/amm.mjs'
import * as marketDedupe from '../../lib/market-dedupe.mjs'
import { upsertMarketEmbedding } from '../../lib/market-embeddings.mjs'

export async function tryD1MarketsRoutes(ctx) {
  const { db, kv, r2, env, request, path, method, query, body, requestId, jsonResponse } = ctx
  void requestId


// GET/POST /api/markets
if (path === 'markets') {
  if (method === 'GET') {
    const { source, status } = query
    const sortRaw = (query.sort || '').toString().toLowerCase()
    const useActivitySort = sortRaw === 'activity' || sortRaw === 'p2p'
    const cached =
      kv && !useActivitySort ? await storage.getMarketsCache(kv, source || 'all') : null
    if (cached) return jsonResponse(cached)

    const all = await storage.getContracts(db, { limit: 500 })
    const orderCounts = await storage.getOpenP2pOrderCountsByMarket(db)
    const marketRows = all.filter(
      (r) =>
        r.contractId !== d1.CRON_HEARTBEAT_CONTRACT_ID &&
        (r.templateId === d1.TEMPLATE_VIRTUAL_MARKET || (r.templateId && r.templateId.includes('Market')))
    )
    const statusFilter = status ? [status] : ['Active', 'Approved']
    let markets = marketRows
      .filter((r) => statusFilter.includes(r.status))
      .map((r) => ({
        contractId: r.contractId,
        templateId: r.templateId,
        payload: { ...(r.payload || {}), status: r.status === 'Approved' ? 'Active' : r.status, source: r.payload?.source ?? 'user' },
        party: r.party,
        status: r.status,
        createdAt: r.createdAt,
        openOrderCount: orderCounts[r.contractId] || 0,
      }))
    if (source && source !== 'all') {
      markets = markets.filter((m) => (m.payload?.source ?? 'user') === source)
    }
    if (useActivitySort) {
      markets.sort((a, b) => (b.openOrderCount || 0) - (a.openOrderCount || 0))
    }
    const out = { success: true, markets, count: markets.length }
    if (kv && !useActivitySort) await storage.setMarketsCache(kv, source || 'all', out)
    return jsonResponse(out)
  }

  if (method === 'POST') {
    const {
      marketId,
      title,
      description,
      marketType = 'Binary',
      outcomes = ['Yes', 'No'],
      settlementTrigger = 'Manual',
      resolutionCriteria,
      category,
      styleLabel,
      source = 'user',
      creator,
      parentMarketId,
      scalarSpec,
    } = body
    // Only API-driven (auto-markets) creation allowed; no user-created markets
    if (source === 'user') {
      return jsonResponse({ error: 'User-created markets are disabled. Markets are created automatically from external events.' }, 403)
    }
    if (!title || !description || !resolutionCriteria) {
      return jsonResponse({ error: 'Missing required fields', required: ['title', 'description', 'resolutionCriteria'] }, 400)
    }
    const id = marketId || `market-${Date.now()}`
    const party = creator || 'platform'
    let mt = String(marketType || 'Binary')
    if (mt !== 'MultiOutcome') mt = 'Binary'
    let normalizedOutcomes = ['Yes', 'No']
    if (mt === 'MultiOutcome') {
      const raw = Array.isArray(outcomes) ? outcomes : []
      const cleaned = [...new Set(raw.map((o) => String(o).trim()).filter(Boolean))].slice(0, 8)
      if (cleaned.length < 2) {
        return jsonResponse({ error: 'Multi-outcome markets require at least 2 unique outcome labels (max 8).' }, 400)
      }
      normalizedOutcomes = cleaned
    } else if (Array.isArray(outcomes) && outcomes.length === 2) {
      normalizedOutcomes = outcomes.map((o) => String(o).trim())
    }
    const payload = {
      marketId: id,
      title,
      description,
      marketType: mt,
      outcomes: normalizedOutcomes,
      settlementTrigger: typeof settlementTrigger === 'object' ? settlementTrigger : { tag: settlementTrigger },
      resolutionCriteria,
      status: 'Active',
      totalVolume: 0,
      yesVolume: 0,
      noVolume: 0,
      outcomeVolumes: {},
      category: category || null,
      styleLabel: styleLabel || null,
      source,
      createdAt: new Date().toISOString(),
    }
    if (parentMarketId && String(parentMarketId).trim()) {
      payload.parentMarketId = String(parentMarketId).trim()
    }
    if (scalarSpec && typeof scalarSpec === 'object' && !Array.isArray(scalarSpec)) {
      payload.scalarSpec = scalarSpec
    }
    await marketDedupe.assignDedupeKeyToPayload(payload)
    await storage.upsertContract(db, {
      contract_id: id,
      template_id: d1.TEMPLATE_VIRTUAL_MARKET,
      payload,
      party,
      status: 'Active',
    })
    await d1.backupToR2(r2, undefined, id, payload)
    if (!marketDedupe.isFeedTopicPayload(payload)) {
      await upsertMarketEmbedding(env, id, payload)
    }
    const useZeroLiquidity = env.AUTO_MARKETS_ZERO_LIQUIDITY === '1' || env.AUTO_MARKETS_ZERO_LIQUIDITY === 'true' || String(env.INITIAL_POOL_LIQUIDITY || '').trim() === '0'
    const initialLiquidity = useZeroLiquidity ? 0 : 1000
    const poolState =
      mt === 'MultiOutcome'
        ? createPoolStateMulti(id, normalizedOutcomes, initialLiquidity, {})
        : createPoolState(id, initialLiquidity, initialLiquidity)
    await storage.upsertContract(db, {
      contract_id: poolState.poolId,
      template_id: 'LiquidityPool',
      payload: poolState,
      party: 'platform',
      status: 'Active',
    })
    await d1.backupToR2(r2, undefined, poolState.poolId, poolState)
    return jsonResponse({
      success: true,
      market: { contractId: id, templateId: d1.TEMPLATE_VIRTUAL_MARKET, payload: { ...payload }, party, status: 'Active' },
      poolId: poolState.poolId,
    })
  }
}
  return null
}
