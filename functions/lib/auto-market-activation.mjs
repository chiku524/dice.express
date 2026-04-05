/**
 * Promote AutoPending virtual markets to Active (pool + trading) after post-create validation.
 */

import * as storage from './cf-storage.mjs'
import { createPoolState, createPoolStateMulti } from './amm.mjs'
import * as d1 from '../api/lib/d1-shared.mjs'
import {
  CONTRACT_STATUS_AUTO_PENDING,
  CONTRACT_STATUS_AUTO_REJECTED,
  evaluateAutoMarketQualityGates,
} from './auto-market-seed.mjs'

/**
 * Re-run quality gates plus optional minimum horizon before resolution deadline.
 * @param {Record<string, unknown>} payload
 * @param {Record<string, unknown>} env
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function evaluateAutoMarketPostActivation(payload, env) {
  const reasons = []
  const g = evaluateAutoMarketQualityGates(payload, env)
  if (!g.ok) reasons.push(...g.reasons)

  const minHorizonH = parseInt(String(env?.AUTO_MARKETS_POST_MIN_DEADLINE_HOURS ?? ''), 10)
  if (Number.isFinite(minHorizonH) && minHorizonH > 0) {
    const dl = payload?.resolutionDeadline
    if (dl) {
      const ms = new Date(dl).getTime()
      if (!Number.isNaN(ms) && ms < Date.now() + minHorizonH * 3600000) {
        reasons.push('deadline_inside_min_horizon')
      }
    }
  }

  return { ok: reasons.length === 0, reasons }
}

/**
 * @param {{ db: any, r2: any, env: Record<string, unknown>, limit?: number }} ctx
 */
export async function activateAutoPendingMarketsBatch({ db, r2, env, limit = 40 }) {
  const lim = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 40))
  const rows = await storage.getContracts(db, {
    templateType: 'VirtualMarket',
    status: CONTRACT_STATUS_AUTO_PENDING,
    limit: lim,
  })

  const useZeroLiquidity =
    env.AUTO_MARKETS_ZERO_LIQUIDITY === '1' ||
    env.AUTO_MARKETS_ZERO_LIQUIDITY === 'true' ||
    String(env.INITIAL_POOL_LIQUIDITY || '').trim() === '0'
  const initialLiquidity = useZeroLiquidity ? 0 : 1000

  /** @type {{ marketId: string, title?: string }[]} */
  const activated = []
  /** @type {{ marketId: string, reasons: string[] }[]} */
  const rejected = []
  /** @type {{ marketId: string, error: string }[]} */
  const errors = []

  for (const row of rows) {
    const id = row.contractId
    const payload = row.payload && typeof row.payload === 'object' ? { ...row.payload } : {}
    try {
      const v = evaluateAutoMarketPostActivation(payload, env)
      if (!v.ok) {
        const nextPayload = {
          ...payload,
          status: CONTRACT_STATUS_AUTO_REJECTED,
          autoMarketActivation: {
            ...(payload.autoMarketActivation && typeof payload.autoMarketActivation === 'object'
              ? payload.autoMarketActivation
              : {}),
            lastRejectionAt: new Date().toISOString(),
            reasons: v.reasons,
          },
        }
        await storage.updateContractPayload(db, id, nextPayload)
        await storage.updateContractStatus(db, id, CONTRACT_STATUS_AUTO_REJECTED)
        if (r2) await d1.backupToR2(r2, undefined, id, nextPayload).catch(() => {})
        rejected.push({ marketId: id, reasons: v.reasons })
        continue
      }

      const nextPayload = { ...payload, status: 'Active' }
      await storage.updateContractPayload(db, id, nextPayload)
      await storage.updateContractStatus(db, id, 'Active')

      const poolId = `pool-${id}`
      const existingPool = await storage.getContractById(db, poolId)
      if (!existingPool || existingPool.templateId !== 'LiquidityPool') {
        const poolState =
          nextPayload.marketType === 'MultiOutcome' &&
          Array.isArray(nextPayload.outcomes) &&
          nextPayload.outcomes.length >= 2
            ? createPoolStateMulti(id, nextPayload.outcomes, initialLiquidity, {})
            : createPoolState(id, initialLiquidity, initialLiquidity)
        await storage.upsertContract(db, {
          contract_id: poolState.poolId,
          template_id: 'LiquidityPool',
          payload: poolState,
          party: 'platform',
          status: 'Active',
        })
        if (r2) await d1.backupToR2(r2, undefined, poolState.poolId, poolState).catch(() => {})
      }

      if (r2) await d1.backupToR2(r2, undefined, id, nextPayload).catch(() => {})
      activated.push({ marketId: id, title: typeof payload.title === 'string' ? payload.title : undefined })
    } catch (e) {
      errors.push({ marketId: id, error: e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e) })
    }
  }

  return { activated, rejected, errors, scanned: rows.length }
}
