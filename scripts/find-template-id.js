/**
 * Find the correct template ID format by checking deployed packages
 */

const fs = require('fs')

const LEDGER_URL = process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'

// Load token
let authToken = null
try {
  if (fs.existsSync('token.txt')) {
    authToken = fs.readFileSync('token.txt', 'utf8').trim()
  } else if (fs.existsSync('token.json')) {
    const tokenData = JSON.parse(fs.readFileSync('token.json', 'utf8'))
    authToken = tokenData.access_token
  }
} catch (error) {
  console.error('Error loading token:', error.message)
  process.exit(1)
}

if (!authToken) {
  console.error('No token found')
  process.exit(1)
}

console.log('==========================================')
console.log('Find Template ID Format')
console.log('==========================================')
console.log('')

/**
 * Get package IDs
 */
async function getPackages() {
  try {
    const response = await fetch(`${LEDGER_URL}/v2/packages`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.packageIds || []
    }
  } catch (error) {
    console.error('Error getting packages:', error.message)
  }
  return []
}

/**
 * Try template ID formats with different package hashes
 */
async function tryTemplateFormats(packageIds) {
  const templateFormats = [
    'Token:TokenBalance',
    'Token:TokenBalance:prediction-markets',
  ]
  
  // Add formats with package hashes
  if (packageIds.length > 0) {
    // Try with the most recent package (likely ours)
    const latestPackage = packageIds[packageIds.length - 1]
    templateFormats.push(`Token:TokenBalance:${latestPackage}`)
    templateFormats.push(`Token:TokenBalance:${latestPackage.substring(0, 8)}`)
    
    // Try with a few other packages
    for (let i = 0; i < Math.min(3, packageIds.length); i++) {
      templateFormats.push(`Token:TokenBalance:${packageIds[i]}`)
    }
  }
  
  console.log('Trying template ID formats:')
  templateFormats.forEach((fmt, i) => console.log(`  ${i + 1}. ${fmt}`))
  console.log('')
  
  const PARTY = process.env.PARTY || 'nico'
  
  for (const templateId of templateFormats) {
    console.log(`Testing template ID: "${templateId}"`)
    
    const command = {
      actAs: [PARTY],
      commandId: `test-${Date.now()}`,
      applicationId: 'prediction-markets',
      commands: [
        {
          CreateCommand: {
            templateId: templateId,
            createArguments: {
              owner: PARTY,
              token: {
                id: 'USDC',
                symbol: 'USDC',
                name: 'USD Coin',
                decimals: 6,
                description: 'Test',
              },
              amount: 1000.0,
            },
          },
        },
      ],
    }
    
    try {
      const response = await fetch(`${LEDGER_URL}/v2/commands/submit-and-wait`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(command),
      })
      
      const contentType = response.headers.get('content-type')
      let data = null
      let text = null
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json()
        } catch (e) {
          text = await response.text()
        }
      } else {
        text = await response.text()
      }
      
      console.log(`  Status: ${response.status}`)
      
      if (response.ok) {
        console.log(`  ✅ SUCCESS! Template ID format is correct!`)
        if (data) {
          console.log(`  Response:`, JSON.stringify(data, null, 2).substring(0, 500))
        }
        console.log('')
        return { success: true, templateId, data }
      } else if (response.status === 400) {
        // Check if it's a different error (not just "Invalid value for: body")
        const errorMsg = (data ? JSON.stringify(data) : text) || ''
        if (!errorMsg.includes('Invalid value for: body')) {
          console.log(`  ⚠️  Different error (progress!): ${errorMsg.substring(0, 200)}`)
        } else {
          console.log(`  ❌ Still format error`)
        }
      } else {
        console.log(`  ⚠️  Status: ${response.status}`)
        if (data) {
          console.log(`  Error: ${JSON.stringify(data).substring(0, 200)}`)
        }
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
    }
    console.log('')
    
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  return { success: false }
}

async function main() {
  // Get packages
  console.log('Getting deployed packages...')
  const packageIds = await getPackages()
  console.log(`Found ${packageIds.length} packages`)
  if (packageIds.length > 0) {
    console.log('Latest packages:')
    packageIds.slice(-5).forEach((pkg, i) => {
      console.log(`  ${packageIds.length - 4 + i}. ${pkg.substring(0, 16)}...`)
    })
  }
  console.log('')
  
  // Try template formats
  const result = await tryTemplateFormats(packageIds)
  
  console.log('==========================================')
  if (result.success) {
    console.log(`✅ Found working template ID: "${result.templateId}"`)
    console.log('')
    console.log('Update your scripts to use this template ID:')
    console.log(`  templateId: "${result.templateId}"`)
  } else {
    console.log('❌ Could not find working template ID format')
    console.log('')
    console.log('The issue might be:')
    console.log('  1. Template ID needs different format')
    console.log('  2. Party needs to be allocated first')
    console.log('  3. Request body structure is still wrong')
    console.log('')
    console.log('Please check:')
    console.log('  - What party ID was assigned in wallet UI?')
    console.log('  - Canton JSON API documentation for exact format')
  }
  console.log('==========================================')
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })

