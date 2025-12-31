// Vercel serverless function to proxy Canton JSON API queries
// Located at project root /api/ directory (Vercel requirement)
//
// IMPORTANT: Based on OpenAPI documentation (https://participant.dev.canton.wolfedgelabs.com/json-api/docs/openapi),
// query endpoints do NOT exist in the JSON API.
//
// Available endpoints from OpenAPI:
// - /v2/commands/submit-and-wait - Submit commands
// - /v2/commands/async/submit - Submit commands asynchronously
// - /v2/commands/completions - Query completions (not contract queries)
// - /v2/events/events-by-contract-id - Get events by contract ID (requires contract ID, not template queries)
// - /v2/version - Get version
//
// Query endpoints (/v1/query, /v2/query) do NOT exist.
// Contract querying requires gRPC API or WebSocket connections.
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

  // Query endpoints do not exist in JSON API per OpenAPI documentation
  // Return empty results immediately with flag indicating endpoints are unavailable
  console.warn('[api/query] Query endpoints are not available in JSON API (per OpenAPI documentation)')
  console.warn('[api/query] Returning empty result set - contract querying requires gRPC or WebSocket APIs')
  console.log('[api/query] Request body:', JSON.stringify(req.body || {}).substring(0, 200))
  
  // Return empty result set in format expected by frontend
  // Use 200 status to prevent retries
  // Add a flag to indicate endpoints are unavailable so frontend can stop polling
  return res.status(200).json({
    result: [],
    _endpointsUnavailable: true, // Flag to indicate query endpoints don't exist
    _note: 'Query endpoints do not exist in JSON API per OpenAPI documentation. Use gRPC or WebSocket for contract queries.'
  })
}
