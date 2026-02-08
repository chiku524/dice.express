/**
 * Virtual AMM trade — execute trade against pool, update balances and positions (no blockchain).
 */
const { createClient } = require('@supabase/supabase-js')
const { getQuote, isTradeWithinLimit, applyTrade } = require('./lib/amm')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
let supabase = null
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization')
}

module.exports = async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' })
  }

  try {
    const { marketId, side, amount, minOut, userId } = req.body
    if (!marketId || !side || !amount || !userId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['marketId', 'side', 'amount', 'userId'],
      })
    }
    const sideNorm = side === 'yes' || side === 'Yes' ? 'Yes' : side === 'no' || side === 'No' ? 'No' : null
    if (!sideNorm) {
      return res.status(400).json({ error: 'side must be Yes or No' })
    }
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' })
    }
    const minOutNum = typeof minOut !== 'undefined' ? parseFloat(minOut) : 0

    const poolId = `pool-${marketId}`
    const { data: poolRow, error: poolErr } = await supabase
      .from('contracts')
      .select('*')
      .eq('contract_id', poolId)
      .eq('template_id', 'LiquidityPool')
      .single()

    if (poolErr || !poolRow) {
      return res.status(404).json({ error: 'Pool not found for this market' })
    }

    const poolPayload = poolRow.payload || {}
    const pool = {
      yesReserve: parseFloat(poolPayload.yesReserve) || 0,
      noReserve: parseFloat(poolPayload.noReserve) || 0,
      feeRate: parseFloat(poolPayload.feeRate) ?? 0.003,
      platformFeeShare: parseFloat(poolPayload.platformFeeShare) ?? 0.2,
      maxTradeReserveFraction: parseFloat(poolPayload.maxTradeReserveFraction) ?? 0.1,
    }

    const { outputAmount, feeAmount } = getQuote(pool, sideNorm, amountNum)
    if (outputAmount <= 0) {
      return res.status(400).json({ error: 'Trade would result in zero output' })
    }
    if (outputAmount < minOutNum) {
      return res.status(400).json({ error: 'Slippage tolerance exceeded', minOut: minOutNum, outputAmount })
    }
    if (!isTradeWithinLimit(pool, sideNorm, outputAmount)) {
      return res.status(400).json({ error: 'Trade size exceeds pool limit' })
    }

    // Deduct balance
    const { data: balRow } = await supabase.from('user_balances').select('balance').eq('party', userId).single()
    const currentBal = balRow ? parseFloat(balRow.balance) : 0
    if (currentBal < amountNum) {
      return res.status(400).json({ error: 'Insufficient balance', currentBalance: currentBal, required: amountNum })
    }

    applyTrade(pool, sideNorm, amountNum, outputAmount)
    const newBalance = currentBal - amountNum

    await supabase.from('user_balances').upsert(
      { party: userId, balance: newBalance.toString(), updated_at: new Date().toISOString() },
      { onConflict: 'party' }
    )

    await supabase.from('contracts').update({
      payload: {
        ...poolPayload,
        yesReserve: pool.yesReserve,
        noReserve: pool.noReserve,
      },
      updated_at: new Date().toISOString(),
    }).eq('contract_id', poolId).eq('template_id', 'LiquidityPool')

    const positionId = `position-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const price = sideNorm === 'Yes' ? pool.yesReserve / (pool.yesReserve + pool.noReserve) : pool.noReserve / (pool.yesReserve + pool.noReserve)
    await supabase.from('contracts').insert({
      contract_id: positionId,
      template_id: 'Position',
      payload: {
        positionId,
        marketId,
        owner: userId,
        positionType: sideNorm,
        amount: outputAmount,
        price,
        createdAt: new Date().toISOString(),
      },
      party: userId,
      status: 'Active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const { data: marketRow } = await supabase.from('contracts').select('*').eq('contract_id', marketId).single()
    if (marketRow?.payload) {
      const p = marketRow.payload
      const totalVolume = (parseFloat(p.totalVolume) || 0) + amountNum
      const yesVolume = (parseFloat(p.yesVolume) || 0) + (sideNorm === 'Yes' ? outputAmount : 0)
      const noVolume = (parseFloat(p.noVolume) || 0) + (sideNorm === 'No' ? outputAmount : 0)
      await supabase.from('contracts').update({
        payload: { ...p, totalVolume, yesVolume, noVolume },
        updated_at: new Date().toISOString(),
      }).eq('contract_id', marketId)
    }

    return res.status(200).json({
      success: true,
      positionId,
      outputAmount,
      feeAmount,
      newBalance,
      pool: { yesReserve: pool.yesReserve, noReserve: pool.noReserve },
    })
  } catch (err) {
    console.error('[api/trade]', err)
    return res.status(500).json({ error: 'Internal server error', message: err.message })
  }
}
