/**
 * D1-backed /api/* request handling: dispatches to `routes/d1-*.mjs` in order.
 */
import { jsonResponse as jsonResponseWithCors } from './lib/api-http.mjs'
import { parseBody } from './lib/d1-shared.mjs'
import { tryD1PublicRoutes } from './routes/d1-public.mjs'
import { tryD1DepositRoutes } from './routes/d1-deposits.mjs'
import { tryD1WithdrawalRoutes } from './routes/d1-withdrawals.mjs'
import { tryD1PredictionMaintenanceRoutes } from './routes/d1-prediction-maintenance.mjs'
import { tryD1OpsRoutes } from './routes/d1-ops.mjs'
import { tryD1OrderRoutes } from './routes/d1-orders.mjs'
import { tryD1ContractRoutes } from './routes/d1-contracts.mjs'
import { tryD1UserRoutes } from './routes/d1-users.mjs'
import { tryD1AutoMarketsRoutes } from './routes/d1-auto-markets.mjs'
import { tryD1MarketsRoutes } from './routes/d1-markets.mjs'
import { tryD1TradeRoutes } from './routes/d1-trade.mjs'
import { tryD1ResolveRoutes } from './routes/d1-resolve.mjs'

const D1_ROUTE_HANDLERS = [
  tryD1PublicRoutes,
  tryD1DepositRoutes,
  tryD1WithdrawalRoutes,
  tryD1PredictionMaintenanceRoutes,
  tryD1OpsRoutes,
  tryD1OrderRoutes,
  tryD1ContractRoutes,
  tryD1UserRoutes,
  tryD1AutoMarketsRoutes,
  tryD1MarketsRoutes,
  tryD1TradeRoutes,
  tryD1ResolveRoutes,
]

export async function handleWithD1(db, kv, r2, request, path, method, env = {}, requestId = '') {
  const jsonResponse = (body, status = 200, extra = {}) =>
    jsonResponseWithCors(body, status, { ...extra, 'X-Request-Id': requestId })
  const query = Object.fromEntries(new URL(request.url).searchParams)
  const body = await parseBody(request)
  const ctx = { db, kv, r2, env, request, path, method, query, body, requestId, jsonResponse }

  for (const handler of D1_ROUTE_HANDLERS) {
    const res = await handler(ctx)
    if (res) return res
  }
  return null
}
