/**
 * Deep investigation of JSON API authentication
 * Tests various authentication scenarios and request formats
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

/**
 * Test authentication with detailed error capture
 */
async function testAuth(endpoint, headers, body, description) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Test: ${description}`)
  console.log(`${'='.repeat(60)}`)
  console.log(`Endpoint: ${endpoint}`)
  console.log(`Headers:`, JSON.stringify(headers, null, 2))
  console.log(`Body:`, JSON.stringify(body, null, 2).substring(0, 500))
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    })
    
    const contentType = response.headers.get('content-type')
    let data = null
    let text = null
    
    // Try to get full response
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json()
      } catch (e) {
        text = await response.text()
      }
    } else {
      text = await response.text()
    }
    
    console.log(`\nResponse Status: ${response.status}`)
    console.log(`Response Headers:`, Object.fromEntries(response.headers.entries()))
    
    if (data) {
      console.log(`Response Data:`, JSON.stringify(data, null, 2))
    } else if (text) {
      console.log(`Response Text:`, text.substring(0, 1000))
    }
    
    return {
      status: response.status,
      ok: response.ok,
      data: data,
      text: text,
      headers: Object.fromEntries(response.headers.entries()),
    }
  } catch (error) {
    console.log(`\nError: ${error.message}`)
    return {
      error: error.message,
    }
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('==========================================')
  console.log('Deep JSON API Authentication Investigation')
  console.log('==========================================')
  console.log(`Token length: ${authToken.length}`)
  console.log(`Token (first 50 chars): ${authToken.substring(0, 50)}...`)
  
  // Decode token to check claims
  try {
    const parts = authToken.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
      console.log('\nToken Claims:')
      console.log(`  iss: ${payload.iss}`)
      console.log(`  aud: ${JSON.stringify(payload.aud)}`)
      console.log(`  sub: ${payload.sub}`)
      console.log(`  exp: ${payload.exp} (${new Date(payload.exp * 1000).toISOString()})`)
      console.log(`  iat: ${payload.iat} (${new Date(payload.iat * 1000).toISOString()})`)
      console.log(`  scope: ${payload.scope}`)
      console.log(`  azp: ${payload.azp}`)
      if (payload.realm_access) {
        console.log(`  realm_access: ${JSON.stringify(payload.realm_access)}`)
      }
      if (payload.resource_access) {
        console.log(`  resource_access: ${JSON.stringify(payload.resource_access)}`)
      }
    }
  } catch (e) {
    console.log('Could not decode token:', e.message)
  }
  
  const endpoint = `${LEDGER_URL}/v2/commands/submit-and-wait`
  
  // Minimal test command
  const testCommand = {
    actAs: ['Admin'],
    commandId: `test-${Date.now()}`,
    applicationId: 'prediction-markets',
    commands: [
      {
        CreateCommand: {
          templateId: 'Token:TokenBalance',
          createArguments: {
            owner: 'Admin',
            token: {
              id: 'USDC',
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
              description: 'Test token'
            },
            amount: 1000.0
          }
        }
      }
    ]
  }
  
  const tests = [
    {
      description: 'Test 1: Standard Bearer token',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: testCommand
    },
    {
      description: 'Test 2: Bearer token with X-Auth-Token header',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Auth-Token': authToken
      },
      body: testCommand
    },
    {
      description: 'Test 3: Token in X-Auth-Token header only',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Auth-Token': authToken
      },
      body: testCommand
    },
    {
      description: 'Test 4: No authentication (check if auth is required)',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: testCommand
    },
    {
      description: 'Test 5: Check OpenAPI endpoint (might reveal auth requirements)',
      headers: {
        'Accept': 'application/json'
      },
      body: null,
      endpoint: `${LEDGER_URL.replace('/json-api', '')}/docs/openapi` // Try base URL
    }
  ]
  
  const results = []
  
  for (const test of tests) {
    const testEndpoint = test.endpoint || endpoint
    const result = await testAuth(testEndpoint, test.headers, test.body, test.description)
    results.push({ ...test, result })
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('\n')
  console.log('==========================================')
  console.log('Summary')
  console.log('==========================================')
  
  for (const test of results) {
    const status = test.result?.status || 'N/A'
    const icon = test.result?.ok ? '✅' : test.result?.status === 400 ? '⚠️' : '❌'
    console.log(`${icon} ${test.description}: ${status}`)
    if (test.result?.data?.context?.ledger_api_error) {
      console.log(`   Error: ${test.result.data.context.ledger_api_error}`)
    }
  }
  
  console.log('\n')
  console.log('Key Findings:')
  console.log('  - If all return 403: Token validation issue')
  console.log('  - If Test 4 returns 401: Auth is required')
  console.log('  - If Test 4 returns 403: Auth format issue')
  console.log('  - If Test 5 works: Check OpenAPI for auth requirements')
}

runTests()
  .then(() => {
    console.log('\nTests complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Test error:', error)
    process.exit(1)
  })

