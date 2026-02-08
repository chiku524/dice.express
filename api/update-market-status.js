/**
 * Virtual only: update market status (e.g. Resolving, Settled) and resolved outcome.
 */
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
let supabase = null
if (supabaseUrl && supabaseKey) supabase = createClient(supabaseUrl, supabaseKey)

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

  if (!supabase) return res.status(500).json({ error: 'Database not configured' })

  const { marketId, status, resolvedOutcome } = req.body || {}
  if (!marketId) return res.status(400).json({ error: 'marketId required' })

  const { data: row } = await supabase.from('contracts').select('*').eq('contract_id', marketId).single()
  if (!row || !row.payload) return res.status(404).json({ error: 'Market not found' })

  const payload = { ...row.payload }
  if (status) payload.status = status
  if (resolvedOutcome !== undefined) payload.resolvedOutcome = resolvedOutcome

  const { error } = await supabase.from('contracts').update({
    payload,
    updated_at: new Date().toISOString(),
  }).eq('contract_id', marketId)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ success: true, market: { contractId: marketId, payload } })
}
