/**
 * Get wallet address from wallet UI or token
 * Party ID = Wallet Address according to client
 */

const fs = require('fs')

const WALLET_UI_URL = process.env.WALLET_UI_URL || 'https://wallet.validator.dev.canton.wolfedgelabs.com'

// Load token
let authToken = null
let userInfo = null

try {
  if (fs.existsSync('token.txt')) {
    authToken = fs.readFileSync('token.txt', 'utf8').trim()
  } else if (fs.existsSync('token.json')) {
    const tokenData = JSON.parse(fs.readFileSync('token.json', 'utf8'))
    authToken = tokenData.access_token
  }
  
  // Decode token to get user info
  if (authToken) {
    const parts = authToken.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
      userInfo = {
        userId: payload.sub,
        email: payload.email,
        username: payload.preferred_username,
        name: payload.name,
      }
    }
  }
} catch (error) {
  console.error('Error loading token:', error.message)
  process.exit(1)
}

console.log('==========================================')
console.log('Get Wallet Address (Party ID)')
console.log('==========================================')
console.log('')

if (userInfo) {
  console.log(`User: ${userInfo.name} (${userInfo.email})`)
  console.log(`Username: ${userInfo.username}`)
  console.log('')
}

console.log('According to the client:')
console.log('  Party ID = Wallet Address')
console.log('')
console.log('To find your wallet address:')
console.log('')
console.log('1. Log into the Wallet UI:')
console.log(`   ${WALLET_UI_URL}`)
console.log('')
console.log('2. Check your wallet/account page for:')
console.log('   - Wallet Address')
console.log('   - Account Address')
console.log('   - Party ID')
console.log('   - Any address/identifier shown')
console.log('')
console.log('3. The wallet address should look like:')
console.log('   - A string of characters (hex format)')
console.log('   - Or a party name/identifier')
console.log('')
console.log('Once you have the wallet address, you can:')
console.log('')
console.log('  Option 1: Set as environment variable')
console.log('    export PARTY_ID="your-wallet-address"')
console.log('    node scripts/setup-via-json-api.js')
console.log('')
console.log('  Option 2: Update scripts directly')
console.log('    Edit scripts/setup-via-json-api.js')
console.log('    Change: const ADMIN_PARTY = "your-wallet-address"')
console.log('')
console.log('  Option 3: Pass as parameter')
console.log('    node scripts/setup-via-json-api.js --party="your-wallet-address"')
console.log('')

// Try to query wallet UI API for wallet address
async function tryGetWalletAddress() {
  console.log('Attempting to query wallet address from API...')
  console.log('')
  
  if (!authToken) {
    console.log('❌ No token available for API query')
    return null
  }
  
  const possibleEndpoints = [
    `${WALLET_UI_URL}/api/user/wallet`,
    `${WALLET_UI_URL}/api/user/address`,
    `${WALLET_UI_URL}/api/user/party`,
    `${WALLET_UI_URL}/api/wallet`,
    `${WALLET_UI_URL}/api/address`,
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
        const data = await response.json()
        console.log(`  ✅ Success!`)
        console.log(`  Response:`, JSON.stringify(data, null, 2).substring(0, 500))
        
        // Try to extract wallet address
        let walletAddress = null
        if (data.walletAddress) {
          walletAddress = data.walletAddress
        } else if (data.address) {
          walletAddress = data.address
        } else if (data.partyId) {
          walletAddress = data.partyId
        } else if (data.party) {
          walletAddress = data.party
        } else if (typeof data === 'string') {
          walletAddress = data
        }
        
        if (walletAddress) {
          console.log('')
          console.log(`✅ Found wallet address: ${walletAddress}`)
          return walletAddress
        }
      } else if (response.status === 404) {
        console.log(`  ❌ Endpoint not found`)
      } else {
        const text = await response.text()
        console.log(`  Response: ${text.substring(0, 200)}`)
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
    }
    console.log('')
  }
  
  return null
}

async function main() {
  const walletAddress = await tryGetWalletAddress()
  
  if (walletAddress) {
    console.log('==========================================')
    console.log(`✅ Wallet Address (Party ID): ${walletAddress}`)
    console.log('==========================================')
    console.log('')
    console.log('You can now use this in your scripts:')
    console.log(`  export PARTY_ID="${walletAddress}"`)
    console.log('')
    console.log('Or update scripts/setup-via-json-api.js:')
    console.log(`  const ADMIN_PARTY = "${walletAddress}"`)
  } else {
    console.log('==========================================')
    console.log('⚠️  Could not find wallet address via API')
    console.log('==========================================')
    console.log('')
    console.log('Please check the Wallet UI manually:')
    console.log(`  ${WALLET_UI_URL}`)
    console.log('')
    console.log('Look for your wallet address on:')
    console.log('  - Dashboard/Home page')
    console.log('  - Account/Profile page')
    console.log('  - Wallet/Balance page')
    console.log('')
    console.log('Once you have it, share it and we can update the scripts!')
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })

