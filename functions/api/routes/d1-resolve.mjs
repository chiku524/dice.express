/**
 * D1 API: d1-resolve
 */
import * as storage from '../../lib/cf-storage.mjs'
import * as d1 from '../lib/d1-shared.mjs'
import { deleteMarketEmbeddings } from '../../lib/market-embeddings.mjs'
import { predictionLog } from '../../lib/prediction-observability.mjs'
import * as resolveMarkets from '../../lib/resolve-markets.mjs'

export async function tryD1ResolveRoutes(ctx) {
  const { db, kv, r2, env, request, path, method, query, body, requestId, jsonResponse } = ctx

// POST /api/resolve-markets — resolve due markets from oracle APIs and settle (call from cron or manually)
if (path === 'resolve-markets' && method === 'POST') {
  const ops = d1.checkOpsSecret(request, body, env, requestId)
  if (!ops.ok) return ops.response
  const resolveStarted = Date.now()
  const all = await storage.getContracts(db, { limit: 500 })
  const marketRows = all.filter(
    (r) => (r.templateId === d1.TEMPLATE_VIRTUAL_MARKET || (r.templateId && r.templateId.includes('Market'))) &&
      r.status === 'Active' &&
      (r.payload?.oracleSource || r.payload?.source) &&
      r.payload?.source !== 'user'
  )
  const due = marketRows.filter((m) => resolveMarkets.isMarketDueForResolution(m, env))
  const SETTLEMENT_FEE = 0.02
  const resolved = []
  let resolveErrors = 0
  for (const market of due) {
    try {
      const result = await resolveMarkets.resolveOutcome(env, market)
      const { resolved: didResolve, outcome, meta } = result
      if (!didResolve || outcome === undefined) {
        if (meta?.didFetch && !meta?.skippedThrottle) {
          const src = market.payload?.oracleSource || market.payload?.source
          if (src === 'operator_manual' && market.payload?.oracleConfig) {
            const p = market.payload
            const next = {
              ...p,
              oracleConfig: { ...p.oracleConfig, lastOperatorNewsFetchAt: new Date().toISOString() },
            }
            await storage.updateContractPayload(db, market.contractId, next)
            await d1.backupToR2(r2, undefined, market.contractId, next).catch(() => {})
            market.payload = next
          }
        }
        continue
      }
      const marketId = market.contractId
      const payload = { ...market.payload, status: 'Settled', resolvedOutcome: outcome }
      await storage.updateContractPayload(db, marketId, payload)
      await d1.backupToR2(r2, undefined, marketId, payload)
      await d1.settleVirtualMarketPositions(db, marketId, outcome, { SETTLEMENT_FEE, r2 })
      resolved.push({ marketId, outcome })
      if (env?.VECTORIZE) {
        const delEmb = await deleteMarketEmbeddings(env, [marketId])
        if (!delEmb.ok && delEmb.reason === 'delete_failed') {
          predictionLog('resolve_markets.embedding_delete_failed', { marketId, reason: delEmb.reason })
        }
      }
    } catch (err) {
      resolveErrors += 1
      console.error('[resolve-markets]', market.contractId, err?.message)
    }
  }
  predictionLog('resolve_markets.complete', {
    httpRequestId: requestId,
    ms: Date.now() - resolveStarted,
    due: due.length,
    resolved: resolved.length,
    resolveErrors,
  })
  try {
    await d1.upsertAutomationHeartbeat(db, r2, {
      lastResolveAt: new Date().toISOString(),
      lastResolveDue: due.length,
      lastResolveResolved: resolved.length,
      lastResolveErrors: resolveErrors,
    })
  } catch (hbErr) {
    console.error('[resolve-markets] heartbeat', hbErr?.message)
  }
  return jsonResponse({ success: true, due: due.length, resolved: resolved.length, markets: resolved })
}

// POST /api/resolve-markets-preview — dry-run due markets (no D1 settlement writes); ops secret if configured
if (path === 'resolve-markets-preview' && method === 'POST') {
  const ops = d1.checkOpsSecret(request, body, env, requestId)
  if (!ops.ok) return ops.response
  const maxN = Math.min(100, Math.max(1, parseInt(body?.limit ?? '40', 10) || 40))
  const all = await storage.getContracts(db, { limit: 500 })
  const marketRows = all.filter((r) => resolveMarkets.isVirtualAutoMarketRow(r))
  const due = resolveMarkets.filterDueResolutionMarkets(marketRows, env).slice(0, maxN)
  const previews = []
  for (const market of due) {
    try {
      const result = await resolveMarkets.resolveOutcome(env, market, { dryRun: true })
      previews.push({
        marketId: market.contractId,
        title: market.payload?.title,
        resolutionDeadline: market.payload?.resolutionDeadline,
        oracleSource: market.payload?.oracleSource || market.payload?.source,
        marketType: market.payload?.marketType,
        customType: market.payload?.oracleConfig?.customType ?? null,
        wouldResolve: result.resolved === true,
        outcome: result.outcome,
        meta: result.meta || null,
      })
    } catch (err) {
      previews.push({
        marketId: market.contractId,
        title: market.payload?.title,
        error: err?.message || String(err),
      })
    }
  }
  predictionLog('resolve_markets.preview', {
    httpRequestId: requestId,
    dueScanned: due.length,
    previews: previews.length,
  })
  return jsonResponse({
    success: true,
    dryRun: true,
    dueTotal: resolveMarkets.filterDueResolutionMarkets(marketRows, env).length,
    scanned: due.length,
    previews,
  })
}

// POST /api/update-market-status (optionally settle P2P positions: pay winners, 2% fee)
if (path === 'update-market-status' && method === 'POST') {
  const { marketId, status, resolvedOutcome } = body
  if (!marketId) return jsonResponse({ error: 'marketId required' }, 400)
  const row = await storage.getContractById(db, marketId)
  if (!row || !row.payload) return jsonResponse({ error: 'Market not found' }, 404)
  const payload = { ...row.payload }
  if (status) payload.status = status
  if (resolvedOutcome !== undefined) payload.resolvedOutcome = resolvedOutcome
  await storage.updateContractPayload(db, marketId, payload)
  await d1.backupToR2(r2, undefined, marketId, payload)

  if (status === 'Settled' && env?.VECTORIZE) {
    const delEmb = await deleteMarketEmbeddings(env, [marketId])
    if (!delEmb.ok && delEmb.reason === 'delete_failed') {
      predictionLog('update_market_status.embedding_delete_failed', { marketId, reason: delEmb.reason })
    }
  }

  const SETTLEMENT_FEE = 0.02
  if (status === 'Settled' && resolvedOutcome) {
    await d1.settleVirtualMarketPositions(db, marketId, resolvedOutcome, { SETTLEMENT_FEE, r2 })
  }

  return jsonResponse({ success: true, market: { contractId: marketId, payload } })
}

// POST /api/create-position
if (path === 'create-position' && method === 'POST') {
  const ops = d1.checkOpsSecret(request, body, env, requestId)
  if (!ops.ok) return ops.response
  const { marketId, positionType, amount, price, owner } = body
  if (!marketId || !positionType || amount === undefined || price === undefined || !owner) {
    return jsonResponse({
      error: 'Missing required fields',
      required: ['marketId', 'positionType', 'amount', 'price', 'owner'],
    }, 400)
  }
  const amountNum = parseFloat(amount)
  const priceNum = parseFloat(price)
  if (isNaN(amountNum) || amountNum <= 0) return jsonResponse({ error: 'Invalid amount' }, 400)
  if (isNaN(priceNum) || priceNum < 0 || priceNum > 1) return jsonResponse({ error: 'Invalid price', message: 'Price must be between 0.0 and 1.0' }, 400)

  const currentBal = await storage.getBalance(db, owner)
  if (currentBal < amountNum) {
    return jsonResponse({
      error: 'Insufficient balance',
      message: `You have ${currentBal} GP but need ${amountNum} GP.`,
      currentBalance: String(currentBal),
      requiredAmount: String(amountNum),
    }, 400)
  }

  let marketRow = await storage.getContractById(db, marketId)
  if (!marketRow) {
    const all = await storage.getContracts(db, { limit: 500 })
    marketRow = all.find(
      (r) =>
        (r.templateId === d1.TEMPLATE_VIRTUAL_MARKET || (r.templateId && r.templateId.includes('Market'))) &&
        ['Active', 'Approved'].includes(r.status) &&
        (r.contractId === marketId || (r.payload && r.payload.marketId === marketId))
    )
  }
  if (!marketRow) {
    return jsonResponse({ error: 'Market not found', message: `No approved market found with marketId: ${marketId}` }, 404)
  }

  const positionId = `position-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const contractId = `position-${positionId}`
  const templateId = (marketRow.templateId || '').includes('VirtualMarket') ? 'Position' : `${(marketRow.templateId || '').split(':')[0] || 'PredictionMarkets'}:Position`
  const costPipsCreate =
    positionType === 'No' ? amountNum * (1 - priceNum) : amountNum * priceNum
  const positionPayload = {
    positionId,
    marketId,
    owner,
    positionType: positionType === 'Yes' || positionType === 'No' ? positionType : `Outcome:${positionType}`,
    amount: String(amountNum),
    price: String(priceNum),
    costPips: costPipsCreate,
    createdAt: new Date().toISOString(),
    depositAmount: String(amountNum),
    depositCurrency: 'Credits',
    depositStatus: 'completed',
    depositTimestamp: new Date().toISOString(),
  }
  await storage.upsertContract(db, {
    contract_id: contractId,
    template_id: templateId,
    payload: positionPayload,
    party: owner,
    status: 'Active',
  })
  await d1.backupToR2(r2, undefined, contractId, positionPayload)

  const p = marketRow.payload || {}
  const newTotalVolume = (parseFloat(p.totalVolume) || 0) + amountNum
  let newYesVolume = parseFloat(p.yesVolume) || 0
  let newNoVolume = parseFloat(p.noVolume) || 0
  const newOutcomeVolumes = { ...(p.outcomeVolumes || {}) }
  if (positionType === 'Yes') newYesVolume += amountNum
  else if (positionType === 'No') newNoVolume += amountNum
  else newOutcomeVolumes[positionType] = String((parseFloat(newOutcomeVolumes[positionType]) || 0) + amountNum)

  await storage.updateContractPayload(db, marketRow.contractId, {
    ...p,
    totalVolume: newTotalVolume,
    yesVolume: newYesVolume,
    noVolume: newNoVolume,
    outcomeVolumes: newOutcomeVolumes,
  })

  await storage.setBalance(db, owner, currentBal - amountNum)

  return jsonResponse({
    success: true,
    position: { contract_id: contractId, template_id: templateId, payload: positionPayload, party: owner, status: 'Active' },
    market: marketRow,
    volumes: { totalVolume: newTotalVolume, yesVolume: newYesVolume, noVolume: newNoVolume, outcomeVolumes: newOutcomeVolumes },
  })
}
  return null
}
