// Diagnostic endpoint to check party status and domain connection
// This helps diagnose synchronizer issues
export default async function handler(req, res) {
  console.log('[api/party-status] ===== FUNCTION INVOKED =====')
  
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  const LEDGER_URL = process.env.VITE_LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
  const baseUrl = LEDGER_URL.replace(/\/$/, '')
  
  // Get party from query or body
  const party = req.method === 'GET' 
    ? req.query.party 
    : (req.body?.party || req.body?.actAs?.[0])
  
  if (!party) {
    return res.status(400).json({ 
      error: 'Party is required',
      usage: {
        GET: '/api/party-status?party=PARTY_ID',
        POST: '{ "party": "PARTY_ID" }'
      }
    })
  }
  
  console.log('[api/party-status] Checking party:', party)
  
  const diagnostics = {
    party,
    timestamp: new Date().toISOString(),
    checks: {}
  }
  
  // Check 1: Can we query contracts? (This tests read access)
  try {
    console.log('[api/party-status] Test 1: Querying contracts...')
    const queryResponse = await fetch(`${baseUrl}/v2/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify({
        filter: {
          party: party
        },
        templateIds: []
      })
    })
    
    diagnostics.checks.queryAccess = {
      status: queryResponse.status,
      success: queryResponse.ok,
      message: queryResponse.ok 
        ? 'Party can query contracts (read access works)'
        : `Query failed with status ${queryResponse.status}`,
      error: queryResponse.ok ? null : await queryResponse.text().catch(() => 'Unknown error')
    }
    
    console.log('[api/party-status] Query result:', diagnostics.checks.queryAccess)
  } catch (error) {
    diagnostics.checks.queryAccess = {
      status: 'error',
      success: false,
      message: `Query test failed: ${error.message}`,
      error: error.message
    }
  }
  
  // Check 2: Try a minimal command to see the exact error
  try {
    console.log('[api/party-status] Test 2: Testing minimal command...')
    const commandResponse = await fetch(`${baseUrl}/v2/commands/submit-and-wait`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify({
        actAs: [party],
        commandId: `diagnostic-${Date.now()}`,
        applicationId: 'diagnostic',
        commands: [] // Empty commands array to test if party can submit
      })
    })
    
    const responseText = await commandResponse.text()
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { raw: responseText }
    }
    
    diagnostics.checks.commandSubmission = {
      status: commandResponse.status,
      success: commandResponse.ok,
      message: commandResponse.ok
        ? 'Party can submit commands'
        : `Command submission failed with status ${commandResponse.status}`,
      error: responseData,
      errorCode: responseData.code,
      errorCause: responseData.cause
    }
    
    console.log('[api/party-status] Command result:', diagnostics.checks.commandSubmission)
  } catch (error) {
    diagnostics.checks.commandSubmission = {
      status: 'error',
      success: false,
      message: `Command test failed: ${error.message}`,
      error: error.message
    }
  }
  
  // Check 3: Try to get user ID from token and check permissions
  try {
    console.log('[api/party-status] Test 3: Checking user permissions...')
    const authHeader = req.headers.authorization || req.headers.Authorization
    const token = authHeader ? authHeader.replace('Bearer ', '') : null
    
    if (token) {
      // Try to extract user_id from token (JWT)
      try {
        const tokenParts = token.split('.')
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
          const userId = payload.sub || payload.user_id || payload.preferred_username
          
          if (userId) {
            diagnostics.checks.userId = {
              found: true,
              userId: userId,
              note: 'Extracted from JWT token. Use UserManagementService/ListUserRights to verify permissions.'
            }
          }
        }
      } catch (e) {
        // Not a JWT or can't parse
      }
    }
    
    diagnostics.checks.permissions = {
      note: 'Permissions should be checked via UserManagementService/ListUserRights (gRPC)',
      recommendation: 'Client confirmed party has both actAs and readAs permissions. Issue is synchronizer configuration, not permissions.'
    }
  } catch (error) {
    diagnostics.checks.permissions = {
      success: false,
      message: `Permission check failed: ${error.message}`
    }
  }
  
  // Check 4: Try to get party info (if endpoint exists)
  try {
    console.log('[api/party-status] Test 4: Checking for party info endpoint...')
    const infoEndpoints = [
      `${baseUrl}/v2/parties/${encodeURIComponent(party)}`,
      `${baseUrl}/v1/parties/${encodeURIComponent(party)}`,
      `${baseUrl}/parties/${encodeURIComponent(party)}`
    ]
    
    for (const endpoint of infoEndpoints) {
      try {
        const infoResponse = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': req.headers.authorization || ''
          }
        })
        
        if (infoResponse.ok) {
          const infoData = await infoResponse.json()
          diagnostics.checks.partyInfo = {
            success: true,
            endpoint,
            data: infoData
          }
          break
        }
      } catch (e) {
        // Try next endpoint
      }
    }
    
    if (!diagnostics.checks.partyInfo) {
      diagnostics.checks.partyInfo = {
        success: false,
        message: 'No party info endpoint found'
      }
    }
  } catch (error) {
    diagnostics.checks.partyInfo = {
      success: false,
      message: `Party info check failed: ${error.message}`
    }
  }
  
  // Summary
  diagnostics.summary = {
    canRead: diagnostics.checks.queryAccess?.success || false,
    canWrite: diagnostics.checks.commandSubmission?.success || false,
    synchronizerIssue: diagnostics.checks.commandSubmission?.errorCode === 'NO_SYNCHRONIZER_FOR_SUBMISSION',
    permissionsConfirmed: diagnostics.checks.permissions?.note?.includes('Client confirmed'),
    recommendation: diagnostics.checks.commandSubmission?.errorCode === 'NO_SYNCHRONIZER_FOR_SUBMISSION'
      ? diagnostics.checks.permissions?.note?.includes('Client confirmed')
        ? 'Party has actAs and readAs permissions confirmed. Issue is synchronizer/domain connection configuration (requires admin action).'
        : 'Party needs to be connected to a domain with synchronizer enabled (requires admin action)'
      : diagnostics.checks.commandSubmission?.success
      ? 'Party appears to be properly configured'
      : 'Unknown issue - check error details'
  }
  
  return res.status(200).json(diagnostics)
}

