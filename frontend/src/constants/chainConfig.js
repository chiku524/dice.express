/** Match server `functions/lib/evm-withdraw-config.mjs` for deposits from browser wallet. */
export const EVM_USDC_CONTRACT = {
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  avalanche: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  fantom: '0x28a92dde19D9989F39A499F75A8A81476A083aBC',
  bnb: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  bsc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  linea: '0x176211869cA2b568f29E5431fA96c3823247BB74',
  scroll: '0x06eFdBFf2a14a7c8E15944D1F4A45FcbD53565f0',
  zksync: '0x3355df6D25c0Afc4d11d7FbAc0e087cdfC7C36215',
  cronos: '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59',
}

export const EVM_CHAIN_ID = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  avalanche: 43114,
  fantom: 250,
  bnb: 56,
  bsc: 56,
  linea: 59144,
  scroll: 534352,
  zksync: 324,
  cronos: 38825,
}

export const EVM_NETWORK_LABEL = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  base: 'Base',
  avalanche: 'Avalanche C-Chain',
  fantom: 'Fantom',
  bnb: 'BNB Chain',
  bsc: 'BNB Chain',
  linea: 'Linea',
  scroll: 'Scroll',
  zksync: 'zkSync Era',
  cronos: 'Cronos',
}

export const WITHDRAW_EVM_USDC_NETWORKS = Object.keys(EVM_USDC_CONTRACT).filter((k) => k !== 'bsc')

/** Match server `EVM_NATIVE_WITHDRAW_NETWORKS` (exclude duplicate `bsc` key; use `bnb`). */
export const WITHDRAW_EVM_NATIVE_NETWORKS = Object.keys(EVM_CHAIN_ID).filter((k) => k !== 'bsc')

export function evmTxExplorerUrl(networkId, txHash) {
  const n = String(networkId || 'ethereum').toLowerCase()
  if (n === 'solana') return `https://solscan.io/tx/${txHash}`
  const map = {
    ethereum: `https://etherscan.io/tx/${txHash}`,
    polygon: `https://polygonscan.com/tx/${txHash}`,
    arbitrum: `https://arbiscan.io/tx/${txHash}`,
    optimism: `https://optimistic.etherscan.io/tx/${txHash}`,
    base: `https://basescan.org/tx/${txHash}`,
    avalanche: `https://snowtrace.io/tx/${txHash}`,
    fantom: `https://ftmscan.com/tx/${txHash}`,
    bnb: `https://bscscan.com/tx/${txHash}`,
    bsc: `https://bscscan.com/tx/${txHash}`,
    linea: `https://lineascan.build/tx/${txHash}`,
    scroll: `https://scrollscan.com/tx/${txHash}`,
    zksync: `https://explorer.zksync.io/tx/${txHash}`,
    cronos: `https://cronoscan.com/tx/${txHash}`,
  }
  return map[n] || `https://etherscan.io/tx/${txHash}`
}

/** Mainnet Circle USDC mint on Solana */
export const SOLANA_MAINNET_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
