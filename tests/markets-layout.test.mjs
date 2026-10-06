import { beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_MARKETS_LAYOUT,
  MARKETS_LAYOUT_OPTIONS,
  MARKETS_LAYOUT_STORAGE_KEY,
  layoutContainerClass,
  readMarketsLayout,
  writeMarketsLayout,
} from '../frontend/src/utils/marketsLayout.js'

const store = new Map()

globalThis.localStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null
  },
  setItem(key, value) {
    store.set(key, String(value))
  },
  removeItem(key) {
    store.delete(key)
  },
}

describe('markets layout preference', () => {
  beforeEach(() => store.clear())

  it('defaults to gallery in Gallery, List, Grid order', () => {
    assert.equal(readMarketsLayout(), DEFAULT_MARKETS_LAYOUT)
    assert.equal(DEFAULT_MARKETS_LAYOUT, 'gallery')
    assert.deepEqual(
      MARKETS_LAYOUT_OPTIONS.map((o) => o.value),
      ['gallery', 'list', 'grid']
    )
  })

  it('migrates legacy cards to grid and compact to list', () => {
    store.set('dice.markets.layout.v1', 'cards')
    assert.equal(readMarketsLayout(), 'grid')
    store.set('dice.markets.layout.v1', 'compact')
    assert.equal(readMarketsLayout(), 'list')
  })

  it('persists a valid layout and maps container classes', () => {
    assert.equal(writeMarketsLayout('list'), 'list')
    assert.equal(store.get(MARKETS_LAYOUT_STORAGE_KEY), 'list')
    assert.equal(readMarketsLayout(), 'list')
    assert.match(layoutContainerClass('gallery'), /market-gallery/)
    assert.match(layoutContainerClass('grid'), /market-grid/)
    assert.match(layoutContainerClass('list'), /market-list/)
  })
})
