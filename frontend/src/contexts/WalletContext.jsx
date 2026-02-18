import { createContext, useContext, useState, useEffect } from 'react'

const WalletContext = createContext(null)

const WALLET_STORAGE_KEY = 'virtual_account'
const DEFAULT_USER_ID = 'guest'

function generateAccountId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'acc_' + crypto.randomUUID().replace(/-/g, '')
  }
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  }
  return 'acc_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function normalizeStoredWallet(walletData) {
  if (!walletData?.party || !String(walletData.party).trim()) return null
  const party = String(walletData.party).trim()
  const accountId = walletData.accountId || generateAccountId()
  const createdAt = walletData.createdAt || walletData.connectedAt || new Date().toISOString()
  const connectedAt = walletData.connectedAt || new Date().toISOString()
  return { party, accountId, createdAt, connectedAt }
}

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem(WALLET_STORAGE_KEY)
    if (stored) {
      try {
        const walletData = JSON.parse(stored)
        const normalized = normalizeStoredWallet(walletData)
        if (normalized) {
          setWallet(normalized)
          // Persist normalized shape if we upgraded it
          if (!walletData.accountId || !walletData.createdAt) {
            localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(normalized))
          }
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
            const normalized = normalizeStoredWallet(JSON.parse(e.newValue))
            if (normalized) setWallet(normalized)
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
        throw new Error('Please enter a display name')
      }
      const now = new Date().toISOString()
      const newWallet = {
        party,
        accountId: generateAccountId(),
        createdAt: now,
        connectedAt: now,
      }
      setWallet(newWallet)
      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(newWallet))
      window.dispatchEvent(new CustomEvent('wallet_connected', { detail: newWallet }))
      return { success: true, party, accountId: newWallet.accountId }
    } catch (error) {
      console.error('Failed to connect', error)
      throw error
    }
  }

  const updateDisplayName = (newParty) => {
    const trimmed = newParty != null ? String(newParty).trim() : ''
    if (!trimmed || !wallet) return
    const updated = { ...wallet, party: trimmed, connectedAt: new Date().toISOString() }
    setWallet(updated)
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('wallet_connected', { detail: updated }))
  }

  const disconnectWallet = () => {
    setWallet(null)
    localStorage.removeItem(WALLET_STORAGE_KEY)
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
    <WalletContext.Provider value={{ wallet, connectWallet, disconnectWallet, updateDisplayName, DEFAULT_USER_ID }}>
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

