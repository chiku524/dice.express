/**
 * Canton Blockchain Provider
 * 
 * Implementation of BlockchainProvider for Canton blockchain.
 * Currently supports the hybrid approach (database + on-chain commands).
 * 
 * FUTURE: When Canton offers full on-chain capabilities, this provider
 * will be updated to support:
 * - Direct contract querying (via gRPC or WebSocket)
 * - Real-time contract events
 * - Complete on-chain market operations
 * - Full position tracking on-chain
 * 
 * See docs/BLOCKCHAIN_INTEGRATION.md for migration strategy.
 */
import LedgerClient from '../ledgerClient'
import { BlockchainProvider } from './BlockchainProvider'

export class CantonProvider extends BlockchainProvider {
  constructor(config = {}) {
    super({
      networkId: 'canton',
      name: 'Canton',
      ...config
    })
    this.ledgerClient = null
    this.token = null
  }

  /**
   * Initialize connection to Canton
   */
  async connect() {
    try {
      // Get token from localStorage if available
      this.token = typeof window !== 'undefined' 
        ? localStorage.getItem('canton_token') 
        : null

      this.ledgerClient = new LedgerClient(this.config.baseUrl, this.token)
      
      // Test connection (simple initialization - no actual network call)
      this.isConnected = true
      return true
    } catch (error) {
      console.error('[CantonProvider] Connection error:', error)
      this.isConnected = false
      throw error
    }
  }

  /**
   * Disconnect from Canton
   */
  async disconnect() {
    this.ledgerClient = null
    this.token = null
    this.isConnected = false
  }

  /**
   * Get current party/account identifier
   */
  async getAccount() {
    if (typeof window === 'undefined') {
      throw new Error('Window is not available')
    }
    const party = localStorage.getItem('wallet_party')
    if (!party) {
      throw new Error('No wallet party found. Please connect a wallet.')
    }
    return party
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token
    if (this.ledgerClient) {
      this.ledgerClient.setToken(token)
    }
  }

  /**
   * Create a contract on Canton
   */
  async createContract(templateId, payload, account) {
    if (!this.ledgerClient) {
      throw new Error('Not connected to Canton. Call connect() first.')
    }

    try {
      const result = await this.ledgerClient.create(templateId, payload, account)
      
      // Extract contract ID from result
      // Canton may return updateId initially, then contractId later
      const contractId = result.updateId 
        ? `updateId:${result.updateId}` 
        : result.contractId || result.result?.contractId

      return {
        contractId,
        updateId: result.updateId,
        transactionHash: result.transactionHash,
        result
      }
    } catch (error) {
      console.error('[CantonProvider] Create contract error:', error)
      throw error
    }
  }

  /**
   * Exercise a choice on a Canton contract
   */
  async exerciseChoice(contractId, choice, argument, account) {
    if (!this.ledgerClient) {
      throw new Error('Not connected to Canton. Call connect() first.')
    }

    try {
      // Parse choice path (format: "Module:Template:Choice")
      const choiceParts = choice.split(':')
      if (choiceParts.length < 3) {
        throw new Error(`Invalid choice format: ${choice}. Expected "Module:Template:Choice"`)
      }

      const templateId = `${this.config.packageId || 'b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0'}:${choiceParts[0]}:${choiceParts[1]}`
      const choiceName = choiceParts[2]

      const result = await this.ledgerClient.exercise(
        templateId,
        contractId,
        choiceName,
        argument,
        account
      )

      return {
        result,
        transactionHash: result.transactionHash,
        updateId: result.updateId
      }
    } catch (error) {
      console.error('[CantonProvider] Exercise choice error:', error)
      throw error
    }
  }

  /**
   * Query contracts from Canton
   * 
   * NOTE: Currently limited by Canton JSON API capabilities.
   * When full query support is available, this will be updated.
   */
  async queryContracts(templateIds, filters = {}, options = {}) {
    if (!this.ledgerClient) {
      throw new Error('Not connected to Canton. Call connect() first.')
    }

    try {
      const account = await this.getAccount().catch(() => null)
      const results = await this.ledgerClient.query(templateIds, filters, {
        ...options,
        walletParty: account
      })

      // Check if endpoints are unavailable
      if (results._endpointsUnavailable) {
        console.warn('[CantonProvider] Query endpoints are unavailable in JSON API')
        return []
      }

      return results
    } catch (error) {
      console.error('[CantonProvider] Query contracts error:', error)
      // Return empty array on error (database-first approach)
      return []
    }
  }

  /**
   * Get a contract by ID
   * 
   * NOTE: Currently not supported via JSON API.
   * When Canton offers this capability, it will be implemented.
   */
  async getContract(contractId) {
    if (!this.ledgerClient) {
      throw new Error('Not connected to Canton. Call connect() first.')
    }

    // Currently not supported - would need gRPC or WebSocket
    // For now, return null to indicate it should be fetched from database
    console.warn('[CantonProvider] getContract() not yet supported via JSON API')
    return null
  }

  /**
   * Get supported features for Canton
   */
  getSupportedFeatures() {
    return [
      'createContract',
      'exerciseChoice',
      // 'queryContracts', // Limited support
      // 'getContract', // Not yet supported
      // 'events', // Not yet supported
    ]
  }
}
