/**
 * Compatibility Checker Script
 * Verifies SDK versions, API versions, and dependencies are compatible
 */

const fs = require('fs')
const path = require('path')

console.log('==========================================')
console.log('Daml Compatibility Checker')
console.log('==========================================')
console.log('')

// Read daml.yaml
let damlYaml = null
try {
  const yamlPath = path.join(process.cwd(), 'daml.yaml')
  if (fs.existsSync(yamlPath)) {
    const yamlContent = fs.readFileSync(yamlPath, 'utf8')
    damlYaml = yamlContent
  } else {
    console.error('❌ daml.yaml not found')
    process.exit(1)
  }
} catch (error) {
  console.error('❌ Error reading daml.yaml:', error.message)
  process.exit(1)
}

// Parse SDK version
const sdkVersionMatch = damlYaml.match(/^sdk-version:\s*([\d.]+)/m)
const sdkVersion = sdkVersionMatch ? sdkVersionMatch[1] : null

// Parse build options
const targetMatch = damlYaml.match(/--target=([\d.]+)/)
const targetVersion = targetMatch ? targetMatch[1] : null

console.log('📋 Configuration:')
console.log(`  SDK Version: ${sdkVersion || 'NOT FOUND'}`)
console.log(`  LF Target: ${targetVersion || 'NOT FOUND'}`)
console.log('')

// Compatibility matrix
const compatibility = {
  '3.4.9': {
    apiVersion: 'v2',
    scriptType: 'Script',
    scriptModule: 'Daml.Script',
    supportedTargets: ['2.1', '2.0', '1.15', '1.14'],
    cantonSupport: '⚠️  May not work (Canton may only support v1 API)',
  },
  '2.10.0': {
    apiVersion: 'v1',
    scriptType: 'Scenario',
    scriptModule: 'DA.Script',
    supportedTargets: ['1.14', '1.13', '1.12'],
    cantonSupport: '✅ Should work (Canton supports v1 API)',
  },
}

// Check SDK compatibility
if (!sdkVersion) {
  console.error('❌ SDK version not found in daml.yaml')
  process.exit(1)
}

const sdkInfo = compatibility[sdkVersion]
if (!sdkInfo) {
  console.warn(`⚠️  Unknown SDK version: ${sdkVersion}`)
  console.warn('   Supported versions: 3.4.9, 2.10.0')
} else {
  console.log('✅ SDK Compatibility:')
  console.log(`  API Version: ${sdkInfo.apiVersion}`)
  console.log(`  Script Type: ${sdkInfo.scriptType}`)
  console.log(`  Script Module: ${sdkInfo.scriptModule}`)
  console.log(`  Canton Support: ${sdkInfo.cantonSupport}`)
  console.log('')
  
  // Check target compatibility
  if (targetVersion) {
    if (sdkInfo.supportedTargets.includes(targetVersion)) {
      console.log(`✅ LF Target ${targetVersion} is compatible with SDK ${sdkVersion}`)
    } else {
      console.warn(`⚠️  LF Target ${targetVersion} may not be fully compatible with SDK ${sdkVersion}`)
      console.warn(`   Recommended targets: ${sdkInfo.supportedTargets.join(', ')}`)
    }
  } else {
    console.warn('⚠️  No LF target specified')
  }
}

console.log('')

// Check Setup scripts
console.log('📝 Setup Scripts:')
const setupScripts = [
  { path: 'daml/Setup.daml', sdk: '3.4.9', type: 'Script' },
  { path: 'daml/Setup-2.10.0.daml', sdk: '2.10.0', type: 'Scenario' },
]

for (const script of setupScripts) {
  const scriptPath = path.join(process.cwd(), script.path)
  if (fs.existsSync(scriptPath)) {
    const content = fs.readFileSync(scriptPath, 'utf8')
    const hasCorrectType = content.includes(script.type)
    const hasCorrectModule = script.sdk === '3.4.9' 
      ? content.includes('Daml.Script')
      : content.includes('DA.Script')
    
    if (hasCorrectType && hasCorrectModule) {
      console.log(`  ✅ ${script.path} (SDK ${script.sdk})`)
    } else {
      console.warn(`  ⚠️  ${script.path} may have incorrect syntax`)
    }
  } else {
    console.log(`  ⚪ ${script.path} (not found)`)
  }
}

console.log('')

// Check JSON API script
console.log('🌐 JSON API Scripts:')
const jsonApiScript = path.join(process.cwd(), 'scripts/setup-via-json-api.js')
if (fs.existsSync(jsonApiScript)) {
  console.log('  ✅ scripts/setup-via-json-api.js (fallback)')
} else {
  console.log('  ⚪ scripts/setup-via-json-api.js (not found)')
}

console.log('')

// Recommendations
console.log('💡 Recommendations:')
if (sdkVersion === '3.4.9') {
  console.log('  1. If DAML Script fails with "Method not found", try SDK 2.10.0')
  console.log('  2. Use Setup-2.10.0.daml for v1 API compatibility')
  console.log('  3. Use setup-via-json-api.js as fallback')
} else if (sdkVersion === '2.10.0') {
  console.log('  1. Use Setup-2.10.0.daml (or rename to Setup.daml)')
  console.log('  2. Ensure LF target is 1.14 or compatible')
  console.log('  3. Use setup-via-json-api.js as fallback')
}

console.log('')
console.log('==========================================')
console.log('')

// Exit with appropriate code
if (sdkInfo && targetVersion && sdkInfo.supportedTargets.includes(targetVersion)) {
  process.exit(0)
} else {
  process.exit(1)
}

