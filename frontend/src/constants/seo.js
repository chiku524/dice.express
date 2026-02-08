/**
 * Per-page SEO: title and meta description.
 * Used by PageSEO to set document.title and meta description on route change.
 */
const BASE_TITLE = 'dice.express'
const BASE_DESCRIPTION = 'Trade on real-world outcomes with virtual Credits. Deposit and withdraw on your preferred chain. Your choice. Your chance.'

export const SEO_PAGES = {
  '/': {
    title: `${BASE_TITLE} — Your choice. Your chance.`,
    description: BASE_DESCRIPTION,
  },
  '/market': {
    title: `Market | ${BASE_TITLE}`,
    description: 'View and trade on a prediction market. Your choice. Your chance.',
  },
  '/create': {
    title: `Create Market | ${BASE_TITLE}`,
    description: 'Create a new prediction market. Set the question, outcomes, and resolution.',
  },
  '/portfolio': {
    title: `Portfolio | ${BASE_TITLE}`,
    description: 'Your positions, balance, and activity across prediction markets.',
  },
  '/admin': {
    title: `Admin | ${BASE_TITLE}`,
    description: 'Admin dashboard for prediction market management.',
  },
  '/history': {
    title: `Contract History | ${BASE_TITLE}`,
    description: 'View contract and transaction history.',
  },
  '/docs': {
    title: `Documentation | ${BASE_TITLE}`,
    description: 'API and platform documentation for dice.express.',
  },
  '/documentation': {
    title: `Documentation | ${BASE_TITLE}`,
    description: 'API and platform documentation for dice.express.',
  },
  '/test': {
    title: `Test Contracts | ${BASE_TITLE}`,
    description: 'Test contract and API tools.',
  },
  '/test-active-contracts': {
    title: `Active Contracts Test | ${BASE_TITLE}`,
    description: 'Test active contracts.',
  },
}

/**
 * Get SEO for a path. Supports dynamic routes (e.g. /market/:id).
 */
export function getSEOForPath(pathname) {
  const exact = SEO_PAGES[pathname]
  if (exact) return exact
  if (pathname.startsWith('/market/')) return SEO_PAGES['/market']
  return {
    title: BASE_TITLE,
    description: BASE_DESCRIPTION,
  }
}
