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

  const connectWallet = async () => {
    try {
      // Canton requires full party ID format: {user-id}::{party-id}
      // Example: ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292
      const defaultPartyId = 'ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292'
      
      const partyId = prompt(
        'Enter your Canton Party ID:\n\n' +
        'Format: {user-id}::{party-id}\n' +
        'Example: ' + defaultPartyId.substring(0, 50) + '...\n\n' +
        '• Leave empty to use default party ID\n' +
        '• Paste your full party ID to connect\n\n' +
        'Note: You can find your party ID in the block explorer or from your Canton admin.'
      )
      
      if (partyId === null) {
        // User cancelled
        return
      }
      
      // Use provided party ID or default
      const party = partyId.trim() || defaultPartyId
      
      // Validate party ID format (should contain ::)
      if (!party.includes('::')) {
        alert('Invalid party ID format. Party ID must be in format: {user-id}::{party-id}\n\nExample: ' + defaultPartyId.substring(0, 50) + '...')
        return
      }
      
      const newWallet = {
        party: party,
        connectedAt: new Date().toISOString(),
      }
      
      setWallet(newWallet)
      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(newWallet))
      
      // Show success message
      console.log('Wallet connected:', party)
      alert('Wallet connected successfully!\nParty ID: ' + party.substring(0, 50) + '...')
    } catch (error) {
      console.error('Failed to connect wallet', error)
      alert('Failed to connect wallet: ' + error.message)
    }
  }

  const disconnectWallet = () => {
    setWallet(null)
    localStorage.removeItem(WALLET_STORAGE_KEY)
  }

  return { wallet, connectWallet, disconnectWallet }
}

