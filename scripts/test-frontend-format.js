/**
 * Test using the exact format that the frontend uses
 * Based on frontend/src/services/ledgerClient.js
 */

const fs = require('fs')

const LEDGER_URL = process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
const PARTY_ID = process.env.PARTY_ID || 'ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292'

// Load token
let authToken = null
try {
  if (fs.existsSync('token.txt')) {
    authToken = fs.readFileSync('token.txt', 'utf8').trim()
  } else if (fs.existsSync('token.json')) {
    const tokenData = JSON.parse(fs.readFileSync('token.json', 'utf8'))
    authToken = tokenData.access_token
  }
} catch (error) {
  console.error('Error loading token:', error.message)
  process.exit(1)
}

if (!authToken) {
  console.error('No token found')
  process.exit(1)
}

console.log('==========================================')
console.log('Test Frontend Request Format')
console.log('==========================================')
console.log(`Party ID: ${PARTY_ID}`)
console.log('')

/**
 * Test the exact format the frontend uses
 * From frontend/src/services/ledgerClient.js - submitCommand method
 */
async function testFrontendFormat() {
  console.log('--- Testing Frontend Format (v1 style) ---')
  console.log('')
  
  // This is the format the frontend uses (from ledgerClient.js)
  const command = {
    commands: {
      party: PARTY_ID,
      applicationId: 'prediction-markets',
      commandId: `create-${Date.now()}-${Math.random()}`,
      list: [
        {
          templateId: 'Token:TokenBalance',
          payload: {
            owner: PARTY_ID,
            token: {
              id: 'USDC',
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
              description: 'Test token',
            },
            amount: 1000.0,
          },
        },
      ],
    },
  }
  
  console.log('Request (frontend format):')
  console.log(JSON.stringify(command, null, 2))
  console.log('')
  
  // Try v1 endpoint first (what frontend might use)
  const endpoints = [
    `${LEDGER_URL}/v1/command`,
    `${LEDGER_URL}/v2/command`,
    `${LEDGER_URL}/command`,
  ]
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying: ${endpoint}`)
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(command),
      })
      
      const contentType = response.headers.get('content-type')
      let data = null
      let text = null
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json()
        } catch (e) {
          text = await response.text()
        }
      } else {
        text = await response.text()
      }
      
      console.log(`  Status: ${response.status}`)
      
      if (response.ok) {
        console.log(`  ✅ SUCCESS!`)
        if (data) {
          console.log('  Response:', JSON.stringify(data, null, 2).substring(0, 500))
        } else {
          console.log('  Response:', text?.substring(0, 500))
        }
        return { success: true, endpoint, data }
      } else {
        console.log(`  ❌ Failed`)
        if (data) {
          console.log('  Error:', JSON.stringify(data, null, 2).substring(0, 300))
        } else {
          console.log('  Error:', text?.substring(0, 300))
        }
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
    }
    console.log('')
  }
  
  return { success: false }
}

/**
 * Test through the Vercel proxy (like frontend does)
 */
async function testViaProxy() {
  console.log('--- Testing via Vercel Proxy (like frontend) ---')
  console.log('')
  
  // Frontend uses the proxy at /api/command
  const proxyUrl = process.env.PROXY_URL || 'https://upwork-canton-daml-project.vercel.app/api/command'
  
  const command = {
    commands: {
      party: PARTY_ID,
      applicationId: 'prediction-markets',
      commandId: `create-${Date.now()}-${Math.random()}`,
      list: [
        {
          templateId: 'Token:TokenBalance',
          payload: {
            owner: PARTY_ID,
            token: {
              id: 'USDC',
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
              description: 'Test token',
            },
            amount: 1000.0,
          },
        },
      ],
    },
  }
  
  try {
    console.log(`Trying proxy: ${proxyUrl}`)
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(command),
    })
    
    const data = await response.json()
    console.log(`  Status: ${response.status}`)
    
    if (response.ok) {
      console.log(`  ✅ SUCCESS via proxy!`)
      console.log('  Response:', JSON.stringify(data, null, 2).substring(0, 500))
      return { success: true, data }
    } else {
      console.log(`  ❌ Failed`)
      console.log('  Error:', JSON.stringify(data, null, 2).substring(0, 300))
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`)
  }
  
  return { success: false }
}

async function main() {
  // Test direct format
  const directResult = await testFrontendFormat()
  
  if (!directResult.success) {
    // Try via proxy
    await testViaProxy()
  }
  
  console.log('')
  console.log('==========================================')
  if (directResult.success) {
    console.log('✅ Found working format!')
    console.log(`   Endpoint: ${directResult.endpoint}`)
  } else {
    console.log('❌ Frontend format also failed')
    console.log('')
    console.log('This suggests:')
    console.log('  1. Template ID format is still wrong')
    console.log('  2. Request structure needs adjustment')
    console.log('  3. Need to wait for client response')
  }
  console.log('==========================================')
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })

