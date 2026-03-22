#!/usr/bin/env node
/**
 * Deletes all automated prediction-market contracts from D1 (VirtualMarket, pools, positions,
 * market creation requests, P2P orders). Preserves user balances, deposits, withdrawals.
 *
 * Usage (from repo root):
 *   node scripts/clear-prediction-markets.mjs remote
 *   node scripts/clear-prediction-markets.mjs local
 *
 * Or: npm run d1:clear-prediction-markets
 *     npm run d1:clear-prediction-markets:local
 */

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const mode = process.argv[2] === 'local' ? 'local' : 'remote'

const args = [
  'wrangler',
  'd1',
  'execute',
  'dice-express-db',
  `--${mode}`,
  '--file=./schema/d1/maintenance_clear_prediction_markets.sql',
]

const r = spawnSync('npx', args, {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (r.error) {
  console.error(r.error)
  process.exit(1)
}
process.exit(r.status === 0 ? 0 : r.status ?? 1)
