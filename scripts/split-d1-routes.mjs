/**
 * Emit functions/api/lib/d1-shared.mjs and functions/api/routes/d1-*.mjs from handle-d1.mjs.
 * Run: node scripts/split-d1-routes.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const srcPath = path.join(root, 'functions/api/handle-d1.mjs')
const srcText = fs.readFileSync(srcPath, 'utf8')
if (srcText.includes('D1_ROUTE_HANDLERS')) {
  console.error('Refusing to run: handle-d1.mjs is already the thin dispatcher. Restore the monolith from git to re-split.')
  process.exit(1)
}
const lines = srcText.split(/\n/)

let sharedImports = lines.slice(3, 51).join('\n')
sharedImports = sharedImports.replace(/from '\.\.\/lib\//g, "from '../../lib/")
sharedImports = sharedImports.replace(
  /from '\.\/lib\/api-http\.mjs'/g,
  "from './api-http.mjs'"
)
let sharedHelpers = lines.slice(52, 406).join('\n')
sharedHelpers = sharedHelpers.replace(/^const TEMPLATE_VIRTUAL_MARKET/m, 'export const TEMPLATE_VIRTUAL_MARKET')
sharedHelpers = sharedHelpers.replace(/^const CRON_HEARTBEAT_CONTRACT_ID/m, 'export const CRON_HEARTBEAT_CONTRACT_ID')
sharedHelpers = sharedHelpers.replace(/^async function /gm, 'export async function ')
sharedHelpers = sharedHelpers.replace(/^function /gm, 'export function ')

const sharedFile = `/**
 * Shared helpers, constants, and idempotency for D1 API routes.
 */
${sharedImports}

${sharedHelpers}
`

const D1_SHARED_NAMES = [
  'envFlagTrue',
  'checkOpsSecret',
  'backupToR2',
  'settleVirtualMarketPositions',
  'shouldSkipFeedTopicHeadlineMarkets',
  'checkPredictionMaintenanceAuth',
  'getDisplaySourceAndCategory',
  'categoryFromNewsTopic',
  'upsertAutomationHeartbeat',
  'normalizeIdempotencyKey',
  'readP2pOrderIdempotency',
  'writeP2pOrderIdempotency',
  'readWithdrawIdempotency',
  'writeWithdrawIdempotency',
  'sendOneWithdrawal',
  'TEMPLATE_VIRTUAL_MARKET',
  'CRON_HEARTBEAT_CONTRACT_ID',
]

function prefixD1Identifiers(code) {
  let out = code
  for (const n of D1_SHARED_NAMES) {
    const re = new RegExp(`\\b${n}\\b`, 'g')
    out = out.replace(re, `d1.${n}`)
  }
  return out
}

const routesDir = path.join(root, 'functions/api/routes')
fs.mkdirSync(routesDir, { recursive: true })
fs.writeFileSync(path.join(root, 'functions/api/lib/d1-shared.mjs'), sharedFile)

const routeBlocks = [
  { name: 'd1-public.mjs', export: 'tryD1PublicRoutes', startLine: 415, endLine: 457 },
  { name: 'd1-deposits.mjs', export: 'tryD1DepositRoutes', startLine: 458, endLine: 755 },
  { name: 'd1-withdrawals.mjs', export: 'tryD1WithdrawalRoutes', startLine: 756, endLine: 943 },
  { name: 'd1-prediction-maintenance.mjs', export: 'tryD1PredictionMaintenanceRoutes', startLine: 944, endLine: 1023 },
  { name: 'd1-ops.mjs', export: 'tryD1OpsRoutes', startLine: 1024, endLine: 1045 },
  { name: 'd1-orders.mjs', export: 'tryD1OrderRoutes', startLine: 1046, endLine: 1277 },
  { name: 'd1-contracts.mjs', export: 'tryD1ContractRoutes', startLine: 1278, endLine: 1364 },
  { name: 'd1-users.mjs', export: 'tryD1UserRoutes', startLine: 1365, endLine: 1554 },
  { name: 'd1-auto-markets.mjs', export: 'tryD1AutoMarketsRoutes', startLine: 1555, endLine: 1959 },
  { name: 'd1-markets.mjs', export: 'tryD1MarketsRoutes', startLine: 1960, endLine: 2095 },
  { name: 'd1-trade.mjs', export: 'tryD1TradeRoutes', startLine: 2096, endLine: 2318 },
  { name: 'd1-resolve.mjs', export: 'tryD1ResolveRoutes', startLine: 2319, endLine: 2558 },
]

const importLine = `import * as storage from '../../lib/cf-storage.mjs'
import * as d1 from '../lib/d1-shared.mjs'
`

const extraImports = {
  'd1-public.mjs': '',
  'd1-deposits.mjs': `import { addPips, pipsToCents, cryptoAmountToPipsStr } from '../../lib/pips-precision.mjs'
