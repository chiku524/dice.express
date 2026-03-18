/**
 * Verify a crypto deposit transaction on-chain via JSON-RPC (read-only).
 * Used to ensure we only credit after the chain confirms the transfer to the platform wallet.
 * Works with Alchemy/Infura free tier (low CU usage per verification).
 */

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // keccak256("Transfer(address,address,uint256)")

function padAddress(addr) {
  const a = String(addr).replace(/^0x/, '').toLowerCase()
  return '0x' + a.padStart(64, '0')
}

async function rpc(rpcUrl, method, params = []) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || 'RPC error')
  return data.result
}

/**
 * Verify an ERC20 (e.g. USDC) deposit: tx must exist, succeeded, and include a Transfer to platformWallet with amount >= expectedAmountRaw.
 * @param {string} rpcUrl - e.g. https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
 * @param {string} txHash - 0x...
 * @param {{ platformWallet: string, expectedAmountRaw: string|number, tokenContractAddress?: string, minConfirmations?: number }} options
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export async function verifyErc20Deposit(rpcUrl, txHash, options = {}) {
  const {
    platformWallet,
    expectedAmountRaw,
    tokenContractAddress = null,
    minConfirmations = 1,
  } = options

  if (!rpcUrl || !txHash || !platformWallet || expectedAmountRaw == null) {
    return { ok: false, reason: 'Missing rpcUrl, txHash, platformWallet, or expectedAmountRaw' }
  }

  const txHashNorm = String(txHash).trim()
  const walletNorm = String(platformWallet).trim().toLowerCase().replace(/^0x/, '')
  const walletPadded = padAddress(platformWallet)
  const expectedBig = BigInt(expectedAmountRaw)

  try {
    const [tx, receipt] = await Promise.all([
      rpc(rpcUrl, 'eth_getTransactionByHash', [txHashNorm]),
      rpc(rpcUrl, 'eth_getTransactionReceipt', [txHashNorm]),
    ])

    if (!tx) return { ok: false, reason: 'Transaction not found' }
    if (!receipt) return { ok: false, reason: 'Transaction receipt not found (may still be pending)' }
    if (receipt.status !== '0x1') return { ok: false, reason: 'Transaction failed on-chain' }

    if (minConfirmations > 0) {
      const currentBlock = await rpc(rpcUrl, 'eth_blockNumber', [])
      const current = parseInt(currentBlock, 16)
      const txBlock = parseInt(receipt.blockNumber, 16)
      if (current - txBlock < minConfirmations) {
        return { ok: false, reason: `Not enough confirmations (have ${current - txBlock}, need ${minConfirmations})` }
      }
    }

    const logs = receipt.logs || []
    const transferLog = logs.find(
      (log) =>
        log.topics && log.topics[0] === TRANSFER_TOPIC && log.topics[2] && log.topics[2].toLowerCase() === walletPadded.toLowerCase()
    )

    if (!transferLog) {
      return { ok: false, reason: 'No Transfer to platform wallet found in this transaction' }
    }

    if (tokenContractAddress && transferLog.address) {
      const logAddr = String(transferLog.address).toLowerCase().replace(/^0x/, '')
      const wantAddr = String(tokenContractAddress).toLowerCase().replace(/^0x/, '')
      if (logAddr !== wantAddr) {
        return { ok: false, reason: 'Transfer is not from the expected token contract' }
      }
    }

    const amountHex = transferLog.data || '0x0'
    const amount = BigInt(amountHex)
    if (amount < expectedBig) {
      return { ok: false, reason: `On-chain amount ${amount.toString()} is less than requested credit ${expectedBig.toString()}` }
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e?.message || 'Verification failed' }
  }
}

/**
 * Verify a native (ETH/MATIC etc.) deposit: tx must exist, succeeded, to === platformWallet, value >= expectedAmountWei.
 * @param {string} rpcUrl
 * @param {string} txHash - 0x...
 * @param {{ platformWallet: string, expectedAmountWei: string|number|bigint, minConfirmations?: number }} options
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export async function verifyNativeDeposit(rpcUrl, txHash, options = {}) {
  const { platformWallet, expectedAmountWei, minConfirmations = 1 } = options
  if (!rpcUrl || !txHash || !platformWallet || expectedAmountWei == null) {
    return { ok: false, reason: 'Missing rpcUrl, txHash, platformWallet, or expectedAmountWei' }
  }
  const txHashNorm = String(txHash).trim()
  const walletNorm = String(platformWallet).trim().toLowerCase().replace(/^0x/, '')
  const expectedBig = BigInt(expectedAmountWei)
  try {
    const [tx, receipt] = await Promise.all([
      rpc(rpcUrl, 'eth_getTransactionByHash', [txHashNorm]),
      rpc(rpcUrl, 'eth_getTransactionReceipt', [txHashNorm]),
    ])
    if (!tx) return { ok: false, reason: 'Transaction not found' }
    if (!receipt) return { ok: false, reason: 'Transaction receipt not found (may still be pending)' }
    if (receipt.status !== '0x1') return { ok: false, reason: 'Transaction failed on-chain' }
    if (minConfirmations > 0) {
      const currentBlock = await rpc(rpcUrl, 'eth_blockNumber', [])
      const current = parseInt(currentBlock, 16)
      const txBlock = parseInt(receipt.blockNumber, 16)
      if (current - txBlock < minConfirmations) {
        return { ok: false, reason: `Not enough confirmations (have ${current - txBlock}, need ${minConfirmations})` }
      }
    }
    const toAddr = (tx.to || '').toLowerCase().replace(/^0x/, '')
    if (toAddr !== walletNorm) {
      return { ok: false, reason: 'Transaction recipient is not the platform wallet' }
    }
    const valueHex = tx.value || '0x0'
    const value = BigInt(valueHex)
    if (value < expectedBig) {
      return { ok: false, reason: `On-chain value ${value.toString()} is less than expected ${expectedBig.toString()}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e?.message || 'Verification failed' }
  }
}
