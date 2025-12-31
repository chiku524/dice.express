/**
 * Contract Storage Utility
 * Stores contract IDs locally so we can display them even when query endpoints are unavailable
 */

const STORAGE_KEY = 'canton_contracts'
const MAX_STORED_CONTRACTS = 100 // Limit to prevent storage bloat

export const ContractStorage = {
  /**
   * Store a contract after creation
   * @param {string} contractId - Contract ID
   * @param {string} templateId - Template ID (e.g., "PredictionMarkets:Market")
   * @param {object} payload - Contract payload data
   * @param {string} party - Party that created the contract
   */
  storeContract(contractId, templateId, payload = {}, party = null) {
    try {
      const contracts = this.getAllContracts()
      
      // Add new contract
      const contract = {
        contractId,
        templateId,
        payload,
        party,
        createdAt: new Date().toISOString(),
        viewed: false
      }
      
      contracts.unshift(contract) // Add to beginning
      
      // Limit storage size
      if (contracts.length > MAX_STORED_CONTRACTS) {
        contracts.splice(MAX_STORED_CONTRACTS)
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts))
      return contract
    } catch (error) {
      console.error('Failed to store contract:', error)
      return null
    }
  },

  /**
   * Get all stored contracts
   * @returns {Array} Array of stored contracts
   */
  getAllContracts() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to read contracts from storage:', error)
      return []
    }
  },

  /**
   * Get contracts by template type
   * @param {string} templateType - Template type (e.g., "Market", "MarketCreationRequest")
   * @returns {Array} Filtered contracts
   */
  getContractsByType(templateType) {
    const contracts = this.getAllContracts()
    return contracts.filter(c => 
      c.templateId && c.templateId.includes(templateType)
    )
  },

  /**
   * Get contracts by party
   * @param {string} party - Party ID
   * @returns {Array} Filtered contracts
   */
  getContractsByParty(party) {
    const contracts = this.getAllContracts()
    return contracts.filter(c => c.party === party)
  },

  /**
   * Mark contract as viewed
   * @param {string} contractId - Contract ID
   */
  markAsViewed(contractId) {
    try {
      const contracts = this.getAllContracts()
      const contract = contracts.find(c => c.contractId === contractId)
      if (contract) {
        contract.viewed = true
        contract.viewedAt = new Date().toISOString()
        localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts))
      }
    } catch (error) {
      console.error('Failed to mark contract as viewed:', error)
    }
  },

  /**
   * Get recent contracts (last N)
   * @param {number} limit - Number of recent contracts to return
   * @returns {Array} Recent contracts
   */
  getRecentContracts(limit = 10) {
    const contracts = this.getAllContracts()
    return contracts.slice(0, limit)
  },

  /**
   * Clear all stored contracts
   */
  clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear contracts:', error)
    }
  },

  /**
   * Remove a specific contract
   * @param {string} contractId - Contract ID to remove
   */
  removeContract(contractId) {
    try {
      const contracts = this.getAllContracts()
      const filtered = contracts.filter(c => c.contractId !== contractId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error('Failed to remove contract:', error)
    }
  }
}

