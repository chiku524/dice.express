/**
 * D1 API: d1-deposits
 */
import * as storage from '../../lib/cf-storage.mjs'
import * as d1 from '../lib/d1-shared.mjs'
import { addPips, pipsToCents, cryptoAmountToPipsStr } from '../../lib/pips-precision.mjs'
import { verifyErc20Deposit, verifyNativeDeposit } from '../../lib/verify-deposit-rpc.mjs'
import { getAlchemyRpcUrl, listAlchemyNetworkIdsForDisplay } from '../../lib/alchemy-networks.mjs'
import { verifySolanaSplDeposit, SOLANA_MAINNET_USDC_MINT } from '../../lib/verify-deposit-solana.mjs'
import { getDefaultUsdcContractForEvm } from '../../lib/evm-withdraw-config.mjs'
import { verifySolanaDepositSignature, isValidSolanaAddress } from '../../lib/solana-deposit-signature.mjs'
import { verifyMessage } from 'viem'
import { predictionLog } from '../../lib/prediction-observability.mjs'

export async function tryD1DepositRoutes(ctx) {
  const { db, kv, r2, env, request, path, method, query, body, requestId, jsonResponse } = ctx
  void requestId

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

  if (netId === 'solana') {
    const solRpc = env.SOLANA_RPC_URL?.trim() || null
    const platformSol = env.PLATFORM_WALLET_SOL?.trim() || null
    const solMint = (env.DEPOSIT_VERIFICATION_SOLANA_USDC_MINT || SOLANA_MAINNET_USDC_MINT).trim()
    if (!solRpc || !platformSol) {
      return jsonResponse(
        {
          error: 'Solana deposit verification not configured',
          code: 'SOLANA_NOT_CONFIGURED',
          message: 'Set SOLANA_RPC_URL and PLATFORM_WALLET_SOL on Pages.',
        },
        503
      )
    }
    if (!referenceId) {
      return jsonResponse(
        { error: 'txHash (Solana signature) required for verified Solana deposits', code: 'VERIFICATION_REQUIRED' },
        400
      )
    }
    const solVerify = await verifySolanaSplDeposit(solRpc, referenceId, {
      recipientWallet: platformSol,
      expectedAmountRaw,
      mint: solMint,
      minConfirmations,
    })
    if (!solVerify.ok) {
      return jsonResponse(
        { error: 'Deposit verification failed', message: solVerify.reason, code: 'VERIFICATION_FAILED' },
        400
      )
    }
  } else if (rpcUrl && platformWallet) {
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
  const solAddr = env.PLATFORM_WALLET_SOL || null
  const evmNetworkIds = listAlchemyNetworkIdsForDisplay()
  return jsonResponse({
    success: true,
    addresses: {
      evm: evm
        ? {
            address: evm,
            networks: evmNetworkIds,
            asset: 'USDC (ERC-20) recommended; native ETH/MATIC via deposit-with-tx',
            note: 'Use DEPOSIT_VERIFICATION_USDC_CONTRACT to pin a single USDC contract when verifying ERC-20 deposits.',
          }
        : null,
      solana: solAddr
        ? {
            address: solAddr,
            asset: 'USDC (SPL)',
            note: 'Send SPL USDC (mainnet mint EPjF… if using default). Crediting uses POST /api/deposit-crypto with networkId "solana" and SOLANA_RPC_URL set.',
          }
        : null,
    },
  })
}

// POST /api/deposit-with-tx — credit Pips after user deposits from connected wallet (EVM or Solana SPL). No DEPOSIT_CRYPTO_SECRET.
// Body: { userParty, txHash, fromAddress, amountPips, signature, depositType?: 'usdc'|'native', networkId }.
// Solana: signature = base64-encoded 64-byte ed25519 (e.g. Phantom signMessage); txHash = transaction signature (base58).
if (path === 'deposit-with-tx' && method === 'POST') {
  const amountRaw = body.amountPips ?? body.amountGuap
  const { userParty, txHash, fromAddress, signature, depositType, networkId } = body
  const party = (userParty || '').trim()
  const txHashNorm = (txHash || '').trim()
  const fromAddrRaw = (fromAddress || '').trim()
  if (!party || !txHashNorm || !fromAddrRaw || amountRaw == null || !signature) {
    return jsonResponse({ error: 'userParty, txHash, fromAddress, amountPips, and signature are required' }, 400)
  }
  const isNative = depositType === 'native'
  const netId = (networkId || 'ethereum').toString().toLowerCase()
  const platformWallet =
    netId === 'solana'
      ? env.PLATFORM_WALLET_SOL?.trim() || null
      : env.PLATFORM_WALLET_ADDRESS?.trim() || null
  if (!platformWallet) {
    return jsonResponse(
      {
        error: 'Deposit wallet not configured',
        message:
          netId === 'solana' ? 'Set PLATFORM_WALLET_SOL' : 'Set PLATFORM_WALLET_ADDRESS',
      },
      503
    )
  }

  const amountNum = parseFloat(amountRaw)
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return jsonResponse({ error: 'amountPips must be a positive number' }, 400)
  }
  const message = `deposit:${party}:${txHashNorm}`
  const minConfirmations = Math.max(0, parseInt(env.DEPOSIT_VERIFICATION_MIN_CONFIRMATIONS || '1', 10) || 1)

  if (netId === 'solana') {
    if (isNative) {
      return jsonResponse({ error: 'Native SOL deposit-with-tx is not supported; use SPL USDC' }, 400)
    }
    if (!isValidSolanaAddress(fromAddrRaw)) {
      return jsonResponse({ error: 'Invalid Solana fromAddress' }, 400)
    }
    const solRpc = env.SOLANA_RPC_URL?.trim()
    if (!solRpc) {
      return jsonResponse({ error: 'SOLANA_RPC_URL required for Solana deposits' }, 503)
    }
    if (!verifySolanaDepositSignature(message, signature, fromAddrRaw)) {
      return jsonResponse({ error: 'Invalid signature', message: 'Solana signMessage does not match fromAddress' }, 400)
    }
    const amountPipsStrUsdc = addPips('0', amountRaw)
    if (pipsToCents(amountPipsStrUsdc) <= 0) return jsonResponse({ error: 'amountPips must be positive' }, 400)
    const cents = pipsToCents(amountPipsStrUsdc)
    const expectedAmountRaw = String(Math.floor(cents * Math.pow(10, 6 - 2)))
    const solMint = (env.DEPOSIT_VERIFICATION_SOLANA_USDC_MINT || SOLANA_MAINNET_USDC_MINT).trim()
    const splOk = await verifySolanaSplDeposit(solRpc, txHashNorm, {
      recipientWallet: platformWallet,
      expectedAmountRaw,
      mint: solMint,
      minConfirmations,
    })
    if (!splOk.ok) {
      return jsonResponse({ error: 'Transaction verification failed', message: splOk.reason }, 400)
    }
  } else {
    const fromNorm = fromAddrRaw.toLowerCase()
    const rpcUrl = env.DEPOSIT_VERIFICATION_RPC_URL || (env.ALCHEMY_API_KEY ? getAlchemyRpcUrl(env.ALCHEMY_API_KEY, netId) : null)
    if (!rpcUrl) {
      return jsonResponse({ error: 'RPC not configured for this network' }, 503)
    }
    let recoveredAddress
    try {
      recoveredAddress = await verifyMessage({ message, signature })
    } catch (e) {
      return jsonResponse({ error: 'Invalid signature', message: e?.message || 'Signature verification failed' }, 400)
    }
    if (recoveredAddress.toLowerCase() !== fromNorm) {
      return jsonResponse({ error: 'Signature does not match fromAddress' }, 400)
    }
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
      const tokenContract =
        env.DEPOSIT_VERIFICATION_USDC_CONTRACT?.trim() || getDefaultUsdcContractForEvm(netId) || null
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
  predictionLog('api.deposit.credited', { party, networkId: netId, referenceIdTail: txHashNorm.slice(-8) })
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
  return null
}
