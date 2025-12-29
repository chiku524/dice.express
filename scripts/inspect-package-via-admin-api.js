/**
 * Use Admin API (gRPC) to inspect the deployed package
 * This might reveal template ID format
 */

const { execSync } = require('child_process')
const fs = require('fs')

const LEDGER_HOST = 'participant.dev.canton.wolfedgelabs.com'
const LEDGER_PORT = 443
const PACKAGE_ID = 'b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0'

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
console.log('Inspect Package via Admin API')
console.log('==========================================')
console.log(`Package ID: ${PACKAGE_ID}`)
console.log('')

// Check if grpcurl is available
let grpcurlAvailable = false
try {
  execSync('grpcurl --version', { stdio: 'ignore' })
  grpcurlAvailable = true
  console.log('✅ grpcurl found')
} catch {
  console.log('❌ grpcurl not found')
  console.log('')
  console.log('Please install grpcurl to use this script:')
  console.log('  Windows: choco install grpcurl')
  console.log('  Or download from: https://github.com/fullstorydev/grpcurl/releases')
  process.exit(1)
}

console.log('')

/**
 * List all packages
 */
async function listPackages() {
  console.log('--- Step 1: List All Packages ---')
  console.log('')
  
  try {
    const cmd = `grpcurl -H "Authorization: Bearer ${authToken}" ${LEDGER_HOST}:${LEDGER_PORT} list`
    console.log(`Command: ${cmd}`)
    console.log('')
    
    const output = execSync(cmd, { encoding: 'utf8' })
    console.log('Available services:')
    console.log(output)
    
    // Check for PackageService
    if (output.includes('PackageService')) {
      console.log('✅ PackageService found!')
    }
  } catch (error) {
    console.log(`Error: ${error.message}`)
  }
  console.log('')
}

/**
 * Try to get package details
 */
async function getPackageDetails() {
  console.log('--- Step 2: Get Package Details ---')
  console.log('')
  
  const service = 'com.digitalasset.canton.admin.participant.v30.PackageService'
  
  // Try different methods
  const methods = [
    'ListPackages',
    'GetPackage',
    'GetPackageStatus',
  ]
  
  for (const method of methods) {
    try {
      console.log(`Trying: ${service}/${method}`)
      
      // For methods that need input, we'll try with package ID
      let cmd
      if (method === 'GetPackage' || method === 'GetPackageStatus') {
        const input = JSON.stringify({ packageId: PACKAGE_ID })
        cmd = `grpcurl -H "Authorization: Bearer ${authToken}" -d '${input}' ${LEDGER_HOST}:${LEDGER_PORT} ${service}/${method}`
      } else {
        cmd = `grpcurl -H "Authorization: Bearer ${authToken}" ${LEDGER_HOST}:${LEDGER_PORT} ${service}/${method}`
      }
      
      console.log(`Command: ${cmd.substring(0, 200)}...`)
      
      const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
      console.log('✅ Success!')
      console.log('')
      console.log('Output:')
      console.log(output.substring(0, 2000))
      
      // Check if output contains template information
      if (output.includes('Token') || output.includes('TokenBalance') || output.includes('template')) {
        console.log('')
        console.log('✅ Found template-related information!')
        console.log('Check the output above for template ID format')
      }
      
      return output
    } catch (error) {
      console.log(`❌ Failed: ${error.message.substring(0, 200)}`)
    }
    console.log('')
  }
  
  return null
}

/**
 * Describe the service to see available methods
 */
async function describeService() {
  console.log('--- Step 3: Describe PackageService ---')
  console.log('')
  
  const service = 'com.digitalasset.canton.admin.participant.v30.PackageService'
  
  try {
    const cmd = `grpcurl -H "Authorization: Bearer ${authToken}" ${LEDGER_HOST}:${LEDGER_PORT} describe ${service}`
    console.log(`Command: ${cmd}`)
    console.log('')
    
    const output = execSync(cmd, { encoding: 'utf8' })
    console.log('Service description:')
    console.log(output)
    
    return output
  } catch (error) {
    console.log(`Error: ${error.message}`)
    return null
  }
}

async function main() {
  await listPackages()
  await describeService()
  await getPackageDetails()
  
  console.log('')
  console.log('==========================================')
  console.log('Summary')
  console.log('==========================================')
  console.log('')
  console.log('If template information was found above,')
  console.log('use that format for the template ID.')
  console.log('')
  console.log('Otherwise, we still need to wait for')
  console.log('client response with the correct format.')
  console.log('')
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })

