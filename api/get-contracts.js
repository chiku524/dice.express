// Vercel serverless function to retrieve contracts from cloud database
// Located at project root /api/ directory (Vercel requirement)
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Allow both GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', received: req.method })
  }

  // Check if Supabase is configured
  if (!supabase) {
    console.error('[api/get-contracts] Supabase not configured')
    // Return empty array instead of error - this allows the app to continue working
    // Cloud storage is optional, not required
    console.warn('[api/get-contracts] ⚠️ Cloud storage not configured - returning empty array')
    return res.status(200).json({
      success: true,
      contracts: [],
      count: 0,
      _note: 'Cloud storage not configured - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required'
    })
  }

  try {
    // Get query parameters (from GET query string or POST body)
    const queryParams = req.method === 'GET' ? req.query : req.body
    const { party, templateType, status, limit } = queryParams

    console.log('[api/get-contracts] Query params:', { party, templateType, status, limit })

    // Build query
    let query = supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false })

    // Filter by party if provided
    if (party) {
      query = query.eq('party', party)
    }

    // Filter by template type if provided
    if (templateType) {
      query = query.ilike('template_id', `%${templateType}%`)
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    // Limit results if provided
    if (limit) {
      query = query.limit(parseInt(limit, 10))
    } else {
      query = query.limit(100) // Default limit
    }

    const { data, error } = await query

    if (error) {
      console.error('[api/get-contracts] Supabase error:', error)
      return res.status(500).json({
        error: 'Failed to retrieve contracts',
        message: error.message,
        details: error
      })
    }

    // Transform data to match expected format
    const contracts = (data || []).map(contract => ({
      contractId: contract.contract_id,
      templateId: contract.template_id,
      payload: contract.payload || {},
      party: contract.party,
      status: contract.status,
      updateId: contract.update_id,
      completionOffset: contract.completion_offset,
      explorerUrl: contract.explorer_url,
      createdAt: contract.created_at,
      updatedAt: contract.updated_at,
      _fromCloudStorage: true, // Flag to indicate this came from cloud storage
      // Ensure updateId is accessible at top level for easy lookup
      ...(contract.update_id && { updateId: contract.update_id })
    }))

    console.log(`[api/get-contracts] ✅ Retrieved ${contracts.length} contracts`)

    return res.status(200).json({
      success: true,
      contracts: contracts,
      count: contracts.length
    })
  } catch (error) {
    console.error('[api/get-contracts] Unexpected error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}