// Vercel serverless function to proxy Canton JSON API queries
// Located at project root /api/ directory (Vercel requirement)
export default async function handler(req, res) {
  // CRITICAL: Log immediately to verify function is being called
  console.log('[api/query] ===== FUNCTION INVOKED =====')
  console.log('[api/query] Request received:', {
    method: req.method,
    url: req.url,
    path: req.url,
    query: req.query,
    headers: req.headers,
    body: req.body,
  })
  console.log('[api/query] Environment:', {
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
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

  // Ensure request body is parsed (Vercel should do this automatically, but check)
  if (!req.body) {
    console.error('[api/query] No request body received')
    return res.status(400).json({ error: 'Request body is required' })
  }

  // Check Content-Type
  const requestContentType = req.headers['content-type'] || req.headers['Content-Type']
  if (requestContentType && !requestContentType.includes('application/json')) {
    console.warn('[api/query] Unexpected Content-Type:', requestContentType)
  }

  // JSON API is at /json-api path (admin-api is at base URL)
  // Ensure we have the full JSON API URL
  let LEDGER_URL = process.env.VITE_LEDGER_URL || process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
  
  // Ensure /json-api is in the URL
  if (!LEDGER_URL.includes('/json-api')) {
    LEDGER_URL = LEDGER_URL.replace(/\/$/, '') + '/json-api'
  }

  try {
    // Ensure we're using HTTPS and the correct endpoint
    // Remove trailing slash from LEDGER_URL if present
    const baseUrl = LEDGER_URL.replace(/\/$/, '')
    
    // Try multiple endpoint formats - Canton 3.4 may use v2, but v1 might also work
    // Try endpoints in order: v2/query, v1/query, query
    // Note: Query endpoints may not be enabled on this Canton participant
    // If all return 404, the participant may only support commands, not queries
    const possibleEndpoints = [
      `${baseUrl}/v2/query`,
      `${baseUrl}/v1/query`,
      `${baseUrl}/query`,
      `${baseUrl}/v2/contracts/search`, // Alternative v2 endpoint
      `${baseUrl}/v1/contracts/search`, // Alternative v1 endpoint
    ]
    
    console.log('[api/query] Trying endpoints:', possibleEndpoints)
    console.log('[api/query] Request body:', JSON.stringify(req.body))
    console.log('[api/query] Content-Type:', requestContentType)
    
    // Ensure request body matches Canton JSON API format
    // Try multiple formats - Canton might expect different formats
    const templateIds = req.body.templateIds || []
    
    // Try with and without package IDs - some Canton setups might not need full package IDs
    const templateIdsWithPackage = templateIds.map(id => {
      // If already has package ID, use as-is
      if (id.includes(':')) {
        return id
      }
      // Otherwise, add default package ID
      const defaultPackageId = 'b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0'
      return `${defaultPackageId}:${id}`
    })
    
    // Also try without package IDs (just module:template)
    const templateIdsWithoutPackage = templateIds.map(id => {
      // Extract module:template from packageId:module:template
      const parts = id.split(':')
      if (parts.length >= 3) {
        return `${parts[1]}:${parts[2]}`
      }
      return id
    })
    
    const requestBody = {
      templateIds: templateIdsWithPackage,
      query: req.body.query || {},
    }
    
    const requestBodyWithoutPackage = {
      templateIds: templateIdsWithoutPackage,
      query: req.body.query || {},
    }
    
    console.log('[api/query] Formatted request body (with package):', JSON.stringify(requestBody))
    console.log('[api/query] Formatted request body (without package):', JSON.stringify(requestBodyWithoutPackage))
    
    // Try each endpoint until one works
    let lastError = null
    let response = null
    let usedEndpoint = null
    
    for (const queryUrl of possibleEndpoints) {
      try {
        // Try different Content-Type headers - Canton might be picky
        const contentTypeOptions = [
          'application/json; charset=utf-8',
          'application/json',
          'application/grpc-web+json',
          'application/grpc-web',
        ]
        
        let responseAttempt = null
        let lastContentTypeError = null
        
        // Try each Content-Type option, and also try with/without package IDs
        for (const contentType of contentTypeOptions) {
          // Try with package IDs first, then without
          const bodiesToTry = [requestBody]
          if (templateIdsWithPackage.length > 0 && templateIdsWithPackage[0] !== templateIdsWithoutPackage[0]) {
            bodiesToTry.push(requestBodyWithoutPackage)
          }
          
          for (const bodyToTry of bodiesToTry) {
            try {
              console.log('[api/query] Trying endpoint:', queryUrl, 'with Content-Type:', contentType)
              console.log('[api/query] Request body:', JSON.stringify(bodyToTry).substring(0, 300))
              responseAttempt = await fetch(queryUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': contentType,
                  'Accept': 'application/json',
                  ...(req.headers.authorization && { Authorization: req.headers.authorization }),
                },
                body: JSON.stringify(bodyToTry),
                redirect: 'follow', // Follow redirects if any
              })
            
            console.log('[api/query] Response URL:', responseAttempt.url) // Log final URL after redirects
            console.log('[api/query] Response status:', responseAttempt.status)
            
            // If we get a non-415 and non-404 response, this Content-Type worked
            if (responseAttempt.status !== 415 && responseAttempt.status !== 404) {
              response = responseAttempt
              usedEndpoint = queryUrl
              console.log('[api/query] Endpoint responded (not 404/415):', queryUrl)
              break // Break out of bodyToTry loop
            }
            
            // If 415, try next body format or Content-Type
            if (responseAttempt.status === 415) {
              const clonedResponse = responseAttempt.clone()
              try {
                const errorText = await clonedResponse.text()
                lastContentTypeError = {
                  contentType,
                  status: responseAttempt.status,
                  message: errorText.substring(0, 200)
                }
                console.log('[api/query] 415 with Content-Type:', contentType, '- trying next...')
              } catch (readError) {
                lastContentTypeError = {
                  contentType,
                  status: responseAttempt.status,
                  message: 'Could not read error message'
                }
                console.log('[api/query] 415 with Content-Type:', contentType, '- trying next...')
              }
              continue
            }
            
            // If 404, try next body format
            if (responseAttempt.status === 404) {
              const errorData = await responseAttempt.json().catch(() => ({}))
              lastError = { endpoint: queryUrl, status: responseAttempt.status, data: errorData }
              console.log('[api/query] Endpoint returned 404 with this body format, trying next format...')
              continue // Try next body format
            }
          } catch (contentTypeError) {
            console.log('[api/query] Error with body format:', contentTypeError.message)
            lastContentTypeError = { contentType, error: contentTypeError.message }
            continue // Try next body format
          }
        }
        
        // If we got a successful response, break out of Content-Type loop
        if (response) {
          break
        }
      } catch (endpointError) {
        console.log('[api/query] Error with Content-Type:', contentType, endpointError.message)
        lastContentTypeError = { contentType, error: endpointError.message }
      }
        
        // If we found a working response, break out of endpoint loop
        if (response && response.status !== 404 && response.status !== 415) {
          break
        }
        
        // If all Content-Types failed with 415, use the last response
        if (!response && responseAttempt && responseAttempt.status === 415) {
          response = responseAttempt
          usedEndpoint = queryUrl
          break // We'll handle 415 error below
        }
      } catch (error) {
        console.log('[api/query] Error with endpoint:', queryUrl, error.message)
        lastError = { endpoint: queryUrl, error: error.message }
        response = null
        // Continue to next endpoint
      }
    }
    
    // If all endpoints failed, return empty result instead of error
    // This allows the frontend to continue working even if query endpoints aren't available
    if (!response) {
      console.error('[api/query] All endpoints failed. Last error:', lastError)
      console.warn('[api/query] Returning empty result set - Canton query endpoints are not available')
      // Return empty result set in format expected by frontend (matches Canton response format)
      // Use 200 status to prevent retries - 404 would trigger retries
      // Add a flag to indicate endpoints are unavailable so frontend can stop polling
      return res.status(200).json({
        result: [],
        _endpointsUnavailable: true // Flag to indicate query endpoints don't exist
      })
    }
    
    console.log('[api/query] Response headers:', Object.fromEntries(response.headers.entries()))

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type')
    console.log('[api/query] Response content-type:', contentType)
    
    let data
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      const text = await response.text()
      console.log('[api/query] Non-JSON response:', text.substring(0, 500))
      data = { error: 'Non-JSON response', text: text.substring(0, 500) }
    }
    
    console.log('[api/query] Ledger response data:', JSON.stringify(data).substring(0, 200))
    
    if (!response.ok) {
      console.log('[api/query] Ledger returned error, forwarding status:', response.status)
      
      // If 404, provide helpful error message
      if (response.status === 404) {
        console.error('[api/query] 404 Error - Canton endpoint may not be configured')
        console.error('[api/query] Error details:', JSON.stringify(data))
        
        // Return a more helpful error message
        return res.status(404).json({
          error: 'Canton endpoint not found',
          message: 'The Canton participant JSON API endpoint is not configured or accessible.',
          details: data,
          suggestion: 'Please verify that the Canton participant has the JSON API enabled and the endpoint path is correct.',
          endpoint: usedEndpoint || 'unknown'
        })
      }
      
      return res.status(response.status).json(data)
    }

    console.log('[api/query] Sending successful response')
    return res.status(200).json(data)
  } catch (error) {
    console.error('[api/query] Query proxy error:', error)
    console.error('[api/query] Error stack:', error.stack)
    return res.status(500).json({ 
      error: 'Failed to query ledger',
      message: error.message 
    })
  }
}
