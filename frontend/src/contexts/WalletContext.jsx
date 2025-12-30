import { createContext, useContext, useState, useEffect } from 'react'

const WalletContext = createContext(null)

const WALLET_STORAGE_KEY = 'canton_wallet'
const DEFAULT_PARTY_ID = 'ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292'

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null)

  // Load wallet from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(WALLET_STORAGE_KEY)
    if (stored) {
      try {
        const walletData = JSON.parse(stored)
        // Validate party ID format (must contain ::)
        if (walletData.party && walletData.party.includes('::')) {
          setWallet(walletData)
        } else {
          // Invalid format - clear it
          console.warn('Invalid party ID format in stored wallet:', walletData.party)
          localStorage.removeItem(WALLET_STORAGE_KEY)
        }
      } catch (e) {
        console.error('Failed to load wallet from storage', e)
      }
    }
  }, [])

  // Listen for storage changes (from other tabs or components)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === WALLET_STORAGE_KEY) {
        if (e.newValue) {
          try {
            const walletData = JSON.parse(e.newValue)
            if (walletData.party && walletData.party.includes('::')) {
              setWallet(walletData)
            }
          } catch (err) {
            console.error('Failed to parse wallet from storage change', err)
          }
        } else {
          setWallet(null)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const connectWallet = async (partyId = null) => {
    try {
      // If partyId is provided (from modal), use it; otherwise use default
      const party = partyId?.trim() || DEFAULT_PARTY_ID
      
      // Validate party ID format (should contain ::)
      if (!party.includes('::')) {
        throw new Error('Invalid party ID format. Party ID must be in format: {user-id}::{party-id}')
      }
      
      const newWallet = {
        party: party,
        connectedAt: new Date().toISOString(),
      }
      
      setWallet(newWallet)
      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(newWallet))
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('wallet_connected', { detail: newWallet }))
      
      // Show success message
      console.log('Wallet connected:', party)
      return { success: true, party }
    } catch (error) {
      console.error('Failed to connect wallet', error)
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
    <WalletContext.Provider value={{ wallet, connectWallet, disconnectWallet, DEFAULT_PARTY_ID }}>
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

