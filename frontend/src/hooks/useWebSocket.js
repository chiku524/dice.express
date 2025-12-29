import { useEffect, useRef, useState } from 'react'

// JSON API is at /json-api path (admin-api is at base URL)
const LEDGER_URL = import.meta.env.VITE_LEDGER_URL || 'https://participant.dev.canton.wolfedgelabs.com/json-api'

/**
 * Hook for WebSocket connection to Canton ledger
 * Provides real-time updates for contract changes
 */
// Disable WebSocket by default - enable only if explicitly needed
const WEBSOCKET_ENABLED = false // Set to true to enable WebSocket (currently disabled due to connection issues)

export function useWebSocket(templateIds = [], query = {}, enabled = true) {
  const [data, setData] = useState([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 3

  useEffect(() => {
    // Disable WebSocket if not enabled globally or locally
    if (!WEBSOCKET_ENABLED || !enabled || templateIds.length === 0) {
      return
    }

    // Convert HTTP URL to WebSocket URL
    const wsUrl = LEDGER_URL
      .replace('https://', 'wss://')
      .replace('http://', 'ws://')
      .replace('/v1', '') + '/v1/stream/query'

    const connect = () => {
      // Stop trying after max attempts
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        console.log('WebSocket: Max reconnect attempts reached, giving up')
        return
      }

      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          console.log('WebSocket connected')
          setConnected(true)
          setError(null)
          reconnectAttemptsRef.current = 0 // Reset on successful connection

          // Subscribe to contract updates
          ws.send(JSON.stringify({
            templateIds,
            query,
          }))
        }

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            
            // Handle different message types
            if (message.result) {
              setData(message.result)
            } else if (message.event) {
              // Handle contract events (created, archived, etc.)
              console.log('Contract event:', message.event)
              // Trigger cache invalidation or data refresh
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err)
          }
        }

        ws.onerror = (err) => {
          // Only log error, don't set state to avoid spam
          if (reconnectAttemptsRef.current === 0) {
            console.warn('WebSocket connection error (will retry silently)')
          }
          setConnected(false)
        }

        ws.onclose = (event) => {
          if (event.wasClean) {
            console.log('WebSocket disconnected cleanly')
          } else {
            console.log('WebSocket disconnected unexpectedly')
          }
          setConnected(false)
          
          // Only attempt to reconnect if we haven't exceeded max attempts
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++
            reconnectTimeoutRef.current = setTimeout(() => {
              if (enabled && WEBSOCKET_ENABLED) {
                connect()
              }
            }, 5000) // Longer delay between attempts
          }
        }
      } catch (err) {
        console.error('Failed to create WebSocket:', err)
        setError(err.message)
      }
    }

    // Initial connection attempt
    connect()

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
      reconnectAttemptsRef.current = 0
    }
  }, [templateIds, JSON.stringify(query), enabled])

  return { data, connected, error }
}

