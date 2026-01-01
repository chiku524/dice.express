// Vercel serverless function to store contracts in cloud database
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

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', received: req.method })
  }

  // Check if Supabase is configured
  if (!supabase) {
    console.error('[api/store-contract] Supabase not configured')
    return res.status(500).json({
      error: 'Cloud storage not configured',
      message: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required'
    })
  }

  try {
    const { contractId, templateId, payload, party, updateId, completionOffset, explorerUrl, status } = req.body

    // Validate required fields
    if (!contractId || !templateId || !party) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['contractId', 'templateId', 'party'],
        received: { contractId: !!contractId, templateId: !!templateId, party: !!party }
      })
    }

    console.log('[api/store-contract] Storing contract:', {
      contractId,
      templateId,
      party,
      status: status || 'PendingApproval'
    })

    // Store contract in Supabase
    // Use upsert to handle duplicates (based on contract_id unique constraint)
    const { data, error } = await supabase
      .from('contracts')
      .upsert({
        contract_id: contractId,
        template_id: templateId,
        payload: payload || {},
        party: party,
        status: status || 'PendingApproval',
        update_id: updateId || null,
        completion_offset: completionOffset || null,
        explorer_url: explorerUrl || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'contract_id',
        ignoreDuplicates: false // Update if exists
      })
      .select()
      .single()

    if (error) {
      console.error('[api/store-contract] Supabase error:', error)
      return res.status(500).json({
        error: 'Failed to store contract',
        message: error.message,
        details: error
      })
    }

    console.log('[api/store-contract] ✅ Contract stored successfully:', data.id)

    return res.status(200).json({
      success: true,
      contract: data
    })
  } catch (error) {
    console.error('[api/store-contract] Unexpected error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}