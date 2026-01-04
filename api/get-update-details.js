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
    // Try /v2/updates endpoint first - this should have record_time
    const updatesEndpoint = `${baseUrl}/v2/updates`
    
    console.log('[api/get-update-details] Querying /v2/updates for updateId:', updateId)
    
    // Try different Content-Type headers
    const contentTypeOptions = [
      'application/json; charset=utf-8',
      'application/json',
      'application/grpc-web+json',
      'application/grpc-web',
    ]
    
    let updatesResponse = null
    let recordTime = null
    
    for (const contentType of contentTypeOptions) {
      try {
        updatesResponse = await fetch(`${updatesEndpoint}?updateId=${encodeURIComponent(updateId)}`, {
          method: 'GET',
          headers: {
            'Content-Type': contentType,
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        })
        
        if (updatesResponse.ok) {
          const updatesData = await updatesResponse.json()
          console.log('[api/get-update-details] Updates response:', JSON.stringify(updatesData).substring(0, 1000))
          
          // Extract record_time from updates response
          recordTime = updatesData.recordTime ||
                      updatesData.record_time ||
                      updatesData.verdict?.recordTime ||
                      updatesData.verdict?.record_time ||
                      updatesData.update?.recordTime ||
                      updatesData.update?.record_time
          
          if (recordTime) {
            console.log('[api/get-update-details] ✅ Found record_time from /v2/updates:', recordTime)
            return res.status(200).json({
              updateId,
              recordTime,
              completionOffset
            })
          }
          break
        } else if (updatesResponse.status !== 415) {
          break // Non-415 error means Content-Type worked but endpoint failed
        }
      } catch (error) {
        console.log(`[api/get-update-details] Error with Content-Type ${contentType}:`, error.message)
        continue
      }
    }
    
    // Fallback: Query completions endpoint
    const completionsEndpoint = `${baseUrl}/v2/commands/completions`
    const completionsBody = {
      applicationId,
      parties: party ? [party] : [],
      offset: completionOffset ? completionOffset.toString() : '0'
    }

    console.log('[api/get-update-details] Falling back to completions endpoint')
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
          recordTime = matchingCompletion.recordTime ||
                       matchingCompletion.record_time ||
                       matchingCompletion.completion?.recordTime ||
                       matchingCompletion.completion?.record_time ||
                       matchingCompletion.timestamp ||
                       matchingCompletion.completion?.timestamp
          
          if (recordTime) {
            console.log('[api/get-update-details] ✅ Found record_time from completions:', recordTime)
            return res.status(200).json({
              updateId,
              recordTime,
              completionOffset: matchingCompletion.completionOffset || matchingCompletion.completion_offset || completionOffset
            })
          }
        }
      }
    }

    // If we can't get record_time, return updateId with a note
    console.log('[api/get-update-details] ⚠️ Could not find record_time in updates or completions')
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