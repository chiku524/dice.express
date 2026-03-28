import { useState, useEffect, useCallback } from 'react'
import { getVirtualBalance } from '../services/balance'

/**
 * Live Pips balance for the signed-in party (display name).
 * @param {string | undefined} party
 */
export function usePipsBalance(party) {
  const [raw, setRaw] = useState(0)
  const [loading, setLoading] = useState(!!party)

  const refreshBalance = useCallback(async () => {
    if (!party) {
      setRaw(0)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { raw: next } = await getVirtualBalance(party)
      setRaw(Number.isFinite(next) ? next : 0)
    } catch {
      setRaw(0)
    } finally {
      setLoading(false)
    }
  }, [party])

  useEffect(() => {
    refreshBalance()
  }, [refreshBalance])

  return { balanceRaw: raw, balanceLoading: loading, refreshBalance }
}
