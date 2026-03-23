import { describe, it } from 'node:test'
import assert from 'node:assert'
import { parseEmbeddingBatchResponse } from '../functions/lib/market-embeddings.mjs'

describe('parseEmbeddingBatchResponse', () => {
  it('parses Workers AI batch shape (data: vector[])', () => {
    const v1 = Array.from({ length: 768 }, (_, i) => i * 0.001)
    const v2 = Array.from({ length: 768 }, (_, i) => 1 + i * 0.001)
    const out = parseEmbeddingBatchResponse({ data: [v1, v2] }, 2)
    assert.equal(out.length, 2)
    assert.equal(out[0]?.[0], 0)
    assert.equal(out[1]?.[0], 1)
  })

  it('fills nulls for short batch', () => {
    const v1 = Array(768).fill(0.5)
    const out = parseEmbeddingBatchResponse({ data: [v1] }, 3)
    assert.equal(out[0]?.[0], 0.5)
    assert.equal(out[1], null)
    assert.equal(out[2], null)
  })
})