import { verifyErc20Deposit, verifyNativeDeposit } from '../../lib/verify-deposit-rpc.mjs'
import { getAlchemyRpcUrl, listAlchemyNetworkIdsForDisplay } from '../../lib/alchemy-networks.mjs'
import { verifySolanaSplDeposit, SOLANA_MAINNET_USDC_MINT } from '../../lib/verify-deposit-solana.mjs'
import { getDefaultUsdcContractForEvm } from '../../lib/evm-withdraw-config.mjs'
import { verifySolanaDepositSignature, isValidSolanaAddress } from '../../lib/solana-deposit-signature.mjs'
import { verifyMessage } from 'viem'
import { predictionLog } from '../../lib/prediction-observability.mjs'
`,
  'd1-withdrawals.mjs': `import {
  EVM_NATIVE_WITHDRAW_NETWORKS,
  EVM_USDC_WITHDRAW_NETWORKS,
} from '../../lib/evm-withdraw-config.mjs'
import { isValidSolanaAddress } from '../../lib/solana-deposit-signature.mjs'
import { addPips, pipsToCents, centsToPipsStr } from '../../lib/pips-precision.mjs'
import { predictionLog } from '../../lib/prediction-observability.mjs'
`,
  'd1-prediction-maintenance.mjs': `import {
  backfillVirtualMarketsEmbeddingsChunk,
  deleteMarketEmbeddings,
} from '../../lib/market-embeddings.mjs'
`,
  'd1-ops.mjs': `import { addPips, pipsToCents } from '../../lib/pips-precision.mjs'
`,
  'd1-orders.mjs': `import { consumeRateLimitBucket } from '../../lib/api-rate-limit.mjs'
import { loadSellCapacityForBinaryOrder } from '../../lib/p2p-order-validation.mjs'
import { predictionLog } from '../../lib/prediction-observability.mjs'
`,
  'd1-contracts.mjs': `import { consumeRateLimitBucket, contractsListingClientKey } from '../../lib/api-rate-limit.mjs'
import { predictionLog } from '../../lib/prediction-observability.mjs'
`,
  'd1-users.mjs': `import { hashPassword, verifyPassword } from '../../lib/auth.mjs'
import { addPips, pipsToCents, centsToPipsStr } from '../../lib/pips-precision.mjs'
`,
  'd1-auto-markets.mjs': `import {
  createPoolState,
  createPoolStateMulti,
} from '../../lib/amm.mjs'
import * as dataSources from '../../lib/data-sources.mjs'
import { enrichNewsEvent } from '../../lib/custom-news-markets.mjs'
import { finalizeNewsFeedTopicMarket, isFeedTopicOnlyNewsCandidate } from '../../lib/news-market-topic.mjs'
import { promoteNewsArticleToOutcomeMarket } from '../../lib/outcome-news-markets.mjs'
import { applyPlayfulOutcomePresentation } from '../../lib/market-presentation.mjs'
import * as marketDedupe from '../../lib/market-dedupe.mjs'
import {
  embedText,
  embeddingDocumentFromPayload,
  findParaphraseDuplicate,
  isNearDuplicateInBatch,
  marketEmbedMinScore,
  upsertMarketEmbedding,
} from '../../lib/market-embeddings.mjs'
import { predictionLog } from '../../lib/prediction-observability.mjs'
import * as resolveMarkets from '../../lib/resolve-markets.mjs'
`,
  'd1-markets.mjs': `import {
  createPoolState,
  createPoolStateMulti,
} from '../../lib/amm.mjs'
import * as marketDedupe from '../../lib/market-dedupe.mjs'
import { upsertMarketEmbedding } from '../../lib/market-embeddings.mjs'
`,
  'd1-trade.mjs': `import {
  getQuote,
  isTradeWithinLimit,
  applyTrade,
  getQuoteMulti,
  isTradeWithinLimitMulti,
  applyTradeMulti,
  outcomeProbabilityMulti,
} from '../../lib/amm.mjs'
`,
  'd1-resolve.mjs': `import { deleteMarketEmbeddings } from '../../lib/market-embeddings.mjs'
import { predictionLog } from '../../lib/prediction-observability.mjs'
import * as resolveMarkets from '../../lib/resolve-markets.mjs'
`,
}

for (const b of routeBlocks) {
  const slice = lines.slice(b.startLine - 1, b.endLine)
  const inner = prefixD1Identifiers(
    slice
      .map((line) => (line.startsWith('  ') ? line.slice(2) : line))
      .join('\n')
  )
  const header = `/**
 * D1 API: ${b.name.replace('.mjs', '')}
 */
${importLine}${extraImports[b.name] || ''}
export async function ${b.export}(ctx) {
  const { db, kv, r2, env, request, path, method, query, body, requestId, jsonResponse } = ctx
  void requestId

`
  const footer = `
  return null
}
`
  fs.writeFileSync(path.join(routesDir, b.name), header + inner + footer)
}

console.log('OK: d1-shared.mjs +', routeBlocks.length, 'routes')
