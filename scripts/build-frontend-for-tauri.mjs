#!/usr/bin/env node
/**
 * Run the Vite production build with CI=false for the child process only.
 * Tauri's macOS DMG step needs the parent environment to keep CI=true (GitHub Actions)
 * so bundle_dmg skips Finder/AppleScript. Some frontend tooling behaves differently
 * under CI=true; this isolates Vite from that without touching the outer `tauri build`.
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Resolve repo root whether `tauri build` cwd is project root or `src-tauri/`. */
function findRepoRoot() {
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    const pkg = path.join(dir, 'package.json')
    if (fs.existsSync(pkg)) {
      try {
        const { name } = JSON.parse(fs.readFileSync(pkg, 'utf8'))
        if (name === 'dice-express') return dir
      } catch {
        /* continue */
      }
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return path.resolve(__dirname, '..')
}

const root = findRepoRoot()
const frontend = path.join(root, 'frontend')

const env = { ...process.env, CI: 'false' }

execSync('npm run build', {
  cwd: frontend,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
