/**
 * Setup script using JSON API (fallback if DAML Script doesn't work)
 * This script:
 * 1. Creates a TokenBalance contract
 * 2. Creates a MarketConfig contract using the token balance
 * 
 * Note: This requires parties to be allocated beforehand
 */

const LEDGER_URL = process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
const TOKEN_FILE = process.env.TOKEN_FILE || 'token.json'
const ADMIN_PARTY = process.env.ADMIN_PARTY || 'Admin'
const ORACLE_PARTY = process.env.ORACLE_PARTY || 'Oracle'

// Load authentication token if available
let authToken = null
try {
  const fs = require('fs')
  // Try token.json first
  if (fs.existsSync(TOKEN_FILE)) {
    const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'))
    authToken = tokenData.access_token
  }
  // Fallback to token.txt (extracted token)
  if (!authToken && fs.existsSync('token.txt')) {
    authToken = fs.readFileSync('token.txt', 'utf8').trim()
  }
  // Also check environment variable
  if (!authToken && process.env.AUTH_TOKEN) {
    authToken = process.env.AUTH_TOKEN
  }
} catch (error) {
  console.warn('Warning: Could not load authentication token:', error.message)
  // Ignore errors, authToken remains null
}

/**
 * Submit a command to Canton JSON API
 */
async function submitCommand(command, description) {
  console.log(`\n--- ${description} ---`)
  console.log('Command:', JSON.stringify(command, null, 2))
  
  const possibleEndpoints = [
    `${LEDGER_URL}/v2/commands/submit-and-wait`,
    `${LEDGER_URL}/v1/command`,
    `${LEDGER_URL}/v2/command`,
  ]

  for (const endpoint of possibleEndpoints) {
    try {
      console.log(`Trying endpoint: ${endpoint}`)
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
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
          // Extract contract ID from response
          let contractId = null
          if (data.result && data.result.created && data.result.created.length > 0) {
            contractId = data.result.created[0].contractId
          } else if (data.created && data.created.length > 0) {
            contractId = data.created[0].contractId
          } else if (data.contractId) {
            contractId = data.contractId
          } else if (data.commands && data.commands.length > 0 && data.commands[0].contractId) {
            contractId = data.commands[0].contractId
          }
          
          if (contractId) {
            console.log(`✅ SUCCESS: Contract created!`)
            console.log(`Contract ID: ${contractId}`)
            return contractId
          } else {
            console.log(`✅ SUCCESS: Command executed (no contract ID in response)`)
            console.log('Full response:', JSON.stringify(data, null, 2))
            return true
          }
        } else {
          console.log(`❌ Error: ${response.status}`)
          console.log('Error details:', JSON.stringify(data, null, 2))
          
          // For 401, authentication is required
          if (response.status === 401) {
            console.log('⚠️  Authentication required - ensure token is loaded')
            if (!authToken) {
              throw new Error('Authentication required but no token available. Please provide credentials.')
            }
          }
          
          // If 400, it might be a format issue - try next endpoint
          if (response.status === 400 && endpoint !== possibleEndpoints[possibleEndpoints.length - 1]) {
            console.log('Trying next endpoint...')
            continue
          }
          
          throw new Error(`Failed to create contract: ${response.status} - ${JSON.stringify(data)}`)
        }
    } catch (error) {
      console.log(`Error with endpoint ${endpoint}: ${error.message}`)
      if (endpoint === possibleEndpoints[possibleEndpoints.length - 1]) {
        throw error
      }
      // Try next endpoint
    }
  }
  
  throw new Error('All endpoints failed')
}

/**
 * Main setup function
 */
