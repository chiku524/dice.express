/**
 * Cloudflare Pages Function: /api/* router.
 * All API is served from D1 (+ optional KV cache, R2). Set env.DB in wrangler.toml.
 * If BACKEND_URL is set and DB is not bound: proxy to external origin (optional).
 */
import * as storage from '../lib/cf-storage.mjs'
import { getQuote, isTradeWithinLimit, applyTrade, createPoolState } from '../lib/amm.mjs'
import { hashPassword, verifyPassword } from '../lib/auth.mjs'
import * as dataSources from '../lib/data-sources.mjs'
import * as resolveMarkets from '../lib/resolve-markets.mjs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS,DELETE',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization',
}

const TEMPLATE_VIRTUAL_MARKET = 'VirtualMarket'
const R2_BUCKET_NAME = 'dice-express-r2'

/** Fire-and-forget R2 backup; never throws. */
async function backupToR2(r2, bucketName, contractId, payload) {
  if (!r2) return
  try {
    await storage.backupContractToR2(r2, bucketName || R2_BUCKET_NAME, contractId, payload)
  } catch (e) {
    console.warn('[R2 backup]', contractId, e?.message)
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

function getPath(context) {
  const p = context.params?.path
  if (Array.isArray(p)) return p[p.length - 1] || ''
  return typeof p === 'string' ? p : ''
}

export async function onRequest(context) {
  const { request, env } = context
  const path = getPath(context)
  const method = request.method

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const db = env.DB
  const kv = env.KV
  const backendBase = env.BACKEND_URL

  // Prefer D1-native API when DB is bound
  if (db) {
    try {
      if (path === 'stripe-webhook' && method === 'POST') {
        const rawBody = await request.text()
        const res = await handleStripeWebhook(db, env.R2, rawBody, request.headers, env)
        if (res) return res
      }
      const res = await handleWithD1(db, kv, env.R2, request, path, method, env)
      if (res) return res
    } catch (err) {
      console.error('[api]', path, err)
      return jsonResponse({ error: 'Internal server error', message: err?.message }, 500)
    }
  }

  // Fallback: proxy to backend
  if (!backendBase) {
    return jsonResponse({
      error: 'API not configured',
      hint: 'Set DB (D1) in wrangler.toml, or set BACKEND_URL in Cloudflare env to your API origin.',
    }, 503)
  }

  const base = backendBase.replace(/\/$/, '')
  const url = new URL(request.url)
  const targetPath = path ? `/api/${path}` : '/api'
  const targetUrl = `${base}${targetPath}${url.search}`

  const headers = new Headers(request.headers)
  headers.delete('Host')
  headers.delete('cf-connecting-ip')
  headers.delete('cf-ray')
  headers.delete('x-forwarded-host')
  if (url.host) headers.set('X-Forwarded-Host', url.host)

  const init = { method, headers, redirect: 'follow' }
  if (method !== 'GET' && method !== 'HEAD') init.body = request.body

  let res
  try {
    res = await fetch(targetUrl, init)
  } catch (err) {
    return jsonResponse({ error: 'Proxy request failed', message: err?.message }, 502)
  }

  const resHeaders = new Headers(res.headers)
  Object.entries(CORS).forEach(([k, v]) => resHeaders.set(k, v))
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: resHeaders })
}

async function parseBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return {}
  try {
    return await request.json()
  } catch {
    return {}
  }
}

/** Verify Stripe webhook signature (v1) and return payload or null */
async function verifyStripeWebhook(rawBody, signatureHeader, secret) {
  if (!secret || !signatureHeader) return null
  const parts = signatureHeader.split(',').reduce((acc, p) => {
    const [k, v] = p.split('=')
    if (k && v) acc[k.trim()] = v.trim()
    return acc
  }, {})
  const t = parts.t
  const v1 = parts.v1
  if (!t || !v1) return null
  const payload = t + '.' + rawBody
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
  if (hex !== v1) return null
  try {
    return JSON.parse(rawBody)
  } catch {
    return null
  }
}

