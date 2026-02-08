/**
 * Virtual AMM pools — get pool by market (no blockchain).
 */
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
let supabase = null
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization')
}

module.exports = async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  if (!supabase) {
    return res.status(200).json({ success: true, pool: null, _note: 'Database not configured' })
  }

  const { marketId } = req.query
  if (!marketId) {
    return res.status(400).json({ error: 'marketId required' })
  }

  const poolId = `pool-${marketId}`
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('contract_id', poolId)
    .eq('template_id', 'LiquidityPool')
    .single()

  if (error || !data) {
    return res.status(200).json({ success: true, pool: null })
  }

  const pool = data.payload || {}
  return res.status(200).json({
    success: true,
    pool: {
      poolId: data.contract_id,
      marketId: pool.marketId,
      yesReserve: parseFloat(pool.yesReserve) || 0,
      noReserve: parseFloat(pool.noReserve) || 0,
      totalLPShares: parseFloat(pool.totalLPShares) || 0,
      feeRate: parseFloat(pool.feeRate) ?? 0.003,
      platformFeeShare: parseFloat(pool.platformFeeShare) ?? 0.2,
      maxTradeReserveFraction: parseFloat(pool.maxTradeReserveFraction) ?? 0.1,
      minLiquidity: parseFloat(pool.minLiquidity) ?? 100,
    },
  })
}
