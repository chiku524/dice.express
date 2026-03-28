import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  sumPositionSharesForMarketOutcome,
  sumOpenSellSharesReservedForOutcome,
  netSellableSharesAfterOpenSells,
} from '../functions/lib/p2p-order-validation.mjs'

describe('p2p-order-validation', () => {
  it('sums position amounts for market outcome', () => {
    const rows = [
      { status: 'Active', payload: { marketId: 'm1', positionType: 'Yes', amount: 10 } },
      { status: 'Active', payload: { marketId: 'm1', positionType: 'Yes', amount: 2.5 } },
      { status: 'Active', payload: { marketId: 'm1', positionType: 'No', amount: 99 } },
    ]
    assert.equal(sumPositionSharesForMarketOutcome(rows, 'm1', 'Yes'), 12.5)
  })

  it('sums open sell remaining for owner and outcome', () => {
    const orders = [
      { owner: 'u1', side: 'sell', outcome: 'Yes', amountRemaining: 3 },
      { owner: 'u1', side: 'sell', outcome: 'Yes', amountReal: 5, amountRemaining: 1 },
      { owner: 'u1', side: 'buy', outcome: 'Yes', amountRemaining: 100 },
      { owner: 'u2', side: 'sell', outcome: 'Yes', amountRemaining: 50 },
    ]
    assert.equal(sumOpenSellSharesReservedForOutcome(orders, 'u1', 'Yes'), 4)
  })

  it('net sellable never negative', () => {
    assert.equal(netSellableSharesAfterOpenSells(2, 5), 0)
    assert.equal(netSellableSharesAfterOpenSells(10, 3), 7)
  })
})
