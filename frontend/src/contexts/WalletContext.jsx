import { createContext, useContext, useState, useEffect } from 'react'

const WalletContext = createContext(null)

const WALLET_STORAGE_KEY = 'virtual_account'
const DEFAULT_USER_ID = 'guest'

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem(WALLET_STORAGE_KEY)
    if (stored) {
      try {
        const walletData = JSON.parse(stored)
        if (walletData.party && String(walletData.party).trim()) {
          setWallet(walletData)
        } else {
          localStorage.removeItem(WALLET_STORAGE_KEY)
        }
      } catch (e) {
        console.error('Failed to load account from storage', e)
      }
    }
  }, [])

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === WALLET_STORAGE_KEY) {
        if (e.newValue) {
          try {
            const walletData = JSON.parse(e.newValue)
            if (walletData.party && String(walletData.party).trim()) setWallet(walletData)
          } catch (err) {}
        } else setWallet(null)
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const connectWallet = async (userId = null) => {
    try {
      const party = (userId != null ? String(userId).trim() : null) || DEFAULT_USER_ID
      if (!party) {
        throw new Error('Please enter a user ID')
      }
      const newWallet = { party, connectedAt: new Date().toISOString() }
      setWallet(newWallet)
      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(newWallet))
      window.dispatchEvent(new CustomEvent('wallet_connected', { detail: newWallet }))
      return { success: true, party }
    } catch (error) {
      console.error('Failed to connect', error)
      throw error
    }
  }

  const disconnectWallet = () => {
    setWallet(null)
    localStorage.removeItem(WALLET_STORAGE_KEY)
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('wallet_disconnected'))
  }

  // Listen for custom wallet events (for same-tab synchronization)
  useEffect(() => {
    const handleWalletConnected = (e) => {
      if (e.detail) {
        setWallet(e.detail)
      }
    }

    const handleWalletDisconnected = () => {
      setWallet(null)
    }

    window.addEventListener('wallet_connected', handleWalletConnected)
    window.addEventListener('wallet_disconnected', handleWalletDisconnected)

    return () => {
      window.removeEventListener('wallet_connected', handleWalletConnected)
      window.removeEventListener('wallet_disconnected', handleWalletDisconnected)
    }
  }, [])

  return (
    <WalletContext.Provider value={{ wallet, connectWallet, disconnectWallet, DEFAULT_USER_ID }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

