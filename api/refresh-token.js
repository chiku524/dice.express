// Vercel serverless function to refresh Keycloak authentication token
// Uses refresh_token to get a new access token without requiring username/password

module.exports = async function handler(req, res) {
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

  const { refresh_token, clientId = 'Prediction-Market' } = req.body

  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token is required' })
  }

  const keycloakUrl = 'https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet/protocol/openid-connect/token'

  try {
    const formData = new URLSearchParams()
    formData.append('client_id', clientId)
    formData.append('refresh_token', refresh_token)
    formData.append('grant_type', 'refresh_token')

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
        error: data.error_description || data.error || 'Failed to refresh token',
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
      refresh_token: data.refresh_token || refresh_token, // Use new refresh token if provided, otherwise keep old one
      scope: data.scope,
    })
  } catch (error) {
    console.error('[api/refresh-token] Error:', error)
    return res.status(500).json({
      error: 'Failed to refresh token',
      message: error.message,
    })
  }
}
