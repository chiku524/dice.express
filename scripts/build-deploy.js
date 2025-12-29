const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

console.log('==========================================');
console.log('DAML Build and Deploy Script');
console.log('==========================================\n');

try {
  // Step 1: Build
  console.log('Step 1: Building DAML project...');
  console.log('Running: daml build\n');
  
  execSync('daml build', {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PATH: process.env.PATH }
  });
  
  console.log('\n[OK] Build completed successfully!\n');
  
  // Step 2: Find DAR file
  console.log('Step 2: Finding DAR file...');
  const darFile = path.join(projectRoot, '.daml', 'dist', 'prediction-markets-1.0.0.dar');
  
  if (!fs.existsSync(darFile)) {
    throw new Error(`DAR file not found at: ${darFile}`);
  }
  
  console.log(`Found DAR file: ${darFile}\n`);
  
  // Step 3: Deploy
  console.log('Step 3: Deploying to Canton...');
  console.log('Uploading to: https://participant.dev.canton.wolfedgelabs.com/v2/packages\n');
  
  const curlCommand = `curl -X POST https://participant.dev.canton.wolfedgelabs.com/v2/packages -H "Content-Type: application/octet-stream" --data-binary "@${darFile}" -w "\\n\\nHTTP Status: %{http_code}\\n"`;
  
  execSync(curlCommand, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true
  });
  
  console.log('\n[OK] Deployment completed!');
  
} catch (error) {
  console.error('\n[ERROR] Deployment failed!');
  console.error(error.message);
  if (error.stdout) console.error('STDOUT:', error.stdout.toString());
  if (error.stderr) console.error('STDERR:', error.stderr.toString());
  process.exit(1);
}

