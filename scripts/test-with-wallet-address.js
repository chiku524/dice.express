/**
 * Quick test script to test contract creation with wallet address as party ID
 * Usage: node scripts/test-with-wallet-address.js <wallet-address>
 * Or: PARTY_ID=<wallet-address> node scripts/test-with-wallet-address.js
 */

const fs = require('fs')

const LEDGER_URL = process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'

// Get wallet address from command line or environment
// Default to full party ID mapped format (found in block explorer)
const walletAddress = process.argv[2] || process.env.PARTY_ID || process.env.ADMIN_PARTY || 'ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292'

if (!walletAddress) {
  console.error('==========================================')
  console.error('❌ Error: Wallet address (Party ID) required')
  console.error('==========================================')
  console.error('')
  console.error('Usage:')
  console.error('  node scripts/test-with-wallet-address.js <wallet-address>')
  console.error('')
  console.error('Or set environment variable:')
  console.error('  export PARTY_ID="your-wallet-address"')
  console.error('  node scripts/test-with-wallet-address.js')
  console.error('')
  console.error('Note: Use the FULL party ID mapped format:')
  console.error('  ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292')
  console.error('')
  process.exit(1)
}

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
  console.error('❌ No token found. Please run: .\\scripts\\request-new-token.ps1')
  process.exit(1)
}

console.log('==========================================')
console.log('Test Contract Creation with Wallet Address')
console.log('==========================================')
console.log('')
console.log(`Wallet Address (Party ID): ${walletAddress}`)
console.log(`Token: ${authToken.substring(0, 20)}...`)
console.log('')

/**
 * Test creating a TokenBalance contract
 */
async function testCreateContract() {
  const command = {
    actAs: [walletAddress],
    commandId: `test-${Date.now()}`,
    applicationId: 'prediction-markets',
    commands: [
      {
        CreateCommand: {
          templateId: 'Token:TokenBalance',
          createArguments: {
            owner: walletAddress,
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
  
  console.log('Request:')
  console.log(JSON.stringify(command, null, 2))
  console.log('')
  console.log('Sending request...')
  
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
    
    console.log(`Response Status: ${response.status}`)
    console.log('')
    
    if (response.ok) {
      console.log('==========================================')
      console.log('✅ SUCCESS! Contract created!')
      console.log('==========================================')
      console.log('')
      if (data) {
        console.log('Response:')
        console.log(JSON.stringify(data, null, 2))
        
        // Try to extract contract ID
        if (data.result && data.result.created) {
          const contractId = data.result.created[0]?.contractId
          if (contractId) {
            console.log('')
            console.log(`✅ Contract ID: ${contractId}`)
          }
        }
      } else {
        console.log('Response:', text)
      }
      console.log('')
      return { success: true, data }
    } else {
      console.log('==========================================')
      console.log(`❌ Failed: Status ${response.status}`)
      console.log('==========================================')
      console.log('')
      if (data) {
        console.log('Error details:')
        console.log(JSON.stringify(data, null, 2))
      } else {
        console.log('Error:', text)
      }
      console.log('')
      
      // Provide helpful error messages
      if (response.status === 400) {
        console.log('Possible issues:')
        console.log('  1. Template ID format might be wrong')
        console.log('  2. Request body structure might need adjustment')
        console.log('  3. Party ID (wallet address) might be incorrect')
        console.log('')
        console.log('Next steps:')
        console.log('  - Verify wallet address is correct')
        console.log('  - Check if template ID needs package hash')
        console.log('  - Review Canton JSON API documentation')
      } else if (response.status === 403) {
        console.log('Authentication issue:')
        console.log('  - Token might be expired')
        console.log('  - User might not be onboarded')
        console.log('  - Party ID might not be mapped correctly')
        console.log('')
        console.log('Try:')
        console.log('  .\\scripts\\request-new-token.ps1')
      } else if (response.status === 404) {
        console.log('Template not found:')
        console.log('  - Template ID might be wrong')
        console.log('  - Package might not be deployed')
        console.log('  - Template might need package hash')
      }
      console.log('')
      return { success: false, status: response.status, error: data || text }
    }
  } catch (error) {
    console.log('==========================================')
    console.log(`❌ Error: ${error.message}`)
    console.log('==========================================')
    console.log('')
    return { success: false, error: error.message }
  }
}

testCreateContract()
  .then((result) => {
    if (result.success) {
      console.log('✅ Test completed successfully!')
      console.log('')
      console.log('You can now use this wallet address in your scripts:')
      console.log(`  export PARTY_ID="${walletAddress}"`)
      console.log('')
      process.exit(0)
    } else {
      console.log('❌ Test failed. See error details above.')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })

