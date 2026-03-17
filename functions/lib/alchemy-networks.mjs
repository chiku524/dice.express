/**
 * Alchemy RPC subdomains per network. Used to build RPC URL from ALCHEMY_API_KEY.
 * https://docs.alchemy.com/reference/api-overview#base-urls
 */
export const ALCHEMY_NETWORK_SUBDOMAINS = {
  ethereum: 'eth-mainnet',
  'eth-mainnet': 'eth-mainnet',
  mainnet: 'eth-mainnet',
  polygon: 'polygon-mainnet',
  'polygon-mainnet': 'polygon-mainnet',
  arbitrum: 'arb-mainnet',
  'arb-mainnet': 'arb-mainnet',
  'arbitrum-one': 'arb-mainnet',
  optimism: 'opt-mainnet',
  'opt-mainnet': 'opt-mainnet',
  base: 'base-mainnet',
  'base-mainnet': 'base-mainnet',
  avalanche: 'avax-mainnet',
  'avax-mainnet': 'avax-mainnet',
  fantom: 'ftm-mainnet',
  'ftm-mainnet': 'ftm-mainnet',
  cronos: 'cro-mainnet',
  'cro-mainnet': 'cro-mainnet',
  bnb: 'bnb-mainnet',
  'bnb-mainnet': 'bnb-mainnet',
  bsc: 'bnb-mainnet',
}

export function getAlchemyRpcUrl(apiKey, networkId) {
  if (!apiKey || !networkId) return null
  const sub = ALCHEMY_NETWORK_SUBDOMAINS[String(networkId).toLowerCase()]
  if (!sub) return null
  return `https://${sub}.g.alchemy.com/v2/${apiKey}`
}
