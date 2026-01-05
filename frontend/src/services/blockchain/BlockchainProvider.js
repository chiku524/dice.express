/**
 * Blockchain Provider Interface
 * 
 * Abstract base class for blockchain network integrations.
 * This allows the application to support multiple blockchain networks
 * while maintaining a consistent interface.
 * 
 * To add support for a new blockchain network, extend this class
 * and implement all abstract methods.
 */
export class BlockchainProvider {
  constructor(config = {}) {
    this.config = config
    this.networkId = config.networkId || 'unknown'
    this.name = config.name || 'Unknown Network'
    this.isConnected = false
  }

  /**
   * Initialize the blockchain connection
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('connect() must be implemented by subclass')
  }

  /**
   * Disconnect from the blockchain
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('disconnect() must be implemented by subclass')
  }

  /**
   * Get the current account/party identifier
   * @returns {Promise<string>} Account/party identifier
   */
  async getAccount() {
    throw new Error('getAccount() must be implemented by subclass')
  }

  /**
   * Create a contract on the blockchain
   * @param {string} templateId - Contract template identifier
   * @param {object} payload - Contract payload/arguments
   * @param {string} account - Account/party creating the contract
   * @returns {Promise<{contractId: string, transactionHash?: string}>}
   */
  async createContract(templateId, payload, account) {
    throw new Error('createContract() must be implemented by subclass')
  }

  /**
   * Exercise a choice on a contract
   * @param {string} contractId - Contract identifier
   * @param {string} choice - Choice name
   * @param {object} argument - Choice arguments
   * @param {string} account - Account/party exercising the choice
   * @returns {Promise<{result: any, transactionHash?: string}>}
   */
  async exerciseChoice(contractId, choice, argument, account) {
    throw new Error('exerciseChoice() must be implemented by subclass')
  }

  /**
   * Query contracts from the blockchain
   * @param {string[]} templateIds - Template IDs to query
   * @param {object} filters - Query filters
   * @param {object} options - Query options
   * @returns {Promise<object[]>} Array of contract results
   */
  async queryContracts(templateIds, filters = {}, options = {}) {
    throw new Error('queryContracts() must be implemented by subclass')
  }

  /**
   * Get a contract by ID
   * @param {string} contractId - Contract identifier
   * @returns {Promise<object|null>} Contract data or null if not found
   */
  async getContract(contractId) {
    throw new Error('getContract() must be implemented by subclass')
  }

  /**
   * Get network information
   * @returns {object} Network metadata
   */
  getNetworkInfo() {
    return {
      networkId: this.networkId,
      name: this.name,
      isConnected: this.isConnected,
      ...this.config
    }
  }

  /**
   * Check if a feature is supported by this network
   * @param {string} feature - Feature name (e.g., 'queryContracts', 'events')
   * @returns {boolean} Whether the feature is supported
   */
  supportsFeature(feature) {
    const supportedFeatures = this.getSupportedFeatures()
    return supportedFeatures.includes(feature)
  }

  /**
   * Get list of supported features
   * Override this method in subclasses
   * @returns {string[]} Array of supported feature names
   */
  getSupportedFeatures() {
    return []
  }
}