/** Handle Stripe webhook: checkout.session.completed → credit Guap */
async function handleStripeWebhook(db, r2, rawBody, headers, env) {
  const sig = headers.get('Stripe-Signature')
  const secret = env.STRIPE_WEBHOOK_SECRET
  const event = secret ? await verifyStripeWebhook(rawBody, sig, secret) : JSON.parse(rawBody)
  if (!event || !event.type) return jsonResponse({ received: true }, 200)
  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object
    const userParty = session?.client_reference_id || session?.metadata?.userParty
    const amountTotal = session?.amount_total
    if (!userParty) {
      console.warn('[stripe-webhook] No client_reference_id')
      return jsonResponse({ received: true }, 200)
    }
    const guapAmount = amountTotal ? amountTotal / 100 : 0
    if (guapAmount <= 0) return jsonResponse({ received: true }, 200)
    const current = await storage.getBalance(db, userParty)
    const newBal = current + guapAmount
    await storage.setBalance(db, userParty, newBal)
    await storage.insertDepositRecord(db, {
      party: userParty,
      amountGuap: guapAmount,
      source: 'stripe',
      referenceId: session.id,
    })
  }
  return jsonResponse({ received: true }, 200)
}

async function handleWithD1(db, kv, r2, request, path, method, env = {}) {
  const url = new URL(request.url)
  const query = Object.fromEntries(url.searchParams)
  const body = await parseBody(request)

  // GET /api/health
  if (path === 'health' && method === 'GET') {
    return jsonResponse({ ok: true, provider: 'cloudflare' })
  }

  // GET /api/stripe-packages — return Pips package config from wrangler [vars] (STRIPE_PRODUCT_5 etc.) for frontend
  if (path === 'stripe-packages' && method === 'GET') {
    const packages = [
      { amount: 5, productId: env.STRIPE_PRODUCT_5 || null, label: '$5' },
      { amount: 10, productId: env.STRIPE_PRODUCT_10 || null, label: '$10' },
      { amount: 25, productId: env.STRIPE_PRODUCT_25 || null, label: '$25' },
      { amount: 50, productId: env.STRIPE_PRODUCT_50 || null, label: '$50' },
      { amount: 100, productId: env.STRIPE_PRODUCT_100 || null, label: '$100' },
    ]
    return jsonResponse({ packages })
  }

  // GET /api/oracle?symbol= — proxy to RedStone (e.g. for price oracles)
  if (path === 'oracle' && method === 'GET') {
    const symbol = query.symbol
    if (!symbol) return jsonResponse({ error: 'Symbol parameter is required' }, 400)
    try {
      const res = await fetch(
        `https://api.redstone.finance/prices?symbol=${encodeURIComponent(symbol)}&provider=redstone`,
        { headers: { Accept: 'application/json' } }
      )
      if (!res.ok) throw new Error(`Oracle returned ${res.status}`)
      const data = await res.json()
      return jsonResponse(data)
    } catch (err) {
      return jsonResponse({ error: 'Oracle request failed', message: err?.message }, 502)
    }
  }

  // POST /api/stripe-create-checkout-session — create Stripe Checkout; redirect user to pay; webhook credits Pips
  // Accepts: amount (custom PP), priceId (price_xxx), or productId (prod_xxx) — productId is resolved to default price via Stripe API
  if (path === 'stripe-create-checkout-session' && method === 'POST') {
    const stripeKey = env.STRIPE_SECRET_KEY
    if (!stripeKey) return jsonResponse({ error: 'Stripe not configured', hint: 'Set STRIPE_SECRET_KEY' }, 503)
    const { amount, priceId, productId, userParty, successUrl, cancelUrl } = body
    const origin = new URL(request.url).origin
    const baseParams = {
      'mode': 'payment',
      'client_reference_id': String(userParty),
      'success_url': successUrl || `${origin}/portfolio?stripe=success`,
      'cancel_url': cancelUrl || `${origin}/portfolio?stripe=cancel`,
    }
    if (!userParty) return jsonResponse({ error: 'userParty required' }, 400)
    let resolvedPriceId = (priceId && typeof priceId === 'string' && priceId.startsWith('price_')) ? priceId : null
    if (!resolvedPriceId && productId && typeof productId === 'string' && productId.startsWith('prod_')) {
      const productRes = await fetch(`https://api.stripe.com/v1/products/${encodeURIComponent(productId)}`, {
        headers: { Authorization: `Bearer ${stripeKey}` },
      })
      const product = await productRes.json()
      if (product.error) return jsonResponse({ error: product.error.message || 'Stripe product error' }, 400)
      const defaultPrice = product.default_price
      resolvedPriceId = (defaultPrice && typeof defaultPrice === 'object' && defaultPrice.id) ? defaultPrice.id : (typeof defaultPrice === 'string' ? defaultPrice : null)
      if (!resolvedPriceId) return jsonResponse({ error: 'Product has no default price; set one in Stripe Dashboard', hint: 'Products → [product] → Pricing' }, 400)
    }
    let params
    if (resolvedPriceId) {
      params = new URLSearchParams({
        ...baseParams,
        'line_items[0][price]': resolvedPriceId,
        'line_items[0][quantity]': '1',
      })
    } else {
      const amountGuap = parseFloat(amount)
      if (!amountGuap || amountGuap < 1) return jsonResponse({ error: 'amount (min 1), priceId, or productId required' }, 400)
      const amountCents = Math.round(amountGuap * 100)
      params = new URLSearchParams({
        ...baseParams,
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][unit_amount]': String(amountCents),
        'line_items[0][price_data][product_data][name]': 'Pips',
        'line_items[0][quantity]': '1',
      })
    }
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    const data = await res.json()
    if (data.error) return jsonResponse({ error: data.error.message || 'Stripe error' }, 400)
    return jsonResponse({ url: data.url, sessionId: data.id })
  }

  // POST /api/deposit-crypto — credit Guap after crypto deposit (platform wallet received funds; call from admin or automation)
  if (path === 'deposit-crypto' && method === 'POST') {
    const { userParty, accountId, amount, networkId, txHash } = body
    const party = userParty || accountId
    if (!party || amount === undefined) return jsonResponse({ error: 'userParty/accountId and amount required' }, 400)
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) return jsonResponse({ error: 'amount must be positive' }, 400)
    const current = await storage.getBalance(db, party)
    const newBal = current + amountNum
    await storage.setBalance(db, party, newBal)
    await storage.insertDepositRecord(db, {
      party,
      amountGuap: amountNum,
      source: 'crypto',
      referenceId: txHash || null,
    })
    return jsonResponse({
      success: true,
      balance: String(newBal),
      added: String(amountNum),
      networkId: networkId || null,
    })
  }

  // POST /api/withdraw-request — debit Guap, create withdrawal request (platform wallet sends crypto separately)
  if (path === 'withdraw-request' && method === 'POST') {
    const feeRate = parseFloat(env.WITHDRAWAL_FEE_RATE || '0.02')
    const feeMin = parseFloat(env.WITHDRAWAL_FEE_MIN || '1')
    const { userParty, accountId, amount, destinationAddress, networkId } = body
    const party = userParty || accountId
    if (!party || amount === undefined || !destinationAddress) {
      return jsonResponse({ error: 'userParty/accountId, amount, and destinationAddress required' }, 400)
    }
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) return jsonResponse({ error: 'amount must be positive' }, 400)
    const fee = Math.max(amountNum * feeRate, feeMin)
    const net = amountNum - fee
    if (net <= 0) return jsonResponse({ error: 'Amount too small after fee' }, 400)
    const current = await storage.getBalance(db, party)
    if (current < amountNum) return jsonResponse({ error: 'Insufficient balance', current, required: amountNum }, 400)
    const requestId = `wd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    await storage.setBalance(db, party, current - amountNum)
    await storage.insertWithdrawalRequest(db, {
      requestId,
      party,
      amountGuap: amountNum,
      feeGuap: fee,
      netGuap: net,
      destination: destinationAddress,
      networkId: networkId || 'ethereum',
    })
    return jsonResponse({
      success: true,
      requestId,
      amount: amountNum,
      fee,
      net,
      destination: destinationAddress,
      networkId: networkId || 'ethereum',
      message: 'Withdrawal queued. Funds will be sent from the platform wallet.',
    })
  }

  // GET /api/withdrawal-requests — list withdrawal requests for a user
  if (path === 'withdrawal-requests' && method === 'GET') {
    const userParty = query.userParty || query.accountId
    if (!userParty) return jsonResponse({ error: 'userParty or accountId required' }, 400)
    const list = await storage.getWithdrawalRequestsByParty(db, userParty)
    return jsonResponse({ success: true, requests: list })
  }

  // POST /api/add-credits — virtual top-up (Credits added to balance; no blockchain)
  if (path === 'add-credits' && method === 'POST') {
    const { userParty, accountId, amount } = body
    const party = userParty || accountId
    if (!party || amount === undefined) {
      return jsonResponse({ error: 'userParty or accountId and amount are required' }, 400)
    }
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) return jsonResponse({ error: 'amount must be a positive number' }, 400)
    const current = await storage.getBalance(db, party)
    const newBal = current + amountNum
    await storage.setBalance(db, party, newBal)
    return jsonResponse({
      success: true,
      balance: String(newBal),
      previousBalance: String(current),
      added: String(amountNum),
    })
  }

  // GET /api/orders — list open P2P orders for a market
  if (path === 'orders' && method === 'GET') {
    const { marketId, outcome } = query
    if (!marketId) return jsonResponse({ error: 'marketId required' }, 400)
    const orders = await storage.getOpenOrdersByMarket(db, marketId, outcome || undefined)
    return jsonResponse({ success: true, orders })
  }

  // POST /api/orders — create P2P order (and try match) or cancel
  if (path === 'orders' && method === 'POST') {
    const { cancel, orderId, owner, marketId, outcome, side, amount, price } = body
    if (cancel && orderId && owner) {
      const ok = await storage.cancelOrder(db, orderId, owner)
      if (!ok) return jsonResponse({ error: 'Order not found or already matched/cancelled' }, 404)
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
    const stake = outcomeNorm === 'Yes'
      ? (sideNorm === 'buy' ? amountNum * priceNum : amountNum * (1 - priceNum))
      : (sideNorm === 'buy' ? amountNum * (1 - priceNum) : amountNum * priceNum)
    const bal = await storage.getBalance(db, owner)
    if (bal < stake) return jsonResponse({ error: 'Insufficient balance', required: stake, current: bal }, 400)

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
      if (r2) backupToR2(r2, undefined, posIdA, positionPayloadA).catch(() => {})
      if (r2) backupToR2(r2, undefined, posIdB, positionPayloadB).catch(() => {})

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
    if (hadMatch) {
      return jsonResponse({
        success: true,
        matched: true,
        orderId: newOrderId,
        positionId: lastPositionId,
        amountFilled: totalFilled,
        amountRemaining: remainingToFill,
        price: lastSettlePrice,
        message: remainingToFill > 0 ? `Partially filled: ${totalFilled} matched, ${remainingToFill} left on the book.` : 'Fully filled.',
      })
    }

    return jsonResponse({
      success: true,
      matched: false,
      orderId: newOrderId,
      message: 'Order placed. It will fill when someone takes the other side (any size up to your amount).',
    })
  }

  // GET /api/get-contracts, POST /api/get-contracts
  if (path === 'get-contracts' && (method === 'GET' || method === 'POST')) {
    try {
      const params = method === 'GET' ? query : body
      const { party, templateType, status, limit } = params
      const list = await storage.getContracts(db, {
        party: party || undefined,
        templateType: templateType || undefined,
        status: status || undefined,
        limit: limit ? parseInt(limit, 10) : 100,
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
    await backupToR2(r2, undefined, contractId, contractPayload)
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

  // GET /api/account — load persisted account/onboarding (by accountId)
  if (path === 'account' && method === 'GET') {
    const accountId = query.accountId
    if (!accountId) return jsonResponse({ error: 'accountId required' }, 400)
    const row = await storage.getContractById(db, accountId)
    if (!row || row.templateId !== 'UserAccount') {
      return jsonResponse({ success: true, account: null })
    }
    const payload = row.payload || {}
    return jsonResponse({
      success: true,
      account: {
        accountId: row.contractId,
        displayName: payload.displayName ?? row.party,
        onboardingCompleted: payload.onboardingCompleted ?? false,
        fundChoice: payload.fundChoice ?? null,
        createdAt: payload.createdAt ?? row.createdAt,
      },
    })
  }

  // POST /api/account — persist account/onboarding (local + remote)
  if (path === 'account' && method === 'POST') {
    const { accountId, displayName, onboardingCompleted, fundChoice } = body
    if (!accountId || !displayName) {
      return jsonResponse({ error: 'accountId and displayName required' }, 400)
    }
    const now = new Date().toISOString()
    const payload = {
      displayName: String(displayName).trim(),
      onboardingCompleted: Boolean(onboardingCompleted),
      fundChoice: fundChoice || null,
      createdAt: now,
    }
    await storage.upsertContract(db, {
      contract_id: accountId,
      template_id: 'UserAccount',
      payload,
      party: payload.displayName,
      status: 'Active',
    })
    await backupToR2(r2, undefined, accountId, payload)
    return jsonResponse({ success: true, account: { accountId, ...payload } })
  }

  // POST /api/register — create user with email/password, persist to D1 and UserAccount contract
  if (path === 'register' && method === 'POST') {
    const { email, password, displayName, fundChoice } = body
    const emailTrim = (email || '').trim().toLowerCase()
    const displayNameTrim = (displayName || '').trim()
    if (!emailTrim || !password || !displayNameTrim) {
      return jsonResponse({ error: 'Email, password, and display name are required' }, 400)
    }
    if (password.length < 8) {
      return jsonResponse({ error: 'Password must be at least 8 characters' }, 400)
    }
    const emailSimple = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailSimple.test(emailTrim)) {
      return jsonResponse({ error: 'Please enter a valid email address' }, 400)
    }
    const existing = await storage.getUserByEmail(db, emailTrim)
    if (existing) {
      return jsonResponse({ error: 'An account with this email already exists' }, 409)
    }
    const accountId = 'acc_' + crypto.randomUUID().replace(/-/g, '')
    const { hash: passwordHash, salt } = await hashPassword(password)
    await storage.createUser(db, {
      email: emailTrim,
      passwordHash,
      salt,
      accountId,
      displayName: displayNameTrim,
      fundChoice: fundChoice || null,
      onboardingCompleted: true,
    })
    const now = new Date().toISOString()
    const payload = { displayName: displayNameTrim, onboardingCompleted: true, fundChoice: fundChoice || null, createdAt: now }
    await storage.upsertContract(db, { contract_id: accountId, template_id: 'UserAccount', payload, party: displayNameTrim, status: 'Active' })
    await backupToR2(r2, undefined, accountId, payload)
    return jsonResponse({ success: true, account: { accountId, displayName: displayNameTrim, fundChoice: fundChoice || null, createdAt: now } })
  }

  // POST /api/sign-in — verify email/password, return account for session restore
  if (path === 'sign-in' && method === 'POST') {
    const { email, password } = body
    const emailTrim = (email || '').trim().toLowerCase()
    if (!emailTrim || !password) {
      return jsonResponse({ error: 'Email and password are required' }, 400)
    }
    const user = await storage.getUserByEmail(db, emailTrim)
    if (!user) {
      return jsonResponse({ error: 'Invalid email or password' }, 401)
    }
    const ok = await verifyPassword(password, user.salt, user.password_hash)
    if (!ok) {
      return jsonResponse({ error: 'Invalid email or password' }, 401)
    }
    return jsonResponse({
      success: true,
      account: {
        accountId: user.account_id,
        displayName: user.display_name,
        fundChoice: user.fund_choice ?? null,
        createdAt: user.created_at,
      },
    })
  }

  // GET/POST /api/get-user-balance
  if (path === 'get-user-balance' && (method === 'GET' || method === 'POST')) {
    const { userParty } = method === 'GET' ? query : body
    if (!userParty) return jsonResponse({ error: 'User party required', message: 'Please provide userParty' }, 400)
    let bal = await storage.getBalance(db, userParty)
    // Ensure row exists (create with 0 if not)
    await storage.setBalance(db, userParty, bal)
    return jsonResponse({ success: true, balance: String(bal) })
  }

  // POST /api/update-user-balance
  if (path === 'update-user-balance' && method === 'POST') {
    const { userParty, amount, operation } = body
    if (!userParty || amount === undefined || !operation) {
      return jsonResponse({ error: 'Missing required fields', required: ['userParty', 'amount', 'operation'] }, 400)
    }
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum)) return jsonResponse({ error: 'Invalid amount' }, 400)
    const current = await storage.getBalance(db, userParty)
    let newBal = current
    if (operation === 'add') newBal = current + amountNum
    else if (operation === 'subtract') {
      newBal = current - amountNum
      if (newBal < 0) {
        return jsonResponse({ error: 'Insufficient balance', currentBalance: current }, 400)
      }
    } else {
      return jsonResponse({ error: 'Invalid operation', message: 'Operation must be "add" or "subtract"' }, 400)
    }
    await storage.setBalance(db, userParty, newBal)
    return jsonResponse({
      success: true,
      balance: String(newBal),
      previousBalance: String(current),
      newBalance: String(newBal),
      operation,
      amount: String(amountNum),
    })
  }

  // GET/POST /api/auto-markets — list events from APIs or seed markets from them
  if (path === 'auto-markets') {
    const action = query.action || (method === 'POST' ? (body.action || 'seed') : 'events')
    const source = query.source || body?.source || 'sports'
    const limit = Math.min(parseInt(query.limit || body?.limit || '10', 10) || 10, 50)
    const sportKey = query.sport || body?.sport || 'basketball_nba'

    if (method === 'GET' && action === 'events') {
      let events = []
      try {
        if (source === 'sports') {
          events = await dataSources.eventsFromOdds(env, sportKey, limit)
        } else if (source === 'alpha_vantage' || source === 'stocks') {
          events = await dataSources.eventsFromAlphaVantage(env, dataSources.ALPHA_VANTAGE_SYMBOLS.slice(0, 5))
        } else if (source === 'crypto' || source === 'coingecko') {
          events = await dataSources.eventsFromCoinGecko(env, dataSources.COINGECKO_COINS.slice(0, 5))
        } else if (source === 'openweather' || source === 'weather') {
          events = await dataSources.eventsFromOpenWeather(env, dataSources.WEATHER_CITIES?.slice(0, 3) || ['London', 'New York'])
        } else if (source === 'weatherapi') {
          events = await dataSources.eventsFromWeatherApi(env, dataSources.WEATHER_CITIES?.slice(0, 3) || ['London', 'New York'])
        } else if (source === 'gnews' || source === 'news') {
          events = await dataSources.eventsFromGNews(env, query.category || 'general', limit)
        } else if (source === 'perigon') {
          events = await dataSources.eventsFromPerigon(env, query.q || body?.q || 'technology', limit)
        } else {
          return jsonResponse({ error: 'Unknown source', supported: ['sports', 'stocks', 'crypto', 'weather', 'openweather', 'weatherapi', 'news', 'gnews', 'perigon'] }, 400)
        }
      } catch (err) {
        console.error('[auto-markets] events', source, err)
        return jsonResponse({ error: 'Failed to fetch events', message: err?.message }, 502)
      }
      return jsonResponse({ success: true, source, events, count: events.length })
    }

    if (method === 'POST' && action === 'seed') {
      let events = []
      try {
        if (source === 'sports') {
          events = await dataSources.eventsFromOdds(env, sportKey, limit)
        } else if (source === 'alpha_vantage' || source === 'stocks') {
          events = await dataSources.eventsFromAlphaVantage(env, dataSources.ALPHA_VANTAGE_SYMBOLS.slice(0, 5))
        } else if (source === 'crypto' || source === 'coingecko') {
          events = await dataSources.eventsFromCoinGecko(env, dataSources.COINGECKO_COINS.slice(0, 5))
        } else if (source === 'openweather' || source === 'weather') {
          events = await dataSources.eventsFromOpenWeather(env, dataSources.WEATHER_CITIES?.slice(0, 3) || ['London', 'New York'])
        } else if (source === 'weatherapi') {
          events = await dataSources.eventsFromWeatherApi(env, dataSources.WEATHER_CITIES?.slice(0, 3) || ['London', 'New York'])
        } else if (source === 'gnews' || source === 'news') {
          events = await dataSources.eventsFromGNews(env, body?.category || 'general', limit)
        } else if (source === 'perigon') {
          events = await dataSources.eventsFromPerigon(env, body?.q || 'technology', limit)
        } else {
          return jsonResponse({ error: 'Unknown source', supported: ['sports', 'stocks', 'crypto', 'weather', 'openweather', 'weatherapi', 'news', 'gnews', 'perigon'] }, 400)
        }
      } catch (err) {
        console.error('[auto-markets] seed fetch', source, err)
        return jsonResponse({ error: 'Failed to fetch events', message: err?.message }, 502)
      }
      const created = []
      for (const ev of events) {
        const id = ev.id ? `market-${ev.id}` : `market-${ev.source}-${Date.now()}-${created.length}`
        const payload = {
          marketId: id,
          title: ev.title,
          description: ev.description || ev.title,
          marketType: 'Binary',
          outcomes: ['Yes', 'No'],
          settlementTrigger: { tag: 'Manual' },
          resolutionCriteria: ev.resolutionCriteria || ev.title,
          status: 'Active',
          totalVolume: 0,
          yesVolume: 0,
          noVolume: 0,
          outcomeVolumes: {},
          category: ev.source,
          styleLabel: ev.source,
          source: ev.source,
          oracleSource: ev.oracleSource || ev.source,
          oracleConfig: ev.oracleConfig || {},
          createdAt: new Date().toISOString(),
        }
        await storage.upsertContract(db, {
          contract_id: id,
          template_id: TEMPLATE_VIRTUAL_MARKET,
          payload,
          party: 'platform',
          status: 'Active',
        })
        await backupToR2(r2, undefined, id, payload)
        const poolState = createPoolState(id, 1000, 1000)
        await storage.upsertContract(db, {
          contract_id: poolState.poolId,
          template_id: 'LiquidityPool',
          payload: poolState,
          party: 'platform',
          status: 'Active',
        })
        await backupToR2(r2, undefined, poolState.poolId, poolState)
        created.push({ marketId: id, title: ev.title, source: ev.source })
      }
      // Markets list cache will refresh on next GET (TTL)
      return jsonResponse({ success: true, source, created, count: created.length })
    }

    return jsonResponse({ error: 'Use GET ?action=events&source=... or POST { action: "seed", source: ... }' }, 400)
  }

  // GET/POST /api/markets
  if (path === 'markets') {
    if (method === 'GET') {
      const { source, status } = query
      const cached = kv ? await storage.getMarketsCache(kv, source || 'all') : null
      if (cached) return jsonResponse(cached)

      const all = await storage.getContracts(db, { limit: 500 })
      const marketRows = all.filter(
        (r) => r.templateId === TEMPLATE_VIRTUAL_MARKET || (r.templateId && r.templateId.includes('Market'))
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
        }))
      if (source && source !== 'all') {
        markets = markets.filter((m) => (m.payload?.source ?? 'user') === source)
      }
      const out = { success: true, markets, count: markets.length }
      if (kv) await storage.setMarketsCache(kv, source || 'all', out)
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
      const payload = {
        marketId: id,
        title,
        description,
        marketType,
        outcomes: Array.isArray(outcomes) ? outcomes : ['Yes', 'No'],
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
      await storage.upsertContract(db, {
        contract_id: id,
        template_id: TEMPLATE_VIRTUAL_MARKET,
        payload,
        party,
        status: 'Active',
      })
      await backupToR2(r2, undefined, id, payload)
      const poolState = createPoolState(id, 1000, 1000)
      await storage.upsertContract(db, {
        contract_id: poolState.poolId,
        template_id: 'LiquidityPool',
        payload: poolState,
        party: 'platform',
        status: 'Active',
      })
      await backupToR2(r2, undefined, poolState.poolId, poolState)
      return jsonResponse({
        success: true,
        market: { contractId: id, templateId: TEMPLATE_VIRTUAL_MARKET, payload: { ...payload }, party, status: 'Active' },
        poolId: poolState.poolId,
      })
    }
  }

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
    return jsonResponse({
      success: true,
      pool: {
        poolId: row.contractId,
        marketId: pool.marketId,
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
    const sideNorm = side === 'yes' || side === 'Yes' ? 'Yes' : side === 'no' || side === 'No' ? 'No' : null
    if (!sideNorm) return jsonResponse({ error: 'side must be Yes or No' }, 400)
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) return jsonResponse({ error: 'amount must be a positive number' }, 400)
    const minOutNum = typeof minOut !== 'undefined' ? parseFloat(minOut) : 0

    const poolId = `pool-${marketId}`
    const poolRow = await storage.getContractById(db, poolId)
    if (!poolRow || poolRow.templateId !== 'LiquidityPool') {
      return jsonResponse({ error: 'Pool not found for this market' }, 404)
    }
    const poolPayload = poolRow.payload || {}
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

    const currentBal = await storage.getBalance(db, userId)
    if (currentBal < amountNum) {
      return jsonResponse({ error: 'Insufficient balance', currentBalance: currentBal, required: amountNum }, 400)
    }

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
      createdAt: new Date().toISOString(),
    }
    await storage.upsertContract(db, {
      contract_id: positionId,
      template_id: 'Position',
      payload: positionPayload,
      party: userId,
      status: 'Active',
    })
    await backupToR2(r2, undefined, positionId, positionPayload)

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

  // POST /api/resolve-markets — resolve due markets from oracle APIs and settle (call from cron or manually)
  if (path === 'resolve-markets' && method === 'POST') {
    const all = await storage.getContracts(db, { limit: 500 })
    const marketRows = all.filter(
      (r) => (r.templateId === TEMPLATE_VIRTUAL_MARKET || (r.templateId && r.templateId.includes('Market'))) &&
        r.status === 'Active' &&
        (r.payload?.oracleSource || r.payload?.source) &&
        r.payload?.source !== 'user'
    )
    const due = marketRows.filter((m) => resolveMarkets.isMarketDueForResolution(m))
    const SETTLEMENT_FEE = 0.02
    const resolved = []
    for (const market of due) {
      try {
        const { resolved: didResolve, outcome } = await resolveMarkets.resolveOutcome(env, market)
        if (!didResolve || outcome === undefined) continue
        const marketId = market.contractId
        const payload = { ...market.payload, status: 'Settled', resolvedOutcome: outcome }
        await storage.updateContractPayload(db, marketId, payload)
        await backupToR2(r2, undefined, marketId, payload)
        if (outcome) {
          const positions = (await storage.getContracts(db, { templateType: 'Position', limit: 1000 }))
            .filter((c) => c.payload?.marketId === marketId && c.payload?.counterpartyPositionId)
          for (const pos of positions) {
            const amount = parseFloat(pos.payload?.amount) || 0
            if (amount <= 0) continue
            const isWinner = (pos.payload?.positionType === outcome) || (pos.payload?.positionType === `Outcome:${outcome}`)
            if (isWinner) {
              const payout = 2 * amount * (1 - SETTLEMENT_FEE)
              const owner = pos.party
              const current = await storage.getBalance(db, owner)
              await storage.setBalance(db, owner, current + payout)
            }
          }
        }
        resolved.push({ marketId, outcome })
      } catch (err) {
        console.error('[resolve-markets]', market.contractId, err?.message)
      }
    }
    return jsonResponse({ success: true, due: due.length, resolved: resolved.length, markets: resolved })
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
    await backupToR2(r2, undefined, marketId, payload)

    const SETTLEMENT_FEE = 0.02
    if (status === 'Settled' && resolvedOutcome) {
      const all = await storage.getContracts(db, { templateType: 'Position', limit: 1000 })
      const positions = all.filter((c) => c.payload?.marketId === marketId && c.payload?.counterpartyPositionId)
      for (const pos of positions) {
        const amount = parseFloat(pos.payload?.amount) || 0
        if (amount <= 0) continue
        const isWinner = (pos.payload?.positionType === resolvedOutcome) || (pos.payload?.positionType === `Outcome:${resolvedOutcome}`)
        if (isWinner) {
          const payout = 2 * amount * (1 - SETTLEMENT_FEE)
          const owner = pos.party
          const current = await storage.getBalance(db, owner)
          await storage.setBalance(db, owner, current + payout)
        }
      }
    }

    return jsonResponse({ success: true, market: { contractId: marketId, payload } })
  }

  // POST /api/create-position
  if (path === 'create-position' && method === 'POST') {
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
          (r.templateId === TEMPLATE_VIRTUAL_MARKET || (r.templateId && r.templateId.includes('Market'))) &&
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
    const positionPayload = {
      positionId,
      marketId,
      owner,
      positionType: positionType === 'Yes' || positionType === 'No' ? positionType : `Outcome:${positionType}`,
      amount: String(amountNum),
      price: String(priceNum),
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
    await backupToR2(r2, undefined, contractId, positionPayload)

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

  return null // fall through to proxy
}
