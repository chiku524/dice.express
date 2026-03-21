#!/usr/bin/env node
/**
 * Build Tauri static updater manifest (latest.json) from release asset filenames + .sig files.
 * Run after copying all release binaries and signatures into one directory.
 *
 * Usage: node scripts/generate-updater-latest.mjs <assetsDir> <semverVersion> <githubRepo> <gitTag>
 * Example: node scripts/generate-updater-latest.mjs ./release-assets 1.0.9 chiku524/dice.express v1.0.9
 */
import fs from 'node:fs'
import path from 'node:path'

const [,, assetsDir, version, repo, tag] = process.argv
if (!assetsDir || !version || !repo || !tag) {
  console.error('Usage: node scripts/generate-updater-latest.mjs <assetsDir> <semverVersion> <githubRepo> <gitTag>')
  process.exit(1)
}

const baseUrl = `https://github.com/${repo}/releases/download/${tag}`

function readSig(baseName, files) {
  const sigName = `${baseName}.sig`
  const sigPath = files.find((f) => f === sigName)
  if (!sigPath) return null
  return fs.readFileSync(path.join(assetsDir, sigPath), 'utf8').trim()
}

const files = fs.readdirSync(assetsDir).filter((f) => !f.startsWith('.'))
const platforms = {}

// Windows NSIS (prefer *-setup.exe over plain .exe if both exist)
const winSetup = files.find((f) => /-setup\.exe$/i.test(f) && !f.endsWith('.sig'))
if (winSetup) {
  const sig = readSig(winSetup, files)
  if (sig) {
    platforms['windows-x86_64'] = {
      signature: sig,
      url: `${baseUrl}/${winSetup}`,
    }
  }
}

// macOS updater bundles (.app.tar.gz); filenames must include arch (CI renames from dice.express.app.tar.gz)
for (const f of files) {
  if (!f.endsWith('.app.tar.gz') || f.endsWith('.sig')) continue
  const sig = readSig(f, files)
  if (!sig) continue
  let key = null
  if (/_aarch64\.app\.tar\.gz$/i.test(f) || /aarch64|arm64/i.test(f)) key = 'darwin-aarch64'
  else if (/_x64\.app\.tar\.gz$/i.test(f) || /x86_64|x64/i.test(f)) key = 'darwin-x86_64'
  if (key) platforms[key] = { signature: sig, url: `${baseUrl}/${f}` }
}

// Linux AppImage
const appimage = files.find((f) => f.endsWith('.AppImage') && !f.endsWith('.sig'))
if (appimage) {
  const sig = readSig(appimage, files)
  if (sig) {
    platforms['linux-x86_64'] = {
      signature: sig,
      url: `${baseUrl}/${appimage}`,
    }
  }
}

const required = ['windows-x86_64', 'darwin-aarch64', 'darwin-x86_64', 'linux-x86_64']
const missing = required.filter((k) => !platforms[k])
if (missing.length) {
  console.error('Missing platform entries (need bundle + .sig for each):', missing.join(', '))
  console.error('Files in dir:', files.join(', '))
  process.exit(1)
}

const manifest = {
  version,
  notes: `dice.express ${version}`,
  pub_date: new Date().toISOString(),
  platforms,
}

const out = path.join(assetsDir, 'latest.json')
fs.writeFileSync(out, JSON.stringify(manifest, null, 2), 'utf8')
console.log('Wrote', out)
console.log(JSON.stringify(manifest, null, 2))
