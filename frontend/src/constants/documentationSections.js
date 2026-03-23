/**
 * Single source of truth for in-app documentation sections.
 * Used by the Documentation page (hash routing) and nav flyouts (Navbar / desktop sidebar).
 */
export const DOCUMENTATION_SECTIONS = [
  { id: 'getting-started', title: 'Getting Started' },
  { id: 'product-map', title: 'Product map' },
  { id: 'wallet-authentication', title: 'Account & sign-in' },
  { id: 'market-creation', title: 'Markets & discovery' },
  { id: 'amm-fees', title: 'AMM, fees & limit orders' },
  { id: 'position-creation', title: 'Trading & positions' },
  { id: 'deposit-withdraw', title: 'Deposit & withdraw' },
  { id: 'portfolio', title: 'Portfolio' },
  { id: 'blockchain', title: 'Infrastructure' },
  { id: 'apis-oracles', title: 'APIs & oracles' },
  { id: 'architecture', title: 'Architecture' },
  { id: 'security', title: 'Security' },
  { id: 'roadmap', title: 'Roadmap' },
  { id: 'api-reference', title: 'API reference' },
]

export function documentationHashToSectionId(hash) {
  const id = typeof hash === 'string' ? hash.replace(/^#/, '') : ''
  return DOCUMENTATION_SECTIONS.some((s) => s.id === id) ? id : 'getting-started'
}
