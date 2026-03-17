/**
 * Contract Storage Utility
 * Stores contracts via API (Cloudflare D1) with local storage as fallback
 * Prioritizes cloud storage for cross-device access and reliability
 */

const STORAGE_KEY = 'virtual_contracts'
const MAX_STORED_CONTRACTS = 100 // Limit to prevent storage bloat

// API endpoints
const API_BASE = '/api'
const STORE_CONTRACT_ENDPOINT = `${API_BASE}/store-contract`
const GET_CONTRACTS_ENDPOINT = `${API_BASE}/get-contracts`

export const ContractStorage = {
  /**
   * Store a contract after creation
   * Tries cloud storage first, falls back to local storage if cloud fails
   * @param {string} contractId - Contract ID
   * @param {string} templateId - Template ID (e.g., "PredictionMarkets:Market")
   * @param {object} payload - Contract payload data
   * @param {string} party - Party that created the contract
   * @param {object} metadata - Optional metadata (updateId, completionOffset, explorerUrl, status)
   */
  async storeContract(contractId, templateId, payload = {}, party = null, metadata = {}) {
    const contractData = {
      contractId,
      templateId,
      payload,
      party,
      updateId: metadata.updateId || null,
      completionOffset: metadata.completionOffset || null,
      explorerUrl: metadata.explorerUrl || null,
      status: metadata.status || 'PendingApproval'
    }

    // Try cloud storage first
    try {
      const response = await fetch(STORE_CONTRACT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contractData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('[ContractStorage] ✅ Contract stored in cloud:', contractId)
        // Also store locally as backup
        this._storeLocal(contractId, templateId, payload, party, metadata)
        return result.contract || contractData
      } else {
        const error = await response.json()
        console.warn('[ContractStorage] ⚠️ Cloud storage failed, using local storage:', error.message)
        // Fall back to local storage
        return this._storeLocal(contractId, templateId, payload, party, metadata)
      }
    } catch (error) {
      console.warn('[ContractStorage] ⚠️ Cloud storage error, using local storage:', error.message)
      // Fall back to local storage
      return this._storeLocal(contractId, templateId, payload, party, metadata)
    }
  },

  /**
   * Internal method to store in local storage
   * @private
   */
  _storeLocal(contractId, templateId, payload, party, metadata) {
    try {
      const contracts = this.getAllContracts()
      
      // Add new contract
      const contract = {
        contractId,
        templateId,
        payload,
        party,
        updateId: metadata.updateId || null,
        completionOffset: metadata.completionOffset || null,
        explorerUrl: metadata.explorerUrl || null,
        status: metadata.status || 'PendingApproval',
        createdAt: new Date().toISOString(),
        viewed: false,
        _fromLocalStorage: true
      }
      
      contracts.unshift(contract) // Add to beginning
      
      // Limit storage size
      if (contracts.length > MAX_STORED_CONTRACTS) {
        contracts.splice(MAX_STORED_CONTRACTS)
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts))
      return contract
    } catch (error) {
      console.error('Failed to store contract locally:', error)
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
   * Tries cloud storage first, falls back to local storage
   * @param {string} templateType - Template type (e.g., "Market", "MarketCreationRequest")
   * @param {string} party - Optional party filter
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} Filtered contracts
   */
  async getContractsByType(templateType, party = null, status = null) {
    // Try cloud storage first
    try {
      const params = new URLSearchParams({ templateType })
      if (party) params.append('party', party)
      if (status) params.append('status', status)

      const response = await fetch(`${GET_CONTRACTS_ENDPOINT}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`[ContractStorage] ✅ Retrieved ${result.contracts?.length || 0} contracts from cloud`)
        return result.contracts || []
      } else {
        console.warn('[ContractStorage] ⚠️ Cloud retrieval failed, using local storage')
        // Fall back to local storage
        return this._getLocalContractsByType(templateType, party, status)
      }
    } catch (error) {
      console.warn('[ContractStorage] ⚠️ Cloud retrieval error, using local storage:', error.message)
      // Fall back to local storage
      return this._getLocalContractsByType(templateType, party, status)
    }
  },

  /**
   * Internal method to get contracts from local storage by type
   * @private
   */
  _getLocalContractsByType(templateType, party = null, status = null) {
    const contracts = this.getAllContracts()
    return contracts.filter(c => {
      const matchesType = c.templateId && c.templateId.includes(templateType)
      const matchesParty = !party || c.party === party
      const matchesStatus = !status || c.status === status
      return matchesType && matchesParty && matchesStatus
    })
  },

  /**
   * Get contracts by party
   * Tries cloud storage first, falls back to local storage
   * @param {string} party - Party ID
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} Filtered contracts
   */
  async getContractsByParty(party, status = null) {
    // Try cloud storage first
    try {
      const params = new URLSearchParams({ party })
      if (status) params.append('status', status)

      const response = await fetch(`${GET_CONTRACTS_ENDPOINT}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`[ContractStorage] ✅ Retrieved ${result.contracts?.length || 0} contracts from cloud`)
        return result.contracts || []
      } else {
        console.warn('[ContractStorage] ⚠️ Cloud retrieval failed, using local storage')
        // Fall back to local storage
        return this._getLocalContractsByParty(party, status)
      }
    } catch (error) {
      console.warn('[ContractStorage] ⚠️ Cloud retrieval error, using local storage:', error.message)
      // Fall back to local storage
      return this._getLocalContractsByParty(party, status)
    }
  },

  /**
   * Internal method to get contracts from local storage by party
   * @private
   */
  _getLocalContractsByParty(party, status = null) {
    const contracts = this.getAllContracts()
    return contracts.filter(c => {
      const matchesParty = c.party === party
      const matchesStatus = !status || c.status === status
      return matchesParty && matchesStatus
    })
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

