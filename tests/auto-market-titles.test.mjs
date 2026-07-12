import { describe, it } from 'node:test'
import assert from 'node:assert'
import { enrichNewsEvent } from '../functions/lib/custom-news-markets.mjs'
import { finalizeNewsFeedTopicMarket } from '../functions/lib/news-market-topic.mjs'
import {
  clipMarketTitle,
  operatorTopicTitle,
  titleHasVagueCopy,
} from '../functions/lib/market-title-copy.mjs'
import { evaluateAutoMarketQualityGates } from '../functions/lib/auto-market-seed.mjs'
import { applyPlayfulOutcomePresentation } from '../functions/lib/market-presentation.mjs'

function newsEv(title, extras = {}) {
  return {
    source: 'gnews',
    title,
    description: title,
    endDate: '2026-12-31',
    oracleConfig: {
      title,
      anchorTitle: title,
      category: 'general',
      dateStr: '2026-12-31',
    },
    ...extras,
  }
}

describe('market-title-copy helpers', () => {
  it('clipMarketTitle keeps a trailing question mark when truncating', () => {
    const long = `Will ${'x'.repeat(200)} happen by 2026-12-31?`
    const clipped = clipMarketTitle(long, 40)
    assert.ok(clipped.length <= 40)
    assert.ok(clipped.endsWith('?'))
  })

  it('operatorTopicTitle names the story instead of “this headline”', () => {
    const title = operatorTopicTitle({
      kind: 'fda_drug',
      headline: 'FDA approves novel cancer therapy from Acme Bio',
      byDate: '2026-09-30',
    })
    assert.match(title, /FDA action on/)
    assert.match(title, /Acme|cancer|FDA/i)
    assert.ok(!titleHasVagueCopy(title))
  })

  it('titleHasVagueCopy catches legacy filler phrases', () => {
    assert.strictEqual(titleHasVagueCopy('Will the court outcome referenced in this headline be confirmed?'), true)
    assert.strictEqual(titleHasVagueCopy('Will the leading candidate win the 2028 election?'), true)
    assert.strictEqual(titleHasVagueCopy('Will Lakers beat Celtics?'), false)
  })
})

describe('enrichNewsEvent title quality', () => {
  it('builds FDA titles from the headline topic', () => {
    const out = enrichNewsEvent(
      newsEv('FDA reject novel cancer therapy from Acme Bio after advisory vote'),
      { usedCustomTypes: {} }
    )
    assert.strictEqual(out.customType, 'fda_drug')
    assert.match(out.title, /FDA action on/)
    assert.ok(!/described in this news thread/i.test(out.title))
    assert.ok(!titleHasVagueCopy(out.title))
  })

  it('builds court titles from the headline topic', () => {
    const out = enrichNewsEvent(
      newsEv('Supreme Court to rule on nationwide injunction power'),
      { usedCustomTypes: {} }
    )
    assert.strictEqual(out.customType, 'court')
    assert.match(out.title, /court rule on/i)
    assert.ok(!/referenced in this headline/i.test(out.title))
  })

  it('builds legislation titles from the headline topic', () => {
    const out = enrichNewsEvent(
      newsEv('Senate passes major AI safety bill after late-night vote'),
      { usedCustomTypes: {} }
    )
    assert.strictEqual(out.customType, 'legislation')
    assert.match(out.title, /Congress act on/i)
  })

  it('uses a grammatical Olympics topic title', () => {
    const out = enrichNewsEvent(
      newsEv('USA targets gold medal haul at 2028 Los Angeles Olympics'),
      { usedCustomTypes: {} }
    )
    assert.strictEqual(out.customType, 'olympics')
    assert.match(out.title, /^Will “.+” be confirmed by the end of the 2028 Olympics\?$/)
    assert.ok(!/^Will USA targets/i.test(out.title))
  })

  it('skips election enrich when no candidate entity is found', () => {
    const out = enrichNewsEvent(
      newsEv('Presidential election 2028 polls tighten nationwide'),
      { usedCustomTypes: {} }
    )
    assert.notStrictEqual(out.customType, 'election')
    assert.ok(!/the leading candidate/i.test(out.title))
  })

  it('names the candidate when extractable', () => {
    const out = enrichNewsEvent(
      newsEv('Will Jordan Blake win the 2028 presidential election?'),
      { usedCustomTypes: {} }
    )
    assert.strictEqual(out.customType, 'election')
    assert.match(out.title, /Jordan Blake/)
    assert.ok(!/the leading candidate/i.test(out.title))
  })

  it('includes company name in tech antitrust titles', () => {
    const out = enrichNewsEvent(
      newsEv('EU antitrust regulators prepare forced sale order against Google'),
      { usedCustomTypes: {} }
    )
    assert.strictEqual(out.customType, 'tech_antitrust')
    assert.match(out.title, /Google/)
    assert.ok(!/referenced in this headline/i.test(out.title))
  })
})

describe('finalizeNewsFeedTopicMarket titles', () => {
  it('keeps feed-topic titles short and topic-led', () => {
    const out = finalizeNewsFeedTopicMarket(
      newsEv('Renewable energy policy shifts after major grid outage')
    )
    assert.match(out.title, /^Will “.+” still show up in GNews by 2026-12-31\?$/)
    assert.ok(out.title.length < 140)
    assert.ok(!/article title similar to/i.test(out.title))
  })
})

describe('sports-style punchy presentation', () => {
  it('keeps a short sports question readable after emoji presentation', () => {
    const presented = applyPlayfulOutcomePresentation({
      title: 'Will Lakers beat Celtics?',
      oneLiner: 'Yes if Lakers win on the posted final score; No if Celtics win or the result is a draw.',
      homeTeam: 'Lakers',
      awayTeam: 'Celtics',
      sportKey: 'basketball_nba',
      oracleSource: 'the_odds_api',
      oracleConfig: { eventId: 'x' },
    })
    assert.match(presented.title, /Lakers beat Celtics/)
    assert.ok(presented.title.length <= 130)
  })
})

describe('evaluateAutoMarketQualityGates vague titles', () => {
  const base = {
    resolutionCriteria: 'Resolved YES if official sources confirm the outcome by the deadline.',
    resolutionDeadline: '2026-12-31T23:59:59.000Z',
    oracleConfig: { customType: 'court' },
  }

  it('rejects vague “this headline” titles', () => {
    const r = evaluateAutoMarketQualityGates(
      {
        ...base,
        title: 'Will the court outcome referenced in this headline be confirmed by 2026-12-31?',
      },
      {}
    )
    assert.strictEqual(r.ok, false)
    assert.ok(r.reasons.includes('title_vague_copy'))
  })

  it('rejects “the leading candidate” titles', () => {
    const r = evaluateAutoMarketQualityGates(
      { ...base, title: 'Will the leading candidate win the 2028 election?' },
      {}
    )
    assert.strictEqual(r.ok, false)
    assert.ok(r.reasons.includes('title_vague_copy'))
  })

  it('passes a punchy semantic title', () => {
    const r = evaluateAutoMarketQualityGates(
      { ...base, title: 'Will Lakers beat Celtics?' },
      {}
    )
    assert.strictEqual(r.ok, true)
  })
})
