// Vercel serverless function to proxy Canton JSON API queries
// Located at project root /api/ directory (Vercel requirement)
//
// Uses /v2/state/active-contracts endpoint to query contracts by template ID
module.exports = async function handler(req, res) {
  console.log('[api/query] ===== FUNCTION INVOKED =====')
  console.log('[api/query] Request received:', {
    method: req.method,
    url: req.url,
    query: req.query,
  })
  
  // IMPORTANT: Set CORS headers FIRST before any other operations
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  // Handle preflight
  if (req.method === 'OPTIONS') {
    console.log('[api/query] Handling OPTIONS preflight')
    return res.status(200).end()
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('[api/query] Method not allowed:', req.method)
    return res.status(405).json({ error: 'Method not allowed', received: req.method })
  }

  // Get request body
  const requestBody = req.body || {}
  const { templateIds, query: queryFilters, party, walletParty, minOffset } = requestBody

  if (!templateIds || !Array.isArray(templateIds) || templateIds.length === 0) {
    return res.status(400).json({ 
      error: 'templateIds is required and must be a non-empty array',
      received: requestBody
    })
  }

  // JSON API is at /json-api path
  let LEDGER_URL = process.env.VITE_LEDGER_URL || process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
  
  // Ensure /json-api is in the URL
  if (!LEDGER_URL.includes('/json-api')) {
    LEDGER_URL = LEDGER_URL.replace(/\/$/, '') + '/json-api'
  }

  const baseUrl = LEDGER_URL.replace(/\/$/, '')
  const endpoint = `${baseUrl}/v2/state/active-contracts`

  // Extract token from Authorization header or request body
  const authHeader = req.headers.authorization || req.headers.Authorization
  let token = authHeader ? authHeader.replace('Bearer ', '') : (requestBody.token || null)
  
  if (!token) {
    console.warn('[api/query] No authentication token provided - request may fail')
  }

  // Build request body for /v2/state/active-contracts
  // According to OpenAPI spec, the request should be GetActiveContractsRequest
  // Format can be either:
  // 1. Simple: { filter: { templateIds: [...] } }
  // 2. Party-specific: { filter: { filtersByParty: { party: { inclusive: { templateIds: [...] } } } } }
  
  // Determine which party to filter by
  // The endpoint requires a party for filtersByParty, so we need to use a party
  // Priority: explicit party > walletParty > party from query filters
  // For MarketsList (no query filters), we need walletParty
  // For AdminDashboard/Portfolio, we use the party from query filters
  const filterParty = party || walletParty || queryFilters?.party || queryFilters?.admin || queryFilters?.owner || queryFilters?.creator
  
  // Build filter structure
  // Note: The endpoint requires filtersByParty with a party, so we always need a party
  // If no party is provided, we can't query (endpoint requirement)
  // In practice, components should always have a wallet party available
  let filter = {}
  
  if (filterParty) {
    // Filter by specific party using filtersByParty
    // This gets contracts visible to this party
    filter = {
      filtersByParty: {
        [filterParty]: {
          inclusive: {
            templateIds: templateIds
          }
        }
      }
    }
  } else {
    // No party provided - this is a problem because endpoint requires a party
    // Return error or use a default party if available
    // For now, return error to make it clear a party is needed
    return res.status(400).json({
      error: 'Party is required for /v2/state/active-contracts endpoint',
      message: 'The endpoint requires a party in filtersByParty. Please provide a party in the query.',
      hint: 'For MarketsList, use wallet.party. For AdminDashboard/Portfolio, the party is extracted from query filters.'
    })
  }

  // Build request body according to GetActiveContractsRequest schema
  // activeAtOffset is required and must be a Long (integer)
  // Use 0 to start from the beginning, or use minOffset if provided
  // Note: If contracts are created with updateId/completionOffset, they might not appear
  // immediately. Using 0 should work, but we might need to wait for synchronization.
  const activeAtOffset = requestBody.minOffset !== undefined && requestBody.minOffset !== null 
    ? parseInt(requestBody.minOffset, 10) 
    : 0
  const requestBodyV2 = {
    filter: filter,
    activeAtOffset: activeAtOffset // Required field - Long type, 0 means start from beginning
  }

  console.log('[api/query] Calling endpoint:', endpoint)
  console.log('[api/query] Request body:', JSON.stringify(requestBodyV2, null, 2))

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(requestBodyV2),
    })

    console.log('[api/query] Response status:', response.status)
    console.log('[api/query] Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[api/query] Error response:', errorText)
      
      // Provide helpful error messages for common issues
      if (response.status === 401) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid or expired authentication token. Please update your token in the Wallet modal.',
          status: 401,
          hint: 'Your token may have expired. Get a new token and save it in the Wallet modal.'
        })
      }
      
      return res.status(response.status).json({
        error: 'Failed to query contracts',
        message: errorText.substring(0, 500),
        status: response.status
      })
    }

    const data = await response.json()
    console.log('[api/query] Response data (first 1000 chars):', JSON.stringify(data).substring(0, 1000))
    const contractCount = Array.isArray(data) ? data.length : 0
    console.log('[api/query] Total contracts returned:', contractCount)
    
    // Log full response if empty to help debug
    if (contractCount === 0) {
      console.log('[api/query] ⚠️ No contracts found. Debugging info:')
      console.log('[api/query]   - Filter party:', filterParty)
      console.log('[api/query]   - Template IDs:', templateIds)
      console.log('[api/query]   - Active at offset:', activeAtOffset)
      console.log('[api/query]   - Request body:', JSON.stringify(requestBodyV2, null, 2))
      console.log('[api/query] Possible reasons:')
      console.log('[api/query]   1. No contracts exist for this party/template combination')
      console.log('[api/query]   2. Contracts exist but are not yet synchronized (wait a few seconds)')
      console.log('[api/query]   3. Contracts exist but party does not have visibility (check signatories/observers)')
      console.log('[api/query]   4. Contracts were created but immediately archived')
      console.log('[api/query]   5. activeAtOffset: 0 might miss contracts - try querying from completionOffset')
      console.log('[api/query]   6. Contract might be in a different domain or state')
    } else {
      console.log('[api/query] ✅ Found contracts. Sample:', JSON.stringify(data[0]).substring(0, 500))
      // Log all contract IDs and their admin/creator fields for debugging
      data.slice(0, 5).forEach((contract, idx) => {
        const contractId = contract.createdEvent?.contractId || contract.contractId
        const payload = contract.createdEvent?.createArguments || contract.payload || {}
        console.log(`[api/query] Contract ${idx + 1}:`, {
          contractId: contractId?.substring(0, 50) + '...',
          admin: payload.admin,
          creator: payload.creator,
          title: payload.title
        })
      })
    }

    // Transform response to match expected format
    // Response format: [{ createdEvent: { contractId, templateId, createArguments } }]
    // Expected format: [{ contractId, payload: createArguments }]
    let transformedResults = Array.isArray(data) ? data.map(item => {
      if (item.createdEvent) {
        return {
          contractId: item.createdEvent.contractId,
          templateId: item.createdEvent.templateId,
          payload: item.createdEvent.createArguments || {}
        }
      }
      return item
    }) : []

    console.log('[api/query] Transformed contracts:', transformedResults.length)
    if (queryFilters && Object.keys(queryFilters).length > 0) {
      console.log('[api/query] Applying client-side filters:', queryFilters)
      const beforeFilter = transformedResults.length
      transformedResults = transformedResults.filter(contract => {
        // Check if contract matches all query filters
        const matches = Object.entries(queryFilters).every(([key, value]) => {
          // Handle nested fields (e.g., settlementTrigger.tag)
          const contractValue = contract.payload?.[key]
          const match = contractValue === value
          if (!match) {
            console.log(`[api/query] Contract ${contract.contractId} filtered out: ${key} = ${contractValue} (expected ${value})`)
          }
          return match
        })
        return matches
      })
      console.log(`[api/query] After filtering: ${transformedResults.length} contracts (was ${beforeFilter})`)
    }

    return res.status(200).json({
      result: transformedResults,
      _endpoint: '/v2/state/active-contracts',
      _note: 'Using /v2/state/active-contracts endpoint'
    })
  } catch (error) {
    console.error('[api/query] Error:', error)
    return res.status(500).json({
      error: 'Failed to query contracts',
      message: error.message
    })
  }
}
