import { describe, it } from 'node:test'
import assert from 'node:assert'
import { buildGetContractsQuery } from '../functions/lib/cf-storage.mjs'

describe('buildGetContractsQuery', () => {
  it('unfiltered uses single LIMIT binding', () => {
    const { query, params } = buildGetContractsQuery({ limit: 10 })
    assert.match(query, /LIMIT \?\s*$/)
    assert.deepEqual(params, [10])
  })

  it('templateType uses three placeholders (template, like, limit)', () => {
    const { query, params } = buildGetContractsQuery({ templateType: 'VirtualMarket', limit: 1500 })
    const qmarks = (query.match(/\?/g) || []).length
    assert.equal(qmarks, 3)
    assert.deepEqual(params, ['VirtualMarket', '%VirtualMarket%', 1500])
  })

  it('party + status stack before LIMIT', () => {
    const { params } = buildGetContractsQuery({ party: 'platform', status: 'Active', limit: 50 })
    assert.deepEqual(params, ['platform', 'Active', 50])
  })
})
