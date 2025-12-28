// Manual download script with verification
const https = require('https');
const fs = require('fs');
const path = require('path');

const libDir = path.join(process.cwd(), '.lib');
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, {recursive: true});
}

const packages = [
  {
    name: 'daml-finance-interface-account.dar',
    url: 'https://github.com/digital-asset/daml-finance/releases/download/Daml.Finance.Interface.Account.V4/4.0.0/daml-finance-interface-account-v4-4.0.0.dar',
    expectedMinSize: 400000 // Expect at least 400KB for v4
  },
  {
    name: 'daml-finance-interface-holding.dar',
    url: 'https://github.com/digital-asset/daml-finance/releases/download/Daml.Finance.Interface.Holding.V4/4.0.0/daml-finance-interface-holding-v4-4.0.0.dar',
    expectedMinSize: 400000
  },
  {
    name: 'daml-finance-interface-settlement.dar',
    url: 'https://github.com/digital-asset/daml-finance/releases/download/Daml.Finance.Interface.Settlement.V4/4.0.0/daml-finance-interface-settlement-v4-4.0.0.dar',
    expectedMinSize: 400000
  },
  {
    name: 'daml-finance-interface-types-common.dar',
    url: 'https://github.com/digital-asset/daml-finance/releases/download/Daml.Finance.Interface.Types.Common.V3/3.0.0/daml-finance-interface-types-common-v3-3.0.0.dar',
    expectedMinSize: 250000
  },
  {
    name: 'daml-finance-interface-instrument-token.dar',
    url: 'https://github.com/digital-asset/daml-finance/releases/download/Daml.Finance.Interface.Instrument.Token.V4/4.0.0/daml-finance-interface-instrument-token-v4-4.0.0.dar',
    expectedMinSize: 350000
  },
  {
    name: 'daml-finance-interface-util.dar',
    url: 'https://github.com/digital-asset/daml-finance/releases/download/Daml.Finance.Interface.Util.V3/3.0.0/daml-finance-interface-util-v3-3.0.0.dar',
    expectedMinSize: 300000
  }
];

function downloadWithUserAgent(url, dest) {
  return new Promise((resolve, reject) => {
    let totalSize = 0;
    
    function makeRequest(url) {
      const file = fs.createWriteStream(dest);
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/octet-stream'
        }
      };
      
      https.get(url, options, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          makeRequest(response.headers.location);
        } else if (response.statusCode === 200) {
          response.pipe(file);
          response.on('data', (chunk) => {
            totalSize += chunk.length;
          });
          file.on('finish', () => {
            file.close();
            resolve(totalSize);
          });
        } else {
          file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        }
      }).on('error', (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
    }
    
    makeRequest(url);
  });
}

async function downloadAll() {
  console.log('Downloading packages with proper User-Agent and verification...\n');
  
  for (const pkg of packages) {
    const dest = path.join(libDir, pkg.name);
    process.stdout.write(`Downloading ${pkg.name}... `);
    
    try {
      const size = await downloadWithUserAgent(pkg.url, dest);
      const isValid = fs.readFileSync(dest, {encoding: null})[0] === 0x50 && 
                      fs.readFileSync(dest, {encoding: null})[1] === 0x4B;
      
      if (isValid) {
        if (size >= pkg.expectedMinSize) {
          console.log(`✓ ${(size / 1024).toFixed(2)} KB (valid DAR, size OK)`);
        } else {
          console.log(`⚠ ${(size / 1024).toFixed(2)} KB (valid DAR, but smaller than expected - may be old version)`);
        }
      } else {
        console.log(`✗ Invalid DAR file (not a ZIP)`);
      }
    } catch (err) {
      console.log(`✗ Failed: ${err.message}`);
    }
  }
  
  console.log('\nDownload complete!');
}

downloadAll().catch(console.error);

