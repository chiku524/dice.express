/**
 * Virtual markets API — create and list markets (no blockchain).
 * Uses Supabase "contracts" table with template_id = 'VirtualMarket' and status = 'Active'.
 */
const { createClient } = require('@supabase/supabase-js')
const { createPoolState } = require('./lib/amm')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
let supabase = null
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)
}

const TEMPLATE_VIRTUAL_MARKET = 'VirtualMarket'

function cors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization')
}

module.exports = async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabase) {
    return res.status(200).json({
      success: true,
      markets: [],
      count: 0,
      _note: 'Database not configured'
    })
  }

  try {
    if (req.method === 'GET') {
      const { source, status } = req.query
      let query = supabase
        .from('contracts')
        .select('*')
        .or(`template_id.eq.${TEMPLATE_VIRTUAL_MARKET},template_id.ilike.%Market%`)
        .order('created_at', { ascending: false })
        .limit(200)
      if (status) query = query.eq('status', status)
      else query = query.in('status', ['Active', 'Approved'])

      const { data, error } = await query
      if (error) {
        return res.status(500).json({ error: 'Failed to fetch markets', message: error.message })
      }

      let list = (data || []).map((row) => ({
        contractId: row.contract_id,
        templateId: row.template_id,
        payload: {
          ...(row.payload || {}),
          status: row.status === 'Approved' ? 'Active' : row.status,
          source: row.payload?.source ?? 'user',
        },
        party: row.party,
        status: row.status,
        createdAt: row.created_at,
      }))

      if (source && source !== 'all') {
        list = list.filter((m) => (m.payload?.source ?? 'user') === source)
      }

      return res.status(200).json({ success: true, markets: list, count: list.length })
    }

    // POST: create virtual market (no approval)
    const body = req.body || {}
    const {
      marketId,
      title,
      description,
      marketType = 'Binary',
      outcomes = ['Yes', 'No'],
      settlementTrigger = 'Manual',
      resolutionCriteria,
      category,
      styleLabel,
      source = 'user',
      creator,
    } = body

    if (!title || !description || !resolutionCriteria) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['title', 'description', 'resolutionCriteria'],
      })
    }

    const id = marketId || `market-${Date.now()}`
    const party = creator || 'platform'

    const payload = {
      marketId: id,
      title,
      description,
      marketType,
      outcomes: Array.isArray(outcomes) ? outcomes : ['Yes', 'No'],
      settlementTrigger: typeof settlementTrigger === 'object' ? settlementTrigger : { tag: settlementTrigger },
      resolutionCriteria,
      status: 'Active',
      totalVolume: 0,
      yesVolume: 0,
      noVolume: 0,
      outcomeVolumes: {},
      category: category || null,
      styleLabel: styleLabel || null,
      source,
      createdAt: new Date().toISOString(),
    }

    const { data: marketRow, error: insertError } = await supabase
      .from('contracts')
      .upsert({
        contract_id: id,
        template_id: TEMPLATE_VIRTUAL_MARKET,
        payload,
        party,
        status: 'Active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'contract_id' })
      .select()
      .single()

    if (insertError) {
      return res.status(500).json({ error: 'Failed to create market', message: insertError.message })
    }

    // Create initial liquidity pool for this market (store in contracts as LiquidityPool)
    const poolState = createPoolState(id, 1000, 1000)
    const poolId = poolState.poolId
    await supabase
      .from('contracts')
      .upsert({
        contract_id: poolId,
        template_id: 'LiquidityPool',
        payload: poolState,
        party: 'platform',
        status: 'Active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'contract_id' })

    return res.status(200).json({
      success: true,
      market: {
        contractId: marketRow.contract_id,
        templateId: marketRow.template_id,
        payload: { ...payload },
        party: marketRow.party,
        status: marketRow.status,
      },
      poolId,
    })
  } catch (err) {
    console.error('[api/markets]', err)
    return res.status(500).json({ error: 'Internal server error', message: err.message })
  }
}
