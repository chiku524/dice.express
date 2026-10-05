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
import { findRelatedMarkets } from '../../lib/related-markets.mjs'
import { consumeRateLimitBucket } from '../../lib/api-rate-limit.mjs'
import {
  USER_MARKET_LIMITS,
  validateUserMarketCreate,
  validateUserMarketResolve,
} from '../../lib/user-market-create.mjs'
import { predictionLog } from '../../lib/prediction-observability.mjs'

function mapMarketRow(r, orderCounts = {}) {
  return {
    contractId: r.contractId,
    templateId: r.templateId,
    payload: {
      ...(r.payload || {}),
      status: r.status === 'Approved' ? 'Active' : r.status,
      source: r.payload?.source ?? 'user',
    },
    party: r.party,
    status: r.status,
    createdAt: r.createdAt,
    openOrderCount: orderCounts[r.contractId] || 0,
  }
}

function isMarketTemplate(r) {
  return (
    r.contractId !== d1.CRON_HEARTBEAT_CONTRACT_ID &&
    (r.templateId === d1.TEMPLATE_VIRTUAL_MARKET || (r.templateId && r.templateId.includes('Market')))
  )
}

/** Resolve by contract id, market-* prefix, or payload.marketId scan. */
async function resolveMarketContract(db, marketId) {
  const id = String(marketId || '').trim()
  if (!id) return null
  let row = await storage.getContractById(db, id)
  if (!row && !id.startsWith('market-')) {
    row = await storage.getContractById(db, `market-${id}`)
  }
  if (row && isMarketTemplate(row)) return row
  const all = await storage.getContracts(db, { limit: 500 })
  return (
    all.find(
      (r) =>
        isMarketTemplate(r) &&
        (r.contractId === id || (r.payload && String(r.payload.marketId) === id))
    ) || null
  )
}

async function createMarketPool(db, r2, env, marketId, marketType, outcomes) {
  const useZeroLiquidity =
    env.AUTO_MARKETS_ZERO_LIQUIDITY === '1' ||
    env.AUTO_MARKETS_ZERO_LIQUIDITY === 'true' ||
    String(env.INITIAL_POOL_LIQUIDITY || '').trim() === '0'
  const initialLiquidity = useZeroLiquidity ? 0 : 1000
  const poolState =
    marketType === 'MultiOutcome'
      ? createPoolStateMulti(marketId, outcomes, initialLiquidity, {})
      : createPoolState(marketId, initialLiquidity, initialLiquidity)
  await storage.upsertContract(db, {
    contract_id: poolState.poolId,
    template_id: 'LiquidityPool',
    payload: poolState,
    party: 'platform',
    status: 'Active',
  })
  await d1.backupToR2(r2, undefined, poolState.poolId, poolState)
  return poolState
}

