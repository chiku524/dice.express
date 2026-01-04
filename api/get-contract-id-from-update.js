// Vercel serverless function to get actual contract ID from updateId
// This helps resolve updateId:... to actual contract IDs for exercising choices
// Uses /v2/commands/completions endpoint to find the contract created by an updateId

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

  const { updateId, templateId, party, applicationId = 'prediction-markets', completionOffset } = req.body

  if (!updateId) {
    return res.status(400).json({ error: 'updateId is required' })
  }

  const LEDGER_URL = process.env.VITE_LEDGER_URL || process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
  
  // Ensure /json-api is in the URL
  let baseUrl = LEDGER_URL.replace(/\/$/, '')
  if (!baseUrl.includes('/json-api')) {
    baseUrl = baseUrl.replace(/\/$/, '') + '/json-api'
  }
  
  // Extract token from Authorization header or request body
  const authHeader = req.headers.authorization || req.headers.Authorization
  let token = authHeader ? authHeader.replace('Bearer ', '') : (req.body.token || null)

  try {
    // Strategy: Use /v2/commands/completions to find the completion with this updateId
    // The completions endpoint returns completions that include updateId, so we can match directly
    const completionsEndpoint = `${baseUrl}/v2/commands/completions`
    
    if (!party) {
      return res.status(400).json({ 
        error: 'party is required to query completions',
        message: 'Cannot query for contract without party'
      })
    }

    // Build request body for completions endpoint
    // Query from offset 0 to find all completions, then filter by updateId
    const completionsBody = {
      applicationId,
      parties: [party],
      offset: completionOffset ? completionOffset.toString() : '0'
    }

    console.log('[api/get-contract-id-from-update] Querying completions for updateId:', updateId)
    console.log('[api/get-contract-id-from-update] Request body:', JSON.stringify(completionsBody, null, 2))

    // Try different Content-Type headers - Canton might be picky
    const contentTypeOptions = [
      'application/json; charset=utf-8',
      'application/json',
      'application/grpc-web+json',
      'application/grpc-web',
    ]
    
    let completionsResponse = null
    let lastError = null
    
    for (const contentType of contentTypeOptions) {
      try {
        console.log(`[api/get-contract-id-from-update] Trying Content-Type: ${contentType}`)
        completionsResponse = await fetch(completionsEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': contentType,
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify(completionsBody),
        })
        
        // If we get a non-415 error, this Content-Type worked
        if (completionsResponse.status !== 415) {
          console.log(`[api/get-contract-id-from-update] ✅ Content-Type ${contentType} worked (status: ${completionsResponse.status})`)
          break
        }
        
        lastError = { contentType, status: 415 }
        console.log(`[api/get-contract-id-from-update] ⚠️ Content-Type ${contentType} returned 415, trying next...`)
      } catch (error) {
        lastError = { contentType, error: error.message }
        console.log(`[api/get-contract-id-from-update] ⚠️ Error with Content-Type ${contentType}:`, error.message)
        continue
      }
    }
    
    if (!completionsResponse) {
      return res.status(500).json({
        error: 'Failed to query completions endpoint',
        message: 'Could not find a supported Content-Type',
        lastError: lastError
      })
    }

    if (!completionsResponse.ok) {
      const errorText = await completionsResponse.text()
      console.error('[api/get-contract-id-from-update] Error response:', errorText)
      return res.status(completionsResponse.status).json({
        error: 'Failed to query completions',
        message: errorText.substring(0, 500),
        status: completionsResponse.status
      })
    }

    const completionsData = await completionsResponse.json()
    console.log('[api/get-contract-id-from-update] Completions response (first 1000 chars):', JSON.stringify(completionsData).substring(0, 1000))
    
    // Look for the completion that matches this updateId
    if (Array.isArray(completionsData)) {
      const matchingCompletion = completionsData.find(c => 
        c.updateId === updateId || 
        c.update_id === updateId ||
        (c.completion && (c.completion.updateId === updateId || c.completion.update_id === updateId))
      )
      
      if (matchingCompletion && matchingCompletion.completion) {
        // Extract contract ID from the completion's created contracts
        const createdContracts = matchingCompletion.completion?.created || 
                                matchingCompletion.completion?.events?.filter(e => e.created) ||
                                []
        
        // Filter by template ID if provided
        for (const created of createdContracts) {
          const contract = created.created || created
          const contractTemplateId = contract.templateId || contract.template_id
          
          // If template ID is provided, make sure it matches
          if (templateId && contractTemplateId !== templateId) {
            continue
          }
          
          const contractId = contract.contractId || contract.contract_id
          if (contractId) {
            console.log('[api/get-contract-id-from-update] ✅ Found contract ID:', contractId)
            return res.status(200).json({
              updateId,
              contractId,
              templateId: contractTemplateId
            })
          }
        }
        
        // If no template filter, return the first contract
        if (createdContracts.length > 0) {
          const firstContract = createdContracts[0].created || createdContracts[0]
          const contractId = firstContract.contractId || firstContract.contract_id
          if (contractId) {
            console.log('[api/get-contract-id-from-update] ✅ Found contract ID (first match):', contractId)
            return res.status(200).json({
              updateId,
              contractId,
              templateId: firstContract.templateId || firstContract.template_id
            })
          }
        }
      }
    }
    
    console.log('[api/get-contract-id-from-update] ⚠️ No matching completion found for updateId:', updateId)
    return res.status(404).json({
      updateId,
      contractId: null,
      message: 'Contract not found in completions. It may not be synchronized yet. Please wait 10-30 seconds and try again.',
      hint: 'Contracts created with updateId can take time to appear in the completions endpoint. Try refreshing the Admin Dashboard after waiting.'
    })
  } catch (error) {
    console.error('[api/get-contract-id-from-update] Error:', error)
    return res.status(500).json({
      error: 'Failed to get contract ID from updateId',
      message: error.message
    })
  }
}
