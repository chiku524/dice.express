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
  const { templateIds, query: queryFilters, party, walletParty } = requestBody

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
  // Use 0 to start from the beginning, or we could get the latest offset first
  const requestBodyV2 = {
    filter: filter,
    activeAtOffset: 0 // Required field - Long type, 0 means start from beginning
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
      return res.status(response.status).json({
        error: 'Failed to query contracts',
        message: errorText.substring(0, 500),
        status: response.status
      })
    }

    const data = await response.json()
    console.log('[api/query] Response data (first 500 chars):', JSON.stringify(data).substring(0, 500))

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

    // Apply client-side filtering by contract data fields
    // The endpoint only filters by party visibility, not by contract data fields
    // So we need to filter client-side for fields like admin, owner, creator, etc.
    if (queryFilters && Object.keys(queryFilters).length > 0) {
      transformedResults = transformedResults.filter(contract => {
        // Check if contract matches all query filters
        return Object.entries(queryFilters).every(([key, value]) => {
          // Handle nested fields (e.g., settlementTrigger.tag)
          const contractValue = contract.payload?.[key]
          return contractValue === value
        })
      })
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
