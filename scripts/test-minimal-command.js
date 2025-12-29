/**
 * Test with minimal command to identify format issues
 */

const fs = require('fs')

const LEDGER_URL = process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
const PARTY = process.env.PARTY || 'nico' // Try with username first

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
console.log('Test Minimal Command Format')
console.log('==========================================')
console.log(`Party: ${PARTY}`)
console.log('')

/**
 * Test different command formats
 */
const formats = [
  {
    name: 'Format 1: Full v2 with applicationId',
    body: {
      actAs: [PARTY],
      commandId: `test-${Date.now()}`,
      applicationId: 'prediction-markets',
      commands: [
        {
          CreateCommand: {
            templateId: 'Token:TokenBalance',
            createArguments: {
              owner: PARTY,
              token: {
                id: 'USDC',
                symbol: 'USDC',
                name: 'USD Coin',
                decimals: 6,
                description: 'Test',
              },
              amount: 1000.0,
            },
          },
        },
      ],
    },
  },
  {
    name: 'Format 2: v2 without applicationId',
    body: {
      actAs: [PARTY],
      commandId: `test-${Date.now()}`,
      commands: [
        {
          CreateCommand: {
            templateId: 'Token:TokenBalance',
            createArguments: {
              owner: PARTY,
              token: {
                id: 'USDC',
                symbol: 'USDC',
                name: 'USD Coin',
                decimals: 6,
                description: 'Test',
              },
              amount: 1000.0,
            },
          },
        },
      ],
    },
  },
  {
    name: 'Format 3: v2 with readAs',
    body: {
      actAs: [PARTY],
      readAs: [],
      commandId: `test-${Date.now()}`,
      applicationId: 'prediction-markets',
      commands: [
        {
          CreateCommand: {
            templateId: 'Token:TokenBalance',
            createArguments: {
              owner: PARTY,
              token: {
                id: 'USDC',
                symbol: 'USDC',
                name: 'USD Coin',
                decimals: 6,
                description: 'Test',
              },
              amount: 1000.0,
            },
          },
        },
      ],
    },
  },
  {
    name: 'Format 4: Minimal - just required fields',
    body: {
      actAs: [PARTY],
      commandId: `test-${Date.now()}`,
      commands: [
        {
          CreateCommand: {
            templateId: 'Token:TokenBalance',
            createArguments: {
              owner: PARTY,
              token: { id: 'USDC' },
              amount: 1000.0,
            },
          },
        },
      ],
    },
  },
]

async function testFormat(format) {
  console.log(`\n--- ${format.name} ---`)
  console.log('Request:', JSON.stringify(format.body, null, 2).substring(0, 500))
  console.log('')
  
  try {
    const response = await fetch(`${LEDGER_URL}/v2/commands/submit-and-wait`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(format.body),
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
    
    if (response.ok) {
      console.log('✅ SUCCESS!')
      if (data) {
        console.log('Response:', JSON.stringify(data, null, 2))
      } else {
        console.log('Response:', text)
      }
      return { success: true, format: format.name, data }
    } else {
      console.log(`❌ Failed`)
      if (data) {
        console.log('Error:', JSON.stringify(data, null, 2).substring(0, 500))
      } else {
        console.log('Error:', text?.substring(0, 500))
      }
      return { success: false, status: response.status, error: data || text }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function testAll() {
  for (const format of formats) {
    const result = await testFormat(format)
    if (result.success) {
      console.log('\n==========================================')
      console.log(`✅ Working format found: ${format.name}`)
      console.log('==========================================')
      return result
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('\n==========================================')
  console.log('❌ No working format found')
  console.log('==========================================')
  console.log('')
  console.log('All formats returned 400 errors.')
  console.log('This suggests:')
  console.log('  1. Request body structure is incorrect')
  console.log('  2. Template ID format is wrong')
  console.log('  3. Field types or values are incorrect')
  console.log('  4. Missing required fields')
  console.log('')
  console.log('Please check:')
  console.log('  - Canton JSON API documentation')
  console.log('  - Template ID format (might need package hash)')
  console.log('  - Required fields for CreateCommand')
}

testAll()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Test error:', error)
    process.exit(1)
  })

