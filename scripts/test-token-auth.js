/**
 * Test different authentication approaches with Canton JSON API
 * This helps diagnose why valid tokens are being rejected
 */

const fs = require('fs')

const LEDGER_URL = process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
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
  process.exit(1)
}

if (!authToken) {
  console.error('No token found')
  process.exit(1)
}

console.log('==========================================')
console.log('Testing Token Authentication')
console.log('==========================================')
console.log('')
console.log(`Token length: ${authToken.length}`)
console.log(`Token (first 50 chars): ${authToken.substring(0, 50)}...`)
console.log('')

/**
 * Test an endpoint with different auth header formats
 */
async function testAuth(endpoint, description, authHeader) {
  console.log(`\n--- ${description} ---`)
  console.log(`Endpoint: ${endpoint}`)
  console.log(`Auth header: ${authHeader ? authHeader.substring(0, 50) + '...' : 'None'}`)
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
  
  if (authHeader) {
    headers['Authorization'] = authHeader
  }
  
  // Minimal test command
  const testCommand = {
    actAs: ['TestParty'],
    commandId: 'test-auth',
    commands: [],
  }
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(testCommand),
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
    
    console.log(`Status: ${response.status}`)
    
    if (response.status === 200 || response.status === 201) {
      console.log('✅ SUCCESS!')
      return { success: true, status: response.status }
    } else if (response.status === 400) {
      console.log('⚠️  400 Bad Request (endpoint exists, format issue)')
      if (data && data.context && data.context.ledger_api_error) {
        console.log(`   Error: ${data.context.ledger_api_error}`)
      }
      return { success: false, status: response.status, error: 'format' }
    } else if (response.status === 401) {
      console.log('❌ 401 Unauthorized (no auth or invalid)')
      return { success: false, status: response.status, error: 'unauthorized' }
    } else if (response.status === 403) {
      console.log('❌ 403 Forbidden (token rejected)')
      if (data && data.context && data.context.ledger_api_error) {
        console.log(`   Error: ${data.context.ledger_api_error}`)
      }
      return { success: false, status: response.status, error: 'forbidden' }
    } else {
      console.log(`⚠️  Status ${response.status}`)
      if (text) {
        console.log(`   Response: ${text.substring(0, 200)}`)
      }
      return { success: false, status: response.status, error: 'unknown' }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return { success: false, error: error.message }
  }
}

/**
 * Main test function
 */
async function runTests() {
  const endpoint = `${LEDGER_URL}/v2/commands/submit-and-wait`
  
  const tests = [
    {
      description: 'Test 1: Bearer token (standard)',
      authHeader: `Bearer ${authToken}`,
    },
    {
      description: 'Test 2: Bearer token with extra space',
      authHeader: `Bearer  ${authToken}`,
    },
    {
      description: 'Test 3: Token without Bearer prefix',
      authHeader: authToken,
    },
    {
      description: 'Test 4: Lowercase authorization header',
      authHeader: `bearer ${authToken}`,
    },
    {
      description: 'Test 5: No authentication',
      authHeader: null,
    },
  ]
  
  const results = []
  
  for (const test of tests) {
    const result = await testAuth(endpoint, test.description, test.authHeader)
    results.push({ ...test, result })
    
    // If we get a 400 (format issue) instead of 403, that's progress
    if (result.status === 400) {
      console.log('\n✅ Endpoint accepts this auth format! (400 means format issue, not auth)')
    }
  }
  
  console.log('\n')
  console.log('==========================================')
  console.log('Summary')
  console.log('==========================================')
  console.log('')
  
  for (const test of results) {
    const status = test.result.status || 'N/A'
    const icon = test.result.success ? '✅' : test.result.status === 400 ? '⚠️' : '❌'
    console.log(`${icon} ${test.description}: ${status}`)
  }
  
  console.log('')
  console.log('Note:')
  console.log('  - 400 = Endpoint exists, auth works, but request format is wrong')
  console.log('  - 401 = No auth or token format wrong')
  console.log('  - 403 = Token rejected (invalid, expired, or wrong permissions)')
  console.log('  - 404 = Endpoint not found')
  console.log('')
}

runTests()
  .then(() => {
    console.log('Tests complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Test error:', error)
    process.exit(1)
  })

