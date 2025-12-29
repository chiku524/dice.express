/**
 * Explore JSON API endpoints to find template information
 * Based on the client's screenshot showing /v2/packages endpoint
 */

const fs = require('fs')

// Try both the public endpoint and the internal endpoint from screenshot
const LEDGER_URLS = [
  'https://participant.dev.canton.wolfedgelabs.com/json-api',
  'https://validator-participant:7575', // From screenshot - might be internal
  'http://validator-participant:7575',  // Try HTTP too
]

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
console.log('Explore JSON API Endpoints')
console.log('==========================================')
console.log('Based on client screenshot showing /v2/packages')
console.log('')

const PACKAGE_ID = 'b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0'

/**
 * Try to get templates from a package
 */
async function getTemplatesFromPackage(baseUrl, packageId) {
  console.log(`--- Trying to get templates from package ---`)
  console.log(`Base URL: ${baseUrl}`)
  console.log(`Package ID: ${packageId}`)
  console.log('')
  
  const endpoints = [
    `${baseUrl}/v2/packages/${packageId}/templates`,
    `${baseUrl}/v2/packages/${packageId}`,
    `${baseUrl}/v1/packages/${packageId}/templates`,
    `${baseUrl}/packages/${packageId}/templates`,
    `${baseUrl}/v2/templates?packageId=${packageId}`,
    `${baseUrl}/v1/templates?packageId=${packageId}`,
    `${baseUrl}/v2/templates`,
    `${baseUrl}/v1/templates`,
    `${baseUrl}/templates`,
  ]
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying: ${endpoint}`)
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      })
      
      console.log(`  Status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`  ✅ SUCCESS!`)
        console.log('')
        console.log('Response:', JSON.stringify(data, null, 2).substring(0, 2000))
        
        // Check if it contains template information
        if (data.templates || data.templateIds || (Array.isArray(data) && data.length > 0)) {
          console.log('')
          console.log('✅ Found template information!')
          
          let templates = []
          if (data.templates) {
            templates = Array.isArray(data.templates) ? data.templates : [data.templates]
          } else if (data.templateIds) {
            templates = Array.isArray(data.templateIds) ? data.templateIds : [data.templateIds]
          } else if (Array.isArray(data)) {
            templates = data
          }
          
          if (templates.length > 0) {
            console.log('')
            console.log('Template IDs found:')
            templates.forEach((tid, i) => {
              console.log(`  ${i + 1}. ${typeof tid === 'string' ? tid : JSON.stringify(tid)}`)
            })
            
            // Look for Token:TokenBalance
            const tokenBalance = templates.find(t => 
              (typeof t === 'string' && t.includes('TokenBalance')) ||
              (typeof t === 'object' && JSON.stringify(t).includes('TokenBalance'))
            )
            
            if (tokenBalance) {
              console.log('')
              console.log('✅ Found TokenBalance template!')
              console.log(`   Format: ${typeof tokenBalance === 'string' ? tokenBalance : JSON.stringify(tokenBalance)}`)
              return tokenBalance
            }
          }
        }
        
        return data
      } else {
        const text = await response.text()
        console.log(`  Error: ${text.substring(0, 200)}`)
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`)
    }
    console.log('')
  }
  
  return null
}

/**
 * Try to query for contracts to see template IDs in use
 */
async function queryContractsForTemplates(baseUrl) {
  console.log(`--- Querying contracts to find template IDs ---`)
  console.log(`Base URL: ${baseUrl}`)
  console.log('')
  
  // Try different query endpoints
  const queryEndpoints = [
    `${baseUrl}/v2/contracts`,
    `${baseUrl}/v1/contracts`,
    `${baseUrl}/contracts`,
    `${baseUrl}/v2/active-contracts`,
    `${baseUrl}/v1/active-contracts`,
  ]
  
  for (const endpoint of queryEndpoints) {
    try {
      console.log(`Trying: ${endpoint}`)
      
      // Try GET first
      let response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      })
      
      if (!response.ok && response.status !== 405) {
        // Try POST
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({}),
        })
      }
      
      console.log(`  Status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`  ✅ Success!`)
        console.log('Response:', JSON.stringify(data, null, 2).substring(0, 1000))
        
        // Extract template IDs
        if (data.result && Array.isArray(data.result)) {
          const templateIds = new Set()
          data.result.forEach(contract => {
            if (contract.templateId) {
              templateIds.add(contract.templateId)
            }
          })
          
          if (templateIds.size > 0) {
            console.log('')
            console.log('Template IDs found in contracts:')
            Array.from(templateIds).forEach(tid => console.log(`  - ${tid}`))
            return Array.from(templateIds)
          }
        }
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`)
    }
    console.log('')
  }
  
  return null
}

/**
 * Try to get OpenAPI spec which might have endpoint documentation
 */
async function getOpenAPISpec(baseUrl) {
  console.log(`--- Try to get OpenAPI specification ---`)
  console.log(`Base URL: ${baseUrl}`)
  console.log('')
  
  const endpoints = [
    `${baseUrl}/openapi.json`,
    `${baseUrl}/docs/openapi`,
    `${baseUrl}/v2/openapi`,
    `${baseUrl}/v1/openapi`,
    `${baseUrl}/swagger.json`,
  ]
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying: ${endpoint}`)
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`  ✅ Found OpenAPI spec!`)
        console.log('')
        
        // Look for template-related endpoints
        if (data.paths) {
          console.log('Template-related endpoints:')
          Object.keys(data.paths).forEach(path => {
            if (path.includes('template') || path.includes('contract') || path.includes('package')) {
              console.log(`  - ${path}`)
            }
          })
        }
        
        return data
      }
    } catch (error) {
      // Continue
    }
  }
  
  return null
}

async function main() {
  for (const baseUrl of LEDGER_URLS) {
    console.log('==========================================')
    console.log(`Testing: ${baseUrl}`)
    console.log('==========================================')
    console.log('')
    
    // Try to get templates from package
    const templates = await getTemplatesFromPackage(baseUrl, PACKAGE_ID)
    
    if (templates) {
      console.log('')
      console.log('✅ Found template information!')
      console.log('Use the format shown above for template IDs')
      return
    }
    
    // Try querying contracts
    await queryContractsForTemplates(baseUrl)
    
    // Try OpenAPI spec
    await getOpenAPISpec(baseUrl)
    
    console.log('')
  }
  
  console.log('==========================================')
  console.log('Summary')
  console.log('==========================================')
  console.log('')
  console.log('Could not find template information via these endpoints.')
  console.log('')
  console.log('However, the screenshot shows:')
  console.log('  - /v2/packages endpoint works')
  console.log('  - Port 7575 might be the JSON API port')
  console.log('  - Internal endpoint: validator-participant:7575')
  console.log('')
  console.log('Next steps:')
  console.log('  1. Ask client if there\'s a /v2/templates endpoint')
  console.log('  2. Or if we can query templates from a package')
  console.log('  3. Or for an example of a working contract creation request')
  console.log('')
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })

