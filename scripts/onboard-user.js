/**
 * Onboard user via Wallet UI (when URL is provided)
 * 
 * This script will attempt to onboard the user once we have:
 * 1. Wallet UI URL
 * 2. Authentication token
 * 3. Onboarding endpoint/process
 */

const fs = require('fs')

// Configuration - Update these when client provides wallet UI URL
const WALLET_UI_URL = process.env.WALLET_UI_URL || '' // To be provided by client
const TOKEN_FILE = process.env.TOKEN_FILE || 'token.json'

// Load token
let authToken = null
try {
  if (fs.existsSync('token.txt')) {
    authToken = fs.readFileSync('token.txt', 'utf8').trim()
  } else if (fs.existsSync(TOKEN_FILE)) {
    const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'))
    authToken = tokenData.access_token
  }
} catch (error) {
  console.error('Error loading token:', error.message)
}

// Decode token to get user ID
let userId = null
if (authToken) {
  try {
    const parts = authToken.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
      userId = payload.sub
      console.log(`Keycloak User ID: ${userId}`)
    }
  } catch (e) {
    console.error('Could not decode token:', e.message)
  }
}

console.log('==========================================')
console.log('User Onboarding Script')
console.log('==========================================')
console.log('')

if (!WALLET_UI_URL) {
  console.log('❌ Wallet UI URL not configured')
  console.log('')
  console.log('Please set WALLET_UI_URL environment variable or update this script')
  console.log('Example:')
  console.log('  export WALLET_UI_URL="https://wallet.dev.canton.wolfedgelabs.com"')
  console.log('  node scripts/onboard-user.js')
  console.log('')
  console.log('Or wait for client to provide the wallet UI URL')
  process.exit(1)
}

if (!authToken) {
  console.log('❌ No authentication token found')
  console.log('')
  console.log('Please get a token first:')
  console.log('  .\\scripts\\get-keycloak-token.ps1 -Username "nico.builds@outlook.com" -Password "Chikuji1!"')
  process.exit(1)
}

if (!userId) {
  console.log('❌ Could not extract user ID from token')
  process.exit(1)
}

console.log(`Wallet UI URL: ${WALLET_UI_URL}`)
console.log(`User ID: ${userId}`)
console.log('')

// Possible onboarding endpoints
const onboardingEndpoints = [
  `${WALLET_UI_URL}/onboard`,
  `${WALLET_UI_URL}/onboarding`,
  `${WALLET_UI_URL}/api/onboard`,
  `${WALLET_UI_URL}/api/onboarding`,
  `${WALLET_UI_URL}/api/user/onboard`,
  `${WALLET_UI_URL}/api/v1/onboard`,
]

async function tryOnboard(endpoint) {
  console.log(`Trying: ${endpoint}`)
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        userId: userId,
        // Add other required fields when we know them
      }),
    })
    
    const contentType = response.headers.get('content-type')
    let data = null
    let text = null
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      text = await response.text()
    }
    
    console.log(`  Status: ${response.status}`)
    
    if (response.ok) {
      console.log(`  ✅ Success!`)
      if (data) {
        console.log(`  Response:`, JSON.stringify(data, null, 2))
      } else {
        console.log(`  Response: ${text}`)
      }
      return { success: true, data: data || text }
    } else {
      console.log(`  ❌ Failed`)
      if (data) {
        console.log(`  Error:`, JSON.stringify(data, null, 2))
      } else {
        console.log(`  Error: ${text}`)
      }
      return { success: false, status: response.status, error: data || text }
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function onboard() {
  console.log('Attempting to onboard user...\n')
  
  for (const endpoint of onboardingEndpoints) {
    const result = await tryOnboard(endpoint)
    if (result.success) {
      console.log('\n✅ Onboarding successful!')
      return
    }
    console.log('')
  }
  
  console.log('❌ Could not onboard via any endpoint')
  console.log('')
  console.log('This might mean:')
  console.log('  1. The wallet UI URL is incorrect')
  console.log('  2. Onboarding must be done through the web UI')
  console.log('  3. The onboarding endpoint is different')
  console.log('  4. Additional authentication or steps are required')
  console.log('')
  console.log('Please check with the client for:')
  console.log('  - Correct wallet UI URL')
  console.log('  - Onboarding process/endpoint')
  console.log('  - Whether onboarding can be done via API or must be done via UI')
}

onboard()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Onboarding error:', error)
    process.exit(1)
  })

