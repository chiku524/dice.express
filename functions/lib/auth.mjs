/**
 * Password hashing and verification using Web Crypto (PBKDF2).
 * Used in Cloudflare Workers / D1 API for register and sign-in.
 */

const PBKDF2_ITERATIONS = 100000
const SALT_BYTES = 16
const HASH_BYTES = 32

function hexEncode(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexDecode(hex) {
  const len = hex.length / 2
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out.buffer
}

/**
 * Hash a password with a new random salt. Returns { salt, hash } as hex strings.
 * @param {string} password
 * @returns {Promise<{ salt: string, hash: string }>}
 */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await deriveKey(password, salt)
  return { salt: hexEncode(salt), hash: hexEncode(hash) }
}

/**
 * Verify password against stored salt and hash.
 * @param {string} password
 * @param {string} saltHex
 * @param {string} storedHashHex
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, saltHex, storedHashHex) {
  const salt = new Uint8Array(hexDecode(saltHex))
  const computed = new Uint8Array(await deriveKey(password, salt))
  const stored = new Uint8Array(hexDecode(storedHashHex))
  if (computed.length !== stored.length) return false
  let diff = 0
  for (let i = 0; i < computed.length; i++) diff |= computed[i] ^ stored[i]
  return diff === 0
}

/**
 * @param {string} password
 * @param {Uint8Array} salt
 * @returns {Promise<ArrayBuffer>}
 */
async function deriveKey(password, salt) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_BYTES * 8
  )
  return bits
}
