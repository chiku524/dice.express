/**
 * D1 API: d1-trade
 */
import * as storage from '../../lib/cf-storage.mjs'
import * as d1 from '../lib/d1-shared.mjs'
import {
  getQuote,
  isTradeWithinLimit,
  applyTrade,
  getQuoteMulti,
  isTradeWithinLimitMulti,
  applyTradeMulti,
  outcomeProbabilityMulti,
} from '../../lib/amm.mjs'

export async function tryD1TradeRoutes(ctx) {
  const { db, kv, r2, env, request, path, method, query, body, requestId, jsonResponse } = ctx
  void requestId


// GET /api/pools
if (path === 'pools' && method === 'GET') {
  const { marketId } = query
  if (!marketId) return jsonResponse({ error: 'marketId required' }, 400)
  const poolId = `pool-${marketId}`
  const row = await storage.getContractById(db, poolId)
  if (!row || row.templateId !== 'LiquidityPool') {
    return jsonResponse({ success: true, pool: null })
  }
  const pool = row.payload || {}
  if (pool.poolKind === 'multi' || (pool.outcomeReserves && Array.isArray(pool.outcomes))) {
    const reserves = pool.outcomeReserves || {}
    const norm = {}
    for (const o of pool.outcomes || []) {
      norm[o] = parseFloat(reserves[o]) || 0
    }
    return jsonResponse({
      success: true,
      pool: {
        poolId: row.contractId,
        marketId: pool.marketId,
        poolKind: 'multi',
        outcomes: pool.outcomes || [],
        outcomeReserves: norm,
        totalLPShares: parseFloat(pool.totalLPShares) || 0,
        feeRate: parseFloat(pool.feeRate) ?? 0.003,
        platformFeeShare: parseFloat(pool.platformFeeShare) ?? 0.2,
        maxTradeReserveFraction: parseFloat(pool.maxTradeReserveFraction) ?? 0.1,
        minLiquidity: parseFloat(pool.minLiquidity) ?? 100,
      },
    })
  }
  return jsonResponse({
    success: true,
    pool: {
      poolId: row.contractId,
      marketId: pool.marketId,
      poolKind: pool.poolKind || 'binary',
      yesReserve: parseFloat(pool.yesReserve) || 0,
      noReserve: parseFloat(pool.noReserve) || 0,
      totalLPShares: parseFloat(pool.totalLPShares) || 0,
      feeRate: parseFloat(pool.feeRate) ?? 0.003,
      platformFeeShare: parseFloat(pool.platformFeeShare) ?? 0.2,
      maxTradeReserveFraction: parseFloat(pool.maxTradeReserveFraction) ?? 0.1,
      minLiquidity: parseFloat(pool.minLiquidity) ?? 100,
    },
  })
}

// POST /api/trade (AMM — can be disabled for P2P-only via env DISABLE_AMM_TRADE)
if (path === 'trade' && method === 'POST') {
  if (env.DISABLE_AMM_TRADE === '1' || env.DISABLE_AMM_TRADE === 'true') {
    return jsonResponse({
      error: 'AMM trading is disabled',
      message: 'Platform is in P2P-only mode. Use the order book or place/create-position when P2P matching is available.',
      code: 'AMM_DISABLED',
    }, 503)
  }
  const { marketId, side, amount, minOut, userId } = body
  if (!marketId || !side || !amount || !userId) {
    return jsonResponse({ error: 'Missing required fields', required: ['marketId', 'side', 'amount', 'userId'] }, 400)
  }
  const amountNum = parseFloat(amount)
  if (isNaN(amountNum) || amountNum <= 0) return jsonResponse({ error: 'amount must be a positive number' }, 400)
  const minOutNum = typeof minOut !== 'undefined' ? parseFloat(minOut) : 0

  const poolId = `pool-${marketId}`
  const poolRow = await storage.getContractById(db, poolId)
  if (!poolRow || poolRow.templateId !== 'LiquidityPool') {
    return jsonResponse({ error: 'Pool not found for this market' }, 404)
  }
  const poolPayload = poolRow.payload || {}
  const marketRowPre = await storage.getContractById(db, marketId)
  const mp = marketRowPre?.payload || {}
  const isMultiMarket = mp.marketType === 'MultiOutcome' && Array.isArray(mp.outcomes) && mp.outcomes.length >= 2
  const isMultiPool = poolPayload.poolKind === 'multi' || (poolPayload.outcomeReserves && Array.isArray(poolPayload.outcomes))

  const currentBal = await storage.getBalance(db, userId)
  if (currentBal < amountNum) {
    return jsonResponse({ error: 'Insufficient balance', currentBalance: currentBal, required: amountNum }, 400)
  }

  if (isMultiMarket && isMultiPool) {
    const sideStr = String(side).trim()
    if (!mp.outcomes.includes(sideStr)) {
      return jsonResponse({ error: 'Invalid outcome for this market', validOutcomes: mp.outcomes }, 400)
    }
    const reserves = { ...(poolPayload.outcomeReserves || {}) }
    for (const o of poolPayload.outcomes || mp.outcomes) {
      if (reserves[o] == null) reserves[o] = 0
    }
    const poolMulti = {
      outcomeReserves: reserves,
      outcomes: (poolPayload.outcomes && poolPayload.outcomes.length ? poolPayload.outcomes : mp.outcomes),
      feeRate: parseFloat(poolPayload.feeRate) ?? 0.003,
      platformFeeShare: parseFloat(poolPayload.platformFeeShare) ?? 0.2,
      maxTradeReserveFraction: parseFloat(poolPayload.maxTradeReserveFraction) ?? 0.1,
    }
    const { outputAmount, feeAmount } = getQuoteMulti(poolMulti, sideStr, amountNum)
    if (outputAmount <= 0) return jsonResponse({ error: 'Trade would result in zero output' }, 400)
    if (outputAmount < minOutNum) return jsonResponse({ error: 'Slippage tolerance exceeded', minOut: minOutNum, outputAmount }, 400)
    if (!isTradeWithinLimitMulti(poolMulti, sideStr, outputAmount)) {
      return jsonResponse({ error: 'Trade size exceeds pool limit' }, 400)
    }
    applyTradeMulti(poolMulti, sideStr, amountNum, outputAmount)
    await storage.setBalance(db, userId, currentBal - amountNum)
    const sumRes = poolMulti.outcomes.reduce((s, o) => s + (poolMulti.outcomeReserves[o] ?? 0), 0)
    const updatedPayload = {
      ...poolPayload,
      poolKind: 'multi',
      outcomes: poolMulti.outcomes,
      outcomeReserves: poolMulti.outcomeReserves,
      totalLPShares: sumRes,
    }
    await storage.updateContractPayload(db, poolId, updatedPayload)

    const positionId = `position-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const price = outcomeProbabilityMulti(poolMulti, sideStr)
    const positionPayload = {
      positionId,
      marketId,
      owner: userId,
      positionType: sideStr,
      amount: outputAmount,
      price,
      costPips: amountNum,
      createdAt: new Date().toISOString(),
    }
    await storage.upsertContract(db, {
      contract_id: positionId,
      template_id: 'Position',
      payload: positionPayload,
      party: userId,
      status: 'Active',
    })
    await d1.backupToR2(r2, undefined, positionId, positionPayload)

    const marketRow = await storage.getContractById(db, marketId)
    if (marketRow?.payload) {
      const p = marketRow.payload
      const totalVolume = (parseFloat(p.totalVolume) || 0) + amountNum
      const ov = { ...(p.outcomeVolumes || {}) }
      ov[sideStr] = (parseFloat(ov[sideStr]) || 0) + outputAmount
      await storage.updateContractPayload(db, marketId, { ...p, totalVolume, outcomeVolumes: ov })
    }

    return jsonResponse({
      success: true,
      positionId,
      outputAmount,
      feeAmount,
      newBalance: currentBal - amountNum,
      pool: {
        poolKind: 'multi',
        outcomes: poolMulti.outcomes,
        outcomeReserves: poolMulti.outcomeReserves,
      },
    })
  }

  const sideNorm = side === 'yes' || side === 'Yes' ? 'Yes' : side === 'no' || side === 'No' ? 'No' : null
  if (!sideNorm) return jsonResponse({ error: 'side must be Yes or No' }, 400)

  const pool = {
    yesReserve: parseFloat(poolPayload.yesReserve) || 0,
    noReserve: parseFloat(poolPayload.noReserve) || 0,
    feeRate: parseFloat(poolPayload.feeRate) ?? 0.003,
    platformFeeShare: parseFloat(poolPayload.platformFeeShare) ?? 0.2,
    maxTradeReserveFraction: parseFloat(poolPayload.maxTradeReserveFraction) ?? 0.1,
  }
  const { outputAmount, feeAmount } = getQuote(pool, sideNorm, amountNum)
  if (outputAmount <= 0) return jsonResponse({ error: 'Trade would result in zero output' }, 400)
  if (outputAmount < minOutNum) return jsonResponse({ error: 'Slippage tolerance exceeded', minOut: minOutNum, outputAmount }, 400)
  if (!isTradeWithinLimit(pool, sideNorm, outputAmount)) return jsonResponse({ error: 'Trade size exceeds pool limit' }, 400)

  applyTrade(pool, sideNorm, amountNum, outputAmount)
  await storage.setBalance(db, userId, currentBal - amountNum)
  const updatedPayload = { ...poolPayload, yesReserve: pool.yesReserve, noReserve: pool.noReserve }
  await storage.updateContractPayload(db, poolId, updatedPayload)

  const positionId = `position-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const price =
    sideNorm === 'Yes'
      ? pool.yesReserve / (pool.yesReserve + pool.noReserve)
      : pool.noReserve / (pool.yesReserve + pool.noReserve)
  const positionPayload = {
    positionId,
    marketId,
    owner: userId,
    positionType: sideNorm,
    amount: outputAmount,
    price,
    costPips: amountNum,
    createdAt: new Date().toISOString(),
  }
  await storage.upsertContract(db, {
    contract_id: positionId,
    template_id: 'Position',
    payload: positionPayload,
    party: userId,
    status: 'Active',
  })
  await d1.backupToR2(r2, undefined, positionId, positionPayload)

  const marketRow = await storage.getContractById(db, marketId)
  if (marketRow?.payload) {
    const p = marketRow.payload
    const totalVolume = (parseFloat(p.totalVolume) || 0) + amountNum
    const yesVolume = (parseFloat(p.yesVolume) || 0) + (sideNorm === 'Yes' ? outputAmount : 0)
    const noVolume = (parseFloat(p.noVolume) || 0) + (sideNorm === 'No' ? outputAmount : 0)
    await storage.updateContractPayload(db, marketId, { ...p, totalVolume, yesVolume, noVolume })
  }

  return jsonResponse({
    success: true,
    positionId,
    outputAmount,
    feeAmount,
    newBalance: currentBal - amountNum,
    pool: { yesReserve: pool.yesReserve, noReserve: pool.noReserve },
  })
}
  return null
}
