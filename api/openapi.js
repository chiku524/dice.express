// Diagnostic endpoint to fetch Canton OpenAPI specification
// This helps identify the correct endpoint format
export default async function handler(req, res) {
  console.log('[api/openapi] ===== FUNCTION INVOKED =====')
  
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  // JSON API is at /json-api path (admin-api is at base URL)
  const LEDGER_URL = process.env.VITE_LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
  const baseUrl = LEDGER_URL.replace(/\/$/, '')
  
  // Try multiple OpenAPI endpoint formats
  const possibleEndpoints = [
    `${baseUrl}/docs/openapi`,
    `${baseUrl}/openapi`,
    `${baseUrl}/v2/openapi`,
    `${baseUrl}/v1/openapi`,
  ]
  
  console.log('[api/openapi] Trying endpoints:', possibleEndpoints)
  
  for (const endpoint of possibleEndpoints) {
    try {
      console.log('[api/openapi] Trying:', endpoint)
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, application/yaml, text/yaml, */*',
        },
        redirect: 'follow',
      })
      
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        const text = await response.text()
        
        console.log('[api/openapi] Success from:', endpoint)
        console.log('[api/openapi] Content-Type:', contentType)
        
        return res.status(200).json({
          success: true,
          endpoint: endpoint,
          contentType: contentType,
          spec: text.substring(0, 5000), // First 5000 chars
          message: 'OpenAPI spec found. Check the spec to identify correct endpoint paths.'
        })
      }
      
      console.log('[api/openapi] Endpoint returned status:', response.status, endpoint)
    } catch (error) {
      console.log('[api/openapi] Error with endpoint:', endpoint, error.message)
    }
  }
  
  return res.status(404).json({
    error: 'OpenAPI spec not found',
    triedEndpoints: possibleEndpoints,
    message: 'Could not find OpenAPI specification. The JSON API might not be enabled or the endpoint path is different.'
  })
}

