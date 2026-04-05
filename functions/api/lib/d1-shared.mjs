/**
 * Shared helpers, constants, and idempotency for D1 API routes.
 */
import * as storage from '../../lib/cf-storage.mjs'
import {
  getEvmWithdrawConfig,
  EVM_NATIVE_WITHDRAW_NETWORKS,
  EVM_USDC_WITHDRAW_NETWORKS,
} from '../../lib/evm-withdraw-config.mjs'
import { getAlchemyRpcUrl } from '../../lib/alchemy-networks.mjs'
import { sendSolanaUsdcWithdrawal } from '../../lib/solana-spl-withdraw.mjs'
import { createWalletClient, http, encodeFunctionData, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { jsonResponse as jsonResponseWithCors } from './api-http.mjs'

export const TEMPLATE_VIRTUAL_MARKET = 'VirtualMarket'
export const CRON_HEARTBEAT_CONTRACT_ID = 'system-cron-heartbeat-v1'
const TEMPLATE_CRON_HEARTBEAT = 'CronHeartbeat'
const R2_BUCKET_NAME = 'dice-express-r2'

export async function upsertAutomationHeartbeat(db, r2, patch) {
  const row = await storage.getContractById(db, CRON_HEARTBEAT_CONTRACT_ID)
  const prev = row?.payload && typeof row.payload === 'object' ? row.payload : {}
  const next = { ...prev, ...patch, updatedAt: new Date().toISOString() }
  await storage.upsertContract(db, {
    contract_id: CRON_HEARTBEAT_CONTRACT_ID,
    template_id: TEMPLATE_CRON_HEARTBEAT,
    payload: next,
    party: 'platform',
    status: 'Active',
  })
  if (r2) backupToR2(r2, undefined, CRON_HEARTBEAT_CONTRACT_ID, next).catch(() => {})
}

export function envFlagTrue(env, key) {
  const v = (env[key] ?? '').toString().trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

/** Pips to refund on Void: AMM stores costPips; P2P uses amount × price (per leg). */
export function positionStakeRefundPips(positionPayload) {
  if (!positionPayload || typeof positionPayload !== 'object') return 0
  const cost = parseFloat(positionPayload.costPips)
  if (Number.isFinite(cost) && cost > 0) return cost
  const amount = parseFloat(positionPayload.amount) || 0
  const price = parseFloat(positionPayload.price)
  if (amount <= 0) return 0
  const p = Number.isFinite(price) && price > 0 && price <= 1 ? price : 0.5
  return amount * p
}

export function positionTypeMatchesResolvedOutcome(positionType, resolvedOutcome) {
  if (!resolvedOutcome || resolvedOutcome === 'Void' || resolvedOutcome === 'Refund') return false
  const p = String(positionType || '')
  return p === resolvedOutcome || p === `Outcome:${resolvedOutcome}`
}

/**
 * Settle virtual-market positions after resolution: P2P winners 2×amount×(1−fee); AMM/pool winners amount×(1−fee) per share; Void refunds stake. Idempotent via payload.settlementCreditedAt.
 */
export async function settleVirtualMarketPositions(db, marketId, resolvedOutcome, options = {}) {
  const SETTLEMENT_FEE = options.SETTLEMENT_FEE ?? 0.02
  const r2 = options.r2 ?? null
  if (resolvedOutcome == null || resolvedOutcome === '') return
  const all = await storage.getContracts(db, { templateType: 'Position', limit: 2000 })
  const positions = all.filter((c) => c.payload?.marketId === marketId)
  const isVoid = resolvedOutcome === 'Void' || resolvedOutcome === 'Refund'
  for (const pos of positions) {
    const pl = pos.payload || {}
    if (pl.settlementCreditedAt) continue
    const owner = pos.party
    const contractId = pos.contractId
    if (isVoid) {
      const stake = positionStakeRefundPips(pl)
      if (stake <= 0) continue
      const current = await storage.getBalance(db, owner)
      await storage.setBalance(db, owner, current + stake)
      const nextPayload = {
        ...pl,
        settlementCreditedAt: new Date().toISOString(),
        settlementOutcome: String(resolvedOutcome),
        settlementKind: 'void_refund',
        settlementPayoutPips: stake,
      }
      await storage.updateContractPayload(db, contractId, nextPayload)
      if (r2) backupToR2(r2, undefined, contractId, nextPayload).catch(() => {})
      continue
    }
    const amount = parseFloat(pl.amount) || 0
    if (amount <= 0) continue
    const ptype = pl.positionType
    const isWinner = positionTypeMatchesResolvedOutcome(ptype, resolvedOutcome)
    if (!isWinner) continue
    let payout = 0
    let kind = 'p2p_winner'
    if (pl.counterpartyPositionId) {
      payout = 2 * amount * (1 - SETTLEMENT_FEE)
    } else {
      payout = amount * (1 - SETTLEMENT_FEE)
      kind = 'amm_winner'
    }
    const current = await storage.getBalance(db, owner)
    await storage.setBalance(db, owner, current + payout)
    const nextPayload = {
      ...pl,
      settlementCreditedAt: new Date().toISOString(),
      settlementOutcome: String(resolvedOutcome),
      settlementKind: kind,
      settlementPayoutPips: payout,
    }
    await storage.updateContractPayload(db, contractId, nextPayload)
    if (r2) backupToR2(r2, undefined, contractId, nextPayload).catch(() => {})
  }
}

/**
 * "Feed-topic" markets = headline still visible in GNews/Perigon/etc. (not price/sports/FRED/oracles).
 * Skipped when AUTO_MARKETS_OUTCOME_ONLY=1 (committed in wrangler.toml) or by default when unset.
 * Set AUTO_MARKETS_ALLOW_FEED_TOPIC=1 to create feed-topic markets anyway.
 */
export function shouldSkipFeedTopicHeadlineMarkets(env) {
  if (envFlagTrue(env, 'AUTO_MARKETS_ALLOW_FEED_TOPIC')) return false
  const v = (env.AUTO_MARKETS_OUTCOME_ONLY ?? '').toString().trim().toLowerCase()
  if (v === '0' || v === 'false' || v === 'no') return false
  return true
}

/** Cron / maintenance: prefer PREDICTION_MAINTENANCE_SECRET, else AUTO_MARKETS_CRON_SECRET. */
export function checkPredictionMaintenanceAuth(request, env, body) {
  const maint = (env.PREDICTION_MAINTENANCE_SECRET || '').toString().trim()
  const cron = (env.AUTO_MARKETS_CRON_SECRET || '').toString().trim()
  const headerMaint = request.headers.get('X-Maintenance-Secret') || ''
  const headerCron = request.headers.get('X-Cron-Secret') || ''
  if (maint) {
    return headerMaint === maint || body?.maintenanceSecret === maint
  }
  if (cron) {
    return headerCron === cron || body?.cronSecret === cron
  }
  return false
}

/**
 * When PRIVILEGED_API_SECRET and/or AUTO_MARKETS_CRON_SECRET is set on Pages, ops-only routes
 * require a matching X-Privileged-Secret or X-Cron-Secret (or body.privilegedSecret / body.cronSecret).
 * When neither env var is set, routes stay open (local dev / backward compatibility).
 * Same gates apply to POST /api/resolve-markets-preview (dry-run).
 */
export function checkOpsSecret(request, body, env, requestId = '') {
  const priv = (env.PRIVILEGED_API_SECRET || '').toString().trim()
  const cron = (env.AUTO_MARKETS_CRON_SECRET || '').toString().trim()
  if (!priv && !cron) return { ok: true }

  const hPriv = (request.headers.get('X-Privileged-Secret') || '').trim()
  const hCron = (request.headers.get('X-Cron-Secret') || '').trim()
  const bPriv = body?.privilegedSecret != null ? String(body.privilegedSecret).trim() : ''
  const bCron = body?.cronSecret != null ? String(body.cronSecret).trim() : ''

  if (priv && (hPriv === priv || bPriv === priv)) return { ok: true }
  if (cron && (hCron === cron || bCron === cron)) return { ok: true }

  const idHeaders = requestId ? { 'X-Request-Id': requestId } : {}
  return {
    ok: false,
    response: jsonResponseWithCors(
      {
        error: 'Unauthorized',
        message:
          'This endpoint requires X-Privileged-Secret (when PRIVILEGED_API_SECRET is set) and/or X-Cron-Secret (when AUTO_MARKETS_CRON_SECRET is set) on Pages.',
        requestId: requestId || undefined,
      },
      401,
      idHeaders
    ),
  }
}

const USDC_ABI = parseAbi(['function transfer(address to, uint256 value) returns (bool)'])
/** Send one withdrawal (EVM USDC/native or Solana SPL USDC). Returns { ok: true, txHash } or { ok: false, error }. */
export async function sendOneWithdrawal(env, db, w) {
  const netId = (w.networkId || 'ethereum').toString().toLowerCase()
  const token = w.token === 'native' ? 'native' : 'usdc'

  if (netId === 'solana') {
    if (token !== 'usdc') return { ok: false, error: 'Solana supports USDC (SPL) withdrawals only' }
    const out = await sendSolanaUsdcWithdrawal(env, w)
    if (out.ok) {
      await storage.updateWithdrawalRequestWithTx(db, w.requestId, out.signature, 'sent')
      return { ok: true, txHash: out.signature }
    }
    return { ok: false, error: out.error }
  }

  const privateKeyHex = env.PLATFORM_WALLET_PRIVATE_KEY
  if (!privateKeyHex || typeof privateKeyHex !== 'string' || !privateKeyHex.startsWith('0x')) {
    return { ok: false, error: 'PLATFORM_WALLET_PRIVATE_KEY not set' }
  }
  const cfg = getEvmWithdrawConfig(netId)
  if (!cfg) return { ok: false, error: `Unsupported EVM network: ${netId}` }
  if (token === 'native' && !EVM_NATIVE_WITHDRAW_NETWORKS.has(netId)) {
    return { ok: false, error: 'Native withdrawals not enabled for this network' }
  }

  const rpcUrl = env.DEPOSIT_VERIFICATION_RPC_URL || (env.ALCHEMY_API_KEY ? getAlchemyRpcUrl(env.ALCHEMY_API_KEY, netId) : null)
  if (!rpcUrl) return { ok: false, error: 'RPC not configured for this network' }
  let account
  try {
    account = privateKeyToAccount(privateKeyHex)
  } catch (e) {
    return { ok: false, error: e?.message || 'Invalid private key' }
  }
  const chain = cfg.chain
  const transport = http(rpcUrl)
  const walletClient = createWalletClient({ account, chain, transport })
  try {
    if (token === 'native') {
      const amountWei = BigInt(Math.floor(Number(w.netPips) * 1e18))
      if (amountWei <= 0n) return { ok: false, error: 'Invalid native amount' }
      const hash = await walletClient.sendTransaction({
        account,
        to: w.destination,
        value: amountWei,
        data: '0x',
      })
      await storage.updateWithdrawalRequestWithTx(db, w.requestId, hash, 'sent')
      return { ok: true, txHash: hash }
    }
    const usdcAddress = cfg.usdc
    const amountRaw = BigInt(Math.floor(Number(w.netPips) * 1e6))
    if (amountRaw <= 0n) return { ok: false, error: 'Invalid USDC amount' }
    const data = encodeFunctionData({
      abi: USDC_ABI,
      functionName: 'transfer',
      args: [w.destination, amountRaw],
    })
    const hash = await walletClient.sendTransaction({
      account,
      to: usdcAddress,
      data,
      gas: 120000n,
    })
    await storage.updateWithdrawalRequestWithTx(db, w.requestId, hash, 'sent')
    return { ok: true, txHash: hash }
  } catch (e) {
    return { ok: false, error: e?.message || 'Send failed' }
  }
}

/** Map automated API source to webapp display source and category (Discover + Category filters). */
const AUTO_SOURCE_DISPLAY = {
  the_odds_api: { source: 'sports', category: 'Sports' },
  alpha_vantage: { source: 'industry', category: 'Finance' },
  alpha_vantage_trend: { source: 'industry', category: 'Finance' },
  coingecko: { source: 'industry', category: 'Crypto' },
  coingecko_trend: { source: 'industry', category: 'Crypto' },
  openweathermap: { source: 'global_events', category: 'Weather' },
  weatherapi: { source: 'global_events', category: 'Weather' },
  gnews: { source: 'global_events', category: 'News' },
  perigon: { source: 'global_events', category: 'News' },
  newsapi_ai: { source: 'global_events', category: 'News' },
  newsdata_io: { source: 'global_events', category: 'News' },
  operator_manual: { source: 'global_events', category: 'News' },
  fred: { source: 'industry', category: 'Finance' },
  finnhub: { source: 'industry', category: 'Finance' },
  frankfurter: { source: 'industry', category: 'Finance' },
  forex: { source: 'industry', category: 'Finance' },
  usgs: { source: 'global_events', category: 'Science' },
  fec: { source: 'global_events', category: 'Politics' },
  openfec: { source: 'global_events', category: 'Politics' },
  nasa_neo: { source: 'global_events', category: 'Science' },
  congress_gov: { source: 'global_events', category: 'Politics' },
  bls: { source: 'industry', category: 'Finance' },
}
export function getDisplaySourceAndCategory(apiSource) {
  return AUTO_SOURCE_DISPLAY[apiSource] || { source: 'global_events', category: 'Other' }
}

/** Map news topic (oracleConfig.q or category) to display category so news markets show under Tech & AI, Politics, etc. */
const NEWS_TOPIC_TO_CATEGORY = {
  technology: 'Tech & AI',
  tech: 'Tech & AI',
  politics: 'Politics',
  election: 'Politics',
  science: 'Science',
  entertainment: 'Entertainment',
  business: 'Finance',
  finance: 'Finance',
  health: 'Science',
  sports: 'Sports',
  world: 'News',
  general: 'News',
}
export function categoryFromNewsTopic(topic) {
  if (!topic || typeof topic !== 'string') return null
  const key = topic.toLowerCase().trim()
  return NEWS_TOPIC_TO_CATEGORY[key] || null
}

/** Fire-and-forget R2 backup; never throws. */
export async function backupToR2(r2, bucketName, contractId, payload) {
  if (!r2) return
  try {
    await storage.backupContractToR2(r2, bucketName || R2_BUCKET_NAME, contractId, payload)
  } catch (e) {
    console.warn('[R2 backup]', contractId, e?.message)
  }
}


export async function parseBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return {}
  try {
    return await request.json()
  } catch {
    return {}
  }
}

const P2P_ORDER_IDEM_PREFIX = 'idem:p2p-order:v1:'
const P2P_ORDER_IDEM_TTL_SEC = 86400

export function normalizeIdempotencyKey(raw) {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (!s || s.length > 128) return ''
  return s
}

export async function readP2pOrderIdempotency(kv, owner, idemKey) {
  if (!kv || !owner || !idemKey) return null
  try {
    const key = `${P2P_ORDER_IDEM_PREFIX}${encodeURIComponent(owner)}:${encodeURIComponent(idemKey)}`
    return await kv.get(key)
  } catch {
    return null
  }
}

export async function writeP2pOrderIdempotency(kv, owner, idemKey, jsonStr) {
  if (!kv || !owner || !idemKey || !jsonStr) return
  try {
    const key = `${P2P_ORDER_IDEM_PREFIX}${encodeURIComponent(owner)}:${encodeURIComponent(idemKey)}`
    await kv.put(key, jsonStr, { expirationTtl: P2P_ORDER_IDEM_TTL_SEC })
  } catch {
    // non-fatal
  }
}

const WITHDRAW_IDEM_PREFIX = 'idem:withdraw:v1:'
const WITHDRAW_IDEM_TTL_SEC = 86400

export async function readWithdrawIdempotency(kv, party, idemKey) {
  if (!kv || !party || !idemKey) return null
  try {
    const key = `${WITHDRAW_IDEM_PREFIX}${encodeURIComponent(party)}:${encodeURIComponent(idemKey)}`
    return await kv.get(key)
  } catch {
    return null
  }
}

export async function writeWithdrawIdempotency(kv, party, idemKey, jsonStr) {
  if (!kv || !party || !idemKey || !jsonStr) return
  try {
    const key = `${WITHDRAW_IDEM_PREFIX}${encodeURIComponent(party)}:${encodeURIComponent(idemKey)}`
    await kv.put(key, jsonStr, { expirationTtl: WITHDRAW_IDEM_TTL_SEC })
  } catch {
    // non-fatal
  }
}
