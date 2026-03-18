import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { createWalletClient, custom, getAddress } from 'viem'
import { mainnet } from 'viem/chains'

const Web3WalletContext = createContext(null)

export function Web3WalletProvider({ children }) {
  const [address, setAddress] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [client, setClient] = useState(null)
  const [error, setError] = useState(null)

  const connect = useCallback(async () => {
    setError(null)
    const ethereum = typeof window !== 'undefined' && window.ethereum
    if (!ethereum) {
      setError('No wallet found. Install MetaMask or another Web3 wallet.')
      return
    }
    try {
      const [account] = await ethereum.request({ method: 'eth_requestAccounts' })
      if (!account) {
        setError('No account selected')
        return
      }
      const walletClient = createWalletClient({
        chain: mainnet,
        transport: custom(ethereum),
      })
      setAddress(getAddress(account))
      setChainId(Number(ethereum.chainId || '0x1'))
      setClient(walletClient)
    } catch (err) {
      setError(err?.message || 'Failed to connect wallet')
      setAddress(null)
      setClient(null)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    setChainId(null)
    setClient(null)
    setError(null)
  }, [])

  useEffect(() => {
    const ethereum = typeof window !== 'undefined' && window.ethereum
    if (!ethereum) return
    const onAccountsChanged = (accounts) => {
      if (!accounts?.length) disconnect()
      else setAddress(getAddress(accounts[0]))
    }
    const onChainChanged = () => {
      setChainId(Number(ethereum.chainId || '0x1'))
    }
    ethereum.on('accountsChanged', onAccountsChanged)
    ethereum.on('chainChanged', onChainChanged)
    return () => {
      ethereum.removeListener('accountsChanged', onAccountsChanged)
      ethereum.removeListener('chainChanged', onChainChanged)
    }
  }, [disconnect])

  const value = {
    address,
    chainId,
    client,
    error,
    connect,
    disconnect,
    isConnected: !!address,
  }

  return (
    <Web3WalletContext.Provider value={value}>
      {children}
    </Web3WalletContext.Provider>
  )
}

export function useWeb3Wallet() {
  const ctx = useContext(Web3WalletContext)
  if (!ctx) throw new Error('useWeb3Wallet must be used within Web3WalletProvider')
  return ctx
}
