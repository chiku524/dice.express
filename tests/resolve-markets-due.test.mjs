import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  isMarketDueForResolution,
  isVirtualAutoMarketRow,
  filterDueResolutionMarkets,
} from '../functions/lib/resolve-markets.mjs'

function vmRow(overrides = {}) {
  const { payload: pIn, ...rest } = overrides
  const basePayload = {
    source: 'fred',
    oracleSource: 'fred',
    oracleConfig: { endDate: '2000-01-15' },
  }
  const p = pIn || {}
  return {
    templateId: 'VirtualMarket',
    status: 'Active',
    contractId: 'm-test',
    ...rest,
    payload: {
      ...basePayload,
      ...p,
      oracleConfig: { ...basePayload.oracleConfig, ...(p.oracleConfig || {}) },
    },
  }
}

describe('isMarketDueForResolution', () => {
  it('fred: past endDate is due', () => {
    const m = vmRow({ payload: { oracleConfig: { endDate: '2000-01-15' } } })
    assert.equal(isMarketDueForResolution(m, {}), true)
  })

  it('fred: future endDate is not due', () => {
    const m = vmRow({ payload: { oracleConfig: { endDate: '2099-12-31' } } })
    assert.equal(isMarketDueForResolution(m, {}), false)
  })

  it('alpha_vantage: uses UTC end of endDate', () => {
    const past = vmRow({
      payload: {
        source: 'alpha_vantage',
        oracleSource: 'alpha_vantage',
        oracleConfig: { endDate: '2001-06-01' },
      },
    })
    assert.equal(isMarketDueForResolution(past, {}), true)
    const future = vmRow({
      payload: {
        source: 'alpha_vantage',
        oracleSource: 'alpha_vantage',
        oracleConfig: { endDate: '2099-06-01' },
      },
    })
    assert.equal(isMarketDueForResolution(future, {}), false)
  })

  it('operator_manual: due when resolutionDeadline has passed', () => {
    const m = vmRow({
      payload: {
        source: 'operator_manual',
        oracleSource: 'operator_manual',
        resolutionDeadline: '2000-01-01T00:00:00.000Z',
        oracleConfig: {},
      },
    })
    assert.equal(isMarketDueForResolution(m, {}), true)
  })
})

describe('isVirtualAutoMarketRow', () => {
  it('accepts VirtualMarket with oracle source and non-user source', () => {
    assert.equal(isVirtualAutoMarketRow(vmRow()), true)
  })

  it('excludes user-created source', () => {
    const m = vmRow({ payload: { source: 'user', oracleSource: 'user' } })
    assert.equal(isVirtualAutoMarketRow(m), false)
  })
})

describe('filterDueResolutionMarkets', () => {
  it('returns only virtual auto markets that are due', () => {
    const rows = [
      vmRow({ contractId: 'a', payload: { oracleConfig: { endDate: '2000-01-01' } } }),
      vmRow({ contractId: 'b', payload: { oracleConfig: { endDate: '2099-01-01' } } }),
    ]
    const due = filterDueResolutionMarkets(rows, {})
    assert.equal(due.length, 1)
    assert.equal(due[0].contractId, 'a')
  })
})
