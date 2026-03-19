/**
 * Per-page SEO: title, meta description, and optional OG/Twitter overrides.
 * Tailored to prediction markets, Pips, trading, deposit/withdraw.
 */
const BASE_TITLE = 'dice.express'
const BASE_DESCRIPTION = 'Trade on prediction markets with Pips. Deposit via card or crypto, trade on sports, markets, weather & more, withdraw earnings. Peer-to-peer. Your choice. Your chance.'

export const SEO_PAGES = {
  '/': {
    title: `Prediction Markets — Trade on Real-World Outcomes | ${BASE_TITLE}`,
    description: 'Trade on prediction markets: sports, crypto, stocks, weather & more. Deposit with card or crypto, get Pips, trade peer-to-peer, withdraw earnings. No bookmaker — you vs other traders.',
    keywords: 'prediction markets, trade outcomes, sports predictions, crypto markets, event trading, Pips, dice.express',
  },
  '/discover/active': {
    title: `Markets with volume — Prediction Markets | ${BASE_TITLE}`,
    description: 'Browse prediction markets that have trading volume. Trade with Pips, deposit via card or crypto, withdraw earnings.',
    keywords: 'prediction markets, active markets, volume, trade outcomes, Pips',
  },
  '/discover/sports': {
    title: `Sports — Prediction Markets | ${BASE_TITLE}`,
    description: 'Browse and trade prediction markets on sports. NBA, NFL, soccer and more. Deposit Pips via card or crypto, trade peer-to-peer.',
    keywords: 'sports prediction markets, NBA, NFL, sports betting, trade outcomes, Pips',
  },
  '/discover/global-events': {
    title: `Weather & News — Prediction Markets | ${BASE_TITLE}`,
    description: 'Browse and trade prediction markets on weather and news. Weather forecasts, headlines, and global events. Deposit Pips via card or crypto, trade peer-to-peer.',
    keywords: 'weather prediction markets, news prediction markets, global events, event trading',
  },
  '/discover/industry': {
    title: `Industry & Markets — Prediction Markets | ${BASE_TITLE}`,
    description: 'Prediction markets on industry and financial outcomes. Trade on stocks, crypto, and market events with Pips. Deposit, trade, withdraw.',
    keywords: 'industry predictions, market outcomes, stocks, crypto, financial predictions',
  },
  '/discover/tech-ai': {
    title: `Tech & AI — Prediction Markets | ${BASE_TITLE}`,
    description: 'Prediction markets on technology and AI. Trade on software, startups, AI news, and tech outcomes with Pips. Deposit, trade, withdraw.',
    keywords: 'tech prediction markets, AI predictions, software, startups, technology outcomes',
  },
  '/discover/politics': {
    title: `Politics — Prediction Markets | ${BASE_TITLE}`,
    description: 'Prediction markets on elections, policy, and political outcomes. Trade with Pips. Deposit via card or crypto, peer-to-peer.',
    keywords: 'political prediction markets, election predictions, policy outcomes',
  },
  '/discover/entertainment': {
    title: `Entertainment — Prediction Markets | ${BASE_TITLE}`,
    description: 'Prediction markets on movies, awards, celebrities, and entertainment. Trade with Pips. Deposit, trade, withdraw.',
    keywords: 'entertainment prediction markets, Oscars, box office, celebrity outcomes',
  },
  '/discover/science': {
    title: `Science — Prediction Markets | ${BASE_TITLE}`,
    description: 'Prediction markets on science, research, and discovery. Trade on space, studies, and scientific outcomes with Pips.',
    keywords: 'science prediction markets, research outcomes, space, discovery',
  },
  '/discover/virtual-realities': {
    title: `Virtual Realities — Prediction Markets | ${BASE_TITLE}`,
    description: 'Prediction markets in virtual and digital realms. Trade on outcomes with Pips. Deposit via card or crypto, peer-to-peer trading.',
    keywords: 'virtual predictions, digital outcomes, prediction markets',
  },
  '/discover/user': {
    title: `Community Markets | ${BASE_TITLE}`,
    description: 'Explore prediction markets. Trade with Pips, deposit by card or crypto, withdraw earnings. Your choice. Your chance.',
    keywords: 'prediction markets, community, trade outcomes',
  },
  '/market': {
    title: `Market — Trade Yes/No | ${BASE_TITLE}`,
    description: 'View and trade on a prediction market. Buy Yes or No with Pips. Peer-to-peer order book. Deposit via card or crypto to get started.',
    keywords: 'prediction market, trade yes no, binary market, Pips',
  },
  '/create': {
    title: `How Markets Work | ${BASE_TITLE}`,
    description: 'Markets are created automatically from real-world events (sports, weather, crypto, news). Browse and trade with Pips — no need to create a market yourself.',
    keywords: 'prediction markets, automated markets, trade outcomes',
  },
  '/dashboard': {
    title: `Dashboard — Balance & Positions | ${BASE_TITLE}`,
    description: 'Your prediction market dashboard: Pips balance, open positions, and quick actions. Trade on sports, crypto, weather & more.',
    keywords: 'dashboard, balance, positions, prediction markets',
  },
  '/profile': {
    title: `Profile | ${BASE_TITLE}`,
    description: 'Manage your dice.express profile and display name. Trade prediction markets with Pips.',
    keywords: 'profile, account, dice.express',
  },
  '/portfolio': {
    title: `Portfolio — Balance, Deposit & Withdraw Pips | ${BASE_TITLE}`,
    description: 'Manage your Pips balance: deposit with crypto (wallet or platform address), withdraw to crypto (fee applies), view positions and withdrawal history.',
    keywords: 'portfolio, Pips balance, deposit, withdraw, prediction market funds',
  },
  '/admin': {
    title: `Admin | ${BASE_TITLE}`,
    description: 'Admin dashboard for prediction market management. dice.express platform administration.',
    keywords: 'admin, prediction markets',
  },
  '/history': {
    title: `Contract History | ${BASE_TITLE}`,
    description: 'View your prediction market contract and transaction history. Trades, positions, and settlements.',
    keywords: 'history, contracts, transactions, prediction markets',
  },
  '/download': {
    title: `Download desktop app | ${BASE_TITLE}`,
    description: 'Download the dice.express desktop app for Windows and macOS. Direct download links for the native app.',
    keywords: 'download, desktop app, dice.express, Windows, macOS, prediction markets',
  },
  '/docs': {
    title: `API & Documentation | ${BASE_TITLE}`,
    description: 'dice.express API and platform documentation. Integrate with prediction markets, Pips balance, deposits, withdrawals, and trading.',
    keywords: 'API, documentation, prediction markets, dice.express',
  },
  '/documentation': {
    title: `API & Documentation | ${BASE_TITLE}`,
    description: 'dice.express API and platform documentation. Prediction markets, Pips, trading, and deposits.',
    keywords: 'documentation, API, prediction markets',
  },
  '/privacy': {
    title: `Privacy Policy | ${BASE_TITLE}`,
    description: 'Privacy policy for dice.express. How we collect, use, and protect your information when you trade prediction markets and use Pips.',
    keywords: 'privacy policy, dice.express, prediction markets',
  },
  '/terms': {
    title: `Terms of Service | ${BASE_TITLE}`,
    description: 'Terms of service for the dice.express prediction markets platform. Trading, Pips, deposits, and withdrawals.',
    keywords: 'terms of service, dice.express, prediction markets',
  },
  '/sign-in': {
    title: `Sign In | ${BASE_TITLE}`,
    description: 'Sign in to your dice.express account. Trade prediction markets with Pips.',
    keywords: 'sign in, login, dice.express',
  },
  '/register': {
    title: `Create Account | ${BASE_TITLE}`,
    description: 'Create your dice.express account. Start trading prediction markets — deposit Pips via card or crypto and trade on real-world outcomes.',
    keywords: 'register, create account, prediction markets',
  },
  '/account': {
    title: `Account | ${BASE_TITLE}`,
    description: 'Your dice.express account. Manage your profile and trade prediction markets with Pips.',
    keywords: 'account, dice.express',
  },
  '/test': {
    title: `Test | ${BASE_TITLE}`,
    description: 'Test contract and API tools for dice.express.',
  },
  '/test-active-contracts': {
    title: `Active Contracts Test | ${BASE_TITLE}`,
    description: 'Test active contracts on dice.express.',
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
    title: `Prediction Markets | ${BASE_TITLE}`,
    description: BASE_DESCRIPTION,
    keywords: 'prediction markets, trade outcomes, Pips, dice.express',
  }
}
