/**
 * Full JWT Decode - Shows all claims in detail
 */

const fs = require('fs')

// Load token
let token = null
try {
  if (fs.existsSync('token.txt')) {
    token = fs.readFileSync('token.txt', 'utf8').trim()
  } else if (fs.existsSync('token.json')) {
    const tokenData = JSON.parse(fs.readFileSync('token.json', 'utf8'))
    token = tokenData.access_token
  }
} catch (error) {
  console.error('Error loading token:', error.message)
  process.exit(1)
}

if (!token) {
  console.error('No token found')
  process.exit(1)
}

console.log('==========================================')
console.log('Full JWT Decode')
console.log('==========================================')
console.log('')

// Split token
const parts = token.split('.')
if (parts.length !== 3) {
  console.error('Invalid JWT format')
  process.exit(1)
}

// Decode header
console.log('--- HEADER ---')
try {
  const header = JSON.parse(Buffer.from(parts[0], 'base64').toString())
  console.log(JSON.stringify(header, null, 2))
} catch (e) {
  console.error('Error decoding header:', e.message)
}

console.log('')
console.log('--- PAYLOAD (All Claims) ---')
try {
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
  console.log(JSON.stringify(payload, null, 2))
  
  console.log('')
  console.log('--- Key Claims Summary ---')
  console.log(`Issuer (iss): ${payload.iss}`)
  console.log(`Subject (sub): ${payload.sub}`)
  console.log(`Audience (aud): ${JSON.stringify(payload.aud)}`)
  console.log(`Client ID (azp): ${payload.azp}`)
  console.log(`Scopes (scope): ${payload.scope}`)
  console.log(`Issued At (iat): ${payload.iat} (${new Date(payload.iat * 1000).toISOString()})`)
  console.log(`Expires At (exp): ${payload.exp} (${new Date(payload.exp * 1000).toISOString()})`)
  console.log(`Token Type (typ): ${payload.typ}`)
  console.log(`Session ID (sid): ${payload.sid}`)
  console.log(`Email: ${payload.email}`)
  console.log(`Name: ${payload.name}`)
  console.log(`Preferred Username: ${payload.preferred_username}`)
  
  if (payload.realm_access) {
    console.log(`\nRealm Access:`)
    console.log(JSON.stringify(payload.realm_access, null, 2))
  }
  
  if (payload.resource_access) {
    console.log(`\nResource Access:`)
    console.log(JSON.stringify(payload.resource_access, null, 2))
  }
  
  console.log('')
  console.log('--- IMPORTANT FOR ONBOARDING ---')
  console.log(`Keycloak User ID (sub): ${payload.sub}`)
  console.log(`This is the ID that needs to be mapped to a Canton party during onboarding`)
  
} catch (e) {
  console.error('Error decoding payload:', e.message)
}

console.log('')
console.log('--- SIGNATURE ---')
console.log(`Signature length: ${parts[2].length} characters`)
console.log(`Signature (first 50 chars): ${parts[2].substring(0, 50)}...`)

console.log('')
console.log('==========================================')
console.log('Full JWT decode complete')
console.log('==========================================')

