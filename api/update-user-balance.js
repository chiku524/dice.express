// Vercel serverless function to update user's virtual CC balance
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

let supabase = null
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabase) {
    return res.status(500).json({
      error: 'Database not configured',
      message: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'
    })
  }

  try {
    const { userParty, amount, operation } = req.body // operation: 'add' or 'subtract'

    if (!userParty || !amount || !operation) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userParty', 'amount', 'operation'],
        received: {
          userParty: !!userParty,
          amount: !!amount,
          operation: !!operation
        }
      })
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum)) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a number'
      })
    }

    // Get current balance
    const { data: currentBalance, error: fetchError } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('party', userParty)
      .single()

    let currentBalanceNum = 0
    if (fetchError && fetchError.code === 'PGRST116') {
      // No balance record exists - create one
      currentBalanceNum = 0
    } else if (fetchError) {
      console.error('[api/update-user-balance] Error fetching balance:', fetchError)
      return res.status(500).json({
        error: 'Failed to fetch current balance',
        message: fetchError.message
      })
    } else {
      currentBalanceNum = parseFloat(currentBalance?.balance || '0')
    }

    // Calculate new balance
    let newBalanceNum = currentBalanceNum
    if (operation === 'add') {
      newBalanceNum = currentBalanceNum + amountNum
    } else if (operation === 'subtract') {
      newBalanceNum = currentBalanceNum - amountNum
      if (newBalanceNum < 0) {
        return res.status(400).json({
          error: 'Insufficient balance',
          message: `Cannot subtract ${amountNum} from balance of ${currentBalanceNum}`,
          currentBalance: currentBalanceNum.toString()
        })
      }
    } else {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Operation must be "add" or "subtract"'
      })
    }

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
      console.error('[api/update-user-balance] Error updating balance:', updateError)
      return res.status(500).json({
        error: 'Failed to update balance',
        message: updateError.message
      })
    }

    return res.status(200).json({
      success: true,
      balance: updatedBalance.balance,
      previousBalance: currentBalanceNum.toString(),
      newBalance: newBalanceNum.toString(),
      operation,
      amount: amountNum.toString()
    })
  } catch (error) {
    console.error('[api/update-user-balance] Unexpected error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}
