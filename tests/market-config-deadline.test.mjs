import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  formatResolutionDeadline,
  getResolutionSummary,
  getCardResolutionLine,
  findRelatedMarkets,
  buildMarketShareDescription,
} from '../frontend/src/constants/marketConfig.js'

describe('formatResolutionDeadline', () => {
  it('formats UTC calendar-day end (23:59:59.000Z) with explicit UTC wording', () => {
    const longForm = formatResolutionDeadline('2026-06-01T23:59:59.000Z', false)
    assert.match(longForm, /23:59 UTC/i)
    assert.match(longForm, /End of/i)

    const shortForm = formatResolutionDeadline('2026-06-01T23:59:59.000Z', true)
    assert.match(shortForm, /23:59 UTC/i)
  })

  it('accepts UTC end-of-day without milliseconds', () => {
    const s = formatResolutionDeadline('2026-06-01T23:59:59Z', false)
    assert.match(s, /23:59 UTC/i)
  })

  it('formats plain YYYY-MM-DD using UTC calendar semantics', () => {
    const s = formatResolutionDeadline('2026-03-15', false)
    assert.ok(s.length > 0)
    assert.ok(!s.includes('Invalid'))
  })
})

describe('getResolutionSummary', () => {
  it('price_feed summary mentions UTC end of endDate and threshold', () => {
    const payload = {
      oracleSource: 'alpha_vantage',
      oracleConfig: {
        outcomeResolutionKind: 'price_feed',
        threshold: 142.5,
        endDate: '2026-01-05',
        comparator: 'lte',
      },
    }
    const s = getResolutionSummary(payload)
    assert.ok(s)
    assert.match(s, /UTC end of 2026-01-05/i)
    assert.match(s, /142\.5/)
    assert.match(s, /at or below/i)
  })
})

describe('getCardResolutionLine', () => {
  it('prefixes Resolves by with short deadline', () => {
    const line = getCardResolutionLine({ resolutionDeadline: '2026-06-01T23:59:59.000Z' })
    assert.match(line, /^Resolves by /)
    assert.match(line, /UTC/i)
  })
})

describe('findRelatedMarkets', () => {
  it('returns markets with overlapping title tokens', () => {
    const self = { title: 'Will the Lakers win the championship game?' }
    const candidates = [
      { contractId: 'a', payload: { marketId: 'a', title: 'Unrelated market about cheese' } },
      { contractId: 'b', payload: { marketId: 'b', title: 'Lakers championship odds this season' } },
    ]
    const related = findRelatedMarkets(self, candidates, 'x', 'x', 3)
    assert.equal(related.length, 1)
    assert.equal(related[0].payload.marketId, 'b')
  })
})

describe('buildMarketShareDescription', () => {
  it('includes title and resolution hint', () => {
    const d = buildMarketShareDescription({
      title: 'Test market question?',
      resolutionDeadline: '2026-06-01T23:59:59.000Z',
      oracleSource: 'the_odds_api',
    })
    assert.ok(d.includes('Test market'))
    assert.match(d, /Resolves/i)
  })
})
