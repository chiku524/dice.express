// Vercel serverless function to get user's virtual CC balance
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabase) {
    return res.status(200).json({
      success: true,
      balance: '0',
      _note: 'Database not configured - returning default balance'
    })
  }

  try {
    const queryParams = req.method === 'GET' ? req.query : req.body
    const { userParty } = queryParams

    if (!userParty) {
      return res.status(400).json({
        error: 'User party required',
        message: 'Please provide userParty'
      })
    }

    // Get or create user balance
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('party', userParty)
      .single()

    if (balanceError && balanceError.code === 'PGRST116') {
      // No balance record exists - create one with 0 balance
      const { data: newBalance, error: createError } = await supabase
        .from('user_balances')
        .insert({
          party: userParty,
          balance: '0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('[api/get-user-balance] Error creating balance:', createError)
        return res.status(500).json({
          error: 'Failed to create balance record',
          message: createError.message
        })
      }

      return res.status(200).json({
        success: true,
        balance: newBalance.balance || '0'
      })
    }

    if (balanceError) {
      console.error('[api/get-user-balance] Error fetching balance:', balanceError)
      return res.status(500).json({
        error: 'Failed to fetch balance',
        message: balanceError.message
      })
    }

    return res.status(200).json({
      success: true,
      balance: balanceData?.balance || '0'
    })
  } catch (error) {
    console.error('[api/get-user-balance] Unexpected error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}
