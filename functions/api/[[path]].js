/**
 * Cloudflare Pages Function: /api/* router.
 * All API is served from D1 (+ optional KV cache, R2). Set env.DB in wrangler.toml.
 * If BACKEND_URL is set and DB is not bound: proxy to external origin (optional).
 */
import * as storage from '../lib/cf-storage.mjs'
import { getQuote, isTradeWithinLimit, applyTrade, createPoolState } from '../lib/amm.mjs'
import { hashPassword, verifyPassword } from '../lib/auth.mjs'
import * as dataSources from '../lib/data-sources.mjs'
import { enrichNewsEvent } from '../lib/custom-news-markets.mjs'
import * as resolveMarkets from '../lib/resolve-markets.mjs'
import { addPips, pipsToCents, centsToPipsStr, cryptoAmountToPipsStr } from '../lib/pips-precision.mjs'
import { verifyErc20Deposit, verifyNativeDeposit } from '../lib/verify-deposit-rpc.mjs'
import { getAlchemyRpcUrl } from '../lib/alchemy-networks.mjs'
import { createWalletClient, createPublicClient, http, encodeFunctionData, parseAbi, verifyMessage } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet, polygon } from 'viem/chains'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS,DELETE',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization',
}

const TEMPLATE_VIRTUAL_MARKET = 'VirtualMarket'
const R2_BUCKET_NAME = 'dice-express-r2'

const USDC_ABI = parseAbi(['function transfer(address to, uint256 value) returns (bool)'])
const USDC_BY_NETWORK = {
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
}
const CHAINS_BY_NETWORK = { ethereum: mainnet, polygon }

