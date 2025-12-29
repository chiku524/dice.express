/**
 * Query JSON API to discover available templates and their IDs
 * This might help us find the correct template ID format
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
console.log('Query JSON API for Templates/Contracts')
console.log('==========================================')
console.log('')

/**
 * Try to query for any existing contracts
 */
async function queryContracts() {
  console.log('--- Attempt 1: Query All Contracts ---')
  console.log('')
  
  const queryEndpoints = [
    `${LEDGER_URL}/v2/query`,
    `${LEDGER_URL}/v1/query`,
    `${LEDGER_URL}/v2/contracts/search`,
    `${LEDGER_URL}/v1/contracts/search`,
  ]
  
  for (const endpoint of queryEndpoints) {
    try {
      console.log(`Trying: ${endpoint}`)
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          templateIds: [],
          query: {},
        }),
      })
      
      console.log(`  Status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`  ✅ Success!`)
        console.log('')
        console.log('Response:', JSON.stringify(data, null, 2).substring(0, 2000))
        
        // Extract template IDs from contracts
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
            Array.from(templateIds).forEach(tid => {
              console.log(`  - ${tid}`)
            })
            return Array.from(templateIds)
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
 * Try to get party information
 */
async function getPartyInfo() {
  console.log('--- Attempt 2: Get Party Information ---')
  console.log('')
  
  const endpoints = [
    `${LEDGER_URL}/v2/parties`,
    `${LEDGER_URL}/v1/parties`,
    `${LEDGER_URL}/parties`,
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
        console.log(`  ✅ Success!`)
        console.log('Response:', JSON.stringify(data, null, 2))
        return data
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`)
    }
    console.log('')
  }
  
  return null
}

/**
 * Try to get package information
 */
async function getPackageInfo() {
  console.log('--- Attempt 3: Get Package Information ---')
  console.log('')
  
  const endpoints = [
    `${LEDGER_URL}/v2/packages`,
    `${LEDGER_URL}/v1/packages`,
    `${LEDGER_URL}/packages`,
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
        console.log(`  ✅ Success!`)
        console.log('Response:', JSON.stringify(data, null, 2).substring(0, 1000))
        return data
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`)
    }
    console.log('')
  }
  
  return null
}

/**
 * Try to query with a wildcard or empty template ID
 */
async function queryWithWildcard() {
  console.log('--- Attempt 4: Query with Wildcard ---')
  console.log('')
  
  // Try querying with our package ID to see if we get template info
  const packageId = 'b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0'
  
  const query = {
    templateIds: [],
    query: {},
  }
  
  try {
    const response = await fetch(`${LEDGER_URL}/v2/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(query),
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('Query response:', JSON.stringify(data, null, 2).substring(0, 1000))
      return data
    } else {
      const text = await response.text()
      console.log(`Status ${response.status}: ${text.substring(0, 500)}`)
    }
  } catch (error) {
    console.log(`Error: ${error.message}`)
  }
  
  return null
}

async function main() {
  // Try different query approaches
  const contracts = await queryContracts()
  const partyInfo = await getPartyInfo()
  const packageInfo = await getPackageInfo()
  const wildcard = await queryWithWildcard()
  
  console.log('')
  console.log('==========================================')
  console.log('Summary')
  console.log('==========================================')
  console.log('')
  
  if (contracts && Array.isArray(contracts)) {
    console.log('✅ Found template IDs from contracts:')
    contracts.forEach(tid => console.log(`  - ${tid}`))
    console.log('')
    console.log('Use one of these formats for your template ID!')
  } else if (contracts) {
    console.log('✅ Got query response (check above for template IDs)')
  } else {
    console.log('❌ Could not query contracts')
  }
  
  if (partyInfo) {
    console.log('✅ Got party information')
  }
  
  if (packageInfo) {
    console.log('✅ Got package information')
  }
  
  console.log('')
  console.log('Next steps:')
  console.log('  1. If template IDs found, use that format')
  console.log('  2. If no contracts exist, try creating with different formats')
  console.log('  3. Check block explorer for existing contracts')
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

