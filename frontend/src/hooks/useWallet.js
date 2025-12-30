import { useState, useEffect } from 'react'

const WALLET_STORAGE_KEY = 'canton_wallet'

export function useWallet() {
  const [wallet, setWallet] = useState(null)

  useEffect(() => {
    // Load wallet from localStorage
    const stored = localStorage.getItem(WALLET_STORAGE_KEY)
    if (stored) {
      try {
        const wallet = JSON.parse(stored)
        // Validate party ID format (must contain ::)
        if (wallet.party && wallet.party.includes('::')) {
          setWallet(wallet)
        } else {
          // Invalid format - clear it and prompt user to reconnect
          console.warn('Invalid party ID format in stored wallet:', wallet.party)
          localStorage.removeItem(WALLET_STORAGE_KEY)
          alert('Your stored wallet has an invalid party ID format. Please reconnect with a valid Canton Party ID (format: user-id::party-id)')
        }
      } catch (e) {
        console.error('Failed to load wallet from storage', e)
      }
    }
  }, [])

  // Default party ID for testing
  const DEFAULT_PARTY_ID = 'ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292'

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
      
      // Show success message
      console.log('Wallet connected:', party)
      return { success: true, party }
    } catch (error) {
      console.error('Failed to connect wallet', error)
      throw error
    }
  }

  // Export default party ID for use in UI
  connectWallet.DEFAULT_PARTY_ID = DEFAULT_PARTY_ID

  const disconnectWallet = () => {
    setWallet(null)
    localStorage.removeItem(WALLET_STORAGE_KEY)
  }

  return { wallet, connectWallet, disconnectWallet, DEFAULT_PARTY_ID }
}

