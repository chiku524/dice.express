/**
 * Script to create a TokenBalance contract on Canton
 * This is required before MarketConfig can be created
 */

const LEDGER_URL = process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'

// Configuration for TokenBalance (stablecoin)
// Token structure matches Token.daml: Token with TokenId (newtype)
// Note: DAML JSON encoding for newtypes is just the wrapped value
const TOKEN_BALANCE = {
  owner: process.env.ADMIN_PARTY || 'Admin',
  token: {
    id: 'USDC', // TokenId is a newtype wrapping Text, so just use the Text value
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    description: 'Stablecoin for prediction markets',
  },
  amount: 1000000.0, // 1 million USDC
}

async function createTokenBalance() {
  console.log('==========================================')
  console.log('Create TokenBalance Contract')
  console.log('==========================================')
  console.log('')
  console.log('Configuration:')
  console.log(JSON.stringify(TOKEN_BALANCE, null, 2))
  console.log('')
  console.log(`Ledger URL: ${LEDGER_URL}`)
  console.log('')

  const party = TOKEN_BALANCE.owner
  const commandId = `create-token-balance-${Date.now()}`

  // Format command for Canton v2 API
  const command = {
    actAs: [party],
    commandId: commandId,
    commands: [
      {
        CreateCommand: {
          templateId: 'Token:TokenBalance',
          createArguments: TOKEN_BALANCE,
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
    let contractId = null
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
          console.log('✅ SUCCESS: TokenBalance contract created!')
          
          // Extract contract ID from response
          if (data.result && data.result.created && data.result.created.length > 0) {
            contractId = data.result.created[0].contractId
          } else if (data.created && data.created.length > 0) {
            contractId = data.created[0].contractId
          } else if (data.contractId) {
            contractId = data.contractId
          }
          
          if (contractId) {
            console.log(`Contract ID: ${contractId}`)
            // Save to environment variable for next script
            process.env.TOKEN_BALANCE_CID = contractId
            console.log('')
            console.log(`Set TOKEN_BALANCE_CID=${contractId}`)
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
      console.log('❌ FAILED: Could not create TokenBalance contract')
      console.log('Last error:', JSON.stringify(lastError, null, 2))
      process.exit(1)
    }

    return contractId
  } catch (error) {
    console.error('FATAL ERROR:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the script
createTokenBalance()
  .then((contractId) => {
    console.log('')
    console.log('Script complete!')
    if (contractId) {
      console.log(`TokenBalance Contract ID: ${contractId}`)
      console.log('')
      console.log('You can now use this contract ID to create MarketConfig:')
      console.log(`export TOKEN_BALANCE_CID="${contractId}"`)
    }
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