export async function tryD1MarketsRoutes(ctx) {
  const { db, kv, r2, env, request, path, method, query, body, requestId, jsonResponse } = ctx
  void requestId

  // POST /api/resolve-user-market — creator settles a user-created market
  if (path === 'resolve-user-market' && method === 'POST') {
    const marketId = String(body?.marketId || '').trim()
    if (!marketId) return jsonResponse({ error: 'marketId required' }, 400)
    const row = await resolveMarketContract(db, marketId)
    if (!row || !row.payload) return jsonResponse({ error: 'Market not found' }, 404)

    const checked = validateUserMarketResolve(row.payload, body)
    if (!checked.ok) {
      return jsonResponse({ error: checked.error, ...(checked.details || {}) }, checked.status || 400)
    }

    const accountId = String(body.accountId).trim()
    const rl = await consumeRateLimitBucket(kv, `user-market-resolve:${accountId}`, 30, 60)
    if (!rl.ok) {
      predictionLog('api.user_market.resolve_rate_limited', { accountId, marketId })
      return jsonResponse({ error: 'Too many requests', retryAfterSec: 60 }, 429)
    }

    const resolvedOutcome = checked.value.resolvedOutcome
    const payload = {
      ...row.payload,
      status: 'Settled',
      resolvedOutcome,
      resolvedAt: new Date().toISOString(),
      resolvedBy: accountId,
    }
    await storage.updateContractPayload(db, row.contractId, payload)
    await storage.updateContractStatus(db, row.contractId, 'Settled')
    await d1.backupToR2(r2, undefined, row.contractId, payload)

    const SETTLEMENT_FEE = 0.02
    await d1.settleVirtualMarketPositions(db, row.contractId, resolvedOutcome, { SETTLEMENT_FEE, r2 })
    await storage.clearMarketsCache(kv)

    predictionLog('api.user_market.resolved', {
      marketId: row.contractId,
      accountId,
      resolvedOutcome,
    })

    return jsonResponse({
      success: true,
      market: { contractId: row.contractId, payload, status: 'Settled' },
    })
  }

  // GET/POST /api/markets
  if (path === 'markets') {
    if (method === 'GET') {
      const { source, status, marketId } = query
      const relatedLimit = Math.min(8, Math.max(0, parseInt(String(query.related || '0'), 10) || 0))

      // Single-market detail (+ optional related) — avoids shipping the full list to the client
      if (marketId) {
        const row = await resolveMarketContract(db, marketId)
        if (!row) return jsonResponse({ error: 'Market not found' }, 404)
        const orderCounts = await storage.getOpenP2pOrderCountsByMarket(db)
        const market = mapMarketRow(row, orderCounts)
        let related = []
        if (relatedLimit > 0) {
          const cached = kv ? await storage.getMarketsCache(kv, 'all') : null
          let candidates = Array.isArray(cached?.markets) ? cached.markets : null
          if (!candidates) {
            const all = await storage.getContracts(db, { limit: 200 })
            candidates = all
              .filter((r) => isMarketTemplate(r) && ['Active', 'Approved'].includes(r.status))
              .map((r) => mapMarketRow(r, orderCounts))
          }
          related = findRelatedMarkets(
            market.payload,
            candidates,
            market.contractId,
            market.payload?.marketId,
            relatedLimit
          )
        }
        return jsonResponse({ success: true, market, related, count: 1 })
      }

      const sortRaw = (query.sort || '').toString().toLowerCase()
      const useActivitySort = sortRaw === 'activity' || sortRaw === 'p2p'
      const cached =
        kv && !useActivitySort ? await storage.getMarketsCache(kv, source || 'all') : null
      if (cached) return jsonResponse(cached)

      const all = await storage.getContracts(db, { limit: 500 })
      const orderCounts = await storage.getOpenP2pOrderCountsByMarket(db)
      const marketRows = all.filter(isMarketTemplate)
      const statusFilter = status ? [status] : ['Active', 'Approved']
      let markets = marketRows
        .filter((r) => statusFilter.includes(r.status))
        .map((r) => mapMarketRow(r, orderCounts))
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
      const requestedSource = body?.source == null || body?.source === '' ? 'user' : String(body.source)

      // --- User-created markets (registered account required) ---
      if (requestedSource === 'user') {
        const accountId = String(body?.accountId || '').trim()
        if (!accountId) {
          return jsonResponse(
            { error: 'Sign in to create a market.', required: ['accountId'] },
            401
          )
        }
        const user = await storage.getUserByAccountId(db, accountId)
        if (!user) {
          return jsonResponse(
            {
              error: 'Registered account required to create markets. Sign in with email and password.',
            },
            401
          )
        }

        const validated = validateUserMarketCreate(body)
        if (!validated.ok) {
          return jsonResponse(
            { error: validated.error, ...(validated.details || {}) },
            validated.status || 400
          )
        }

        const rl = await consumeRateLimitBucket(
          kv,
          `user-market-create:${accountId}`,
          USER_MARKET_LIMITS.maxPerDay,
          24 * 60 * 60
        )
        if (!rl.ok) {
          predictionLog('api.user_market.create_rate_limited', { accountId })
          return jsonResponse(
            {
              error: `Daily create limit reached (${USER_MARKET_LIMITS.maxPerDay} markets per day). Try again tomorrow.`,
              retryAfterSec: 24 * 60 * 60,
            },
            429
          )
        }

        const v = validated.value
        const id = `market-user-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`
        const party = String(user.display_name || body?.creator || 'user').trim() || 'user'
        const payload = {
          marketId: id,
          title: v.title,
          description: v.description,
          marketType: v.marketType,
          outcomes: v.outcomes,
          settlementTrigger: v.settlementTrigger,
          resolutionCriteria: v.resolutionCriteria,
          resolutionDeadline: v.resolutionDeadline,
          status: 'Active',
          totalVolume: 0,
          yesVolume: 0,
          noVolume: 0,
          outcomeVolumes: {},
          category: v.category,
          styleLabel: v.styleLabel,
          source: 'user',
          oracleSource: 'manual',
          oneLiner: v.oneLiner,
          creatorAccountId: accountId,
          creatorDisplayName: party,
          createdAt: new Date().toISOString(),
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
        const poolState = await createMarketPool(db, r2, env, id, v.marketType, v.outcomes)
        await storage.clearMarketsCache(kv)

        predictionLog('api.user_market.created', {
          marketId: id,
          accountId,
          category: v.category,
          marketType: v.marketType,
        })

        return jsonResponse({
          success: true,
          market: {
            contractId: id,
            templateId: d1.TEMPLATE_VIRTUAL_MARKET,
            payload: { ...payload },
            party,
            status: 'Active',
          },
          poolId: poolState.poolId,
        })
      }

      // --- Non-user / platform create (ops / scripts; not the public create UI) ---
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
        source,
        creator,
        parentMarketId,
        scalarSpec,
      } = body
      if (!title || !description || !resolutionCriteria) {
        return jsonResponse(
          { error: 'Missing required fields', required: ['title', 'description', 'resolutionCriteria'] },
          400
        )
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
          return jsonResponse(
            { error: 'Multi-outcome markets require at least 2 unique outcome labels (max 8).' },
            400
          )
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
        settlementTrigger:
          typeof settlementTrigger === 'object' ? settlementTrigger : { tag: settlementTrigger },
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
      const poolState = await createMarketPool(db, r2, env, id, mt, normalizedOutcomes)
      await storage.clearMarketsCache(kv)
      return jsonResponse({
        success: true,
        market: {
          contractId: id,
          templateId: d1.TEMPLATE_VIRTUAL_MARKET,
          payload: { ...payload },
          party,
          status: 'Active',
        },
        poolId: poolState.poolId,
      })
    }
  }
  return null
}
