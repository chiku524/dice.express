import { describe, it } from 'node:test'
import assert from 'node:assert'
import { buildAutoMarketFetchDiagnostics } from '../functions/lib/data-sources.mjs'

describe('buildAutoMarketFetchDiagnostics', () => {
  it('only lists lanes that returned zero events', () => {
    const d = buildAutoMarketFetchDiagnostics(
      { sports: 0, weather: 5, stocks: 0 },
      { ALPHA_VANTAGE_API_KEY: true }
    )
    assert.ok(d.sports)
    assert.ok(d.stocks)
    assert.strictEqual(d.weather, undefined)
  })
})
