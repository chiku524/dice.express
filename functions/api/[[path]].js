/**
 * Cloudflare Pages Function: /api/* router.
 * - If env.DB is set: serve API from D1 (+ optional KV cache, R2). Same surface as Vercel api/*.
 * - If BACKEND_URL is set and DB is not: proxy to backend (e.g. Vercel).
 * - If neither: return 503 with hint.
 */
import * as storage from '../lib/cf-storage.mjs'
import { getQuote, isTradeWithinLimit, applyTrade, createPoolState } from '../lib/amm.mjs'

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
  const backendBase = env.BACKEND_URL || env.VITE_VERCEL_URL

  // Prefer D1-native API when DB is bound
  if (db) {
    try {
      const res = await handleWithD1(db, kv, env.R2, request, path, method)
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

async function handleWithD1(db, kv, r2, request, path, method) {
  const url = new URL(request.url)
  const query = Object.fromEntries(url.searchParams)
  const body = await parseBody(request)

  // GET /api/get-contracts, POST /api/get-contracts
  if (path === 'get-contracts' && (method === 'GET' || method === 'POST')) {
    const params = method === 'GET' ? query : body
    const { party, templateType, status, limit } = params
    const list = await storage.getContracts(db, {
      party: party || undefined,
      templateType: templateType || undefined,
      status: status || undefined,
      limit: limit ? parseInt(limit, 10) : 100,
    })
    const contracts = list.map((c) => ({
      ...c,
      _fromCloudStorage: true,
    }))
    return jsonResponse({ success: true, contracts, count: contracts.length })
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

  // POST /api/trade
  if (path === 'trade' && method === 'POST') {
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

  // POST /api/update-market-status
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
        message: `You have ${currentBal} CC but need ${amountNum} CC.`,
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
