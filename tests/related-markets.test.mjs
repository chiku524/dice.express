import { describe, it } from 'node:test'
import assert from 'node:assert'
import { findRelatedMarkets } from '../functions/lib/related-markets.mjs'

describe('findRelatedMarkets', () => {
  it('scores title token overlap and skips self', () => {
    const self = {
      contractId: 'market-a',
      payload: { marketId: 'market-a', title: 'Will Bitcoin hit fifty thousand?', totalVolume: 10 },
    }
    const candidates = [
      self,
      {
        contractId: 'market-b',
        payload: { marketId: 'market-b', title: 'Bitcoin fifty thousand target this year', totalVolume: 5 },
      },
      {
        contractId: 'market-c',
        payload: { marketId: 'market-c', title: 'Rain in London tomorrow', totalVolume: 20 },
      },
    ]
    const related = findRelatedMarkets(self.payload, candidates, self.contractId, self.payload.marketId, 3)
    assert.strictEqual(related.length, 1)
    assert.strictEqual(related[0].contractId, 'market-b')
  })
})
