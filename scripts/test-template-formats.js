/**
 * Test different template ID formats with the correct party ID
 */

const fs = require('fs')

const LEDGER_URL = process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
// Use full party ID mapped format (found in block explorer)
const PARTY_ID = process.env.PARTY_ID || 'ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292'
const PACKAGE_ID = 'b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0' // From deployment

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
console.log('Test Template ID Formats')
console.log('==========================================')
console.log(`Party ID: ${PARTY_ID}`)
console.log(`Package ID: ${PACKAGE_ID}`)
console.log('')

// Different template ID formats to try
const templateFormats = [
  'Token:TokenBalance',
  `Token:TokenBalance:${PACKAGE_ID}`,
  `Token:TokenBalance:${PACKAGE_ID.substring(0, 8)}`,
  'prediction-markets:Token:TokenBalance',
  `prediction-markets:Token:TokenBalance:${PACKAGE_ID}`,
]

async function testTemplateFormat(templateId) {
  const command = {
    actAs: [PARTY_ID],
    commandId: `test-${Date.now()}-${templateId.substring(0, 20)}`,
    applicationId: 'prediction-markets',
    commands: [
      {
        CreateCommand: {
          templateId: templateId,
          createArguments: {
            owner: PARTY_ID,
            token: {
              id: 'USDC',
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
              description: 'Test token',
            },
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
      templateId,
      status: response.status,
      ok: response.ok,
      data: data,
      text: text,
    }
  } catch (error) {
    return {
      templateId,
      error: error.message,
    }
  }
}

async function testAll() {
  for (const templateId of templateFormats) {
    console.log(`Testing: "${templateId}"`)
    const result = await testTemplateFormat(templateId)
    
    if (result.ok) {
      console.log(`  ✅ SUCCESS! Status: ${result.status}`)
      if (result.data) {
        console.log(`  Response:`, JSON.stringify(result.data, null, 2).substring(0, 500))
      }
      console.log('')
      return { success: true, templateId, result }
    } else if (result.status === 404) {
      const errorMsg = result.data ? JSON.stringify(result.data) : result.text || ''
      if (errorMsg.includes('TEMPLATES_OR_INTERFACES_NOT_FOUND')) {
        console.log(`  ⚠️  Status: 404 - Template not found (format recognized)`)
      } else {
        console.log(`  ❌ Status: 404`)
      }
    } else if (result.status === 400) {
      const errorMsg = result.data ? JSON.stringify(result.data) : result.text || ''
      if (errorMsg.includes('Invalid value for: body')) {
        console.log(`  ⚠️  Status: 400 - Format issue`)
      } else {
        console.log(`  ⚠️  Status: 400 - Different error (progress!): ${errorMsg.substring(0, 200)}`)
      }
    } else if (result.status) {
      console.log(`  ⚠️  Status: ${result.status}`)
    } else {
      console.log(`  ❌ Error: ${result.error}`)
    }
    console.log('')
    
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  return { success: false }
}

testAll()
  .then((summary) => {
    console.log('==========================================')
    if (summary.success) {
      console.log(`✅ Found working template ID: "${summary.templateId}"`)
    } else {
      console.log('❌ No working template ID format found')
      console.log('')
      console.log('The issue might be:')
      console.log('  1. Template ID format is still wrong')
      console.log('  2. Request body structure needs adjustment')
      console.log('  3. Need to query available templates first')
    }
    console.log('==========================================')
    process.exit(summary.success ? 0 : 1)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })

