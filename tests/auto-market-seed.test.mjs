import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  appendSeedRunHistory,
  computeStableAutoMarketFingerprint,
  evaluateAutoMarketQualityGates,
  filterAutoMarketSourcesByHealth,
  maxEventsScannedPerRun,
  maxMarketsCreatedPerRun,
  seedShadowModeEnabled,
  sourcePauseFailureThreshold,
} from '../functions/lib/auto-market-seed.mjs'

describe('evaluateAutoMarketQualityGates', () => {
  const basePayload = {
    title: 'Will Example Corp hit 100 before Q4?',
    resolutionCriteria: 'Resolved YES if official close ≥ 100 on or before deadline.',
    resolutionDeadline: '2026-12-31T23:59:59.000Z',
    oracleConfig: { q: 'example' },
  }

  it('passes a well-formed payload with default env', () => {
    const r = evaluateAutoMarketQualityGates(basePayload, {})
    assert.strictEqual(r.ok, true)
    assert.deepStrictEqual(r.reasons, [])
  })

  it('fails short title', () => {
    const r = evaluateAutoMarketQualityGates({ ...basePayload, title: 'short' }, {})
    assert.strictEqual(r.ok, false)
    assert.ok(r.reasons.some((x) => x.startsWith('title_too_short')))
  })

  it('respects AUTO_MARKETS_REQUIRE_DEADLINE off', () => {
    const r = evaluateAutoMarketQualityGates(
      { ...basePayload, resolutionDeadline: null },
      { AUTO_MARKETS_REQUIRE_DEADLINE: '0' }
    )
    assert.strictEqual(r.ok, true)
  })

  it('fails missing oracleConfig object', () => {
    const r = evaluateAutoMarketQualityGates({ ...basePayload, oracleConfig: null }, {})
    assert.strictEqual(r.ok, false)
    assert.ok(r.reasons.includes('missing_oracle_config'))
  })
})

describe('seed env helpers', () => {
  it('seedShadowModeEnabled reads flag', () => {
    assert.strictEqual(seedShadowModeEnabled({ AUTO_MARKETS_SEED_SHADOW: '1' }), true)
    assert.strictEqual(seedShadowModeEnabled({}), false)
  })

  it('maxMarketsCreatedPerRun and maxEventsScannedPerRun have defaults', () => {
    assert.strictEqual(maxMarketsCreatedPerRun({}), 120)
    assert.strictEqual(maxEventsScannedPerRun({}), 400)
  })
})

describe('computeStableAutoMarketFingerprint', () => {
  it('is stable for same logical content', async () => {
    const p = {
      title: ' Test ',
      resolutionCriteria: 'RC',
      oracleSource: 'gnews',
      oracleConfig: { b: 1, a: 2 },
    }
    const a = await computeStableAutoMarketFingerprint(p, {})
    const b = await computeStableAutoMarketFingerprint(p, {})
    assert.strictEqual(a, b)
    assert.strictEqual(a.length, 64)
  })
})

describe('filterAutoMarketSourcesByHealth', () => {
  it('skips sources at or above consecutive failure threshold', async () => {
    const kv = {
      async get() {
        return JSON.stringify({
          bad: { consecutiveFailures: 5, lastFailureAt: 'x' },
          good: { consecutiveFailures: 2, lastFailureAt: 'x' },
        })
      },
    }
    const r = await filterAutoMarketSourcesByHealth(kv, { AUTO_MARKETS_PAUSE_AFTER_CONSECUTIVE_FAILURES: '5' }, [
      'bad',
      'good',
    ])
    assert.deepStrictEqual(r.sources, ['good'])
    assert.deepStrictEqual(r.skippedDueToHealth, ['bad'])
  })
})

describe('sourcePauseFailureThreshold', () => {
  it('returns 0 when disabled', () => {
    assert.strictEqual(sourcePauseFailureThreshold({ AUTO_MARKETS_PAUSE_AFTER_CONSECUTIVE_FAILURES: '0' }), 0)
  })
})

describe('appendSeedRunHistory', () => {
  it('prepends entry and caps list', async () => {
    const store = new Map()
    const kv = {
      async get(k) {
        return store.get(k) ?? null
      },
      async put(k, v) {
        store.set(k, v)
      },
    }
    for (let i = 0; i < 30; i += 1) {
      await appendSeedRunHistory(kv, { i })
    }
    const raw = store.get('auto_markets:seed_run_history')
    const arr = JSON.parse(raw)
    assert.strictEqual(arr.length, 25)
    assert.strictEqual(arr[0].i, 29)
    assert.strictEqual(arr[24].i, 5)
  })
})
