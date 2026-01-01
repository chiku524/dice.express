// Vercel serverless function to get update details including record_time
// This helps us build the correct explorer URL

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
    // Query completions endpoint to get update details
    // The completions endpoint should return record_time for the update
    const completionsEndpoint = `${baseUrl}/v2/commands/completions`
    
    const completionsBody = {
      applicationId,
      parties: party ? [party] : [],
      offset: completionOffset ? completionOffset.toString() : '0'
    }

    console.log('[api/get-update-details] Querying completions for updateId:', updateId)
    console.log('[api/get-update-details] Request body:', JSON.stringify(completionsBody, null, 2))

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
      console.log('[api/get-update-details] Completions response:', JSON.stringify(completionsData).substring(0, 1000))
      
      // Look for the updateId in completions
      if (Array.isArray(completionsData)) {
        const matchingCompletion = completionsData.find(c => 
          c.updateId === updateId || 
          c.update_id === updateId ||
          c.completion?.updateId === updateId ||
          c.completion?.update_id === updateId
        )
        
        if (matchingCompletion) {
          // Extract record_time from completion
          const recordTime = matchingCompletion.recordTime ||
                           matchingCompletion.record_time ||
                           matchingCompletion.completion?.recordTime ||
                           matchingCompletion.completion?.record_time ||
                           matchingCompletion.timestamp ||
                           matchingCompletion.completion?.timestamp
          
          if (recordTime) {
            console.log('[api/get-update-details] ✅ Found record_time:', recordTime)
            return res.status(200).json({
              updateId,
              recordTime,
              completionOffset: matchingCompletion.completionOffset || matchingCompletion.completion_offset || completionOffset
            })
          }
        }
      }
    }

    // If we can't get record_time from completions, return updateId with a note
    // The frontend can try to construct the URL using the updateId alone or wait and retry
    console.log('[api/get-update-details] ⚠️ Could not find record_time in completions')
    return res.status(200).json({
      updateId,
      completionOffset,
      message: 'Could not retrieve record_time. The explorer URL may need to be constructed differently.',
      note: 'Try using the updateId directly in the explorer, or wait a moment and query again.'
    })
  } catch (error) {
    console.error('[api/get-update-details] Error:', error)
    return res.status(500).json({
      error: 'Failed to get update details',
      message: error.message
    })
  }
}