/** Send one withdrawal (USDC or native) from platform wallet. Returns { ok: true, txHash } or { ok: false, error }. */
async function sendOneWithdrawal(env, db, w) {
  const privateKeyHex = env.PLATFORM_WALLET_PRIVATE_KEY
  if (!privateKeyHex || typeof privateKeyHex !== 'string' || !privateKeyHex.startsWith('0x')) {
    return { ok: false, error: 'PLATFORM_WALLET_PRIVATE_KEY not set' }
  }
  const rpcUrl = env.DEPOSIT_VERIFICATION_RPC_URL || (env.ALCHEMY_API_KEY ? getAlchemyRpcUrl(env.ALCHEMY_API_KEY, (w.networkId || 'ethereum').toString().toLowerCase()) : null)
  if (!rpcUrl) return { ok: false, error: 'RPC not configured' }
  let account
  try {
    account = privateKeyToAccount(privateKeyHex)
  } catch (e) {
    return { ok: false, error: e?.message || 'Invalid private key' }
  }
  const netId = (w.networkId || 'ethereum').toString().toLowerCase()
  const chain = CHAINS_BY_NETWORK[netId] || mainnet
  const transport = http(rpcUrl)
  const walletClient = createWalletClient({ account, chain, transport })
  const token = w.token === 'native' ? 'native' : 'usdc'
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
    const usdcAddress = USDC_BY_NETWORK[netId] || USDC_BY_NETWORK.ethereum
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
      gas: 100000n,
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
}
function getDisplaySourceAndCategory(apiSource) {
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
function categoryFromNewsTopic(topic) {
  if (!topic || typeof topic !== 'string') return null
  const key = topic.toLowerCase().trim()
  return NEWS_TOPIC_TO_CATEGORY[key] || null
}

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

async function handleWithD1(db, kv, r2, request, path, method, env = {}) {
  const url = new URL(request.url)
  const query = Object.fromEntries(url.searchParams)
  const body = await parseBody(request)

  // GET /api/health
  if (path === 'health' && method === 'GET') {
    return jsonResponse({ ok: true, provider: 'cloudflare' })
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

  // POST /api/deposit-crypto — credit Pips after crypto deposit (platform wallet received funds).
  // Secured: requires DEPOSIT_CRYPTO_SECRET (header X-Deposit-Crypto-Secret or body.depositCryptoSecret). Idempotent by txHash.
  if (path === 'deposit-crypto' && method === 'POST') {
    const depositSecret = env.DEPOSIT_CRYPTO_SECRET
    const providedSecret = request.headers.get('X-Deposit-Crypto-Secret') || body.depositCryptoSecret || ''
    if (depositSecret && depositSecret !== providedSecret) {
      return jsonResponse({ error: 'Unauthorized', message: 'Invalid or missing deposit secret' }, 401)
    }

    const { userParty, accountId, amount, cryptoAmount, cryptoDecimals, networkId, txHash } = body
    const party = userParty || accountId
    if (!party) return jsonResponse({ error: 'userParty/accountId required' }, 400)

    const referenceId = txHash ? String(txHash).trim() : null
    // One-time use: same txHash cannot be used to credit twice (idempotency + DB unique on reference_id)
    if (referenceId) {
      const existing = await storage.getDepositRecordByReferenceId(db, referenceId)
      if (existing) {
        const currentRaw = await storage.getBalanceRaw(db, party)
        return jsonResponse({
          success: true,
          alreadyCredited: true,
          balance: currentRaw,
          message: 'This deposit was already credited (idempotent).',
        })
      }
    }

    let amountPipsStr
    let expectedAmountRaw = null
    let cryptoDecimalsNum = 6
    if (cryptoAmount !== undefined && cryptoDecimals !== undefined) {
      cryptoDecimalsNum = Math.min(18, Math.max(0, parseInt(String(cryptoDecimals), 10) || 6))
      amountPipsStr = cryptoAmountToPipsStr(cryptoAmount, cryptoDecimalsNum)
      if (pipsToCents(amountPipsStr) <= 0) return jsonResponse({ error: 'cryptoAmount must be positive' }, 400)
      expectedAmountRaw = String(Math.floor(Number(cryptoAmount)))
    } else if (amount !== undefined) {
      amountPipsStr = addPips('0', amount)
      if (pipsToCents(amountPipsStr) <= 0) return jsonResponse({ error: 'amount must be positive' }, 400)
      // For verification we need raw amount: assume USDC 6 decimals (1 PP = 1e6 raw)
      const cents = pipsToCents(amountPipsStr)
      expectedAmountRaw = String(Math.floor(cents * Math.pow(10, cryptoDecimalsNum - 2)))
    } else {
      return jsonResponse({ error: 'amount required, or cryptoAmount and cryptoDecimals' }, 400)
    }

    // On-chain verification: when RPC and platform wallet are set, require txHash and verify before crediting.
    // Ensures (1) the tx sent the claimed amount to the platform address, (2) the tx can only be used once (idempotency below).
    const netId = (networkId || 'ethereum').toString().toLowerCase()
    const rpcUrl = env.DEPOSIT_VERIFICATION_RPC_URL || (env.ALCHEMY_API_KEY ? getAlchemyRpcUrl(env.ALCHEMY_API_KEY, netId) : null)
    const platformWallet = env.PLATFORM_WALLET_ADDRESS || null
    const tokenContract = env.DEPOSIT_VERIFICATION_USDC_CONTRACT || null
    const minConfirmations = Math.max(0, parseInt(env.DEPOSIT_VERIFICATION_MIN_CONFIRMATIONS || '1', 10) || 1)
    if (rpcUrl && platformWallet) {
      if (!referenceId) {
        return jsonResponse(
          { error: 'txHash required when deposit verification is enabled', code: 'VERIFICATION_REQUIRED' },
          400
        )
      }
      const verification = await verifyErc20Deposit(rpcUrl, referenceId, {
        platformWallet: platformWallet.trim(),
        expectedAmountRaw,
        tokenContractAddress: tokenContract || undefined,
        minConfirmations,
      })
      if (!verification.ok) {
        return jsonResponse(
          { error: 'Deposit verification failed', message: verification.reason, code: 'VERIFICATION_FAILED' },
          400
        )
      }
    }

    const currentRaw = await storage.getBalanceRaw(db, party)
    const newBalStr = addPips(currentRaw, amountPipsStr)
    try {
      await storage.setBalance(db, party, newBalStr)
      await storage.insertDepositRecord(db, {
        party,
        amountPips: parseFloat(amountPipsStr),
        source: 'crypto',
        referenceId,
      })
    } catch (e) {
      if (referenceId && /UNIQUE|constraint/i.test(e?.message)) {
        const currentRaw2 = await storage.getBalanceRaw(db, party)
        return jsonResponse({ success: true, alreadyCredited: true, balance: currentRaw2 }, 200)
      }
      throw e
    }
    return jsonResponse({
      success: true,
      balance: newBalStr,
      added: amountPipsStr,
      networkId: networkId || null,
    })
  }

  // GET /api/deposit-addresses — public platform wallet addresses for crypto deposits (multi-chain)
  if (path === 'deposit-addresses' && method === 'GET') {
    const evm = env.PLATFORM_WALLET_ADDRESS || null
    const solana = env.PLATFORM_WALLET_SOL || null
    return jsonResponse({
      success: true,
      addresses: {
        evm: evm ? { address: evm, networks: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'fantom', 'bnb'] } : null,
        solana: solana ? { address: solana } : null,
      },
    })
  }

  // POST /api/deposit-with-tx — credit Pips after user deposits from connected wallet (EVM). No DEPOSIT_CRYPTO_SECRET.
  // Body: { userParty, txHash, fromAddress, amountPips, signature, depositType?: 'usdc'|'native', networkId?: 'ethereum'|'polygon' }.
  // For depositType 'native', amountPips is in native token units (e.g. 0.5 ETH); we verify tx.value >= amountWei and credit amountPips as PP.
  if (path === 'deposit-with-tx' && method === 'POST') {
    const platformWallet = env.PLATFORM_WALLET_ADDRESS || null
    if (!platformWallet) {
      return jsonResponse({ error: 'Deposit from wallet is not configured (PLATFORM_WALLET_ADDRESS required)' }, 503)
    }
    const amountRaw = body.amountPips ?? body.amountGuap
    const { userParty, txHash, fromAddress, signature, depositType, networkId } = body
    const party = (userParty || '').trim()
    const txHashNorm = (txHash || '').trim()
    const fromNorm = (fromAddress || '').trim().toLowerCase()
    if (!party || !txHashNorm || !fromNorm || amountRaw == null || !signature) {
      return jsonResponse({ error: 'userParty, txHash, fromAddress, amountPips, and signature are required' }, 400)
    }
    const isNative = depositType === 'native'
    const netId = (networkId || 'ethereum').toString().toLowerCase()
    const rpcUrl = env.DEPOSIT_VERIFICATION_RPC_URL || (env.ALCHEMY_API_KEY ? getAlchemyRpcUrl(env.ALCHEMY_API_KEY, netId) : null)
    if (!rpcUrl) {
      return jsonResponse({ error: 'RPC not configured for this network' }, 503)
    }
    const amountNum = parseFloat(amountRaw)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return jsonResponse({ error: 'amountPips must be a positive number' }, 400)
    }
    const message = `deposit:${party}:${txHashNorm}`
    let recoveredAddress
    try {
      recoveredAddress = await verifyMessage({ message, signature })
    } catch (e) {
      return jsonResponse({ error: 'Invalid signature', message: e?.message || 'Signature verification failed' }, 400)
    }
    if (recoveredAddress.toLowerCase() !== fromNorm) {
      return jsonResponse({ error: 'Signature does not match fromAddress' }, 400)
    }
    const minConfirmations = Math.max(0, parseInt(env.DEPOSIT_VERIFICATION_MIN_CONFIRMATIONS || '1', 10) || 1)
    if (isNative) {
      const expectedAmountWei = BigInt(Math.floor(amountNum * 1e18))
      const verification = await verifyNativeDeposit(rpcUrl, txHashNorm, {
        platformWallet: platformWallet.trim(),
        expectedAmountWei: expectedAmountWei.toString(),
        minConfirmations,
      })
      if (!verification.ok) {
        return jsonResponse({ error: 'Transaction verification failed', message: verification.reason }, 400)
      }
    } else {
      const amountPipsStrUsdc = addPips('0', amountRaw)
      if (pipsToCents(amountPipsStrUsdc) <= 0) return jsonResponse({ error: 'amountPips must be positive' }, 400)
      const cents = pipsToCents(amountPipsStrUsdc)
      const cryptoDecimals = 6
      const expectedAmountRaw = String(Math.floor(cents * Math.pow(10, cryptoDecimals - 2)))
      const tokenContract = env.DEPOSIT_VERIFICATION_USDC_CONTRACT || null
      const verification = await verifyErc20Deposit(rpcUrl, txHashNorm, {
        platformWallet: platformWallet.trim(),
        expectedAmountRaw,
        tokenContractAddress: tokenContract || undefined,
        minConfirmations,
      })
      if (!verification.ok) {
        return jsonResponse({ error: 'Transaction verification failed', message: verification.reason }, 400)
      }
    }
    const existing = await storage.getDepositRecordByReferenceId(db, txHashNorm)
    if (existing) {
      const currentRaw = await storage.getBalanceRaw(db, party)
      return jsonResponse({ success: true, alreadyCredited: true, balance: currentRaw }, 200)
    }
    const amountPipsStr = isNative ? String(amountNum) : addPips('0', amountRaw)
    const currentRaw = await storage.getBalanceRaw(db, party)
    const newBalStr = addPips(currentRaw, amountPipsStr)
    await storage.setBalance(db, party, newBalStr)
    await storage.insertDepositRecord(db, {
      party,
      amountPips: amountNum,
      source: 'crypto',
      referenceId: txHashNorm,
    })
    return jsonResponse({
      success: true,
      balance: newBalStr,
      added: amountPipsStr,
    })
  }

  // GET /api/deposit-records — list deposit history for a party (transparency/audit)
  if (path === 'deposit-records' && method === 'GET') {
    const userParty = query.userParty || query.accountId
    if (!userParty) return jsonResponse({ error: 'userParty or accountId required' }, 400)
    const limit = Math.min(100, parseInt(query.limit, 10) || 50)
    const list = await storage.getDepositRecordsByParty(db, userParty, limit)
    return jsonResponse({ success: true, records: list })
  }

  // POST /api/withdraw-request — debit (if needed), create withdrawal, and send immediately from platform wallet.
  // Body: userParty, amount, destinationAddress, networkId ('ethereum'|'polygon'), token ('usdc'|'native').
  // For token 'usdc': amount in PP, fee in PP. For token 'native': amount in native units (e.g. 0.5 ETH), flat 1 PP fee from balance.
  if (path === 'withdraw-request' && method === 'POST') {
    const feeRate = parseFloat(env.WITHDRAWAL_FEE_RATE || '0.02')
    const feeMin = parseFloat(env.WITHDRAWAL_FEE_MIN || '1')
    const withdrawMaxPp = parseFloat(env.WITHDRAW_MAX_PP || '0') || 0
    const withdrawMaxPending = Math.max(0, parseInt(env.WITHDRAW_MAX_PENDING || '0', 10) || 0)
    const { userParty, accountId, amount, destinationAddress, networkId, token: tokenParam } = body
    const party = userParty || accountId
    const token = tokenParam === 'native' ? 'native' : 'usdc'
    if (!party || amount === undefined || !destinationAddress) {
      return jsonResponse({ error: 'userParty/accountId, amount, and destinationAddress required' }, 400)
    }
    const dest = String(destinationAddress).trim()
    if (!/^0x[a-fA-F0-9]{40}$/.test(dest)) {
      return jsonResponse({ error: 'Invalid destination address', message: 'Use a valid EVM address (0x + 40 hex characters)' }, 400)
    }
    const netId = (networkId || 'ethereum').toString().toLowerCase()
    if (!['ethereum', 'polygon'].includes(netId)) {
      return jsonResponse({ error: 'Unsupported network', message: 'Use ethereum or polygon' }, 400)
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
    const sendResult = await sendOneWithdrawal(env, db, w)
    if (sendResult.ok) {
      return jsonResponse({
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
      })
    }
    return jsonResponse({
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
    }, 200)
  }

  // GET /api/withdrawal-requests — list withdrawal requests for a user
  if (path === 'withdrawal-requests' && method === 'GET') {
    const userParty = query.userParty || query.accountId
    if (!userParty) return jsonResponse({ error: 'userParty or accountId required' }, 400)
    const list = await storage.getWithdrawalRequestsByParty(db, userParty)
    return jsonResponse({ success: true, requests: list })
  }

  // POST /api/process-withdrawals — send pending withdrawals from platform wallet (uses PLATFORM_WALLET_PRIVATE_KEY).
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
      const result = await sendOneWithdrawal(env, db, w)
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

  // POST /api/add-credits — virtual top-up (Pips added to balance; no blockchain)
  if (path === 'add-credits' && method === 'POST') {
    const { userParty, accountId, amount } = body
    const party = userParty || accountId
    if (!party || amount === undefined) {
      return jsonResponse({ error: 'userParty or accountId and amount are required' }, 400)
    }
    const amountPipsStr = addPips('0', amount)
    if (pipsToCents(amountPipsStr) <= 0) return jsonResponse({ error: 'amount must be a positive number' }, 400)
    const currentRaw = await storage.getBalanceRaw(db, party)
    const newBalStr = addPips(currentRaw, amountPipsStr)
    await storage.setBalance(db, party, newBalStr)
    return jsonResponse({
      success: true,
      balance: newBalStr,
      previousBalance: currentRaw,
      added: amountPipsStr,
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

  // GET/POST /api/get-user-balance — returns balance as 2-decimal string for precision
  if (path === 'get-user-balance' && (method === 'GET' || method === 'POST')) {
    const { userParty } = method === 'GET' ? query : body
    if (!userParty) return jsonResponse({ error: 'User party required', message: 'Please provide userParty' }, 400)
    const raw = await storage.getBalanceRaw(db, userParty)
    const normalized = centsToPipsStr(pipsToCents(raw))
    await storage.setBalance(db, userParty, normalized)
    return jsonResponse({ success: true, balance: normalized })
  }

  // POST /api/update-user-balance
  if (path === 'update-user-balance' && method === 'POST') {
    const { userParty, amount, operation } = body
    if (!userParty || amount === undefined || !operation) {
      return jsonResponse({ error: 'Missing required fields', required: ['userParty', 'amount', 'operation'] }, 400)
    }
    const amountPipsStr = addPips('0', amount)
    const amountCents = pipsToCents(amountPipsStr)
    if (amountCents < 0) return jsonResponse({ error: 'Invalid amount' }, 400)
    const currentRaw = await storage.getBalanceRaw(db, userParty)
    const currentCents = pipsToCents(currentRaw)
    let newBalStr
    if (operation === 'add') {
      newBalStr = addPips(currentRaw, amountPipsStr)
    } else if (operation === 'subtract') {
      if (amountCents === 0) return jsonResponse({ error: 'Amount must be positive to subtract' }, 400)
      if (currentCents < amountCents) {
        return jsonResponse({ error: 'Insufficient balance', currentBalance: currentRaw }, 400)
      }
      newBalStr = centsToPipsStr(currentCents - amountCents)
    } else {
      return jsonResponse({ error: 'Invalid operation', message: 'Operation must be "add" or "subtract"' }, 400)
    }
    await storage.setBalance(db, userParty, newBalStr)
    return jsonResponse({
      success: true,
      balance: newBalStr,
      previousBalance: currentRaw,
      newBalance: newBalStr,
      operation,
      amount: amountPipsStr,
    })
  }

  // POST /api/transfer-pips — tip another user (transfer Pips from one party to another)
  if (path === 'transfer-pips' && method === 'POST') {
    const { fromParty, toParty, amount } = body
    if (!fromParty || !toParty || amount === undefined) {
      return jsonResponse({ error: 'fromParty, toParty, and amount are required' }, 400)
    }
    const from = String(fromParty).trim()
    const to = String(toParty).trim()
    if (from === to) return jsonResponse({ error: 'Cannot tip yourself' }, 400)
    const amountPipsStr = addPips('0', amount)
    const amountCents = pipsToCents(amountPipsStr)
    if (amountCents <= 0) return jsonResponse({ error: 'Amount must be positive' }, 400)
    const senderRaw = await storage.getBalanceRaw(db, from)
    const senderCents = pipsToCents(senderRaw)
    if (senderCents < amountCents) {
      return jsonResponse({
        error: 'Insufficient balance',
        currentBalance: senderRaw,
        required: amountPipsStr,
      }, 400)
    }
    const senderNewStr = centsToPipsStr(senderCents - amountCents)
    const recipientRaw = await storage.getBalanceRaw(db, to)
    const recipientNewStr = addPips(recipientRaw, amountPipsStr)
    await storage.setBalance(db, from, senderNewStr)
    await storage.setBalance(db, to, recipientNewStr)
    return jsonResponse({
      success: true,
      fromParty: from,
      toParty: to,
      amount: amountPipsStr,
      senderNewBalance: senderNewStr,
      recipientNewBalance: recipientNewStr,
    })
  }

  // GET/POST /api/auto-markets — list events from APIs or seed markets from them
  if (path === 'auto-markets') {
    const action = query.action || (method === 'POST' ? (body.action || 'seed') : 'events')
    const source = query.source || body?.source || 'sports'
    const limit = Math.min(parseInt(query.limit || body?.limit || '10', 10) || 10, 50)
    const sportKey = query.sport || body?.sport || 'basketball_nba'
    const supportedSources = [
      'sports',
      'stocks',
      'stocks_trend',
      'crypto',
      'crypto_trend',
      'weather',
      'openweather',
      'weatherapi',
      'news',
      'gnews',
      'perigon',
      'newsapi_ai',
      'newsdata_io',
      'newsdata',
    ]

    if (method === 'GET' && action === 'probe') {
      let lastSeed = null
      if (kv) {
        try {
          const raw = await kv.get('auto_markets:last_seed')
          if (raw) lastSeed = JSON.parse(raw)
        } catch (_) {}
      }
      return jsonResponse({
        success: true,
        action: 'probe',
        keysPresent: dataSources.probeAutoMarketEnv(env),
        seedSources: dataSources.AUTO_MARKET_SOURCES,
        ...(lastSeed && { lastSeed }),
      })
    }

    if (method === 'GET' && action === 'events') {
      if (!supportedSources.includes(source)) {
        return jsonResponse({ error: 'Unknown source', supported: supportedSources }, 400)
      }
      let events = []
      try {
        events = await dataSources.getEventsFromSource(env, source, { limit, sportKey, category: query.category || 'general', q: query.q || body?.q || 'technology' })
      } catch (err) {
        console.error('[auto-markets] events', source, err)
        return jsonResponse({ error: 'Failed to fetch events', message: err?.message }, 502)
      }
      return jsonResponse({ success: true, source, events, count: events.length })
    }

    // POST seed: multi-source (sources array or seed_all) or single source
    if (method === 'POST' && (action === 'seed' || action === 'seed_all')) {
      let events = []
      let bySource = null
      const sourcesList = Array.isArray(body?.sources) ? body.sources : (action === 'seed_all' || body?.seed_all ? dataSources.AUTO_MARKET_SOURCES : null)
      const perSourceLimit = Math.min(parseInt(body?.perSourceLimit || '5', 10) || 5, 20)

      if (sourcesList && sourcesList.length > 0) {
        const gathered = await dataSources.gatherEventsFromAllSources(env, sourcesList, perSourceLimit)
        events = gathered.events
        bySource = gathered.bySource
        if (events.length === 0 && Object.values(gathered.bySource).every((n) => n === 0)) {
          return jsonResponse({ success: true, message: 'No events from any source (missing keys or empty)', bySource: gathered.bySource, created: [], count: 0, skipped: 0 }, 200)
        }
      } else {
        try {
          events = await dataSources.getEventsFromSource(env, source, { limit, sportKey, category: body?.category || 'general', q: body?.q || 'technology' })
        } catch (err) {
          console.error('[auto-markets] seed fetch', source, err)
          return jsonResponse({ error: 'Failed to fetch events', message: err?.message }, 502)
        }
      }

      const created = []
      const usedCustomTypes = { election: false, olympics: false, conflict: false }
      for (const ev of events) {
        const evUse = enrichNewsEvent(ev, { usedCustomTypes })
        const id = evUse.id ? `market-${evUse.id}` : `market-${evUse.source}-${Date.now()}-${created.length}`
        // Event-driven: only create if we don't already have a market for this event (avoids duplicates when cron runs frequently)
        const existing = await storage.getContractById(db, id)
        if (existing && (existing.templateId === TEMPLATE_VIRTUAL_MARKET || (existing.templateId && existing.templateId.includes('Market')))) {
          continue // already have this event as a market, skip
        }
        const { source: displaySource, category: displayCategory } = getDisplaySourceAndCategory(evUse.source)
        const topicCategory = categoryFromNewsTopic(evUse.oracleConfig?.q || evUse.oracleConfig?.category)
        const finalCategory = topicCategory || displayCategory
        let resolutionDeadline = evUse.resolutionDeadline || null
        if (!resolutionDeadline && evUse.endDate && String(evUse.endDate).length >= 10) {
          resolutionDeadline = `${String(evUse.endDate).slice(0, 10)}T23:59:59.000Z`
        }
        if (!resolutionDeadline && evUse.commenceTime) {
          const d = new Date(evUse.commenceTime)
          if (!Number.isNaN(d.getTime())) {
            d.setUTCHours(d.getUTCHours() + 3)
            resolutionDeadline = d.toISOString()
          } else {
            resolutionDeadline = String(evUse.commenceTime).slice(0, 10)
          }
        }
        if (!resolutionDeadline) resolutionDeadline = evUse.endDate || evUse.date || (evUse.commenceTime ? String(evUse.commenceTime).slice(0, 10) : null)
        const payload = {
          marketId: id,
          title: evUse.title,
          description: evUse.description || evUse.title,
          marketType: 'Binary',
          outcomes: ['Yes', 'No'],
          settlementTrigger: { tag: 'Manual' },
          resolutionCriteria: evUse.resolutionCriteria || evUse.title,
          resolutionDeadline: resolutionDeadline || null,
          oneLiner: evUse.oneLiner || null,
          status: 'Active',
          totalVolume: 0,
          yesVolume: 0,
          noVolume: 0,
          outcomeVolumes: {},
          category: finalCategory,
          styleLabel: evUse.source,
          source: displaySource,
          oracleSource: evUse.oracleSource || evUse.source,
          oracleConfig: { ...(evUse.oracleConfig || {}), ...(evUse.customType && { customType: evUse.customType }) },
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
        const useZeroLiquidity = env.AUTO_MARKETS_ZERO_LIQUIDITY === '1' || env.AUTO_MARKETS_ZERO_LIQUIDITY === 'true' || String(env.INITIAL_POOL_LIQUIDITY || '').trim() === '0'
        const initialLiquidity = useZeroLiquidity ? 0 : 1000
        const poolState = createPoolState(id, initialLiquidity, initialLiquidity)
        await storage.upsertContract(db, {
          contract_id: poolState.poolId,
          template_id: 'LiquidityPool',
          payload: poolState,
          party: 'platform',
          status: 'Active',
        })
        await backupToR2(r2, undefined, poolState.poolId, poolState)
        created.push({ marketId: id, title: evUse.title, source: evUse.source })
      }
      // Markets list cache will refresh on next GET (TTL)
      const res = { success: true, source: bySource ? 'multiple' : source, created, count: created.length, skipped: events.length - created.length }
      if (bySource) res.bySource = bySource
      const lastSeedAt = new Date().toISOString()
      console.log('[auto-markets] seed_all completed', lastSeedAt, 'created:', res.count, 'bySource:', res.bySource ?? '')
      if (kv) {
        try {
          await kv.put('auto_markets:last_seed', JSON.stringify({ at: lastSeedAt, count: res.count, bySource: res.bySource ?? null }))
        } catch (_) {}
      }
      return jsonResponse(res)
    }

    return jsonResponse({ error: 'Use GET ?action=events&source=... or POST { action: "seed", source: ... } or POST { action: "seed_all" } or POST { sources: ["sports", "stocks", ...] }' }, 400)
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
      const useZeroLiquidity = env.AUTO_MARKETS_ZERO_LIQUIDITY === '1' || env.AUTO_MARKETS_ZERO_LIQUIDITY === 'true' || String(env.INITIAL_POOL_LIQUIDITY || '').trim() === '0'
      const initialLiquidity = useZeroLiquidity ? 0 : 1000
      const poolState = createPoolState(id, initialLiquidity, initialLiquidity)
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
