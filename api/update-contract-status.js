// Vercel serverless function to update contract status in Supabase database
// This allows approval/rejection to work even when blockchain interaction is unreliable
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
  res.setHeader('Access-Control-Allow-Methods', 'PUT,OPTIONS,PATCH')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Only allow PUT and PATCH requests
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed', received: req.method })
  }

  // Check if Supabase is configured
  if (!supabase) {
    console.error('[api/update-contract-status] Supabase not configured')
    return res.status(500).json({
      error: 'Cloud storage not configured',
      message: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required'
    })
  }

  try {
    const { contractId, status, updateId } = req.body

    // Validate required fields
    if (!contractId && !updateId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['contractId or updateId', 'status'],
        received: { contractId: !!contractId, updateId: !!updateId, status: !!status }
      })
    }

    if (!status) {
      return res.status(400).json({
        error: 'Missing required field: status',
        received: { contractId, updateId, status }
      })
    }

    // Validate status value
    const validStatuses = ['PendingApproval', 'Approved', 'Rejected', 'Active', 'Archived']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status value',
        validStatuses,
        received: status
      })
    }

    console.log('[api/update-contract-status] Updating contract status:', {
      contractId: contractId || updateId,
      status,
      usingUpdateId: !!updateId
    })

    // Build the update query
    // We can update by contract_id OR by update_id (if contract_id has updateId: prefix)
    let query = supabase.from('contracts')

    if (contractId) {
      // If contractId starts with updateId:, also try matching by update_id field
      if (contractId.startsWith('updateId:')) {
        const updateIdValue = contractId.replace('updateId:', '')
        query = query.eq('update_id', updateIdValue)
      } else {
        query = query.eq('contract_id', contractId)
      }
    } else if (updateId) {
      query = query.eq('update_id', updateId)
    }

    // Update the status
    const { data, error } = await query
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('[api/update-contract-status] Supabase error:', error)
      
      // If no rows matched, try to find the contract
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Contract not found',
          message: `No contract found with contractId: ${contractId || updateId}`,
          hint: 'The contract may not exist in the database, or the contractId/updateId may be incorrect'
        })
      }
      
      return res.status(500).json({
        error: 'Failed to update contract status',
        message: error.message,
        details: error
      })
    }

    console.log('[api/update-contract-status] ✅ Contract status updated successfully:', data.id)

    return res.status(200).json({
      success: true,
      contract: data,
      message: `Contract status updated to ${status}`
    })
  } catch (error) {
    console.error('[api/update-contract-status] Unexpected error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}
