/**
 * Script to verify the deployed DAR package is available on Canton
 * Uses Canton JSON API to query for packages
 */

const LEDGER_URL = process.env.LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'
const PACKAGE_ID = 'b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0'

async function verifyPackage() {
  console.log('==========================================')
  console.log('Verify Deployed Package on Canton')
  console.log('==========================================')
  console.log('')
  console.log(`Package ID: ${PACKAGE_ID}`)
  console.log(`Ledger URL: ${LEDGER_URL}`)
  console.log('')

  try {
    // Try to query packages endpoint
    // Canton JSON API v2 uses /v2/packages or /v2/package/list
    const possibleEndpoints = [
      `${LEDGER_URL}/v2/packages`,
      `${LEDGER_URL}/v1/packages`,
      `${LEDGER_URL}/packages`,
    ]

    let packageFound = false
    let lastError = null

    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`)
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        })

        console.log(`Response status: ${response.status}`)

        if (response.ok) {
          const data = await response.json()
          console.log('Packages response:', JSON.stringify(data, null, 2))

          // Check if our package ID is in the list
          if (data.packages && Array.isArray(data.packages)) {
            const found = data.packages.find(pkg => pkg === PACKAGE_ID || pkg.packageId === PACKAGE_ID)
            if (found) {
              console.log('')
              console.log('✅ SUCCESS: Package found on ledger!')
              packageFound = true
              break
            }
          } else if (data.packageIds && Array.isArray(data.packageIds)) {
            const found = data.packageIds.includes(PACKAGE_ID)
            if (found) {
              console.log('')
              console.log('✅ SUCCESS: Package found on ledger!')
              packageFound = true
              break
            }
          }
        } else {
          const errorText = await response.text()
          console.log(`Endpoint returned ${response.status}: ${errorText.substring(0, 200)}`)
          lastError = { endpoint, status: response.status, error: errorText }
        }
      } catch (error) {
        console.log(`Error with endpoint ${endpoint}: ${error.message}`)
        lastError = { endpoint, error: error.message }
      }
    }

    if (!packageFound) {
      console.log('')
      console.log('⚠️  WARNING: Could not verify package via packages endpoint')
      console.log('This might be normal if the packages endpoint is not available')
      console.log('We can still try to verify by attempting to create a contract')
      console.log('')
      console.log('Last error:', lastError)
    }

    // Alternative: Try to query for a template from our package
    console.log('')
    console.log('Alternative: Querying for templates from our package...')
    try {
      const queryEndpoint = `${LEDGER_URL}/v2/query`
      const queryResponse = await fetch(queryEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          templateIds: ['PredictionMarkets:MarketConfig'],
          query: {},
        }),
      })

      console.log(`Query response status: ${queryResponse.status}`)
      if (queryResponse.ok) {
        const queryData = await queryResponse.json()
        console.log('Query response:', JSON.stringify(queryData, null, 2))
        console.log('')
        console.log('✅ Package appears to be available (template query succeeded)')
      } else {
        const errorText = await queryResponse.text()
        console.log(`Query failed: ${errorText.substring(0, 200)}`)
      }
    } catch (error) {
      console.log(`Query error: ${error.message}`)
    }

  } catch (error) {
    console.error('ERROR:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the verification
verifyPackage()
  .then(() => {
    console.log('')
    console.log('Verification complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

