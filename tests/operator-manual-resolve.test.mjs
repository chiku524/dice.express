import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  inferFromTitles,
  anchorSetFromMarket,
  titleOverlapsAnchors,
  minOverlap,
} from '../functions/lib/operator-manual-resolve.mjs'

describe('operator-manual-resolve inference', () => {
  it('election Yes on projected winner headline with anchor overlap', () => {
    const payload = { title: 'Will Jane Smith win the 2028 Iowa caucus?' }
    const cfg = { customType: 'election', seedHeadline: 'Iowa caucus polling', electionEntitySlug: 'jane-smith' }
    const anchor = anchorSetFromMarket(payload, cfg)
    const minO = minOverlap(anchor)
    const titles = ['Jane Smith elected after Iowa caucus, officials say']
    assert.ok(titleOverlapsAnchors(anchor, titles[0], minO))
    const out = inferFromTitles('election', titles, anchor, cfg)
    assert.equal(out, 'Yes')
  })

  it('election null when Yes and No both appear', () => {
    const payload = { title: 'Will X win?' }
    const cfg = { customType: 'election', electionEntitySlug: 'x-candidate' }
    const anchor = anchorSetFromMarket(payload, cfg)
    const titles = ['X projected winner in state A', 'X concedes after recount']
    const out = inferFromTitles('election', titles, anchor, cfg)
    assert.equal(out, null)
  })

  it('conflict Yes on ceasefire headline', () => {
    const payload = { title: 'Will the Red Sea conflict end by 2026-06?' }
    const cfg = { customType: 'conflict', seedQuery: 'Red Sea ceasefire' }
    const anchor = anchorSetFromMarket(payload, cfg)
    const minO = minOverlap(anchor)
    const t = 'Red Sea shipping ceasefire announced, major powers welcome deal'
    assert.ok(titleOverlapsAnchors(anchor, t, minO))
    assert.equal(inferFromTitles('conflict', [t], anchor, cfg), 'Yes')
  })

  it('generic legislation Yes on signed into law', () => {
    const payload = { title: 'Will the infrastructure bill pass?' }
    const cfg = { customType: 'legislation', seedHeadline: 'infrastructure bill congress' }
    const anchor = anchorSetFromMarket(payload, cfg)
    const t = 'Infrastructure bill signed into law by president'
    assert.equal(inferFromTitles('legislation', [t], anchor, cfg), 'Yes')
  })
})
