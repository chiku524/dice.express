// Vercel serverless function to get contract ID from updateId
// Uses /v2/commands/completions to find the contract created by an updateId

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
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
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { updateId, completionOffset, party, applicationId = 'prediction-markets' } = req.body

  if (!updateId) {
    return res.status(400).json({ error: 'updateId is required' })
  }

  const LEDGER_URL = process.env.VITE_LEDGER_URL || process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
  const baseUrl = LEDGER_URL.replace(/\/$/, '')
  
  // Extract token from Authorization header or request body
  const authHeader = req.headers.authorization || req.headers.Authorization
  let token = authHeader ? authHeader.replace('Bearer ', '') : (req.body.token || null)

  try {
    // Try to get contract from completions endpoint
    // This might not work directly, but it's worth trying
    const completionsEndpoint = `${baseUrl}/v2/commands/completions`
    
    const completionsBody = {
      applicationId,
      parties: party ? [party] : [],
      offset: completionOffset ? completionOffset.toString() : '0'
    }

    console.log('[api/get-contract-from-update] Querying completions:', completionsEndpoint)
    console.log('[api/get-contract-from-update] Request body:', JSON.stringify(completionsBody, null, 2))

    const completionsResponse = await fetch(completionsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(completionsBody),
    })

    if (completionsResponse.ok) {
      const completionsData = await completionsResponse.json()
      console.log('[api/get-contract-from-update] Completions response:', JSON.stringify(completionsData).substring(0, 500))
      
      // Look for the updateId in completions
      if (Array.isArray(completionsData)) {
        const matchingCompletion = completionsData.find(c => c.updateId === updateId)
        if (matchingCompletion && matchingCompletion.completion) {
          // Try to extract contract ID from completion
          const contractId = matchingCompletion.completion?.created?.[0]?.contractId ||
                           matchingCompletion.completion?.created?.[0]?.contract_id
          if (contractId) {
            return res.status(200).json({ contractId, updateId })
          }
        }
      }
    }

    // If completions doesn't work, return the updateId and suggest waiting
    return res.status(200).json({
      updateId,
      completionOffset,
      message: 'Contract is being processed. Use the updateId to query the contract after synchronization.',
      note: 'The contract may take a few seconds to appear in active-contracts queries. Try querying again after a short delay.'
    })
  } catch (error) {
    console.error('[api/get-contract-from-update] Error:', error)
    return res.status(500).json({
      error: 'Failed to get contract from updateId',
      message: error.message
    })
  }
}
