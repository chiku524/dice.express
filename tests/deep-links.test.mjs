import { describe, it } from 'node:test'
import assert from 'node:assert'
import { pathFromDeepLinkUrl, marketsPathForSource, discoverSegmentToSource } from '../frontend/src/utils/deepLinks.js'

describe('pathFromDeepLinkUrl', () => {
  it('parses diceexpress://market/id', () => {
    assert.strictEqual(pathFromDeepLinkUrl('diceexpress://market/abc-123'), '/market/abc-123')
  })

  it('parses diceexpress:///market/id', () => {
    assert.strictEqual(pathFromDeepLinkUrl('diceexpress:///market/xyz'), '/market/xyz')
  })

  it('parses https://dice.express market URLs', () => {
    assert.strictEqual(pathFromDeepLinkUrl('https://dice.express/market/m1'), '/market/m1')
  })

  it('does not map intro route words to /market/…', () => {
    assert.strictEqual(pathFromDeepLinkUrl('diceexpress://launch'), '/launch')
    assert.strictEqual(pathFromDeepLinkUrl('diceexpress://splashscreen'), '/splashscreen')
    assert.strictEqual(pathFromDeepLinkUrl('diceexpress://register'), '/register')
  })

  it('maps plausible bare market ids', () => {
    assert.strictEqual(pathFromDeepLinkUrl('diceexpress://mkt_abc123'), '/market/mkt_abc123')
  })

  it('rejects unknown hosts', () => {
    assert.strictEqual(pathFromDeepLinkUrl('https://evil.example/market/m1'), null)
  })
})

describe('marketsPathForSource', () => {
  it('maps sources to query paths', () => {
    assert.strictEqual(marketsPathForSource('all'), '/')
    assert.strictEqual(marketsPathForSource('sports'), '/?source=sports')
  })
})

describe('discoverSegmentToSource', () => {
  it('maps legacy segments', () => {
    assert.strictEqual(discoverSegmentToSource('global-events'), 'global_events')
    assert.strictEqual(discoverSegmentToSource('tech-ai'), 'tech_ai')
  })
})
