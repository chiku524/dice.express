/**
 * Verify Phantom / Solana wallet `signMessage` for deposit-with-tx (ed25519).
 */
import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'

function signatureBytesFromBody(signature) {
  if (signature == null) return null
  if (typeof signature === 'string') {
    const s = signature.trim()
    try {
      const bin = atob(s)
      const out = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
      return out
    } catch {
      return null
    }
  }
  if (Array.isArray(signature)) return Uint8Array.from(signature)
  return null
}

/**
 * @param {string} message - plain text (e.g. deposit:userParty:txSig)
 * @param {string | number[]} signature - base64-encoded 64-byte detached signature, or byte array
 * @param {string} fromAddressBase58 - Solana public key
 */
export function isValidSolanaAddress(s) {
  try {
    new PublicKey(String(s).trim())
    return true
  } catch {
    return false
  }
}

export function verifySolanaDepositSignature(message, signature, fromAddressBase58) {
  try {
    const pubKey = new PublicKey(fromAddressBase58)
    const pub = pubKey.toBytes()
    if (pub.length !== 32) return false
    const sig = signatureBytesFromBody(signature)
    if (!sig || sig.length !== 64) return false
    const msg = new TextEncoder().encode(message)
    return nacl.sign.detached.verify(msg, sig, pub)
  } catch {
    return false
  }
}
