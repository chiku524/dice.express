// Vercel serverless function to create positions in database
// Database-first approach: stores positions and updates market volumes without blockchain interaction
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

let supabase = null
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)
}

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

  // Check if Supabase is configured
  if (!supabase) {
    console.error('[api/create-position] Supabase not configured')
    return res.status(500).json({
      error: 'Cloud storage not configured',
      message: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required'
    })
  }

  try {
    const { marketId, positionType, amount, price, owner } = req.body

    // Validate required fields
    if (!marketId || !positionType || !amount || !price || !owner) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['marketId', 'positionType', 'amount', 'price', 'owner'],
        received: { 
          marketId: !!marketId, 
          positionType: !!positionType, 
          amount: !!amount, 
          price: !!price, 
          owner: !!owner 
        }
      })
    }

    const amountNum = parseFloat(amount)
    const priceNum = parseFloat(price)

    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a positive number'
      })
    }

    if (isNaN(priceNum) || priceNum < 0 || priceNum > 1) {
      return res.status(400).json({
        error: 'Invalid price',
        message: 'Price must be between 0.0 and 1.0'
      })
    }

    console.log('[api/create-position] Creating position:', {
      marketId,
      positionType,
      amount: amountNum,
      price: priceNum,
      owner
    })

    // Step 0: Check user's virtual CC balance
    if (supabase) {
      try {
        // Use environment variable or construct from request
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : (req.headers.host ? `https://${req.headers.host}` : 'http://localhost:3000')
        const balanceResponse = await fetch(`${baseUrl}/api/get-user-balance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userParty: owner
          })
        })

        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json()
          const currentBalance = parseFloat(balanceData.balance || '0')
          
          if (currentBalance < amountNum) {
            return res.status(400).json({
              error: 'Insufficient balance',
              message: `You have ${currentBalance} CC but need ${amountNum} CC to create this position. Please deposit more CC first.`,
              currentBalance: currentBalance.toString(),
              requiredAmount: amountNum.toString()
            })
          }

          console.log('[api/create-position] ✅ Balance check passed:', {
            currentBalance,
            requiredAmount: amountNum
          })
        } else {
          console.warn('[api/create-position] ⚠️ Could not check balance, proceeding anyway')
        }
      } catch (balanceError) {
        console.warn('[api/create-position] ⚠️ Balance check failed, proceeding anyway:', balanceError.message)
      }
    }

    // Step 1: Find the market contract in the database
    const { data: marketContracts, error: marketError } = await supabase
      .from('contracts')
      .select('*')
      .ilike('template_id', '%MarketCreationRequest%')
      .eq('status', 'Approved')
      .limit(100)

    if (marketError) {
      console.error('[api/create-position] Error finding market:', marketError)
      return res.status(500).json({
        error: 'Failed to find market',
        message: marketError.message
      })
    }

    const marketContract = marketContracts?.find(m => m.payload?.marketId === marketId)

    if (!marketContract) {
      return res.status(404).json({
        error: 'Market not found',
        message: `No approved market found with marketId: ${marketId}`
      })
    }

    // Step 2: Generate position ID
    const positionId = `position-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const contractId = `position-${positionId}`

    // Step 3: Create position payload
    const positionPayload = {
      positionId,
      marketId,
      owner,
      positionType: positionType === 'Yes' || positionType === 'No' ? positionType : `Outcome:${positionType}`,
      amount: amountNum.toString(),
      price: priceNum.toString(),
      createdAt: new Date().toISOString()
    }

    // Step 4: Store position in database (virtual deposit tracking - NOT on-chain)
    // NOTE: Position creation uses virtual CC (database-only), NOT on-chain transfers
    // Actual CC deposits/withdrawals must be done via /api/deposit and /api/withdraw endpoints
    const PLATFORM_WALLET_PARTY_ID = 'ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292'
    
    // Add deposit info to position payload (virtual tracking only)
    const positionPayloadWithDeposit = {
      ...positionPayload,
      depositAmount: amountNum.toString(),
      depositCurrency: 'CC', // Canton Coin (virtual - tracked in database only)
      platformWallet: PLATFORM_WALLET_PARTY_ID,
      depositStatus: 'completed', // Virtual status - assumes user has already deposited CC via /api/deposit
      depositTimestamp: new Date().toISOString()
    }
    
    const { data: positionData, error: positionError } = await supabase
      .from('contracts')
      .upsert({
        contract_id: contractId,
        template_id: `${marketContract.template_id.split(':')[0]}:PredictionMarkets:Position`,
        payload: positionPayloadWithDeposit,
        party: owner,
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'contract_id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (positionError) {
      console.error('[api/create-position] Error storing position:', positionError)
      return res.status(500).json({
        error: 'Failed to store position',
        message: positionError.message
      })
    }

    console.log('[api/create-position] ✅ Position stored in database:', positionData.contract_id)

    // Step 5: Update market volumes
    const currentPayload = marketContract.payload || {}
    const currentTotalVolume = parseFloat(currentPayload.totalVolume || 0)
    const currentYesVolume = parseFloat(currentPayload.yesVolume || 0)
    const currentNoVolume = parseFloat(currentPayload.noVolume || 0)
    const currentOutcomeVolumes = currentPayload.outcomeVolumes || {}

    // Calculate new volumes
    const newTotalVolume = currentTotalVolume + amountNum
    let newYesVolume = currentYesVolume
    let newNoVolume = currentNoVolume
    const newOutcomeVolumes = { ...currentOutcomeVolumes }

    if (positionType === 'Yes') {
      newYesVolume = currentYesVolume + amountNum
    } else if (positionType === 'No') {
      newNoVolume = currentNoVolume + amountNum
    } else {
      // Multi-outcome position
      const currentOutcomeVolume = parseFloat(newOutcomeVolumes[positionType] || 0)
      newOutcomeVolumes[positionType] = (currentOutcomeVolume + amountNum).toString()
    }

    // Step 6: Update market contract with new volumes
    const updatedPayload = {
      ...currentPayload,
      totalVolume: newTotalVolume.toString(),
      yesVolume: newYesVolume.toString(),
      noVolume: newNoVolume.toString(),
      outcomeVolumes: newOutcomeVolumes
    }

    const { data: updatedMarket, error: updateError } = await supabase
      .from('contracts')
      .update({
        payload: updatedPayload,
        updated_at: new Date().toISOString()
      })
      .eq('contract_id', marketContract.contract_id)
      .select()
      .single()

    if (updateError) {
      console.error('[api/create-position] Error updating market volumes:', updateError)
      // Position was created, but volume update failed - still return success but log warning
      console.warn('[api/create-position] ⚠️ Position created but market volumes not updated')
    }

    console.log('[api/create-position] ✅ Position created successfully:', contractId)
    console.log('[api/create-position] 📊 Market volumes updated:', {
      totalVolume: newTotalVolume,
      yesVolume: newYesVolume,
      noVolume: newNoVolume,
      outcomeVolumes: newOutcomeVolumes
    })

    // Step 7: Deduct amount from user's virtual CC balance
    if (supabase) {
      try {
        // Get current balance
        const { data: currentBalance, error: fetchError } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('party', owner)
          .single()

        let currentBalanceNum = 0
        if (fetchError && fetchError.code === 'PGRST116') {
          // No balance record exists - balance is 0
          currentBalanceNum = 0
        } else if (fetchError) {
          console.warn('[api/create-position] ⚠️ Error fetching balance for deduction:', fetchError)
        } else {
          currentBalanceNum = parseFloat(currentBalance?.balance || '0')
        }

        // Calculate new balance (subtract position amount)
        const newBalanceNum = currentBalanceNum - amountNum

        // Update balance record
        const { data: updatedBalance, error: updateError } = await supabase
          .from('user_balances')
          .upsert({
            party: owner,
            balance: newBalanceNum.toString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'party',
            ignoreDuplicates: false
          })
          .select()
          .single()

        if (updateError) {
          console.warn('[api/create-position] ⚠️ Failed to deduct from user balance:', updateError)
        } else {
          console.log('[api/create-position] ✅ User balance deducted:', {
            previousBalance: currentBalanceNum.toString(),
            newBalance: newBalanceNum.toString(),
            deductedAmount: amountNum.toString()
          })
        }
      } catch (balanceError) {
        console.warn('[api/create-position] ⚠️ Balance update failed:', balanceError.message)
        // Don't fail the request if balance update fails - position was already created
      }
    }

    return res.status(200).json({
      success: true,
      position: positionData,
      market: updatedMarket || marketContract,
      volumes: {
        totalVolume: newTotalVolume,
        yesVolume: newYesVolume,
        noVolume: newNoVolume,
        outcomeVolumes: newOutcomeVolumes
      }
    })
  } catch (error) {
    console.error('[api/create-position] Unexpected error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}
