/**
 * Query deployed templates to find the correct template ID format
 */

const fs = require('fs')

const LEDGER_URL = process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
const PARTY_ID = '122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292'

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
console.log('Query Deployed Templates')
console.log('==========================================')
console.log('')

/**
 * Query for any contracts to see template IDs in use
 */
async function queryContracts() {
  console.log('Querying for existing contracts...')
  console.log('')
  
  try {
    // Try empty query to get all contracts
    const response = await fetch(`${LEDGER_URL}/v2/query`, {
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
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Query successful!')
      console.log('')
      
      if (data.result && Array.isArray(data.result)) {
        console.log(`Found ${data.result.length} contracts`)
        console.log('')
        
        // Extract unique template IDs
        const templateIds = new Set()
        const templateDetails = {}
        
        data.result.forEach((contract, index) => {
          if (contract.templateId) {
            templateIds.add(contract.templateId)
            if (!templateDetails[contract.templateId]) {
              templateDetails[contract.templateId] = {
                count: 0,
                example: contract,
              }
            }
            templateDetails[contract.templateId].count++
          }
        })
        
        if (templateIds.size > 0) {
          console.log('Template IDs found:')
          console.log('')
          Array.from(templateIds).forEach(tid => {
            console.log(`  - ${tid}`)
            console.log(`    Count: ${templateDetails[tid].count}`)
            if (templateDetails[tid].example) {
              console.log(`    Example contract ID: ${templateDetails[tid].example.contractId}`)
            }
            console.log('')
          })
          
          // Check if Token:TokenBalance is in the list
          const tokenBalance = Array.from(templateIds).find(tid => 
            tid.includes('TokenBalance') || tid.includes('Token')
          )
          
          if (tokenBalance) {
            console.log('==========================================')
            console.log(`✅ Found Token-related template: ${tokenBalance}`)
            console.log('==========================================')
            console.log('')
            console.log('Use this template ID in your requests:')
            console.log(`  templateId: "${tokenBalance}"`)
            return tokenBalance
          }
        } else {
          console.log('No contracts found (ledger is empty)')
        }
      } else {
        console.log('Response format:', JSON.stringify(data, null, 2).substring(0, 500))
      }
    } else {
      const text = await response.text()
      console.log(`Status ${response.status}: ${text.substring(0, 500)}`)
    }
  } catch (error) {
    console.log(`Error: ${error.message}`)
  }
  
  return null
}

/**
 * Try to query templates endpoint (if available)
 */
async function queryTemplatesEndpoint() {
  console.log('Trying templates endpoint...')
  console.log('')
  
  const endpoints = [
    `${LEDGER_URL}/v2/templates`,
    `${LEDGER_URL}/v1/templates`,
    `${LEDGER_URL}/templates`,
  ]
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Found templates at: ${endpoint}`)
        console.log('')
        console.log('Templates:', JSON.stringify(data, null, 2).substring(0, 1000))
        return data
      }
    } catch (error) {
      // Continue to next endpoint
    }
  }
  
  return null
}

async function main() {
  // Try querying contracts first
  const templateId = await queryContracts()
  
  // If not found, try templates endpoint
  if (!templateId) {
    await queryTemplatesEndpoint()
  }
  
  console.log('')
  console.log('==========================================')
  if (templateId) {
    console.log(`✅ Use this template ID: "${templateId}"`)
  } else {
    console.log('⚠️  Could not find Token:TokenBalance template')
    console.log('')
    console.log('Possible reasons:')
    console.log('  1. No contracts exist yet (ledger is empty)')
    console.log('  2. Template ID format is different')
    console.log('  3. Package needs to be queried differently')
    console.log('')
    console.log('Next steps:')
    console.log('  1. Check Canton documentation for template ID format')
    console.log('  2. Try creating a contract with different template ID formats')
    console.log('  3. Verify the package was deployed correctly')
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

