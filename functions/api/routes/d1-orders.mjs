/**
 * D1 API: d1-orders
 */
import * as storage from '../../lib/cf-storage.mjs'
import * as d1 from '../lib/d1-shared.mjs'
import { consumeRateLimitBucket } from '../../lib/api-rate-limit.mjs'
import { loadSellCapacityForBinaryOrder } from '../../lib/p2p-order-validation.mjs'
import { predictionLog } from '../../lib/prediction-observability.mjs'

export async function tryD1OrderRoutes(ctx) {
  const { db, kv, r2, env, request, path, method, query, body, requestId, jsonResponse } = ctx
  void requestId


// GET /api/orders — list open P2P orders for a market (optional owner = only that party’s rows)
if (path === 'orders' && method === 'GET') {
  const { marketId, outcome, owner: ownerFilter } = query
  if (!marketId) return jsonResponse({ error: 'marketId required' }, 400)
  let orders = await storage.getOpenOrdersByMarket(db, marketId, outcome || undefined)
  if (ownerFilter) {
    orders = orders.filter((o) => o.owner === ownerFilter)
  }
  return jsonResponse({ success: true, orders })
}

// POST /api/orders — create P2P order (and try match) or cancel
if (path === 'orders' && method === 'POST') {
  const { cancel, orderId, owner, marketId, outcome, side, amount, price, idempotencyKey: idemBody } = body
  if (cancel && orderId && owner) {
    const rlCancel = await consumeRateLimitBucket(kv, `p2p-cancel:${owner}`, 80, 60)
    if (!rlCancel.ok) {
      predictionLog('api.order.rate_limited', { kind: 'cancel', owner })
      return jsonResponse({ error: 'Too many requests', retryAfterSec: 60 }, 429)
    }
    const ok = await storage.cancelOrder(db, orderId, owner)
    if (!ok) return jsonResponse({ error: 'Order not found or already matched/cancelled' }, 404)
    predictionLog('api.order.cancelled', { owner, orderId })
    return jsonResponse({ success: true, cancelled: true })
  }
  if (!marketId || !outcome || !side || amount === undefined || price === undefined || !owner) {
    return jsonResponse({ error: 'Missing fields', required: ['marketId', 'outcome', 'side', 'amount', 'price', 'owner'] }, 400)
  }
  const outcomeNorm = outcome === 'yes' || outcome === 'Yes' ? 'Yes' : outcome === 'no' || outcome === 'No' ? 'No' : outcome
  const sideNorm = side === 'buy' || side === 'sell' ? side : null
  if (!sideNorm || !['Yes', 'No'].includes(outcomeNorm)) {
    return jsonResponse({ error: 'outcome must be Yes/No, side must be buy/sell' }, 400)
  }
  const amountNum = parseFloat(amount)
  const priceNum = parseFloat(price)
  if (isNaN(amountNum) || amountNum <= 0 || isNaN(priceNum) || priceNum < 0 || priceNum > 1) {
    return jsonResponse({ error: 'amount must be positive, price between 0 and 1' }, 400)
  }

  const idemKey = d1.normalizeIdempotencyKey(request.headers.get('Idempotency-Key') || idemBody)
  if (idemKey) {
    const cached = await d1.readP2pOrderIdempotency(kv, owner, idemKey)
    if (cached) {
      try {
        const replay = JSON.parse(cached)
        predictionLog('api.order.idempotent_replay', { owner, marketId })
        return jsonResponse(replay)
      } catch {
        // ignore corrupt KV entry
      }
    }
  }

  const rlPlace = await consumeRateLimitBucket(kv, `p2p-order:${owner}`, 45, 60)
  if (!rlPlace.ok) {
    predictionLog('api.order.rate_limited', { kind: 'place', owner, marketId })
    return jsonResponse({ error: 'Too many requests', retryAfterSec: 60 }, 429)
  }

  if (sideNorm === 'sell') {
    const cap = await loadSellCapacityForBinaryOrder(storage, db, { owner, marketId, outcomeNorm })
    if (amountNum > cap.net + 1e-9) {
      predictionLog('api.order.reject_sell_over', {
        owner,
        marketId,
        outcome: outcomeNorm,
        requested: amountNum,
        held: cap.held,
        reserved: cap.reserved,
        net: cap.net,
      })
      return jsonResponse(
        {
          error: 'Sell size exceeds shares available (after open sell orders)',
          code: 'SELL_EXCEEDS_POSITION',
          heldShares: cap.held,
          reservedInOpenSells: cap.reserved,
          availableToSell: cap.net,
        },
        400
      )
    }
  }

  const stake = outcomeNorm === 'Yes'
    ? (sideNorm === 'buy' ? amountNum * priceNum : amountNum * (1 - priceNum))
    : (sideNorm === 'buy' ? amountNum * (1 - priceNum) : amountNum * priceNum)
  const bal = await storage.getBalance(db, owner)
  if (bal < stake) {
    const shortfall = Math.max(0, stake - bal)
    predictionLog('api.order.insufficient_balance', { owner, side: sideNorm, required: stake, current: bal, shortfall })
    return jsonResponse(
      { error: 'Insufficient balance', required: stake, current: bal, shortfall },
      400
    )
  }

  const newOrderId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  await storage.createOrder(db, {
    orderId: newOrderId,
    marketId,
    outcome: outcomeNorm,
    side: sideNorm,
    amountReal: amountNum,
    priceReal: priceNum,
    owner,
  })

  const oppositeSide = sideNorm === 'buy' ? 'sell' : 'buy'
  let remainingToFill = amountNum
  let totalFilled = 0
  let lastSettlePrice = null
  let lastPositionId = null
  let lastMatchOrderId = null

  while (remainingToFill > 0) {
    const openOrders = await storage.getOpenOrdersByMarket(db, marketId, outcomeNorm)
    const matchOrder = openOrders.find(
      (o) => o.owner !== owner && o.side === oppositeSide && o.orderId !== newOrderId &&
        (sideNorm === 'buy' ? o.priceReal <= priceNum : o.priceReal >= priceNum) &&
        (o.amountRemaining ?? o.amountReal) > 0
    )
    if (!matchOrder) break

    const matchRemaining = matchOrder.amountRemaining ?? matchOrder.amountReal
    const fillAmount = Math.min(remainingToFill, matchRemaining)
    if (fillAmount <= 0) break

    const otherStake = outcomeNorm === 'Yes'
      ? (oppositeSide === 'buy' ? fillAmount * matchOrder.priceReal : fillAmount * (1 - matchOrder.priceReal))
      : (oppositeSide === 'buy' ? fillAmount * (1 - matchOrder.priceReal) : fillAmount * matchOrder.priceReal)
    const myStakeForFill = outcomeNorm === 'Yes'
      ? (sideNorm === 'buy' ? fillAmount * priceNum : fillAmount * (1 - priceNum))
      : (sideNorm === 'buy' ? fillAmount * (1 - priceNum) : fillAmount * priceNum)
    const otherBal = await storage.getBalance(db, matchOrder.owner)
    if (otherBal < otherStake) break

    const settlePrice = (priceNum + matchOrder.priceReal) / 2
    const posIdA = `position-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const posIdB = `position-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const positionPayloadA = {
      positionId: posIdA,
      marketId,
      owner,
      positionType: outcomeNorm,
      amount: fillAmount,
      price: settlePrice,
      costPips: myStakeForFill,
      counterpartyPositionId: posIdB,
      createdAt: new Date().toISOString(),
    }
    const positionPayloadB = {
      positionId: posIdB,
      marketId,
      owner: matchOrder.owner,
      positionType: outcomeNorm === 'Yes' ? 'No' : 'Yes',
      amount: fillAmount,
      price: outcomeNorm === 'Yes' ? 1 - settlePrice : settlePrice,
      costPips: otherStake,
      counterpartyPositionId: posIdA,
      createdAt: new Date().toISOString(),
    }

    const myBal = await storage.getBalance(db, owner)
    if (myBal < myStakeForFill) break

    await storage.setBalance(db, owner, myBal - myStakeForFill)
    await storage.setBalance(db, matchOrder.owner, otherBal - otherStake)
    await storage.upsertContract(db, { contract_id: posIdA, template_id: 'Position', payload: positionPayloadA, party: owner, status: 'Active' })
    await storage.upsertContract(db, { contract_id: posIdB, template_id: 'Position', payload: positionPayloadB, party: matchOrder.owner, status: 'Active' })

    const matchNewRemaining = matchRemaining - fillAmount
    if (matchNewRemaining <= 0) {
      await storage.updateOrderMatched(db, matchOrder.orderId, newOrderId, posIdB)
    } else {
      await storage.updateOrderPartialFill(db, matchOrder.orderId, matchNewRemaining)
    }

    remainingToFill -= fillAmount
    totalFilled += fillAmount
    lastSettlePrice = settlePrice
    lastPositionId = posIdA
    lastMatchOrderId = matchOrder.orderId
    if (r2) d1.backupToR2(r2, undefined, posIdA, positionPayloadA).catch(() => {})
    if (r2) d1.backupToR2(r2, undefined, posIdB, positionPayloadB).catch(() => {})

    const marketRow = await storage.getContractById(db, marketId)
    if (marketRow?.payload) {
      const p = marketRow.payload
      const totalVolume = (parseFloat(p.totalVolume) || 0) + fillAmount * 2
      const yesVol = (parseFloat(p.yesVolume) || 0) + (outcomeNorm === 'Yes' ? fillAmount : 0)
      const noVol = (parseFloat(p.noVolume) || 0) + (outcomeNorm === 'No' ? fillAmount : 0)
      await storage.updateContractPayload(db, marketId, { ...p, totalVolume, yesVolume: yesVol, noVolume: noVol })
    }
  }

  if (remainingToFill < amountNum) {
    await storage.updateOrderPartialFill(db, newOrderId, remainingToFill, remainingToFill <= 0 && lastMatchOrderId && lastPositionId ? { counterpartyOrderId: lastMatchOrderId, positionId: lastPositionId } : undefined)
  }
  const hadMatch = totalFilled > 0
  /** @type {Record<string, unknown>} */
  let responseBody
  if (hadMatch) {
    responseBody = {
      success: true,
      matched: true,
      orderId: newOrderId,
      positionId: lastPositionId,
      amountFilled: totalFilled,
      amountRemaining: remainingToFill,
      price: lastSettlePrice,
      message: remainingToFill > 0 ? `Partially filled: ${totalFilled} matched, ${remainingToFill} left on the book.` : 'Fully filled.',
    }
  } else {
    responseBody = {
      success: true,
      matched: false,
      orderId: newOrderId,
      message: 'Order placed. It will fill when someone takes the other side (any size up to your amount).',
    }
  }
  if (idemKey) await d1.writeP2pOrderIdempotency(kv, owner, idemKey, JSON.stringify(responseBody))
  predictionLog('api.order.completed', {
    matched: responseBody.matched,
    orderId: newOrderId,
    marketId,
    owner,
    amountFilled: hadMatch ? totalFilled : 0,
  })
  return jsonResponse(responseBody)
}
  return null
}
