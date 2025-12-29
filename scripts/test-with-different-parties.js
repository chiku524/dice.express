/**
 * Test JSON API with different party formats
 * Tries common party ID patterns to find the correct one
 */

const fs = require('fs')

const LEDGER_URL = process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
const TOKEN_FILE = process.env.TOKEN_FILE || 'token.json'

// Load token
let authToken = null
let userInfo = null

try {
  if (fs.existsSync('token.txt')) {
    authToken = fs.readFileSync('token.txt', 'utf8').trim()
  } else if (fs.existsSync(TOKEN_FILE)) {
    const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'))
    authToken = tokenData.access_token
  }
  
  // Decode token to get user info
  if (authToken) {
    const parts = authToken.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
      userInfo = {
        userId: payload.sub,
        email: payload.email,
        username: payload.preferred_username,
        name: payload.name,
      }
    }
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
console.log('Test with Different Party Formats')
console.log('==========================================')
console.log('')
if (userInfo) {
  console.log(`User: ${userInfo.name} (${userInfo.email})`)
  console.log(`Username: ${userInfo.username}`)
  console.log(`User ID: ${userInfo.userId}`)
  console.log('')
}

// Party formats to try
const partyFormats = [
  userInfo?.username || 'nico',
  userInfo?.email?.split('@')[0] || 'nico',
  userInfo?.email || 'nico.builds@outlook.com',
  userInfo?.userId || 'ee15aa3d-0bd4-44f9-9664-b49ad7e308aa',
  'Admin',
  'admin',
  'Nico',
  'NicoChikuji',
]

console.log('Testing party formats:')
partyFormats.forEach((party, i) => console.log(`  ${i + 1}. ${party}`))
console.log('')

/**
 * Test a party format
 */
async function testParty(party) {
  const command = {
    actAs: [party],
    commandId: `test-party-${Date.now()}-${party}`,
    applicationId: 'prediction-markets',
    commands: [
      {
        CreateCommand: {
          templateId: 'Token:TokenBalance',
          createArguments: {
            owner: party,
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
      },
    ],
  }
  
  try {
    const response = await fetch(`${LEDGER_URL}/v2/commands/submit-and-wait`, {
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
    
    return {
      party,
      status: response.status,
      ok: response.ok,
      data: data,
      text: text,
    }
  } catch (error) {
    return {
      party,
      error: error.message,
    }
  }
}

/**
 * Main test function
 */
async function testAllParties() {
  const results = []
  
  for (const party of partyFormats) {
    console.log(`Testing party: "${party}"`)
    const result = await testParty(party)
    results.push(result)
    
    if (result.status === 200 || result.status === 201) {
      console.log(`  ✅ SUCCESS! Status: ${result.status}`)
      if (result.data) {
        console.log(`  Response:`, JSON.stringify(result.data, null, 2).substring(0, 300))
      }
      console.log('')
      return { success: true, party, result }
    } else if (result.status === 400) {
      console.log(`  ⚠️  Status: 400 (format issue, but auth worked)`)
      if (result.data) {
        const errorMsg = JSON.stringify(result.data).substring(0, 200)
        console.log(`  Error: ${errorMsg}`)
      } else if (result.text) {
        console.log(`  Error: ${result.text.substring(0, 200)}`)
      }
    } else if (result.status === 403) {
      console.log(`  ❌ Status: 403 (auth failed - wrong party)`)
    } else if (result.status) {
      console.log(`  ⚠️  Status: ${result.status}`)
    } else {
      console.log(`  ❌ Error: ${result.error}`)
    }
    console.log('')
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return { success: false, results }
}

testAllParties()
  .then((summary) => {
    console.log('==========================================')
    if (summary.success) {
      console.log(`✅ Found working party: "${summary.party}"`)
      console.log('')
      console.log('Use this party in your requests:')
      console.log(`  actAs: ["${summary.party}"]`)
      console.log('')
      console.log('Or set as environment variable:')
      console.log(`  export ADMIN_PARTY="${summary.party}"`)
    } else {
      console.log('❌ No working party format found')
      console.log('')
      console.log('All attempts returned errors. Please:')
      console.log('  1. Check wallet UI for your assigned party ID')
      console.log('  2. Verify the request format is correct')
      console.log('  3. Check if parties need to be allocated first')
    }
    console.log('==========================================')
    process.exit(summary.success ? 0 : 1)
  })
  .catch((error) => {
    console.error('Test error:', error)
    process.exit(1)
  })

