import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  deterministicShuffle,
  interleaveArrays,
  pickOddsSportKeysForSeed,
  pickRotatingWindow,
  rotatedNewsCategory,
  rotatedNewsQuery,
  seedRunVarietyBaseSlot,
  utcHourSlot,
  varietyOffsetSlot,
} from '../functions/lib/auto-market-variety.mjs'

describe('seedRunVarietyBaseSlot', () => {
  it('matches hour slot when no seed time', () => {
    const h = 42
    assert.strictEqual(seedRunVarietyBaseSlot(h, undefined), h)
    assert.strictEqual(seedRunVarietyBaseSlot(h, NaN), h)
  })

  it('differs across seed runs in the same hour', () => {
    const h = utcHourSlot()
    const a = seedRunVarietyBaseSlot(h, 1_700_000_000_000)
    const b = seedRunVarietyBaseSlot(h, 1_700_000_600_000)
    assert.notStrictEqual(a, b)
  })
})

describe('rotatedNewsCategory / rotatedNewsQuery', () => {
  it('index deterministically from slot', () => {
    const c0 = rotatedNewsCategory(0)
    const c1 = rotatedNewsCategory(1)
    assert.ok(typeof c0 === 'string' && c0.length > 0)
    assert.ok(typeof c1 === 'string')
    const q0 = rotatedNewsQuery(100)
    assert.ok(q0.includes(' ') || q0.length > 3)
  })
})

describe('varietyOffsetSlot', () => {
  it('salts parallel lanes', () => {
    const b = 99
    assert.notStrictEqual(
      varietyOffsetSlot(b, 'a:gnews:0'),
      varietyOffsetSlot(b, 'b:gnews:0')
    )
  })
})

describe('pickRotatingWindow / pickOddsSportKeysForSeed', () => {
  it('returns a window of sport keys', () => {
    const keys = pickOddsSportKeysForSeed(3, 7)
    assert.strictEqual(keys.length, 3)
    assert.ok(keys.every((k) => typeof k === 'string'))
  })
})

describe('deterministicShuffle', () => {
  it('permutes deterministically by seed', () => {
    const a = [1, 2, 3, 4, 5]
    const s1 = deterministicShuffle(a, 12345)
    const s2 = deterministicShuffle(a, 12345)
    const s3 = deterministicShuffle([1, 2, 3, 4, 5], 99999)
    assert.deepStrictEqual(s1, s2)
    assert.notStrictEqual(s1.join(','), s3.join(','))
  })
})

describe('interleaveArrays', () => {
  it('round-robins non-empty lanes', () => {
    assert.deepStrictEqual(
      interleaveArrays([
        ['a', 'b'],
        ['1', '2'],
      ]),
      ['a', '1', 'b', '2']
    )
  })
})
