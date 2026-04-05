import { describe, it } from 'node:test'
import assert from 'node:assert'
import { evaluateAutoMarketPostActivation } from '../functions/lib/auto-market-activation.mjs'

describe('evaluateAutoMarketPostActivation', () => {
  const basePayload = {
    title: 'Will Example Corp hit 100 before Q4?',
    resolutionCriteria: 'Resolved YES if official close ≥ 100 on or before deadline.',
    resolutionDeadline: '2030-12-31T23:59:59.000Z',
    oracleConfig: { q: 'example' },
  }

  it('passes when quality gates pass and no horizon env', () => {
    const r = evaluateAutoMarketPostActivation(basePayload, {})
    assert.strictEqual(r.ok, true)
  })

  it('fails deadline_inside_min_horizon when configured', () => {
    const soon = new Date(Date.now() + 2 * 3600000).toISOString()
    const r = evaluateAutoMarketPostActivation(
      { ...basePayload, resolutionDeadline: soon },
      { AUTO_MARKETS_POST_MIN_DEADLINE_HOURS: '48' }
    )
    assert.strictEqual(r.ok, false)
    assert.ok(r.reasons.includes('deadline_inside_min_horizon'))
  })
})
