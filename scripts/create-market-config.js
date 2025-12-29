/**
 * Script to create a MarketConfig contract on Canton
 * This is required before markets can be created
 */

const LEDGER_URL = process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'

// Configuration for MarketConfig
// Note: stablecoinCid is required - must create TokenBalance first
const MARKET_CONFIG = {
  admin: process.env.ADMIN_PARTY || 'Admin',
  marketCreationDeposit: 100.0,
  marketCreationFee: 0.0,
  positionChangeFee: 0.0,
  partialCloseFee: 0.0,
  settlementFee: 0.0,
  oracleParty: process.env.ORACLE_PARTY || 'Oracle',
  stablecoinCid: process.env.TOKEN_BALANCE_CID || null, // Required - must be set
}

async function createMarketConfig() {
  console.log('==========================================')
  console.log('Create MarketConfig Contract')
  console.log('==========================================')
  console.log('')
  // Validate required fields
  if (!MARKET_CONFIG.stablecoinCid) {
    console.error('❌ ERROR: stablecoinCid is required!')
    console.error('')
    console.error('Please create a TokenBalance first:')
    console.error('  node scripts/create-token-balance.js')
    console.error('')
    console.error('Or set TOKEN_BALANCE_CID environment variable:')
    console.error('  export TOKEN_BALANCE_CID="<contract-id>"')
    process.exit(1)
  }

  console.log('Configuration:')
  console.log(JSON.stringify(MARKET_CONFIG, null, 2))
  console.log('')
  console.log(`Ledger URL: ${LEDGER_URL}`)
  console.log('')

  const party = MARKET_CONFIG.admin
  const commandId = `create-market-config-${Date.now()}`

  // Format command for Canton v2 API
  const command = {
    actAs: [party],
    commandId: commandId,
    commands: [
      {
        CreateCommand: {
          templateId: 'PredictionMarkets:MarketConfig',
          createArguments: MARKET_CONFIG,
        },
      },
    ],
  }

  console.log('Command to send:')
  console.log(JSON.stringify(command, null, 2))
  console.log('')

  try {
    // Try v2 endpoint first
    const possibleEndpoints = [
      `${LEDGER_URL}/v2/commands/submit-and-wait`,
      `${LEDGER_URL}/v1/command`,
      `${LEDGER_URL}/v2/command`,
    ]

    let success = false
    let lastError = null

    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`)
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(command),
        })

        console.log(`Response status: ${response.status}`)

        const responseContentType = response.headers.get('content-type')
        let data
        if (responseContentType && responseContentType.includes('application/json')) {
          data = await response.json()
        } else {
          const text = await response.text()
          console.log('Non-JSON response:', text.substring(0, 500))
          data = { error: 'Non-JSON response', text: text.substring(0, 500) }
        }

        console.log('Response:', JSON.stringify(data, null, 2))

        if (response.ok) {
          console.log('')
          console.log('✅ SUCCESS: MarketConfig contract created!')
          if (data.result && data.result.created) {
            console.log('Created contracts:', JSON.stringify(data.result.created, null, 2))
          }
          if (data.created) {
            console.log('Created contracts:', JSON.stringify(data.created, null, 2))
          }
          success = true
          break
        } else {
          console.log(`❌ Error: ${response.status}`)
          console.log('Error details:', JSON.stringify(data, null, 2))
          lastError = { endpoint, status: response.status, data }
        }
      } catch (error) {
        console.log(`Error with endpoint ${endpoint}: ${error.message}`)
        lastError = { endpoint, error: error.message }
      }
    }

    if (!success) {
      console.log('')
      console.log('❌ FAILED: Could not create MarketConfig contract')
      console.log('Last error:', JSON.stringify(lastError, null, 2))
      console.log('')
      console.log('Possible issues:')
      console.log('1. Party not allocated on ledger')
      console.log('2. Package not deployed correctly')
      console.log('3. Template ID incorrect')
      console.log('4. Missing required fields (e.g., stablecoinCid)')
      process.exit(1)
    }
  } catch (error) {
    console.error('FATAL ERROR:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the script
createMarketConfig()
  .then(() => {
    console.log('')
    console.log('Script complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

