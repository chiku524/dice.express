/**
 * D1 API: d1-withdrawals
 */
import * as storage from '../../lib/cf-storage.mjs'
import * as d1 from '../lib/d1-shared.mjs'
import {
  EVM_NATIVE_WITHDRAW_NETWORKS,
  EVM_USDC_WITHDRAW_NETWORKS,
} from '../../lib/evm-withdraw-config.mjs'
import { isValidSolanaAddress } from '../../lib/solana-deposit-signature.mjs'
import { addPips, pipsToCents, centsToPipsStr } from '../../lib/pips-precision.mjs'
import { predictionLog } from '../../lib/prediction-observability.mjs'

export async function tryD1WithdrawalRoutes(ctx) {
  const { db, kv, r2, env, request, path, method, query, body, requestId, jsonResponse } = ctx
  void requestId


// POST /api/withdraw-request — debit (if needed), create withdrawal, and send immediately from platform wallet.
// Body: userParty, amount, destinationAddress, networkId (EVM id or solana), token ('usdc'|'native').
// Solana: USDC SPL only; set SOLANA_WALLET_PRIVATE_KEY + SOLANA_RPC_URL. EVM: PLATFORM_WALLET_PRIVATE_KEY + Alchemy/RPC.
if (path === 'withdraw-request' && method === 'POST') {
  const feeRate = parseFloat(env.WITHDRAWAL_FEE_RATE || '0.02')
  const feeMin = parseFloat(env.WITHDRAWAL_FEE_MIN || '1')
  const withdrawMaxPp = parseFloat(env.WITHDRAW_MAX_PP || '0') || 0
  const withdrawMaxPending = Math.max(0, parseInt(env.WITHDRAW_MAX_PENDING || '0', 10) || 0)
  const { userParty, accountId, amount, destinationAddress, networkId, token: tokenParam, idempotencyKey: withdrawIdemBody } = body
  const party = userParty || accountId
  const token = tokenParam === 'native' ? 'native' : 'usdc'
  if (!party || amount === undefined || !destinationAddress) {
    return jsonResponse({ error: 'userParty/accountId, amount, and destinationAddress required' }, 400)
  }
  const dest = String(destinationAddress).trim()
  const netId = (networkId || 'ethereum').toString().toLowerCase()
  if (netId === 'solana') {
    if (token !== 'usdc') {
      return jsonResponse({ error: 'Solana withdrawals support USDC (SPL) only' }, 400)
    }
    if (!isValidSolanaAddress(dest)) {
      return jsonResponse({ error: 'Invalid Solana destination address' }, 400)
    }
  } else {
    if (!/^0x[a-fA-F0-9]{40}$/.test(dest)) {
      return jsonResponse({ error: 'Invalid destination address', message: 'Use a valid EVM address (0x + 40 hex)' }, 400)
    }
    if (!EVM_USDC_WITHDRAW_NETWORKS.has(netId)) {
      return jsonResponse(
        {
          error: 'Unsupported network',
          message: `Use one of: ${[...EVM_USDC_WITHDRAW_NETWORKS].sort().join(', ')}, solana`,
        },
        400
      )
    }
    if (token === 'native' && !EVM_NATIVE_WITHDRAW_NETWORKS.has(netId)) {
      return jsonResponse({ error: 'Native withdrawals not supported on this network' }, 400)
    }
  }
  let amountPips, feePips, netPips, amountCents, feeCents, netCents, deductCents
  if (token === 'native') {
    const nativeAmount = parseFloat(amount)
    if (!Number.isFinite(nativeAmount) || nativeAmount <= 0) {
      return jsonResponse({ error: 'amount must be a positive number (native token units, e.g. 0.5 for 0.5 ETH)' }, 400)
    }
    amountPips = nativeAmount
    feePips = 0
    netPips = nativeAmount
    const flatFeeCents = pipsToCents(String(feeMin))
    deductCents = flatFeeCents
    amountCents = 0
    feeCents = flatFeeCents
    netCents = 0
  } else {
    amountCents = pipsToCents(amount)
    if (amountCents <= 0) return jsonResponse({ error: 'amount must be positive' }, 400)
    if (withdrawMaxPp > 0 && parseFloat(centsToPipsStr(amountCents)) > withdrawMaxPp) {
      return jsonResponse({ error: 'Amount exceeds maximum per withdrawal', max: String(withdrawMaxPp) }, 400)
    }
    const feeMinCents = pipsToCents(String(feeMin))
    feeCents = Math.max(Math.floor(amountCents * feeRate), feeMinCents)
    netCents = amountCents - feeCents
    if (netCents <= 0) return jsonResponse({ error: 'Amount too small after fee' }, 400)
    deductCents = amountCents
    amountPips = parseFloat(centsToPipsStr(amountCents))
    feePips = parseFloat(centsToPipsStr(feeCents))
    netPips = parseFloat(centsToPipsStr(netCents))
  }
  if (withdrawMaxPending > 0) {
    const pending = await storage.countPendingWithdrawalsByParty(db, party)
    if (pending >= withdrawMaxPending) {
      return jsonResponse({ error: 'Too many pending withdrawals', message: `Max ${withdrawMaxPending} pending. Wait for one to complete.` }, 429)
    }
  }
  const withdrawIdemKey = d1.normalizeIdempotencyKey(request.headers.get('Idempotency-Key') || withdrawIdemBody)
  if (withdrawIdemKey) {
    const cachedWd = await d1.readWithdrawIdempotency(kv, party, withdrawIdemKey)
    if (cachedWd) {
      try {
        predictionLog('api.withdraw.idempotent_replay', { party })
        return jsonResponse(JSON.parse(cachedWd))
      } catch {
        /* ignore corrupt KV */
      }
    }
  }
  const rlWd = await consumeRateLimitBucket(kv, `withdraw-req:${party}`, 25, 3600)
  if (!rlWd.ok) {
    predictionLog('api.withdraw.rate_limited', { party })
    return jsonResponse({ error: 'Too many withdrawal requests', retryAfterSec: 3600 }, 429)
  }
  const currentRaw = await storage.getBalanceRaw(db, party)
  const currentCents = pipsToCents(currentRaw)
  if (deductCents > 0 && currentCents < deductCents) {
    return jsonResponse({
      error: 'Insufficient balance',
      current: currentRaw,
      required: centsToPipsStr(deductCents),
    }, 400)
  }
  const newBalStr = deductCents > 0 ? centsToPipsStr(currentCents - deductCents) : currentRaw
  if (deductCents > 0) await storage.setBalance(db, party, newBalStr)
  const requestId = `wd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  await storage.insertWithdrawalRequest(db, {
    requestId,
    party,
    amountPips,
    feePips,
    netPips,
    destination: dest,
    networkId: netId,
    token,
  })
  const w = { requestId, party, amountPips, feePips, netPips, destination: dest, networkId: netId, token }
  const sendResult = await d1.sendOneWithdrawal(env, db, w)
  if (sendResult.ok) {
    const wdBody = {
      success: true,
      requestId,
      txHash: sendResult.txHash,
      amount: token === 'usdc' ? centsToPipsStr(amountCents) : String(amountPips),
      fee: token === 'usdc' ? centsToPipsStr(feeCents) : centsToPipsStr(feeCents),
      net: token === 'usdc' ? centsToPipsStr(netCents) : String(netPips),
      destination: dest,
      networkId: netId,
      token,
      message: 'Withdrawal sent. Transaction: ' + sendResult.txHash,
    }
    if (withdrawIdemKey) await d1.writeWithdrawIdempotency(kv, party, withdrawIdemKey, JSON.stringify(wdBody))
    predictionLog('api.withdraw.sent', { party, requestId, networkId: netId, token })
    return jsonResponse(wdBody)
  }
  const wdQueued = {
    success: true,
    requestId,
    txHash: null,
    queued: true,
    amount: token === 'usdc' ? centsToPipsStr(amountCents) : String(amountPips),
    fee: token === 'usdc' ? centsToPipsStr(feeCents) : '0',
    net: token === 'usdc' ? centsToPipsStr(netCents) : String(netPips),
    destination: dest,
    networkId: netId,
    token,
    message: 'Withdrawal queued; send failed and will be retried: ' + (sendResult.error || 'unknown'),
  }
  if (withdrawIdemKey) await d1.writeWithdrawIdempotency(kv, party, withdrawIdemKey, JSON.stringify(wdQueued))
  predictionLog('api.withdraw.queued', { party, requestId, networkId: netId, err: sendResult.error || null })
  return jsonResponse(wdQueued, 200)
}

// GET /api/withdrawal-requests — list withdrawal requests for a user
if (path === 'withdrawal-requests' && method === 'GET') {
  const userParty = query.userParty || query.accountId
  if (!userParty) return jsonResponse({ error: 'userParty or accountId required' }, 400)
  const list = await storage.getWithdrawalRequestsByParty(db, userParty)
  return jsonResponse({ success: true, requests: list })
}

// POST /api/process-withdrawals — send pending withdrawals (EVM: PLATFORM_WALLET_PRIVATE_KEY; Solana: SOLANA_WALLET_PRIVATE_KEY).
// Requires PROCESS_WITHDRAWALS_SECRET header X-Process-Withdrawals-Secret. Cron or admin only.
if (path === 'process-withdrawals' && method === 'POST') {
  const secret = env.PROCESS_WITHDRAWALS_SECRET
  if (secret) {
    const provided = request.headers.get('X-Process-Withdrawals-Secret') || body?.processWithdrawalsSecret || ''
    if (provided !== secret) {
      return jsonResponse({ error: 'Unauthorized', message: 'Invalid or missing X-Process-Withdrawals-Secret' }, 401)
    }
  }
  const pending = await storage.getPendingWithdrawalRequests(db, 5)
  const processed = []
  const errors = []
  for (const w of pending) {
    const result = await d1.sendOneWithdrawal(env, db, w)
    if (result.ok) {
      processed.push({ requestId: w.requestId, txHash: result.txHash, destination: w.destination, netPips: w.netPips, token: w.token || 'usdc' })
    } else {
      errors.push({ requestId: w.requestId, error: result.error })
    }
  }
  return jsonResponse({
    success: true,
    processed: processed.length,
    results: processed,
    errors: errors.length ? errors : undefined,
  })
}
  return null
}
