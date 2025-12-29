/**
 * Query available templates to find correct template ID format
 */

const fs = require('fs')

const LEDGER_URL = process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'

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
console.log('Query Available Templates')
console.log('==========================================')
console.log('')

/**
 * Try different endpoints to query templates
 */
const endpoints = [
  `${LEDGER_URL}/v2/templates`,
  `${LEDGER_URL}/v1/templates`,
  `${LEDGER_URL}/templates`,
  `${LEDGER_URL}/v2/packages`,
  `${LEDGER_URL}/v1/packages`,
]

async function queryTemplates() {
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
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          console.log(`  ✅ Success!`)
          console.log('  Response:', JSON.stringify(data, null, 2).substring(0, 1000))
          
          // Try to find Token:TokenBalance
          if (data.templates) {
            const tokenBalance = data.templates.find(t => 
              t.includes('TokenBalance') || t.includes('Token:TokenBalance')
            )
            if (tokenBalance) {
              console.log('')
              console.log(`✅ Found TokenBalance template: ${tokenBalance}`)
              return tokenBalance
            }
          }
          
          return data
        } else {
          const text = await response.text()
          console.log(`  Response: ${text.substring(0, 200)}`)
        }
      } else if (response.status === 401 || response.status === 403) {
        console.log(`  🔒 Authentication required`)
      } else if (response.status === 404) {
        console.log(`  ❌ Endpoint not found`)
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
    }
    console.log('')
  }
  
  return null
}

/**
 * Try to query contracts to see template IDs in use
 */
async function queryExistingContracts() {
  console.log('Trying to find template IDs from existing contracts...')
  console.log('')
  
  try {
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
      console.log('Query response:', JSON.stringify(data, null, 2).substring(0, 1000))
      
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
          templateIds.forEach(tid => console.log(`  - ${tid}`))
          return Array.from(templateIds)
        }
      }
    } else {
      const text = await response.text()
      console.log(`Status ${response.status}: ${text.substring(0, 200)}`)
    }
  } catch (error) {
    console.log(`Error: ${error.message}`)
  }
  
  return null
}

async function main() {
  // Try to query templates
  const templates = await queryTemplates()
  
  // If not found, try querying existing contracts
  if (!templates) {
    const contractTemplates = await queryExistingContracts()
    if (contractTemplates) {
      console.log('')
      console.log('Use one of these template ID formats for your requests')
    }
  }
  
  console.log('')
  console.log('==========================================')
  console.log('Note: Template IDs in Canton typically include package hash')
  console.log('Format: "Module:Template" or "Module:Template:<package-hash>"')
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

