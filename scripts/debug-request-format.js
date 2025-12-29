/**
 * Debug request format to get more detailed error messages
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
console.log('Debug Request Format')
console.log('==========================================')
console.log(`Party ID: ${PARTY_ID}`)
console.log('')

/**
 * Test with minimal request to see what error we get
 */
async function testMinimalRequest() {
  console.log('Test 1: Minimal request (just required fields)')
  console.log('')
  
  const minimalCommand = {
    actAs: [PARTY_ID],
    commandId: `test-${Date.now()}`,
    commands: [
      {
        CreateCommand: {
          templateId: 'Token:TokenBalance',
          createArguments: {
            owner: PARTY_ID,
            token: { id: 'USDC' },
            amount: 1000.0,
          },
        },
      },
    ],
  }
  
  console.log('Request:', JSON.stringify(minimalCommand, null, 2))
  console.log('')
  
  try {
    const response = await fetch(`${LEDGER_URL}/v2/commands/submit-and-wait`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(minimalCommand),
    })
    
    const text = await response.text()
    console.log(`Status: ${response.status}`)
    console.log(`Response: ${text}`)
    console.log('')
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(text)
      console.log('Parsed JSON:', JSON.stringify(data, null, 2))
    } catch (e) {
      console.log('Response is not JSON')
    }
  } catch (error) {
    console.log(`Error: ${error.message}`)
  }
}

/**
 * Test with different token field format
 */
async function testTokenFormat() {
  console.log('Test 2: Different token field formats')
  console.log('')
  
  const formats = [
    {
      name: 'Token as string (id only)',
      token: 'USDC',
    },
    {
      name: 'Token as object (minimal)',
      token: { id: 'USDC' },
    },
    {
      name: 'Token as TokenId newtype',
      token: { TokenId: 'USDC' },
    },
    {
      name: 'Token as full object',
      token: {
        id: 'USDC',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        description: 'Test',
      },
    },
  ]
  
  for (const format of formats) {
    console.log(`Testing: ${format.name}`)
    
    const command = {
      actAs: [PARTY_ID],
      commandId: `test-${Date.now()}`,
      applicationId: 'prediction-markets',
      commands: [
        {
          CreateCommand: {
            templateId: 'Token:TokenBalance',
            createArguments: {
              owner: PARTY_ID,
              token: format.token,
              amount: 1000.0,
            },
          },
        },
      ],
    }
    
    try {
      const response = await fetch(`${LEDGER_URL}/v2/commands/submit-and-wait`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(command),
      })
      
      const text = await response.text()
      console.log(`  Status: ${response.status}`)
      
      if (response.ok) {
        console.log(`  ✅ SUCCESS!`)
        try {
          const data = JSON.parse(text)
          console.log(`  Response:`, JSON.stringify(data, null, 2).substring(0, 300))
        } catch (e) {
          console.log(`  Response: ${text.substring(0, 200)}`)
        }
        return { success: true, format: format.name }
      } else {
        try {
          const data = JSON.parse(text)
          if (data.cause || data.message) {
            console.log(`  Error: ${data.cause || data.message}`)
          } else {
            console.log(`  Error: ${JSON.stringify(data).substring(0, 200)}`)
          }
        } catch (e) {
          console.log(`  Error: ${text.substring(0, 200)}`)
        }
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`)
    }
    console.log('')
    
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  return { success: false }
}

async function main() {
  await testMinimalRequest()
  console.log('')
  console.log('==========================================')
  console.log('')
  const result = await testTokenFormat()
  
  console.log('==========================================')
  if (result.success) {
    console.log(`✅ Found working format: ${result.format}`)
  } else {
    console.log('❌ No working format found')
    console.log('')
    console.log('The error "Invalid value for: body" is very generic.')
    console.log('This could mean:')
    console.log('  1. Template ID format is wrong')
    console.log('  2. Field types are wrong (e.g., token field format)')
    console.log('  3. Request structure is wrong')
    console.log('  4. Missing required fields')
    console.log('')
    console.log('Next steps:')
    console.log('  1. Check Canton JSON API OpenAPI spec (if available)')
    console.log('  2. Try using DAML Script instead of JSON API')
    console.log('  3. Contact client for correct template ID format')
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

