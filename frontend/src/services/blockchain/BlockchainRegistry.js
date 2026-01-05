/**
 * Blockchain Registry
 * 
 * Central registry for blockchain network providers.
 * Allows dynamic registration and selection of blockchain networks.
 */
import { CantonProvider } from './CantonProvider'

class BlockchainRegistry {
  constructor() {
    this.providers = new Map()
    this.defaultNetwork = 'canton'
    this.currentProvider = null
    
    // Register built-in providers
    this.registerProvider('canton', CantonProvider)
  }

  /**
   * Register a blockchain provider
   * @param {string} networkId - Network identifier (e.g., 'canton', 'ethereum')
   * @param {class} ProviderClass - Provider class extending BlockchainProvider
   * @param {object} config - Default configuration for the provider
   */
  registerProvider(networkId, ProviderClass, config = {}) {
    if (!ProviderClass || typeof ProviderClass !== 'function') {
      throw new Error('ProviderClass must be a class extending BlockchainProvider')
    }

    this.providers.set(networkId, {
      ProviderClass,
      config
    })

    console.log(`[BlockchainRegistry] Registered provider: ${networkId}`)
  }

  /**
   * Get a provider instance for a network
   * @param {string} networkId - Network identifier
   * @param {object} config - Provider-specific configuration
   * @returns {BlockchainProvider} Provider instance
   */
  getProvider(networkId = null, config = {}) {
    const targetNetwork = networkId || this.defaultNetwork

    if (!this.providers.has(targetNetwork)) {
      throw new Error(`No provider registered for network: ${targetNetwork}`)
    }

    const { ProviderClass, config: defaultConfig } = this.providers.get(targetNetwork)
    const mergedConfig = { ...defaultConfig, ...config }

    return new ProviderClass(mergedConfig)
  }

  /**
   * Set the default network
   * @param {string} networkId - Network identifier
   */
  setDefaultNetwork(networkId) {
    if (!this.providers.has(networkId)) {
      throw new Error(`No provider registered for network: ${networkId}`)
    }
    this.defaultNetwork = networkId
  }

  /**
   * Get the default network ID
   * @returns {string} Network identifier
   */
  getDefaultNetwork() {
    return this.defaultNetwork
  }

  /**
   * Get list of registered networks
   * @returns {string[]} Array of network identifiers
   */
  getRegisteredNetworks() {
    return Array.from(this.providers.keys())
  }

  /**
   * Check if a network is registered
   * @param {string} networkId - Network identifier
   * @returns {boolean} Whether the network is registered
   */
  isRegistered(networkId) {
    return this.providers.has(networkId)
  }

  /**
   * Get network metadata
   * @param {string} networkId - Network identifier
   * @returns {object|null} Network metadata or null if not found
   */
  getNetworkMetadata(networkId) {
    if (!this.providers.has(networkId)) {
      return null
    }

    const { ProviderClass, config } = this.providers.get(networkId)
    const instance = new ProviderClass(config)
    
    return {
      networkId,
      name: instance.name,
      supportedFeatures: instance.getSupportedFeatures(),
      config
    }
  }
}

// Export singleton instance
export const blockchainRegistry = new BlockchainRegistry()
export default blockchainRegistry
