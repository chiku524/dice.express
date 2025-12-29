// Vercel serverless function to get Keycloak authentication token
// Proxies the request to avoid CORS issues

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { username, password, clientId = 'Prediction-Market' } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  const keycloakUrl = 'https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet/protocol/openid-connect/token'

  try {
    const formData = new URLSearchParams()
    formData.append('client_id', clientId)
    formData.append('username', username)
    formData.append('password', password)
    formData.append('grant_type', 'password')

    const response = await fetch(keycloakUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error_description || data.error || 'Failed to get token',
        details: data,
      })
    }

    if (!data.access_token) {
      return res.status(500).json({
        error: 'No access_token in response',
        details: data,
      })
    }

    // Return token and full response
    return res.status(200).json({
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      refresh_token: data.refresh_token,
      scope: data.scope,
    })
  } catch (error) {
    console.error('[api/get-token] Error:', error)
    return res.status(500).json({
      error: 'Failed to get token',
      message: error.message,
    })
  }
}

