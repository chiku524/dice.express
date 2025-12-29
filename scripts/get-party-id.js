/**
 * Get the party ID assigned to the user after onboarding
 * This queries Canton to find the party associated with the Keycloak user
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

// Decode token to get user ID
let userId = null
try {
  const parts = authToken.split('.')
  if (parts.length === 3) {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    userId = payload.sub
    console.log(`Keycloak User ID: ${userId}`)
  }
} catch (e) {
  console.error('Could not decode token:', e.message)
  process.exit(1)
}

console.log('==========================================')
console.log('Get Party ID')
console.log('==========================================')
console.log('')

/**
 * Try to get party ID from various endpoints
 */
async function getPartyId() {
  const possibleEndpoints = [
    `${LEDGER_URL}/v2/parties`,
    `${LEDGER_URL}/v1/parties`,
    `${LEDGER_URL}/parties`,
    `${LEDGER_URL}/v2/user/party`,
    `${LEDGER_URL}/v1/user/party`,
    `${LEDGER_URL}/api/user/party`,
  ]
  
  for (const endpoint of possibleEndpoints) {
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
          console.log(`  Response:`, JSON.stringify(data, null, 2))
          
          // Try to extract party ID from response
          let partyId = null
          if (data.party) {
            partyId = data.party
          } else if (data.partyId) {
            partyId = data.partyId
          } else if (data.parties && Array.isArray(data.parties) && data.parties.length > 0) {
            partyId = data.parties[0]
          } else if (Array.isArray(data) && data.length > 0) {
            partyId = typeof data[0] === 'string' ? data[0] : data[0].party || data[0].partyId
          }
          
          if (partyId) {
            console.log('')
            console.log(`✅ Party ID found: ${partyId}`)
            return partyId
          }
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
 * Try to query contracts to see what parties exist
 */
async function findPartiesFromContracts() {
  console.log('Trying to find parties from existing contracts...')
  console.log('')
  
  try {
    // Query for any contracts to see what parties are involved
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
      console.log('Query response:', JSON.stringify(data, null, 2))
      
      // Extract unique parties from contracts
      if (data.result && Array.isArray(data.result)) {
        const parties = new Set()
        data.result.forEach(contract => {
          if (contract.payload && contract.payload.owner) {
            parties.add(contract.payload.owner)
          }
        })
        
        if (parties.size > 0) {
          console.log('')
          console.log('Parties found in contracts:')
          parties.forEach(party => console.log(`  - ${party}`))
          return Array.from(parties)[0] // Return first party found
        }
      }
    }
  } catch (error) {
    console.log(`Error querying contracts: ${error.message}`)
  }
  
  return null
}

/**
 * Main function
 */
async function main() {
  // Try to get party ID from API
  let partyId = await getPartyId()
  
  // If not found, try to find from contracts
  if (!partyId) {
    partyId = await findPartiesFromContracts()
  }
  
  console.log('')
  console.log('==========================================')
  if (partyId) {
    console.log(`✅ Party ID: ${partyId}`)
    console.log('')
    console.log('You can use this party ID in your requests:')
    console.log(`  actAs: ["${partyId}"]`)
    console.log('')
    console.log('Or set as environment variable:')
    console.log(`  export PARTY_ID="${partyId}"`)
  } else {
    console.log('❌ Could not find party ID')
    console.log('')
    console.log('Possible reasons:')
    console.log('  1. Party ID endpoint is not available')
    console.log('  2. User needs to be onboarded (check wallet UI)')
    console.log('  3. Party ID is stored differently')
    console.log('')
    console.log('Try checking the wallet UI to see your assigned party ID')
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

