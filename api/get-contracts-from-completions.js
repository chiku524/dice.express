// Vercel serverless function to get contracts from completions endpoint
// This can help find contracts that were created with updateId but aren't yet in active-contracts

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

  const { party, applicationId = 'prediction-markets', offset = '0', templateId } = req.body

  if (!party) {
    return res.status(400).json({ error: 'party is required' })
  }

  const LEDGER_URL = process.env.VITE_LEDGER_URL || process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
  const baseUrl = LEDGER_URL.replace(/\/$/, '')
  
  // Extract token from Authorization header or request body
  const authHeader = req.headers.authorization || req.headers.Authorization
  let token = authHeader ? authHeader.replace('Bearer ', '') : (req.body.token || null)

  try {
    // Query completions endpoint to find contracts
    const completionsEndpoint = `${baseUrl}/v2/commands/completions`
    
    const completionsBody = {
      applicationId,
      parties: [party],
      offset: offset.toString()
    }

    console.log('[api/get-contracts-from-completions] Querying completions:', completionsEndpoint)
    console.log('[api/get-contracts-from-completions] Request body:', JSON.stringify(completionsBody, null, 2))

    const completionsResponse = await fetch(completionsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(completionsBody),
    })

    if (!completionsResponse.ok) {
      const errorText = await completionsResponse.text()
      console.error('[api/get-contracts-from-completions] Error response:', errorText)
      return res.status(completionsResponse.status).json({
        error: 'Failed to query completions',
        message: errorText.substring(0, 500),
        status: completionsResponse.status
      })
    }

    const completionsData = await completionsResponse.json()
    console.log('[api/get-contracts-from-completions] Completions response:', JSON.stringify(completionsData).substring(0, 1000))
    
    // Extract contracts from completions
    const contracts = []
    
    if (Array.isArray(completionsData)) {
      for (const completion of completionsData) {
        // Look for created contracts in the completion
        const createdContracts = completion.completion?.created || 
                                completion.completion?.events?.filter(e => e.created) ||
                                []
        
        for (const created of createdContracts) {
          const contract = created.created || created
          const contractTemplateId = contract.templateId || contract.template_id
          
          // Filter by template ID if provided
          if (templateId && contractTemplateId !== templateId) {
            continue
          }
          
          // Extract contract details
          const contractData = {
            contractId: contract.contractId || contract.contract_id,
            templateId: contractTemplateId,
            payload: contract.createArguments || contract.arguments || contract.payload || {},
            updateId: completion.updateId || completion.update_id,
            completionOffset: completion.offset || offset,
            _fromCompletions: true
          }
          
          if (contractData.contractId) {
            contracts.push(contractData)
          }
        }
      }
    }

    console.log(`[api/get-contracts-from-completions] ✅ Found ${contracts.length} contracts from completions`)

    return res.status(200).json({
      success: true,
      contracts: contracts,
      count: contracts.length,
      source: 'completions'
    })
  } catch (error) {
    console.error('[api/get-contracts-from-completions] Error:', error)
    return res.status(500).json({
      error: 'Failed to get contracts from completions',
      message: error.message
    })
  }
}