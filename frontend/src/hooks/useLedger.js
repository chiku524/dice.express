import { useState, useEffect } from 'react'
import LedgerClient from '../services/ledgerClient'

export function useLedger() {
  const [ledger, setLedger] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const connect = async () => {
      try {
        // Get token from localStorage if available
        const token = localStorage.getItem('canton_token')
        const newLedger = new LedgerClient(undefined, token)
        
        // Set token if available
        if (token) {
          newLedger.setToken(token)
        }
        
        // Test connection by querying (empty query should work)
        setLedger(newLedger)
        setIsConnected(true)
      } catch (err) {
        setError(err.message)
        setIsConnected(false)
      }
    }

    connect()
    
    // Listen for token updates
    const handleStorageChange = (e) => {
      if (e.key === 'canton_token' && ledger) {
        const newToken = e.newValue
        if (newToken) {
          ledger.setToken(newToken)
        }
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return { ledger, isConnected, error }
}