async function setup() {
  console.log('==========================================')
  console.log('Setup via JSON API')
  console.log('==========================================')
  console.log('')
  console.log(`Ledger URL: ${LEDGER_URL}`)
  console.log(`Admin Party: ${ADMIN_PARTY}`)
  console.log(`Oracle Party: ${ORACLE_PARTY}`)
  if (authToken) {
    console.log('✅ Authentication token found')
    console.log(`   Token (first 20 chars): ${authToken.substring(0, 20)}...`)
  } else {
    console.log('⚠️  No authentication token found')
    console.log('   Tried: token.json, token.txt, AUTH_TOKEN env var')
    console.log('   Some endpoints may require authentication')
  }
  console.log('')

  try {
    // Step 1: Create TokenBalance
  // Use v2 format (will be tried first, then fallback to v1)
  const tokenBalanceCommandV2 = {
    actAs: [ADMIN_PARTY],
    commandId: `create-token-balance-${Date.now()}`,
    commands: [
      {
        CreateCommand: {
          templateId: 'Token:TokenBalance',
          createArguments: {
            owner: ADMIN_PARTY,
            token: {
              id: 'USDC', // TokenId is a newtype, so just use the Text value
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
              description: 'Stablecoin for prediction markets',
            },
            amount: 1000000.0,
          },
        },
      },
    ],
  }
  
  // v1 format (fallback)
  const tokenBalanceCommandV1 = {
    commands: {
      party: ADMIN_PARTY,
      applicationId: 'prediction-markets',
      commandId: `create-token-balance-${Date.now()}`,
      list: [
        {
          templateId: 'Token:TokenBalance',
          payload: {
            owner: ADMIN_PARTY,
            token: {
              id: 'USDC',
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
              description: 'Stablecoin for prediction markets',
            },
            amount: 1000000.0,
          },
        },
      ],
    },
  }
  
  // Try v2 first, then v1
  let tokenBalanceCommand = tokenBalanceCommandV2

    // Try v2 format first
    let tokenBalanceCid = null
    try {
      tokenBalanceCid = await submitCommand(
        tokenBalanceCommandV2,
        'Step 1: Create TokenBalance Contract (v2 format)'
      )
    } catch (error) {
      // If v2 fails, try v1 format
      console.log('v2 format failed, trying v1 format...')
      tokenBalanceCid = await submitCommand(
        tokenBalanceCommandV1,
        'Step 1: Create TokenBalance Contract (v1 format)'
      )
    }

    if (!tokenBalanceCid || typeof tokenBalanceCid !== 'string') {
      throw new Error('Failed to get TokenBalance contract ID')
    }

    console.log('')
    console.log(`TokenBalance Contract ID: ${tokenBalanceCid}`)
    console.log('')

    // Step 2: Create MarketConfig
    // Use v2 format (will be tried first, then fallback to v1)
    const marketConfigCommandV2 = {
      actAs: [ADMIN_PARTY],
      commandId: `create-market-config-${Date.now()}`,
      commands: [
        {
          CreateCommand: {
            templateId: 'PredictionMarkets:MarketConfig',
            createArguments: {
              admin: ADMIN_PARTY,
              marketCreationDeposit: 100.0,
              marketCreationFee: 0.0,
              positionChangeFee: 0.0,
              partialCloseFee: 0.0,
              settlementFee: 0.0,
              oracleParty: ORACLE_PARTY,
              stablecoinCid: tokenBalanceCid,
            },
          },
        },
      ],
    }
    
    // v1 format (fallback)
    const marketConfigCommandV1 = {
      commands: {
        party: ADMIN_PARTY,
        applicationId: 'prediction-markets',
        commandId: `create-market-config-${Date.now()}`,
        list: [
          {
            templateId: 'PredictionMarkets:MarketConfig',
            payload: {
              admin: ADMIN_PARTY,
              marketCreationDeposit: 100.0,
              marketCreationFee: 0.0,
              positionChangeFee: 0.0,
              partialCloseFee: 0.0,
              settlementFee: 0.0,
              oracleParty: ORACLE_PARTY,
              stablecoinCid: tokenBalanceCid,
            },
          },
        ],
      },
    }

    // Try v2 format first
    let marketConfigCid = null
    try {
      marketConfigCid = await submitCommand(
        marketConfigCommandV2,
        'Step 2: Create MarketConfig Contract (v2 format)'
      )
    } catch (error) {
      // If v2 fails, try v1 format
      console.log('v2 format failed, trying v1 format...')
      marketConfigCid = await submitCommand(
        marketConfigCommandV1,
        'Step 2: Create MarketConfig Contract (v1 format)'
      )
    }

    if (!marketConfigCid || typeof marketConfigCid !== 'string') {
      throw new Error('Failed to get MarketConfig contract ID')
    }

    console.log('')
    console.log(`MarketConfig Contract ID: ${marketConfigCid}`)
    console.log('')

    console.log('==========================================')
    console.log('✅ Setup Complete!')
    console.log('==========================================')
    console.log('')
    console.log('Contracts created:')
    console.log(`  - TokenBalance: ${tokenBalanceCid}`)
    console.log(`  - MarketConfig: ${marketConfigCid}`)
    console.log('')
    console.log('You can now test market creation from the frontend!')
    console.log('')

    return {
      tokenBalanceCid,
      marketConfigCid,
    }
  } catch (error) {
    console.error('')
    console.error('==========================================')
    console.error('❌ Setup Failed')
    console.error('==========================================')
    console.error('')
    console.error('Error:', error.message)
    console.error('')
    console.error('Possible issues:')
    console.error('  1. Party not allocated on Canton')
    console.error('  2. Template ID format incorrect')
    console.error('  3. Authentication token invalid or missing')
    console.error('  4. Network connectivity issues')
    console.error('')
    process.exit(1)
  }
}

// Run the setup
setup()
  .then((result) => {
    console.log('Setup script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

