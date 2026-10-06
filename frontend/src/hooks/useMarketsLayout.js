import { useCallback, useEffect, useState } from 'react'
import { readMarketsLayout, writeMarketsLayout } from '../utils/marketsLayout'

export function useMarketsLayout() {
  const [layout, setLayoutState] = useState(() => readMarketsLayout())

  useEffect(() => {
    writeMarketsLayout(layout)
  }, [layout])

  const setLayout = useCallback((next) => {
    setLayoutState(writeMarketsLayout(next))
  }, [])

  return [layout, setLayout]
}
