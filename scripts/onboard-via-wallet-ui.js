/**
 * Onboard user via Wallet UI
 * 
 * Wallet UI URL: https://wallet.validator.dev.canton.wolfedgelabs.com
 * 
 * This script attempts to:
 * 1. Check if user is already onboarded
 * 2. Onboard via API if available
 * 3. Provide instructions for manual onboarding if needed
 */

const fs = require('fs')

const WALLET_UI_URL = 'https://wallet.validator.dev.canton.wolfedgelabs.com'
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

// Decode token to get user info
let userInfo = null
if (authToken) {
  try {
    const parts = authToken.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
      userInfo = {
        userId: payload.sub,
        email: payload.email,
        name: payload.name,
        username: payload.preferred_username,
      }
    }
  } catch (e) {
    console.error('Could not decode token:', e.message)
  }
}

console.log('==========================================')
console.log('Wallet UI Onboarding')
console.log('==========================================')
console.log('')
console.log(`Wallet UI: ${WALLET_UI_URL}`)
if (userInfo) {
  console.log(`User ID: ${userInfo.userId}`)
  console.log(`Email: ${userInfo.email}`)
  console.log(`Name: ${userInfo.name}`)
}
console.log('')

if (!authToken) {
  console.log('❌ No authentication token found')
  console.log('')
  console.log('Please get a token first:')
  console.log('  .\\scripts\\get-keycloak-token.ps1 -Username "nico.builds@outlook.com" -Password "Chikuji1!"')
  process.exit(1)
}

/**
 * Check if wallet UI is accessible
 */
async function checkWalletUI() {
  console.log('Checking wallet UI accessibility...')
  try {
    const response = await fetch(WALLET_UI_URL, {
      method: 'GET',
      redirect: 'follow',
    })
    
    console.log(`  Status: ${response.status}`)
    console.log(`  Content-Type: ${response.headers.get('content-type')}`)
    
    if (response.ok) {
      console.log('  ✅ Wallet UI is accessible')
      return true
    } else {
      console.log(`  ⚠️  Wallet UI returned status ${response.status}`)
      return false
    }
  } catch (error) {
    console.log(`  ❌ Error accessing wallet UI: ${error.message}`)
    return false
  }
}

/**
 * Try to onboard via API
 */
async function tryOnboardViaAPI() {
  console.log('\nAttempting API-based onboarding...')
  
  const possibleEndpoints = [
    `${WALLET_UI_URL}/api/onboard`,
    `${WALLET_UI_URL}/api/onboarding`,
    `${WALLET_UI_URL}/api/user/onboard`,
    `${WALLET_UI_URL}/api/v1/onboard`,
    `${WALLET_UI_URL}/onboard`,
    `${WALLET_UI_URL}/onboarding`,
  ]
  
  for (const endpoint of possibleEndpoints) {
    try {
      console.log(`  Trying: ${endpoint}`)
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          userId: userInfo?.userId,
          email: userInfo?.email,
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
      
      console.log(`    Status: ${response.status}`)
      
      if (response.ok) {
        console.log(`    ✅ Success!`)
        if (data) {
          console.log(`    Response:`, JSON.stringify(data, null, 2))
        }
        return { success: true, endpoint, data: data || text }
      } else if (response.status === 401 || response.status === 403) {
        console.log(`    🔒 Requires authentication (may need fresh token)`)
      } else if (response.status === 404) {
        console.log(`    ❌ Endpoint not found`)
      } else {
        console.log(`    ⚠️  Status ${response.status}`)
        if (data) {
          console.log(`    Response:`, JSON.stringify(data, null, 2).substring(0, 200))
        }
      }
    } catch (error) {
      console.log(`    ❌ Error: ${error.message}`)
    }
  }
  
  return { success: false }
}

/**
 * Check if user is already onboarded
 */
async function checkOnboardingStatus() {
  console.log('\nChecking onboarding status...')
  
  const possibleEndpoints = [
    `${WALLET_UI_URL}/api/user/status`,
    `${WALLET_UI_URL}/api/user/me`,
    `${WALLET_UI_URL}/api/v1/user/status`,
    `${WALLET_UI_URL}/api/status`,
  ]
  
  for (const endpoint of possibleEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })
      
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          console.log(`  ✅ Found status endpoint: ${endpoint}`)
          console.log(`  Response:`, JSON.stringify(data, null, 2))
          return { success: true, data }
        }
      }
    } catch (error) {
      // Continue to next endpoint
    }
  }
  
  console.log('  ⚠️  Could not find status endpoint')
  return { success: false }
}

/**
 * Main onboarding function
 */
async function onboard() {
  // Check wallet UI accessibility
  const isAccessible = await checkWalletUI()
  if (!isAccessible) {
    console.log('\n❌ Cannot access wallet UI. Please check the URL.')
    return
  }
  
  // Check if already onboarded
  const statusCheck = await checkOnboardingStatus()
  if (statusCheck.success && statusCheck.data) {
    console.log('\n✅ User status retrieved')
    // Check if user has partyId
    if (statusCheck.data.partyId || statusCheck.data.party) {
      console.log('✅ User appears to be onboarded!')
      console.log(`   Party ID: ${statusCheck.data.partyId || statusCheck.data.party}`)
      return
    }
  }
  
  // Try API onboarding
  const apiResult = await tryOnboardViaAPI()
  
  if (apiResult.success) {
    console.log('\n✅ Onboarding successful via API!')
    return
  }
  
  // If API onboarding failed, provide manual instructions
  console.log('\n==========================================')
  console.log('Manual Onboarding Required')
  console.log('==========================================')
  console.log('')
  console.log('API-based onboarding is not available.')
  console.log('Please onboard manually via the wallet UI:')
  console.log('')
  console.log(`1. Open browser: ${WALLET_UI_URL}`)
  console.log('2. Log in with Keycloak credentials:')
  console.log(`   Email: ${userInfo?.email || 'nico.builds@outlook.com'}`)
  console.log('   Password: [your password]')
  console.log('3. Complete the onboarding process')
  console.log('4. Verify that a party ID is created')
  console.log('')
  console.log('After onboarding, run:')
  console.log('  .\\scripts\\request-new-token.ps1')
  console.log('')
  console.log('Then test JSON API again.')
}

onboard()
  .then(() => {
    console.log('\nOnboarding check complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\nOnboarding error:', error)
    process.exit(1)
  })

