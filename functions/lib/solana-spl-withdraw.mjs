/**
 * Send SPL USDC from platform hot wallet to a user Solana address.
 */
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import bs58 from 'bs58'
import { SOLANA_MAINNET_USDC_MINT } from './verify-deposit-solana.mjs'

function keypairFromSecret(raw) {
  const s = String(raw).trim()
  if (!s) throw new Error('empty secret')
  if (s.startsWith('[')) {
    const arr = JSON.parse(s)
    if (!Array.isArray(arr)) throw new Error('expected JSON array of bytes')
    return Keypair.fromSecretKey(Uint8Array.from(arr))
  }
  const decoded = bs58.decode(s)
  if (decoded.length !== 64) throw new Error('secret key must decode to 64 bytes')
  return Keypair.fromSecretKey(decoded)
}

/**
 * @param {object} env
 * @param {{ destination: string, netPips: number }} w - withdrawal row fields
 * @returns {Promise<{ ok: true, signature: string } | { ok: false, error: string }>}
 */
export async function sendSolanaUsdcWithdrawal(env, w) {
  const rpc = env.SOLANA_RPC_URL?.trim()
  const secret = env.SOLANA_WALLET_PRIVATE_KEY?.trim()
  if (!rpc) return { ok: false, error: 'SOLANA_RPC_URL not set' }
  if (!secret) return { ok: false, error: 'SOLANA_WALLET_PRIVATE_KEY not set' }

  let keypair
  try {
    keypair = keypairFromSecret(secret)
  } catch (e) {
    return { ok: false, error: e?.message || 'Invalid SOLANA_WALLET_PRIVATE_KEY' }
  }

  const platformPub = keypair.publicKey.toBase58()
  const configured = env.PLATFORM_WALLET_SOL?.trim()
  if (configured && configured !== platformPub) {
    return { ok: false, error: 'SOLANA_WALLET_PRIVATE_KEY public key does not match PLATFORM_WALLET_SOL' }
  }

  const mintStr = (env.DEPOSIT_VERIFICATION_SOLANA_USDC_MINT || SOLANA_MAINNET_USDC_MINT).trim()
  let destOwner
  try {
    destOwner = new PublicKey(String(w.destination).trim())
  } catch {
    return { ok: false, error: 'Invalid Solana destination address' }
  }

  const mint = new PublicKey(mintStr)
  const fromOwner = keypair.publicKey
  const fromAta = getAssociatedTokenAddressSync(mint, fromOwner, false, TOKEN_PROGRAM_ID)
  const toAta = getAssociatedTokenAddressSync(mint, destOwner, false, TOKEN_PROGRAM_ID)

  const amountRaw = BigInt(Math.floor(Number(w.netPips) * 1e6))
  if (amountRaw <= 0n) return { ok: false, error: 'Invalid USDC amount' }

  const connection = new Connection(rpc, 'confirmed')
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')

  const tx = new Transaction()
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(fromOwner, toAta, destOwner, mint, TOKEN_PROGRAM_ID)
  )
  tx.add(createTransferInstruction(fromAta, toAta, fromOwner, amountRaw, [], TOKEN_PROGRAM_ID))
  tx.feePayer = fromOwner
  tx.recentBlockhash = blockhash
  tx.sign(keypair)

  try {
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    })
    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed'
    )
    return { ok: true, signature }
  } catch (e) {
    return { ok: false, error: e?.message || 'Solana send failed' }
  }
}
