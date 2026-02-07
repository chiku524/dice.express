/**
 * Abstract interface for chain-specific deposit and withdrawal.
 * Used for multi-chain: user deposits on a chain → platform credits virtual balance;
 * user withdraws → platform debits balance and sends funds on selected chain.
 * @see docs/VIRTUAL_CURRENCY_AND_MULTICHAIN.md
 */
export class DepositWithdrawProvider {
  constructor({ networkId, name } = {}) {
    this.networkId = networkId
    this.name = name
  }

  /**
   * Get instructions for user to deposit (address, asset, min amount, memo).
   * @returns {{ address: string, asset?: string, minAmount?: string, memoFormat?: string }}
   */
  async getDepositInstructions() {
    throw new Error('getDepositInstructions() must be implemented')
  }

  /**
   * Validate an on-chain deposit tx and return amount + party to credit.
   * @param {string} txHash
   * @param {object} params
   * @returns {Promise<{ amount: number, creditedParty: string }>}
   */
  async validateDeposit(txHash, params) {
    throw new Error('validateDeposit() must be implemented')
  }

  /**
   * Submit a withdrawal request (async; platform processes and sends funds).
   * @param {number} amountCredits
   * @param {string} destinationAddress
   * @param {string} party
   * @returns {Promise<{ requestId: string }>}
   */
  async submitWithdrawal(amountCredits, destinationAddress, party) {
    throw new Error('submitWithdrawal() must be implemented')
  }

  /**
   * Get status of a withdrawal request.
   * @param {string} requestId
   * @returns {Promise<{ status: string, txHash?: string }>}
   */
  async getWithdrawalStatus(requestId) {
    throw new Error('getWithdrawalStatus() must be implemented')
  }
}
