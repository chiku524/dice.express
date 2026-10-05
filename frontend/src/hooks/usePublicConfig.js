import { useState, useEffect } from 'react'
import { fetchPublicConfig } from '../services/marketsApi'

let cached = null
let inflight = null

export function usePublicConfig() {
  const [cfg, setCfg] = useState(
    cached || {
      ammTradeEnabled: true,
      tradingMode: 'amm_and_p2p',
      smsAlertsAvailable: false,
      userMarketCreationStakePips: 10,
    }
  )

  useEffect(() => {
    if (cached) {
      setCfg(cached)
      return
    }
    if (!inflight) {
      inflight = fetchPublicConfig()
        .then((d) => {
          cached = {
            ammTradeEnabled: d.ammTradeEnabled !== false,
            tradingMode: d.tradingMode === 'p2p_only' ? 'p2p_only' : 'amm_and_p2p',
            smsAlertsAvailable: Boolean(d.smsAlertsAvailable),
            userMarketCreationStakePips:
              typeof d.userMarketCreationStakePips === 'number' ? d.userMarketCreationStakePips : 10,
          }
          return cached
        })
        .catch(() => ({
          ammTradeEnabled: true,
          tradingMode: 'amm_and_p2p',
          smsAlertsAvailable: false,
          userMarketCreationStakePips: 10,
        }))
        .finally(() => {
          inflight = null
        })
    }
    inflight.then(setCfg)
  }, [])

  return cfg
}
