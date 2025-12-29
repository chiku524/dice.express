/**
 * Verify token format and validity
 */

const fs = require('fs')

const TOKEN_FILE = process.env.TOKEN_FILE || 'token.json'
const TOKEN_TXT = 'token.txt'

console.log('==========================================')
console.log('Token Verification')
console.log('==========================================')
console.log('')

// Try to load token
let token = null
let source = null

// Try token.txt first
if (fs.existsSync(TOKEN_TXT)) {
  token = fs.readFileSync(TOKEN_TXT, 'utf8').trim()
  if (token) {
    source = 'token.txt'
  }
}

// Try token.json
if (!token && fs.existsSync(TOKEN_FILE)) {
  try {
    const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'))
    if (tokenData && tokenData.access_token) {
      token = tokenData.access_token
      source = 'token.json'
    }
  } catch (error) {
    console.warn(`Warning: Could not parse ${TOKEN_FILE}:`, error.message)
  }
}

if (!token) {
  console.error('❌ No token found')
  console.error('   Checked:', TOKEN_TXT, TOKEN_FILE)
  process.exit(1)
}

console.log(`✅ Token found in: ${source}`)
console.log(`   Token length: ${token.length} characters`)
console.log(`   Token (first 50 chars): ${token.substring(0, 50)}...`)
console.log('')

// Verify JWT format (should have 3 parts separated by dots)
const parts = token.split('.')
if (parts.length !== 3) {
  console.error('❌ Invalid JWT format (should have 3 parts separated by dots)')
  console.error(`   Found ${parts.length} parts`)
  process.exit(1)
}

console.log('✅ JWT format valid (3 parts)')
console.log('')

// Try to decode the payload (second part)
try {
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
  console.log('✅ Token payload decoded successfully')
  console.log('')
  console.log('Token Information:')
  console.log(`   Issuer: ${payload.iss || 'N/A'}`)
  console.log(`   Subject: ${payload.sub || 'N/A'}`)
  console.log(`   Expires: ${payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A'}`)
  console.log(`   Issued: ${payload.iat ? new Date(payload.iat * 1000).toISOString() : 'N/A'}`)
  console.log(`   Client ID: ${payload.azp || (Array.isArray(payload.aud) ? payload.aud[0] : payload.aud) || 'N/A'}`)
  console.log(`   Audience: ${Array.isArray(payload.aud) ? payload.aud.join(', ') : payload.aud || 'N/A'}`)
  console.log(`   Scopes: ${payload.scope || 'N/A'}`)
  console.log('')
  
  // Check audience
  if (payload.aud) {
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
    console.log('   Audience check:')
    for (const aud of audiences) {
      console.log(`     - ${aud}`)
      if (aud.includes('canton') || aud.includes('ledger')) {
        console.log('       ✅ Contains "canton" or "ledger"')
      }
    }
  }
  console.log('')
  
  // Check expiration
  if (payload.exp) {
    const now = Math.floor(Date.now() / 1000)
    const expiresIn = payload.exp - now
    if (expiresIn <= 0) {
      console.error('❌ Token is EXPIRED')
      console.error(`   Expired ${Math.abs(expiresIn)} seconds ago`)
      process.exit(1)
    } else {
      console.log(`✅ Token is valid for ${expiresIn} more seconds (${Math.floor(expiresIn / 60)} minutes)`)
    }
  }
  
  // Check scopes
  if (payload.scope) {
    const scopes = payload.scope.split(' ')
    console.log(`   Required scopes: ${scopes.join(', ')}`)
    if (!scopes.includes('daml_ledger_api')) {
      console.warn('⚠️  Warning: Token may not have "daml_ledger_api" scope')
    }
  }
  
} catch (error) {
  console.warn('⚠️  Could not decode token payload:', error.message)
  console.warn('   Token may still be valid, but format is unexpected')
}

console.log('')
console.log('==========================================')
console.log('Token verification complete')
console.log('==========================================')

