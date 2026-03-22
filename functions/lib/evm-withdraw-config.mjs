/**
 * Viem chains + default USDC (ERC-20) contract per network for withdrawals and deposit verification.
 * Addresses are widely used deployments; confirm against Circle / your bridge for production.
 */
import {
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
  fantom,
  bsc,
  linea,
  scroll,
  zkSync,
  cronos,
} from 'viem/chains'

/** @type {Record<string, { chain: import('viem/chains').Chain, usdc: `0x${string}` }>} */
export const EVM_WITHDRAW_CONFIG = {
  ethereum: { chain: mainnet, usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  polygon: { chain: polygon, usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
  arbitrum: { chain: arbitrum, usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
  optimism: { chain: optimism, usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' },
  base: { chain: base, usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  avalanche: { chain: avalanche, usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' },
  fantom: { chain: fantom, usdc: '0x28a92dde19D9989F39A499F75A8A81476A083aBC' },
  bnb: { chain: bsc, usdc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' },
  bsc: { chain: bsc, usdc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' },
  linea: { chain: linea, usdc: '0x176211869cA2b568f29E5431fA96c3823247BB74' },
  scroll: { chain: scroll, usdc: '0x06eFdBFf2a14a7c8E15944D1F4A45FcbD53565f0' },
  zksync: { chain: zkSync, usdc: '0x3355df6D25c0Afc4d11d7FbAc0e087cdfC7C36215' },
  cronos: { chain: cronos, usdc: '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59' },
}

/** Networks where `token: native` withdrawals use 18-decimal native gas token. */
export const EVM_NATIVE_WITHDRAW_NETWORKS = new Set([
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
  'fantom',
  'bnb',
  'bsc',
  'linea',
  'scroll',
  'zksync',
  'cronos',
])

export const EVM_USDC_WITHDRAW_NETWORKS = new Set(Object.keys(EVM_WITHDRAW_CONFIG))

export function getEvmWithdrawConfig(networkId) {
  const id = String(networkId || '').toLowerCase()
  return EVM_WITHDRAW_CONFIG[id] || null
}

/**
 * Default USDC for on-chain verification when `DEPOSIT_VERIFICATION_USDC_CONTRACT` is unset.
 */
export function getDefaultUsdcContractForEvm(networkId) {
  return getEvmWithdrawConfig(networkId)?.usdc || null
}
