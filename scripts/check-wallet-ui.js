/**
 * Check for Wallet UI endpoints and attempt to discover onboarding process
 */

const LEDGER_BASE = 'https://participant.dev.canton.wolfedgelabs.com'

// Possible wallet UI endpoints
const possibleEndpoints = [
  `${LEDGER_BASE}/wallet`,
  `${LEDGER_BASE}/wallet-ui`,
  `${LEDGER_BASE}/ui`,
  `${LEDGER_BASE}/app`,
  `${LEDGER_BASE}/onboard`,
  `${LEDGER_BASE}/onboarding`,
  `https://wallet.dev.canton.wolfedgelabs.com`,
  `https://wallet-ui.dev.canton.wolfedgelabs.com`,
]

console.log('==========================================')
console.log('Wallet UI Discovery')
console.log('==========================================')
console.log('')

async function checkEndpoint(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
    })
    
    const contentType = response.headers.get('content-type') || ''
    const isHtml = contentType.includes('text/html')
    const isJson = contentType.includes('application/json')
    
    return {
      url: response.url, // Final URL after redirects
      status: response.status,
      contentType: contentType,
      isHtml: isHtml,
      isJson: isJson,
      exists: response.status !== 404,
    }
  } catch (error) {
    return {
      url: url,
      status: 0,
      error: error.message,
      exists: false,
    }
  }
}

async function discoverWalletUI() {
  console.log('Checking possible wallet UI endpoints...\n')
  
  const results = []
  
  for (const endpoint of possibleEndpoints) {
    console.log(`Checking: ${endpoint}`)
    const result = await checkEndpoint(endpoint)
    results.push({ endpoint, ...result })
    
    if (result.exists && result.status === 200) {
      console.log(`  ✅ Found! Status: ${result.status}, Content-Type: ${result.contentType}`)
      if (result.isHtml) {
        console.log(`  📄 This appears to be a web page (HTML)`)
      }
      if (result.isJson) {
        console.log(`  📋 This appears to be an API endpoint (JSON)`)
      }
    } else if (result.status === 404) {
      console.log(`  ❌ Not found (404)`)
    } else if (result.status === 401 || result.status === 403) {
      console.log(`  🔒 Requires authentication (${result.status})`)
    } else if (result.error) {
      console.log(`  ❌ Error: ${result.error}`)
    } else {
      console.log(`  ⚠️  Status: ${result.status}`)
    }
    console.log('')
  }
  
  console.log('==========================================')
  console.log('Summary')
  console.log('==========================================')
  console.log('')
  
  const found = results.filter(r => r.exists && r.status === 200)
  const requiresAuth = results.filter(r => r.status === 401 || r.status === 403)
  
  if (found.length > 0) {
    console.log('✅ Found potential wallet UI endpoints:')
    found.forEach(r => {
      console.log(`   - ${r.endpoint}`)
      console.log(`     Final URL: ${r.url}`)
      console.log(`     Content-Type: ${r.contentType}`)
    })
  } else {
    console.log('❌ No wallet UI endpoints found at common locations')
  }
  
  if (requiresAuth.length > 0) {
    console.log('\n🔒 Endpoints that require authentication:')
    requiresAuth.forEach(r => {
      console.log(`   - ${r.endpoint} (${r.status})`)
    })
  }
  
  if (found.length === 0 && requiresAuth.length === 0) {
    console.log('\n💡 We need the wallet UI URL from the client')
    console.log('   The wallet UI is likely hosted separately or at a different domain')
  }
  
  console.log('')
}

discoverWalletUI()
  .then(() => {
    console.log('Discovery complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Discovery error:', error)
    process.exit(1)
  })

