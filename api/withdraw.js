// Vercel serverless function for on-chain CC withdrawals from platform wallet
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
    // networkId: optional; default 'canton' for CC withdrawals (multi-chain support later)
    const { amount, platformTokenBalanceContractId, networkId = 'canton' } = req.body

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a positive number'
      })
    }

    const amountNum = parseFloat(amount)

    // Get user party from request body
    const { userParty } = req.body
    if (!userParty) {
      return res.status(400).json({
        error: 'User party required',
        message: 'Please provide userParty in request body'
      })
    }

    console.log('[api/withdraw] Processing withdrawal:', {
      amount: amountNum,
      userParty,
      platformWallet: PLATFORM_WALLET_PARTY_ID
    })

    // Step 1: Find platform wallet's TokenBalance contract (required for transfer)
    // For withdrawals, platform wallet needs to transfer to user
    // The platform wallet party must authorize this transfer
    if (!platformTokenBalanceContractId) {
      return res.status(400).json({
        error: 'Platform TokenBalance contract ID required',
        message: 'Please provide platformTokenBalanceContractId. The platform wallet TokenBalance contract must exist.',
        hint: 'The platform wallet owner needs to create a TokenBalance contract first'
      })
    }

    const LEDGER_URL = process.env.VITE_LEDGER_URL || process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
    let baseUrl = LEDGER_URL.replace(/\/$/, '')
    if (!baseUrl.includes('/json-api')) {
      baseUrl = baseUrl.replace(/\/$/, '') + '/json-api'
    }

    // Step 2: Exercise Transfer choice on platform wallet's TokenBalance to user
    // NOTE: This requires the platform wallet party to authorize the transfer
    // In production, this would need proper authorization/signature
    const templateId = `${PACKAGE_ID}:Token:TokenBalance`
    const commandId = `withdraw-${Date.now()}-${Math.random().toString(36).substring(7)}`

    const requestBody = {
      actAs: [PLATFORM_WALLET_PARTY_ID], // Platform wallet must authorize
      commandId: commandId,
      applicationId: 'prediction-markets',
      commands: [{
        ExerciseCommand: {
          templateId: templateId,
          contractId: platformTokenBalanceContractId,
          choice: 'Transfer',
          argument: {
            to: userParty,
            transferAmount: amountNum
          }
        }
      }]
    }

    console.log('[api/withdraw] Executing on-chain transfer:', {
      templateId,
      contractId: platformTokenBalanceContractId,
      choice: 'Transfer',
      from: PLATFORM_WALLET_PARTY_ID,
      to: userParty,
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
      console.error('[api/withdraw] Canton error:', data)
      return res.status(response.status).json({
        error: 'Transfer failed',
        message: data.message || data.error || 'Failed to execute transfer on blockchain',
        details: data
      })
    }

    console.log('[api/withdraw] ✅ On-chain transfer successful:', data.updateId || data.result)

    // Step 3: Update user's virtual CC balance in database
    if (supabase) {
      try {
        // Get current balance
        const { data: currentBalance, error: fetchError } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('party', userParty)
          .single()

        let currentBalanceNum = 0
        if (fetchError && fetchError.code === 'PGRST116') {
          // No balance record exists - create one with 0
          currentBalanceNum = 0
        } else if (fetchError) {
          console.warn('[api/withdraw] ⚠️ Error fetching balance:', fetchError)
        } else {
          currentBalanceNum = parseFloat(currentBalance?.balance || '0')
        }

        // Calculate new balance (subtract withdrawal amount)
        const newBalanceNum = Math.max(0, currentBalanceNum - amountNum) // Ensure non-negative

        // Update or create balance record
        const { data: updatedBalance, error: updateError } = await supabase
          .from('user_balances')
          .upsert({
            party: userParty,
            balance: newBalanceNum.toString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'party',
            ignoreDuplicates: false
          })
          .select()
          .single()

        if (updateError) {
          console.warn('[api/withdraw] ⚠️ Failed to update user balance:', updateError)
        } else {
          console.log('[api/withdraw] ✅ User balance updated:', {
            previousBalance: currentBalanceNum.toString(),
            newBalance: newBalanceNum.toString(),
            withdrawalAmount: amountNum.toString()
          })
        }

        // Track transaction in database
        const transactionId = `withdraw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await supabase.from('contracts').upsert({
          contract_id: transactionId,
          template_id: `${PACKAGE_ID}:Token:WithdrawTransaction`,
          payload: {
            transactionId,
            type: 'withdraw',
            from: PLATFORM_WALLET_PARTY_ID,
            to: userParty,
            amount: amountNum.toString(),
            currency: 'CC',
            tokenBalanceContractId: platformTokenBalanceContractId,
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

        console.log('[api/withdraw] ✅ Transaction tracked in database')
      } catch (dbError) {
        console.warn('[api/withdraw] ⚠️ Failed to track transaction in database:', dbError)
        // Don't fail the request if database tracking fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Withdrawal successful',
      amount: amountNum,
      currency: 'CC',
      from: PLATFORM_WALLET_PARTY_ID,
      to: userParty,
      updateId: data.updateId,
      completionOffset: data.completionOffset,
      transaction: data
    })
  } catch (error) {
    console.error('[api/withdraw] Unexpected error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}
