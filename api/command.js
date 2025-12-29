// Vercel serverless function to proxy Canton JSON API commands
// Located at project root /api/ directory (Vercel requirement)
export default async function handler(req, res) {
  // Enable CORS first
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

  // Log for debugging
  const contentType = req.headers['content-type'] || req.headers['Content-Type'] || ''
  console.log('[api/command] Content-Type:', contentType)
  console.log('[api/command] Body type:', typeof req.body)
  console.log('[api/command] Body exists:', !!req.body)
  console.log('[api/command] Body keys:', req.body ? Object.keys(req.body) : 'none')

  // Vercel automatically parses JSON bodies for serverless functions
  // Just use req.body directly - it's already parsed
  const requestBody = req.body

  // If body is undefined, it might not have been parsed yet
  // This shouldn't happen with Vercel, but handle it gracefully
  if (!requestBody) {
    console.error('[api/command] No request body - Content-Type was:', contentType)
    return res.status(400).json({ 
      error: 'Request body is required',
      receivedContentType: contentType,
      hint: 'Ensure Content-Type is application/json'
    })
  }

  console.log('[api/command] Processing request body:', JSON.stringify(requestBody).substring(0, 200))

  // JSON API is at /json-api path (admin-api is at base URL)
  const LEDGER_URL = process.env.VITE_LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'

  try {
    const baseUrl = LEDGER_URL.replace(/\/$/, '')
    
    const possibleEndpoints = [
      `${baseUrl}/v2/commands/submit-and-wait`,
      `${baseUrl}/v1/command`,
      `${baseUrl}/v2/command`,
      `${baseUrl}/command`,
    ]

    // Extract token from Authorization header or request body
    const authHeader = req.headers.authorization || req.headers.Authorization
    const token = authHeader ? authHeader.replace('Bearer ', '') : (requestBody.token || null)

    // Extract commands object and party from request
    // Frontend sends: { actAs: [string], commandId: string, commands: [Command], applicationId: string }
    const party = Array.isArray(requestBody.actAs) ? requestBody.actAs[0] : (requestBody.party || null)
    const commandId = requestBody.commandId
    const commandList = requestBody.commands || []

    // Transform commands to v2 format if needed
    const transformedCommands = commandList.map(cmd => {
      // If already in CreateCommand format, use as-is
      if (cmd.CreateCommand) {
        return cmd
      }
      // If in old format, transform it
      if (cmd.templateId && cmd.createArguments) {
        return {
          CreateCommand: {
            templateId: cmd.templateId,
            createArguments: cmd.createArguments
          }
        }
      }
      // If in templateId + payload format, transform
      if (cmd.templateId && cmd.payload) {
        return {
          CreateCommand: {
            templateId: cmd.templateId,
            createArguments: cmd.payload
          }
        }
      }
      // Otherwise pass through
      return cmd
    })

    const requestBodyV2 = {
      actAs: party ? [party] : [],
      commandId: commandId,
      applicationId: requestBody.applicationId || 'prediction-markets',
      commands: transformedCommands
    }

    // Try each endpoint
    let lastError = null
    let response = null
    let usedEndpoint = null

    console.log('[api/command] Request body V2:', JSON.stringify(requestBodyV2).substring(0, 300))
    console.log('[api/command] Token present:', !!token)
    console.log('[api/command] Party:', party)

    for (const commandUrl of possibleEndpoints) {
      const isV2Endpoint = commandUrl.includes('/v2/')
      
      const bodyToSend = isV2Endpoint ? requestBodyV2 : requestBody

      try {
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }

        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        console.log('[api/command] Trying endpoint:', commandUrl)
        console.log('[api/command] Sending body:', JSON.stringify(bodyToSend).substring(0, 300))

        response = await fetch(commandUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(bodyToSend),
          redirect: 'follow',
        })

        console.log('[api/command] Response status:', response.status)
        console.log('[api/command] Response headers:', Object.fromEntries(response.headers.entries()))

        if (response.status >= 200 && response.status < 300) {
          usedEndpoint = commandUrl
          break
        }

        // For non-404 errors, use this response
        if (response.status !== 404) {
          usedEndpoint = commandUrl
          break
        }

        // If 404, try next endpoint
        lastError = { endpoint: commandUrl, status: response.status }
        response = null
      } catch (error) {
        lastError = { endpoint: commandUrl, error: error.message }
        response = null
      }
    }

    if (!response) {
      return res.status(404).json({
        error: 'Canton endpoint not found',
        message: 'Tried multiple endpoint formats but none responded successfully.',
        triedEndpoints: possibleEndpoints,
        lastError: lastError,
      })
    }

    // Parse response
    const responseContentType = response.headers.get('content-type')
    let data

    try {
      if (responseContentType && responseContentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        data = {
          error: 'Canton ledger error',
          message: text.substring(0, 1000),
          rawResponse: text.substring(0, 500)
        }
      }
    } catch (parseError) {
      data = {
        error: 'Failed to parse response',
        message: parseError.message,
        status: response.status
      }
    }

    if (!response.ok) {
      const userMessage = data.message || data.error || 'Unknown error from Canton ledger'
      console.log('[api/command] Canton returned error:', response.status, userMessage)
      console.log('[api/command] Full error data:', JSON.stringify(data).substring(0, 500))
      return res.status(response.status).json({
        error: userMessage,
        details: data,
        endpoint: usedEndpoint
      })
    }

    console.log('[api/command] Success! Contract created.')

    return res.status(200).json(data)
  } catch (error) {
    console.error('[api/command] Command proxy error:', error)
    return res.status(500).json({
      error: 'Failed to submit command',
      message: error.message,
    })
  }
}
