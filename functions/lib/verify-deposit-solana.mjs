/**
 * Verify SPL token deposits on Solana (e.g. USDC) via JSON-RPC (getTransaction jsonParsed).
 * No @solana/web3.js — keeps the Pages bundle small.
 */

/** Circle USDC on Solana mainnet-beta */
export const SOLANA_MAINNET_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

async function solanaRpc(rpcUrl, method, params = []) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || 'Solana RPC error')
  return data.result
}

/**
 * Sum net increase (raw token amount) for the recipient wallet + mint across pre/post token balances.
 */
function netSplReceivedForWallet(preBalances, postBalances, mint, recipientWallet) {
  const preByIndex = new Map()
  for (const b of preBalances || []) {
    if (!b || b.mint !== mint || b.owner !== recipientWallet) continue
    const amt = b.uiTokenAmount?.amount
    if (amt == null) continue
    try {
      preByIndex.set(b.accountIndex, BigInt(String(amt)))
    } catch {
      continue
    }
  }
  let total = 0n
  for (const b of postBalances || []) {
    if (!b || b.mint !== mint || b.owner !== recipientWallet) continue
    const raw = b.uiTokenAmount?.amount
    if (raw == null) continue
    let postAmt
    try {
      postAmt = BigInt(String(raw))
    } catch {
      continue
    }
    const preAmt = preByIndex.get(b.accountIndex) ?? 0n
    if (postAmt > preAmt) total += postAmt - preAmt
  }
  return total
}

/**
 * @param {string} rpcUrl - e.g. Helius, QuickNode, or https://api.mainnet-beta.solana.com
 * @param {string} signature - base58 transaction signature
 * @param {{ recipientWallet: string, expectedAmountRaw: string|number|bigint, mint: string, minConfirmations?: number }} options
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export async function verifySolanaSplDeposit(rpcUrl, signature, options = {}) {
  const {
    recipientWallet,
    expectedAmountRaw,
    mint,
    minConfirmations = 1,
  } = options

  if (!rpcUrl || !signature || !recipientWallet || expectedAmountRaw == null || !mint) {
    return { ok: false, reason: 'Missing rpcUrl, signature, recipientWallet, expectedAmountRaw, or mint' }
  }

  const sig = String(signature).trim()
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,128}$/.test(sig)) {
    return { ok: false, reason: 'Invalid Solana transaction signature format' }
  }

  const expectedBig = BigInt(expectedAmountRaw)

  try {
    const tx = await solanaRpc(rpcUrl, 'getTransaction', [
      sig,
      {
        encoding: 'jsonParsed',
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      },
    ])

    if (!tx) return { ok: false, reason: 'Transaction not found (wrong cluster or still pending)' }
    if (tx.meta?.err) return { ok: false, reason: 'Transaction failed on-chain' }

    if (minConfirmations > 0) {
      const txSlot = tx.slot
      if (txSlot == null) return { ok: false, reason: 'Transaction missing slot' }
      const currentSlot = await solanaRpc(rpcUrl, 'getSlot', [{ commitment: 'confirmed' }])
      const depth = Number(currentSlot) - Number(txSlot)
      if (depth < minConfirmations) {
        return { ok: false, reason: `Not enough confirmations (slots: ${depth}, need ${minConfirmations})` }
      }
    }

    const received = netSplReceivedForWallet(
      tx.meta?.preTokenBalances,
      tx.meta?.postTokenBalances,
      mint,
      recipientWallet
    )

    if (received < expectedBig) {
      return {
        ok: false,
        reason: `On-chain SPL amount to platform wallet ${received.toString()} is less than requested credit ${expectedBig.toString()}`,
      }
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e?.message || 'Solana verification failed' }
  }
}
