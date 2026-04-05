import { describe, it } from 'node:test'
import assert from 'node:assert'
import { marketPathForId, shareMarketNative } from '../frontend/src/utils/marketLinks.js'

describe('marketPathForId', () => {
  it('encodes path segment for URL', () => {
    assert.strictEqual(marketPathForId('abc-123'), 'market/abc-123')
    assert.strictEqual(marketPathForId('a/b'), 'market/a%2Fb')
  })

  it('returns empty for missing id', () => {
    assert.strictEqual(marketPathForId(''), '')
    assert.strictEqual(marketPathForId(null), '')
  })
})

describe('shareMarketNative', () => {
  it('returns unsupported when navigator.share is unavailable', async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      return
    }
    const r = await shareMarketNative({ title: 't', text: 'x', url: 'https://example.com/m' })
    assert.strictEqual(r.ok, false)
    assert.strictEqual(r.reason, 'unsupported')
  })
})
