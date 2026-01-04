// Vercel serverless function to get actual contract ID from updateId
// This helps resolve updateId:... to actual contract IDs for exercising choices

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

  const { updateId, templateId, party, applicationId = 'prediction-markets' } = req.body

  if (!updateId) {
    return res.status(400).json({ error: 'updateId is required' })
  }

  const LEDGER_URL = process.env.VITE_LEDGER_URL || process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
  const baseUrl = LEDGER_URL.replace(/\/$/, '')
  
  // Extract token from Authorization header or request body
  const authHeader = req.headers.authorization || req.headers.Authorization
  let token = authHeader ? authHeader.replace('Bearer ', '') : (req.body.token || null)

  try {
    // Query active-contracts to find the contract created by this updateId
    // We'll query for the template and filter by party, then try to match by timing
    const activeContractsEndpoint = `${baseUrl}/v2/state/active-contracts`
    
    if (!templateId || !party) {
      return res.status(400).json({ 
        error: 'templateId and party are required to find contract',
        message: 'Cannot query for contract without template ID and party'
      })
    }

    const filter = {
      filtersByParty: {
        [party]: {
          inclusive: {
            templateIds: [templateId]
          }
        }
      }
    }

    const requestBody = {
      filter: filter,
      activeAtOffset: 0
    }

    console.log('[api/get-contract-id-from-update] Querying active-contracts for updateId:', updateId)
    console.log('[api/get-contract-id-from-update] Request body:', JSON.stringify(requestBody, null, 2))

    // Try different Content-Type headers - Canton might be picky
    const contentTypeOptions = [
      'application/json; charset=utf-8',
      'application/json',
      'application/grpc-web+json',
      'application/grpc-web',
    ]
    
    let response = null
    let lastError = null
    
    for (const contentType of contentTypeOptions) {
      try {
        console.log(`[api/get-contract-id-from-update] Trying Content-Type: ${contentType}`)
        response = await fetch(activeContractsEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': contentType,
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify(requestBody),
        })
        
        // If we get a non-415 error, this Content-Type worked
        if (response.status !== 415) {
          console.log(`[api/get-contract-id-from-update] ✅ Content-Type ${contentType} worked (status: ${response.status})`)
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
    
    if (!response) {
      return res.status(500).json({
        error: 'Failed to query active-contracts endpoint',
        message: 'Could not find a supported Content-Type',
        lastError: lastError
      })
    }

    if (response.ok) {
      const contractsData = await response.json()
      console.log('[api/get-contract-id-from-update] Active contracts response:', JSON.stringify(contractsData).substring(0, 1000))
      
      // Look through contracts to find one that might match
      // Since we can't directly match by updateId, we'll return the most recent contract
      // This is a best-effort approach - the contract might not be synchronized yet
      if (Array.isArray(contractsData) && contractsData.length > 0) {
        // Return the most recent contract (first in array, assuming sorted by creation time)
        const contract = contractsData[0]
        const contractId = contract.createdEvent?.contractId || 
                          contract.contractId || 
                          contract.contract_id
        
        if (contractId) {
          console.log('[api/get-contract-id-from-update] ✅ Found contract ID:', contractId)
          return res.status(200).json({
            updateId,
            contractId,
            note: 'This is the most recent contract. If it does not match your updateId, the contract may not be synchronized yet. Please wait a few seconds and try again.'
          })
        }
      }
      
      console.log('[api/get-contract-id-from-update] ⚠️ No contracts found for this template/party')
      return res.status(200).json({
        updateId,
        contractId: null,
        message: 'Contract not found on blockchain yet. It may not be synchronized. Please wait a few seconds and try again.'
      })
    } else {
      const errorText = await response.text()
      console.error('[api/get-contract-id-from-update] Error response:', errorText)
      return res.status(response.status).json({
        error: 'Failed to query active contracts',
        message: errorText.substring(0, 500),
        status: response.status
      })
    }
  } catch (error) {
    console.error('[api/get-contract-id-from-update] Error:', error)
    return res.status(500).json({
      error: 'Failed to get contract ID from updateId',
      message: error.message
    })
  }
}