// Vercel serverless function to proxy Canton JSON API commands
// Located at project root /api/ directory (Vercel requirement)

// Disable body parsing - we'll handle it manually to avoid "Body has already been read" errors
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

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

  // Parse body manually to avoid "Body has already been read" error
  let requestBody
  try {
    // Vercel automatically parses JSON, but we'll be safe and handle it
    if (typeof req.body === 'string') {
      requestBody = JSON.parse(req.body)
    } else if (req.body && typeof req.body === 'object') {
      // Already parsed by Vercel
      requestBody = req.body
    } else {
      // Read from stream if needed (shouldn't happen in Vercel)
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const bodyString = Buffer.concat(chunks).toString()
      requestBody = JSON.parse(bodyString)
    }
  } catch (parseError) {
    console.error('[api/command] Error parsing body:', parseError)
    return res.status(400).json({ error: 'Invalid JSON in request body', details: parseError.message })
  }

  if (!requestBody) {
    return res.status(400).json({ error: 'Request body is required' })
  }

  // Check Content-Type
  const contentType = req.headers['content-type'] || req.headers['Content-Type']
  if (contentType && !contentType.includes('application/json')) {
    console.warn('[api/command] Unexpected Content-Type:', contentType)
  }

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

        response = await fetch(commandUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(bodyToSend),
          redirect: 'follow',
        })

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
      return res.status(response.status).json({
        error: userMessage,
        details: data,
        endpoint: usedEndpoint
      })
    }

    return res.status(200).json(data)
  } catch (error) {
    console.error('[api/command] Command proxy error:', error)
    return res.status(500).json({
      error: 'Failed to submit command',
      message: error.message,
    })
  }
}
