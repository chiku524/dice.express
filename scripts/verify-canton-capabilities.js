/**
 * Verify Canton Capabilities
 * Tests what endpoints and API versions are available on Canton
 */

const LEDGER_URL = process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
const TOKEN_FILE = process.env.TOKEN_FILE || 'token.json'

// Load authentication token if available
let authToken = null
try {
  const fs = require('fs')
  if (fs.existsSync(TOKEN_FILE)) {
    const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'))
    authToken = tokenData.access_token
  }
} catch (error) {
  // Ignore errors, authToken remains null
}

/**
 * Test an endpoint
 */
async function testEndpoint(method, endpoint, body = null, description) {
  console.log(`\n--- Testing: ${description} ---`)
  console.log(`  ${method} ${endpoint}`)
  
  const headers = {
    'Accept': 'application/json',
  }
  
  if (body) {
    headers['Content-Type'] = 'application/json'
  }
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  
  try {
    const options = {
      method: method,
      headers: headers,
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }
    
    const response = await fetch(endpoint, options)
    
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
      status: response.status,
      ok: response.ok,
      contentType: contentType,
      data: data,
      text: text ? text.substring(0, 500) : null,
    }
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    }
  }
}

/**
 * Main verification function
 */
async function verifyCapabilities() {
  console.log('==========================================')
  console.log('Canton Capabilities Verification')
  console.log('==========================================')
  console.log('')
  console.log(`Base URL: ${LEDGER_URL}`)
  if (authToken) {
    console.log('✅ Authentication token found')
  } else {
    console.log('⚠️  No authentication token (some endpoints may require auth)')
  }
  console.log('')
  
  const results = {
    endpoints: {},
    apiVersions: {
      v1: { commands: false, queries: false },
      v2: { commands: false, queries: false },
    },
    openapi: false,
  }
  
  // Test OpenAPI endpoint
  console.log('==========================================')
  console.log('1. OpenAPI Documentation')
  console.log('==========================================')
  const openApiEndpoints = [
    `${LEDGER_URL}/docs/openapi`,
    `${LEDGER_URL}/openapi.json`,
    `${LEDGER_URL}/v2/openapi`,
    `${LEDGER_URL}/v1/openapi`,
  ]
  
  for (const endpoint of openApiEndpoints) {
    const result = await testEndpoint('GET', endpoint, null, `OpenAPI: ${endpoint}`)
    console.log(`  Status: ${result.status}`)
    if (result.ok) {
      console.log('  ✅ OpenAPI available')
      results.openapi = endpoint
      break
    } else if (result.status === 404) {
      console.log('  ❌ Not found')
    } else {
      console.log(`  ⚠️  ${result.status}: ${result.text || JSON.stringify(result.data)}`)
    }
  }
  
  // Test Command Endpoints
  console.log('')
  console.log('==========================================')
  console.log('2. Command Endpoints')
  console.log('==========================================')
  
  const commandEndpoints = [
    { url: `${LEDGER_URL}/v2/commands/submit-and-wait`, version: 'v2', format: 'submit-and-wait' },
    { url: `${LEDGER_URL}/v2/command`, version: 'v2', format: 'command' },
    { url: `${LEDGER_URL}/v1/command`, version: 'v1', format: 'command' },
    { url: `${LEDGER_URL}/command`, version: 'unknown', format: 'command' },
  ]
  
  // Test with a minimal valid command (may fail due to party/template, but we check endpoint availability)
  const testCommand = {
    actAs: ['TestParty'],
    commandId: 'test-command',
    commands: [],
  }
  
  for (const endpoint of commandEndpoints) {
    const result = await testEndpoint('POST', endpoint.url, testCommand, `Command: ${endpoint.url}`)
    console.log(`  Status: ${result.status}`)
    
    if (result.status === 404) {
      console.log('  ❌ Endpoint not found')
    } else if (result.status === 400 || result.status === 401 || result.status === 403) {
      console.log('  ✅ Endpoint exists (returned validation/auth error, which means endpoint is available)')
      results.endpoints[endpoint.url] = true
      results.apiVersions[endpoint.version].commands = true
    } else if (result.status === 200 || result.status === 201) {
      console.log('  ✅ Endpoint works!')
      results.endpoints[endpoint.url] = true
      results.apiVersions[endpoint.version].commands = true
    } else {
      console.log(`  ⚠️  Unexpected status: ${result.status}`)
      if (result.text) {
        console.log(`  Response: ${result.text.substring(0, 200)}`)
      }
    }
  }
  
  // Test Query Endpoints
  console.log('')
  console.log('==========================================')
  console.log('3. Query Endpoints')
  console.log('==========================================')
  
  const queryEndpoints = [
    { url: `${LEDGER_URL}/v2/query`, version: 'v2' },
    { url: `${LEDGER_URL}/v1/query`, version: 'v1' },
    { url: `${LEDGER_URL}/query`, version: 'unknown' },
    { url: `${LEDGER_URL}/v2/contracts/search`, version: 'v2' },
    { url: `${LEDGER_URL}/v1/contracts/search`, version: 'v1' },
  ]
  
  const testQuery = {
    templateIds: [],
    query: {},
  }
  
  for (const endpoint of queryEndpoints) {
    const result = await testEndpoint('POST', endpoint.url, testQuery, `Query: ${endpoint.url}`)
    console.log(`  Status: ${result.status}`)
    
    if (result.status === 404) {
      console.log('  ❌ Endpoint not found')
    } else if (result.status === 200 || result.status === 400) {
      console.log('  ✅ Endpoint exists')
      results.endpoints[endpoint.url] = true
      results.apiVersions[endpoint.version].queries = true
    } else {
      console.log(`  ⚠️  Status: ${result.status}`)
      if (result.text) {
        console.log(`  Response: ${result.text.substring(0, 200)}`)
      }
    }
  }
  
  // Summary
  console.log('')
  console.log('==========================================')
  console.log('Summary')
  console.log('==========================================')
  console.log('')
  
  console.log('API Versions:')
  console.log(`  v1 Commands: ${results.apiVersions.v1.commands ? '✅' : '❌'}`)
  console.log(`  v1 Queries:  ${results.apiVersions.v1.queries ? '✅' : '❌'}`)
  console.log(`  v2 Commands: ${results.apiVersions.v2.commands ? '✅' : '❌'}`)
  console.log(`  v2 Queries:  ${results.apiVersions.v2.queries ? '✅' : '❌'}`)
  console.log('')
  
  if (results.openapi) {
    console.log(`OpenAPI Docs: ✅ ${results.openapi}`)
  } else {
    console.log('OpenAPI Docs: ❌ Not available')
  }
  console.log('')
  
  // Recommendations
  console.log('💡 Recommendations:')
  if (results.apiVersions.v1.commands) {
    console.log('  ✅ Use SDK 2.10.0 with v1 API (Setup-2.10.0.daml)')
  }
  if (results.apiVersions.v2.commands) {
    console.log('  ✅ SDK 3.4.9 with v2 API may work (Setup.daml)')
  }
  if (!results.apiVersions.v1.commands && !results.apiVersions.v2.commands) {
    console.log('  ⚠️  No command endpoints found - use JSON API fallback script')
  }
  if (results.apiVersions.v1.commands && !results.apiVersions.v2.commands) {
    console.log('  ⚠️  Only v1 API available - use SDK 2.10.0')
  }
  console.log('')
  
  return results
}

// Run verification
verifyCapabilities()
  .then((results) => {
    console.log('Verification complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Verification error:', error)
    process.exit(1)
  })

