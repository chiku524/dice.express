import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateUserMarketCreate,
  validateUserMarketResolve,
  USER_MARKET_LIMITS,
} from '../functions/lib/user-market-create.mjs'

describe('validateUserMarketCreate', () => {
  const now = new Date('2026-06-01T12:00:00.000Z')
  const base = {
    title: 'Will Team A win the finals?',
    description: 'Binary market on the championship final between Team A and Team B.',
    resolutionCriteria: 'Yes if Team A is the official champion per the league site after the final.',
    category: 'Sports',
    styleLabel: 'yesNo',
    resolutionDeadline: '2026-06-15',
  }

  it('accepts a valid binary market and normalizes date-only deadline', () => {
    const r = validateUserMarketCreate(base, { now })
    assert.equal(r.ok, true)
    assert.equal(r.value.source, 'user')
    assert.equal(r.value.oracleSource, 'manual')
    assert.equal(r.value.marketType, 'Binary')
    assert.deepEqual(r.value.outcomes, ['Yes', 'No'])
    assert.equal(r.value.resolutionDeadline, '2026-06-15T23:59:59.000Z')
    assert.equal(r.value.settlementTrigger.tag, 'Manual')
  })

  it('rejects short titles', () => {
    const r = validateUserMarketCreate({ ...base, title: 'Too short' }, { now })
    assert.equal(r.ok, false)
    assert.match(r.error, /Title/)
  })

  it('rejects invalid category', () => {
    const r = validateUserMarketCreate({ ...base, category: 'NotReal' }, { now })
    assert.equal(r.ok, false)
    assert.match(r.error, /category/i)
  })

  it('rejects deadlines too soon', () => {
    const r = validateUserMarketCreate(
      { ...base, resolutionDeadline: new Date(now.getTime() + 10 * 60 * 1000).toISOString() },
      { now }
    )
    assert.equal(r.ok, false)
    assert.match(r.error, /at least/)
  })

  it('accepts multi-outcome with cleaned labels', () => {
    const r = validateUserMarketCreate(
      {
        ...base,
        styleLabel: 'multiOutcome',
        marketType: 'MultiOutcome',
        outcomes: [' Alice ', 'Bob', 'Alice', 'Carol'],
      },
      { now }
    )
    assert.equal(r.ok, true)
    assert.equal(r.value.marketType, 'MultiOutcome')
    assert.deepEqual(r.value.outcomes, ['Alice', 'Bob', 'Carol'])
  })

  it('rejects promotional spam in title', () => {
    const r = validateUserMarketCreate(
      {
        ...base,
        title: 'Buy now free money airdrop today!!',
        description: 'This is long enough description text for the spam title case.',
      },
      { now }
    )
    assert.equal(r.ok, false)
    assert.match(r.error, /spam/i)
  })
})

describe('validateUserMarketResolve', () => {
  const payload = {
    source: 'user',
    creatorAccountId: 'acc_abc',
    status: 'Active',
    outcomes: ['Yes', 'No'],
  }

  it('allows creator to settle a listed outcome', () => {
    const r = validateUserMarketResolve(payload, { accountId: 'acc_abc', resolvedOutcome: 'Yes' })
    assert.equal(r.ok, true)
    assert.equal(r.value.resolvedOutcome, 'Yes')
  })

  it('allows Void', () => {
    const r = validateUserMarketResolve(payload, { accountId: 'acc_abc', resolvedOutcome: 'Void' })
    assert.equal(r.ok, true)
    assert.equal(r.value.resolvedOutcome, 'Void')
  })

  it('rejects non-creator', () => {
    const r = validateUserMarketResolve(payload, { accountId: 'acc_other', resolvedOutcome: 'Yes' })
    assert.equal(r.ok, false)
    assert.equal(r.status, 403)
  })

  it('rejects already settled', () => {
    const r = validateUserMarketResolve(
      { ...payload, status: 'Settled' },
      { accountId: 'acc_abc', resolvedOutcome: 'Yes' }
    )
    assert.equal(r.ok, false)
  })

  it('documents daily create limit constant', () => {
    assert.equal(USER_MARKET_LIMITS.maxPerDay, 5)
  })
})
