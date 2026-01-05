// Vercel serverless function for on-chain CC deposits to platform wallet
// Uses Canton blockchain TokenBalance Transfer choice
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client (for tracking transactions)
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

let supabase = null
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)
}

const PLATFORM_WALLET_PARTY_ID = 'ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292'
const PACKAGE_ID = 'b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0'
const CC_TOKEN_ID = 'CC' // Canton Coin token identifier

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', received: req.method })
  }

  // Extract token from Authorization header
  const authHeader = req.headers.authorization || req.headers.Authorization
  const token = authHeader ? authHeader.replace('Bearer ', '') : null

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide an authorization token'
    })
  }

  try {
    const { amount, userTokenBalanceContractId } = req.body

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a positive number'
      })
    }

    const amountNum = parseFloat(amount)

    // Get user party from token or request body
    // For now, we'll need it from request body since we can't decode JWT easily
    const { userParty } = req.body
    if (!userParty) {
      return res.status(400).json({
        error: 'User party required',
        message: 'Please provide userParty in request body'
      })
    }

    console.log('[api/deposit] Processing deposit:', {
      amount: amountNum,
      userParty,
      platformWallet: PLATFORM_WALLET_PARTY_ID
    })

    // Step 1: Find user's TokenBalance contract (required for transfer)
    // If not provided, we would need to query for it, but for now we'll require it
    if (!userTokenBalanceContractId) {
      return res.status(400).json({
        error: 'TokenBalance contract ID required',
        message: 'Please provide userTokenBalanceContractId. You may need to create a TokenBalance contract first using the Contract Tester.',
        hint: 'Use /test page to create a TokenBalance contract with token id "CC" (Canton Coin)'
      })
    }

    const LEDGER_URL = process.env.VITE_LEDGER_URL || process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
    let baseUrl = LEDGER_URL.replace(/\/$/, '')
    if (!baseUrl.includes('/json-api')) {
      baseUrl = baseUrl.replace(/\/$/, '') + '/json-api'
    }

    // Step 2: Exercise Transfer choice on user's TokenBalance to platform wallet
    const templateId = `${PACKAGE_ID}:Token:TokenBalance`
    const commandId = `deposit-${Date.now()}-${Math.random().toString(36).substring(7)}`

    const requestBody = {
      actAs: [userParty],
      commandId: commandId,
      applicationId: 'prediction-markets',
      commands: [{
        ExerciseCommand: {
          templateId: templateId,
          contractId: userTokenBalanceContractId,
          choice: 'Transfer',
          argument: {
            to: PLATFORM_WALLET_PARTY_ID,
            transferAmount: amountNum
          }
        }
      }]
    }

    console.log('[api/deposit] Executing on-chain transfer:', {
      templateId,
      contractId: userTokenBalanceContractId,
      choice: 'Transfer',
      to: PLATFORM_WALLET_PARTY_ID,
      amount: amountNum
    })

    // Submit command to Canton
    const response = await fetch(`${baseUrl}/v2/commands/submit-and-wait`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[api/deposit] Canton error:', data)
      return res.status(response.status).json({
        error: 'Transfer failed',
        message: data.message || data.error || 'Failed to execute transfer on blockchain',
        details: data
      })
    }

    console.log('[api/deposit] ✅ On-chain transfer successful:', data.updateId || data.result)

    // Step 3: Update user's virtual CC balance in database
    if (supabase) {
      try {
        // Update user balance (add the deposited amount)
        const balanceUpdateResponse = await fetch(`${req.headers.host ? `https://${req.headers.host}` : 'http://localhost:3000'}/api/update-user-balance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userParty,
            amount: amountNum.toString(),
            operation: 'add'
          })
        })

        if (balanceUpdateResponse.ok) {
          const balanceResult = await balanceUpdateResponse.json()
          console.log('[api/deposit] ✅ User balance updated:', balanceResult)
        } else {
          console.warn('[api/deposit] ⚠️ Failed to update user balance')
        }

        // Track transaction in database
        const transactionId = `deposit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await supabase.from('contracts').upsert({
          contract_id: transactionId,
          template_id: `${PACKAGE_ID}:Token:DepositTransaction`,
          payload: {
            transactionId,
            type: 'deposit',
            from: userParty,
            to: PLATFORM_WALLET_PARTY_ID,
            amount: amountNum.toString(),
            currency: 'CC',
            tokenBalanceContractId: userTokenBalanceContractId,
            updateId: data.updateId,
            completionOffset: data.completionOffset,
            status: 'completed',
            timestamp: new Date().toISOString()
          },
          party: userParty,
          status: 'Completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'contract_id',
          ignoreDuplicates: false
        })

        console.log('[api/deposit] ✅ Transaction tracked in database')
      } catch (dbError) {
        console.warn('[api/deposit] ⚠️ Failed to track transaction in database:', dbError)
        // Don't fail the request if database tracking fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Deposit successful',
      amount: amountNum,
      currency: 'CC',
      from: userParty,
      to: PLATFORM_WALLET_PARTY_ID,
      updateId: data.updateId,
      completionOffset: data.completionOffset,
      transaction: data
    })
  } catch (error) {
    console.error('[api/deposit] Unexpected error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}
