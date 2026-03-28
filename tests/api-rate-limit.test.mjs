import { describe, it } from 'node:test'
import assert from 'node:assert'
import { consumeRateLimitBucket, contractsListingClientKey } from '../functions/lib/api-rate-limit.mjs'

describe('contractsListingClientKey', () => {
  it('prefers CF-Connecting-IP', () => {
    const r = new Request('https://dice.express/api/get-contracts', {
      headers: { 'CF-Connecting-IP': '203.0.113.9' },
    })
    assert.equal(contractsListingClientKey(r), '203.0.113.9')
  })

  it('uses first X-Forwarded-For hop', () => {
    const r = new Request('https://dice.express/api', {
      headers: { 'X-Forwarded-For': '198.51.100.2, 10.0.0.1' },
    })
    assert.equal(contractsListingClientKey(r), '198.51.100.2')
  })

  it('tags localhost for local dev', () => {
    const r = new Request('http://localhost:8788/api', {})
    assert.equal(contractsListingClientKey(r), 'local-dev')
  })
})

describe('consumeRateLimitBucket memory fallback', () => {
  it('enforces max without KV', async () => {
    const ok1 = await consumeRateLimitBucket(null, 'test-mem:u1', 2, 60)
    const ok2 = await consumeRateLimitBucket(null, 'test-mem:u1', 2, 60)
    const ok3 = await consumeRateLimitBucket(null, 'test-mem:u1', 2, 60)
    assert.equal(ok1.ok, true)
    assert.equal(ok2.ok, true)
    assert.equal(ok3.ok, false)
    assert.equal(ok3.backend, 'memory')
  })
})
