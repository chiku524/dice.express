// Health check endpoint for API routes
module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  return res.status(200).json({ 
    status: 'ok',
    message: 'API routes are working',
    timestamp: new Date().toISOString()
  })
}

