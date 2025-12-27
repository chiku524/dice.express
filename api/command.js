// Vercel serverless function to proxy Canton JSON API commands
// Located at project root /api/ directory (Vercel requirement)
export default async function handler(req, res) {
  // Log for debugging - this should appear in Vercel function logs if request reaches here
  console.log('[api/command] ===== FUNCTION INVOKED =====')
  console.log('[api/command] Request received:', {
    method: req.method,
    url: req.url,
    path: req.url,
    query: req.query,
    headers: req.headers,
    body: req.body,
  })
  console.log('[api/command] Environment:', {
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  })

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
    console.log('[api/command] Handling OPTIONS preflight')
    return res.status(200).end()
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('[api/command] Method not allowed:', req.method)
    return res.status(405).json({ error: 'Method not allowed', received: req.method })
  }

  const LEDGER_URL = process.env.VITE_LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com'

  try {
    // Ensure we're using HTTPS and the correct endpoint
    // Remove trailing slash from LEDGER_URL if present
    const baseUrl = LEDGER_URL.replace(/\/$/, '')
    
    // Try multiple endpoint formats - Canton 3.4 may use different formats
    // v2 uses /v2/commands/submit-and-wait, v1 uses /v1/command
    const possibleEndpoints = [
      `${baseUrl}/v2/commands/submit-and-wait`,
      `${baseUrl}/v1/command`,
      `${baseUrl}/v2/command`,
      `${baseUrl}/command`,
    ]
    
    console.log('[api/command] Trying endpoints:', possibleEndpoints)
    console.log('[api/command] Request body:', JSON.stringify(req.body))
    
    // Extract commands object and party from request
    const commandsObj = req.body.commands || req.body
    const party = commandsObj.party || (Array.isArray(commandsObj.actAs) ? commandsObj.actAs[0] : null)
    
    // Format request body for different API versions
    // v1 expects: { commands: { party, applicationId, commandId, list } }
    const requestBodyV1 = req.body
    
    // v2 format options - try different structures based on Canton API requirements
    // Option 1: Commands with actAs, removing party from commands (since actAs specifies it)
    const commandsWithoutParty = {
      applicationId: commandsObj.applicationId,
      commandId: commandsObj.commandId,
      list: commandsObj.list
    }
    const requestBodyV2a = {
      actAs: party ? [party] : [],
      commands: commandsWithoutParty
    }
    
    // Option 2: Wrapped commands with actAs, keeping party in commands
    const requestBodyV2b = {
      actAs: party ? [party] : [],
      commands: commandsObj
    }
    
    // Option 3: Unwrapped commands with actAs (some v2 endpoints expect this)
    const requestBodyV2c = {
      actAs: party ? [party] : [],
      ...commandsObj
    }
    
    // Option 4: Just unwrapped commands without party (fallback)
    const requestBodyV2d = commandsWithoutParty
    
    // Try each endpoint until one works
    let lastError = null
    let response = null
    let usedEndpoint = null
    
    // Try each endpoint with appropriate format
    for (const commandUrl of possibleEndpoints) {
      const isV2Endpoint = commandUrl.includes('/v2/')
      
      // For v2 endpoints, try multiple format variations
      const formatsToTry = isV2Endpoint 
        ? [
            { name: 'v2a-no-party-in-commands', body: requestBodyV2a },
            { name: 'v2b-with-party-in-commands', body: requestBodyV2b },
            { name: 'v2c-unwrapped-with-actAs', body: requestBodyV2c },
            { name: 'v2d-direct-no-party', body: requestBodyV2d },
          ]
        : [{ name: 'v1', body: requestBodyV1 }]
      
      for (const format of formatsToTry) {
        try {
          console.log('[api/command] Trying endpoint:', commandUrl, 'with format:', format.name)
          console.log('[api/command] Formatted request body:', JSON.stringify(format.body).substring(0, 500))
          
          response = await fetch(commandUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              ...(req.headers.authorization && { Authorization: req.headers.authorization }),
            },
            body: JSON.stringify(format.body),
            redirect: 'follow',
          })
          
          console.log('[api/command] Response status:', response.status)
          
          // If we get a successful response (2xx), use this format
          if (response.status >= 200 && response.status < 300) {
            console.log('[api/command] Success with endpoint:', commandUrl, 'format:', format.name)
            usedEndpoint = commandUrl
            break
          }
          
          // If we get a non-404 error, check if it's a format/validation error
          // For 400 errors, try other formats as it might be a format issue
          // For other errors (401, 403, 500), return immediately as they're not format-related
          if (response.status !== 404) {
            const contentType = response.headers.get('content-type')
            let errorText = ''
            let errorData = null
            try {
              if (contentType && contentType.includes('application/json')) {
                errorData = await response.json()
                errorText = JSON.stringify(errorData)
              } else {
                errorText = await response.text()
              }
            } catch (e) {
              errorText = 'Could not parse error response'
            }
            
            console.log('[api/command] Endpoint returned error:', response.status, 'format:', format.name)
            console.log('[api/command] Error response:', errorText.substring(0, 500))
            
            // For 400 errors, try other formats (might be format issue)
            // For other errors, return immediately
            if (response.status === 400 && formatsToTry.length > 1) {
              lastError = { 
                endpoint: commandUrl, 
                format: format.name,
                status: response.status, 
                error: errorText.substring(0, 500),
                data: errorData
              }
              response = null
              continue // Try next format
            } else {
              // For non-400 errors or last format, use this response
              usedEndpoint = commandUrl
              break // Exit format loop, will process this error response
            }
          }
          
          // If 404, try next format or endpoint
          const errorData = await response.json().catch(() => ({}))
          lastError = { endpoint: commandUrl, format: format.name, status: response.status, data: errorData }
          console.log('[api/command] Endpoint returned 404, trying next format/endpoint')
          response = null
        } catch (error) {
          console.log('[api/command] Error with endpoint:', commandUrl, 'format:', format.name, error.message)
          lastError = { endpoint: commandUrl, format: format.name, error: error.message }
          response = null
          // Continue to next format
        }
      }
      
      // If we got a successful response, break out of endpoint loop
      if (response && response.ok) {
        break
      }
    }
    
    // If all endpoints failed, return error
    if (!response) {
      console.error('[api/command] All endpoints failed. Last error:', lastError)
      return res.status(404).json({
        error: 'Canton endpoint not found',
        message: 'Tried multiple endpoint formats but none responded successfully.',
        triedEndpoints: possibleEndpoints,
        lastError: lastError,
        suggestion: 'Please verify the Canton participant JSON API is enabled and the endpoint path is correct. Check the OpenAPI docs at the base URL + /docs/openapi'
      })
    }
    
    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type')
    console.log('[api/command] Response content-type:', contentType)
    console.log('[api/command] Response status:', response.status)
    console.log('[api/command] Successful response from:', usedEndpoint)
    
    let data
    try {
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        console.log('[api/command] Non-JSON response:', text.substring(0, 1000))
        // Try to extract meaningful error message from text response
        let errorMessage = text
        // If it's a validation error, try to extract the key part
        if (text.includes('Invalid value') || text.includes('Missing required field')) {
          errorMessage = text
        }
        data = { 
          error: 'Canton ledger error', 
          message: errorMessage.substring(0, 1000),
          rawResponse: text.substring(0, 500)
        }
      }
    } catch (parseError) {
      console.error('[api/command] Error parsing response:', parseError)
      data = { 
        error: 'Failed to parse response', 
        message: parseError.message,
        status: response.status 
      }
    }
    
    console.log('[api/command] Ledger response data:', JSON.stringify(data).substring(0, 500))
    
    if (!response.ok) {
      console.log('[api/command] Ledger returned error, forwarding status:', response.status)
      // Return a more user-friendly error message
      const userMessage = data.message || data.error || data.text || 'Unknown error from Canton ledger'
      return res.status(response.status).json({
        error: userMessage,
        details: data,
        endpoint: usedEndpoint
      })
    }

    return res.status(200).json(data)
  } catch (error) {
    console.error('[api/command] Command proxy error:', error)
    console.error('[api/command] Error stack:', error.stack)
    return res.status(500).json({ 
      error: 'Failed to submit command',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
