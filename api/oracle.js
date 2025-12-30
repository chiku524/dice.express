// Vercel serverless function to proxy RedStone Oracle API requests
// Located at project root /api/ directory (Vercel requirement)
module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { symbol } = req.query

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol parameter is required' })
  }

  try {
    const response = await fetch(`https://api.redstone.finance/prices?symbol=${encodeURIComponent(symbol)}&provider=redstone`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`RedStone API returned ${response.status}`)
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (error) {
    console.error('Oracle proxy error:', error)
    return res.status(500).json({ 
      error: 'Failed to fetch oracle data',
      message: error.message 
    })
  }
}
