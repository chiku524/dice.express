import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { documentationHashToSectionId } from '../constants/documentationSections'
import './Documentation.css'

function sectionIdFromWindowHash() {
  const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
  return documentationHashToSectionId(hash)
}

export default function Documentation() {
  const location = useLocation()
  const [activeSection, setActiveSection] = useState(() => sectionIdFromWindowHash())

  // React Router uses pushState for same-route hash changes — hashchange does NOT fire (HTML5 spec).
  useEffect(() => {
    setActiveSection(documentationHashToSectionId(location.hash))
  }, [location.hash, location.pathname])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [activeSection])

  // Plain <a href="#..."> links in doc content update the URL without always going through Router.
  useEffect(() => {
    const onHashChange = () => setActiveSection(sectionIdFromWindowHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const renderContent = () => {
    switch (activeSection) {
      case 'getting-started':
        return <GettingStartedContent />
      case 'product-map':
        return <ProductMapContent />
      case 'wallet-authentication':
        return <WalletAuthenticationContent />
      case 'market-creation':
        return <MarketCreationContent />
      case 'amm-fees':
        return <AMMFeesContent />
      case 'position-creation':
        return <PositionCreationContent />
      case 'deposit-withdraw':
        return <DepositWithdrawContent />
      case 'portfolio':
        return <PortfolioContent />
      case 'blockchain':
        return <BlockchainContent />
      case 'apis-oracles':
        return <APIsAndOraclesContent />
      case 'architecture':
        return <ArchitectureContent />
      case 'security':
        return <SecurityContent />
      case 'roadmap':
        return <RoadmapContent />
      case 'api-reference':
        return <APIReferenceContent />
      default:
        return <GettingStartedContent />
    }
  }

  return (
    <div className="docs-page">
      <main className="docs-main" role="region" aria-label="Documentation content">
        <p className="docs-nav-hint">
          Open <strong>Documentation</strong> in the header (hover to see all sections) or, in the desktop app, use the sidebar <strong>Documentation</strong> flyout — then pick a section to load here.
        </p>
        <div className="docs-content-inner">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}

// Content Components
function GettingStartedContent() {
  return (
    <div className="doc-section">
      <h1>Getting Started</h1>
      <p>Welcome to dice.express — prediction markets with Pips. Your choice. Your chance.</p>

      <h2>Overview</h2>
      <p>
        Trade on prediction markets. Deposit with <strong>crypto</strong> (connected wallet or platform deposit address) to get <strong>Pips</strong> (1 PP = $1 USD). Spend Pips on <strong>AMM pool trades</strong> (instant price from liquidity) or <strong>limit orders</strong> (peer matching). Withdraw to crypto (fee applies). New markets are <strong>seeded automatically</strong> from external data APIs — there is no end-user market builder. Core API and data live on <strong>Cloudflare</strong> (D1, KV, R2).
      </p>

      <h2>Prerequisites</h2>
      <ul>
        <li>An account — email, password, and display name (create account or sign in from the nav)</li>
        <li>For wallet deposits: a Web3 wallet (e.g. MetaMask) on Ethereum or Polygon for USDC or native ETH/MATIC</li>
      </ul>

      <h2>Quick start</h2>
      <ol>
        <li><strong>Create account:</strong> Use <strong>Create account</strong>, enter email, password, confirm password, and display name. On <strong>Fund your account</strong>, pick <strong>Crypto</strong> (deposit later from Portfolio) or <strong>Add funds later</strong>.</li>
        <li><strong>Deposit:</strong> Open <strong>Portfolio</strong> → Balance → <strong>Deposit from wallet</strong> (sign message after transfer) or <strong>Deposit with crypto</strong> (send to the shown address; include your account ID in the memo when asked).</li>
        <li><strong>Discover:</strong> Use <strong>Discover</strong> in the nav (web) or <strong>Browse categories</strong> (desktop) — see <a href="#product-map">Product map</a> for every category path.</li>
        <li><strong>Trade:</strong> Open a market → <strong>Buy shares</strong> (AMM) and/or <strong>Limit orders</strong> (Yes/No book). Positions and balance appear under <strong>Portfolio</strong>.</li>
      </ol>

      <h2>Key concepts</h2>
      <ul>
        <li><strong>Pips (PP):</strong> In-platform unit; 1 PP = $1 USD for display and accounting. Funded by crypto deposits; used for trading and tips; withdrawn as crypto (withdrawal fee applies).</li>
        <li><strong>Display name:</strong> Public label (shown in the nav, tips, and order book). Linked to your account ID in storage and on the server.</li>
      </ul>
    </div>
  )
}

function ProductMapContent() {
  return (
    <div className="doc-section">
      <h1>Product map</h1>
      <p>
        Everything below is implemented in the app today. Use this as a sitemap for users and operators. Hash links match the sidebar (e.g. <code>#product-map</code>).
      </p>

      <h2>Web app (browser)</h2>
      <ul>
        <li><strong>Top navigation:</strong> Logo → home (<code>/</code>). <strong>Discover</strong> dropdown lists every public browse path (see table). <strong>Documentation</strong> (hover) opens the full section list; <strong>Resources</strong> → Download desktop, Activity (<code>/activity</code>; <code>/history</code> redirects here). When signed in: Pips balance → Portfolio, display name → Dashboard, copy button, Disconnect.</li>
        <li><strong>Auth:</strong> <code>/register</code> (wizard), <code>/sign-in</code> — full-page flows without main chrome.</li>
        <li><strong>Markets:</strong> <code>/market/:marketId</code> — resolution details, AMM trade, limit orders (binary active markets), volumes.</li>
        <li><strong>Account hub (signed in):</strong> <code>/dashboard</code> (summary, account ID copy, links to Profile and Portfolio, <strong>Tip Pips</strong> to another display name). <code>/profile</code> — edit display name, account metadata, sign out. <code>/portfolio</code> — Balance, Positions, Activity tabs; crypto deposit and withdraw.</li>
        <li><strong>Create market:</strong> <code>/create</code> — explains that markets are automated; link back to browse (no builder).</li>
        <li><strong>Marketing / legal:</strong> <code>/download</code> — desktop installers. <code>/privacy</code>, <code>/terms</code>.</li>
      </ul>

      <h2>Desktop app (Tauri)</h2>
      <p>
        Same React app inside a native shell. <code>/splashscreen</code> and <code>/launch</code> are intro/onboarding routes. The main shell uses a <strong>left sidebar</strong> (Markets flyout, Account: Dashboard / Portfolio / Profile, More: Create market, <strong>Documentation</strong> flyout with all sections, Activity) instead of the top nav + footer. There is no Download link in the sidebar — open <code>/download</code> directly if you need installers inside the app. The system tray can trigger <strong>Sign out</strong> (clears session and navigates to sign-in).
      </p>

      <h2>Discover categories</h2>
      <p>Labels match the UI; paths are stable URLs.</p>
      <table className="docs-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Label</th>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Path</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['All Markets', '/'],
            ['With volume', '/discover/active'],
            ['Sports', '/discover/sports'],
            ['Weather & News', '/discover/global-events'],
            ['Finance & Crypto', '/discover/industry'],
            ['Tech & AI', '/discover/tech-ai'],
            ['Politics', '/discover/politics'],
            ['Entertainment', '/discover/entertainment'],
            ['Science', '/discover/science'],
            ['Virtual Realities', '/discover/virtual-realities'],
          ].map(([label, path]) => (
            <tr key={path} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '0.75rem' }}>{label}</td>
              <td style={{ padding: '0.75rem' }}><code>{path}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="docs-note" style={{ marginTop: '1rem', opacity: 0.9 }}>
        A <strong>User-Created</strong> filter exists in config (<code>/discover/user</code>) but is hidden from the default Discover menu; use it if your deployment surfaces user-submitted markets.
      </p>

      <h2>Activity vs Portfolio</h2>
      <ul>
        <li><strong>Portfolio → Activity:</strong> Your in-app activity log (positions, deposits, etc.).</li>
        <li><strong>Resources → Activity (<code>/activity</code>):</strong> Stored <strong>market records</strong> (legacy contract-style rows) for your account: markets, market requests, positions (filter: All / Markets / Requests).</li>
      </ul>
    </div>
  )
}

function WalletAuthenticationContent() {
  return (
    <div className="doc-section">
      <h1>Account &amp; sign-in</h1>

      <h2>Creating an account</h2>
      <p>
        Accounts use <strong>email and password</strong> plus a <strong>display name</strong> (public). You choose whether you intend to fund with <strong>crypto</strong> soon or <strong>add funds later</strong>; either way you deposit from <strong>Portfolio</strong> when ready. The server stores a row keyed by <strong>account ID</strong>; the browser keeps session data in <code>localStorage</code> and syncs display name when possible.
      </p>

      <h3>Registration steps</h3>
      <ol>
        <li><strong>Step 1 — Account:</strong> Email, password, confirm password, display name (max 32 characters).</li>
        <li><strong>Step 2 — Fund your account:</strong> <strong>Crypto</strong> (deposit later from Portfolio) or <strong>Add funds later</strong>.</li>
        <li><strong>Step 3 — Complete:</strong> Review and <strong>Create account</strong> → you are signed in and sent to <strong>Dashboard</strong>.</li>
      </ol>

      <h2>Signing in</h2>
      <p>
        <strong>Sign in</strong> with email and password. Protected routes (e.g. Dashboard, Portfolio) require an active session. <strong>Disconnect</strong> / <strong>Sign out</strong> clears the local session.
      </p>

      <h2>Dashboard</h2>
      <p>
        <strong>Dashboard</strong> shows your display name, member since date, <strong>account ID</strong> (copy for deposit memos), and quick links to <strong>Profile</strong> and <strong>Portfolio</strong>. <strong>Tip Pips</strong> sends Pips to another user by their display name (<code>POST /api/transfer-pips</code>).
      </p>

      <h2>Profile</h2>
      <p>
        <strong>Profile</strong> (<code>/profile</code>) lets you update your display name (same validation as registration) and review account details.
      </p>

      <h2>Security notes</h2>
      <ul>
        <li>Display name is public (trading, tips, order book). Account ID is sensitive for linking deposits — treat memos and IDs like banking references.</li>
        <li>Session lives in <code>localStorage</code>; use a private device or sign out when finished.</li>
      </ul>
    </div>
  )
}

function MarketCreationContent() {
  return (
    <div className="doc-section">
      <h1>Markets &amp; discovery</h1>

      <p>
        Markets are <strong>seeded automatically</strong> from external data (sports, stocks, crypto, weather, news, etc.). Operators call <code>POST /api/auto-markets</code> (cron, script, or admin tool) — there is <strong>no in-app wizard</strong> for creating markets. The <code>/create</code> page explains this and links back to browse.
      </p>

      <h2>How to trade</h2>
      <ol>
        <li>Open <strong>Discover</strong> and pick a category (All, With volume, Sports, Weather &amp; News, Finance &amp; Crypto, Tech &amp; AI, Politics, Entertainment, Science, Virtual Realities — see <a href="#product-map">Product map</a>).</li>
        <li>Open a market for resolution criteria, deadline, implied odds (binary pool), and volumes.</li>
        <li>Use <strong>Buy shares</strong> (AMM) and/or <strong>Limit orders</strong> (order book) on active binary markets.</li>
        <li>Track balances and positions in <strong>Portfolio</strong>.</li>
      </ol>

      <h2>Data sources (auto-markets)</h2>
      <p>
        Seeding supports multiple API lanes: sports (<strong>The Odds API</strong>), stocks (<strong>Alpha Vantage</strong> and trend variants), crypto (<strong>CoinGecko</strong> and trends), weather (<strong>OpenWeatherMap</strong>, <strong>WeatherAPI.com</strong>), and news (<strong>GNews</strong>, <strong>Perigon</strong>, <strong>NewsAPI.ai</strong>, <strong>NewsData.io</strong>). Resolution uses the same family of providers via <code>POST /api/resolve-markets</code> on a schedule you configure.
      </p>

      <h2>Market types</h2>
      <p>
        <strong>Binary</strong> markets use Yes/No (or labeled outcomes). <strong>Multi-outcome</strong> markets show per-outcome volumes and trade paths appropriate to that shape. Underlying records live in D1 (virtual contracts).
      </p>

      <h2>Important notes</h2>
      <ul>
        <li>Market list, pools, positions, and balances are stored in <strong>Cloudflare D1</strong>.</li>
        <li>Resolution is automated from oracle/API data and deadlines — not user voting.</li>
      </ul>
    </div>
  )
}

function AMMFeesContent() {
  return (
    <div className="doc-section">
      <h1>AMM, fees &amp; limit orders</h1>
      <p>
        Binary markets combine two execution styles: an <strong>AMM pool</strong> for immediate <strong>Buy Yes / Buy No</strong> against liquidity, and an optional <strong>limit order book</strong> for peer matching at a chosen price.
      </p>

      <h2>AMM (pool trades)</h2>
      <p>
        Each active binary market has a <strong>liquidity pool</strong>. You spend <strong>Pips</strong> to buy outcome shares at the current pool-implied price. Larger trades move the price more. The market page shows a live quote (e.g. Pips in → approximate shares out) before you confirm.
      </p>
      <p>
        The UI states a <strong>0.3% fee</strong> on these pool trades (see on-page hint on the trade card). Pool parameters (fee rate, max trade fraction) come from the API.
      </p>

      <h2>Limit orders (order book)</h2>
      <p>
        On active <strong>binary</strong> markets you can place <strong>limit orders</strong>: choose outcome (Yes/No), buy or sell, size, and price between 0 and 1. Orders rest on the book until someone takes the other side; matches create paired <strong>positions</strong>. The UI describes a <strong>2% fee on settlement</strong> for this path.
      </p>

      <h2>Funding trades</h2>
      <ul>
        <li>All execution is in <strong>Pips</strong> (1 PP = $1 USD display).</li>
        <li>Fund via Portfolio → <strong>Deposit from wallet</strong> or <strong>Deposit with crypto</strong>.</li>
        <li>Resolved markets credit winning positions back to Pips per platform rules.</li>
      </ul>

      <h2>Other fees</h2>
      <ul>
        <li><strong>Withdrawals:</strong> Platform fee (e.g. 2% with a minimum) — shown on the withdraw form.</li>
      </ul>

      <h2>Quotes and slippage (AMM)</h2>
      <p>
        Quotes reflect the pool at request time; the executed amount can differ if others trade first. If the trade exceeds the configured max fraction of reserves, the UI asks you to reduce size.
      </p>
    </div>
  )
}

function PositionCreationContent() {
  return (
    <div className="doc-section">
      <h1>Trading &amp; positions</h1>

      <p>
        You gain exposure by (1) <strong>buying pool shares</strong> with Pips on the AMM, or (2) having a <strong>limit order</strong> fill against another user. Both create <strong>positions</strong> stored in D1 and listed under Portfolio → Positions.
      </p>

      <h2>AMM trade</h2>
      <ol>
        <li>Open a market from Discover.</li>
        <li>Under <strong>Buy shares</strong>, pick <strong>Buy Yes</strong> or <strong>Buy No</strong>.</li>
        <li>Enter the Pips amount; read the quote line.</li>
        <li><strong>Confirm trade</strong> — pool and position update via <code>POST /api/trade</code>.</li>
      </ol>

      <h2>Limit order</h2>
      <ol>
        <li>Under <strong>Limit orders</strong>, choose outcome, buy/sell, share amount, and price (0–1).</li>
        <li>Submit — order is created via <code>POST /api/orders</code>; you may match immediately or rest on the book.</li>
        <li>Open orders for the market are listed on the same card (up to a small preview count).</li>
      </ol>

      <h2>Outcomes</h2>
      <ul>
        <li><strong>Binary:</strong> Yes vs No (labels may reflect True/False style in copy).</li>
        <li><strong>Multi-outcome:</strong> trade controls follow the market shape shown on the detail page.</li>
      </ul>

      <h2>Resolution</h2>
      <p>
        Operators run <code>POST /api/resolve-markets</code> on a schedule. When a market resolves, winning positions pay out to Pips balances according to platform rules.
      </p>

      <h2>Data</h2>
      <ul>
        <li>Positions and balances are keyed by your <strong>display name</strong> (party) in the API.</li>
        <li>Everything persists in <strong>Cloudflare D1</strong> (plus optional R2 backups for some writes).</li>
      </ul>
    </div>
  )
}

function DepositWithdrawContent() {
  return (
    <div className="doc-section">
      <h1>Pips: Deposit &amp; Withdraw</h1>
      
      <p>
        <strong>Pips (PP)</strong> are the in-platform currency (1 PP = $1 USD). You get Pips by depositing with <strong>crypto</strong> (wallet or platform address). You trade with Pips and can withdraw earnings; a withdrawal fee applies. Balance is stored in Cloudflare D1.
      </p>

      <h2>Deposit from wallet</h2>
      <p>In Portfolio → Balance, connect your Web3 wallet (e.g. MetaMask), choose token (USDC on Ethereum, native ETH, or native MATIC on Polygon), enter amount, and send. After the transaction confirms, sign the verification message; Pips are credited automatically. Use the same platform EVM address for both USDC and native transfers.</p>

      <h2>Deposit with crypto</h2>
      <p>Send supported crypto (USDC, or native ETH/MATIC) to the platform wallet; include your account ID in the memo when possible. After confirmation, we credit Pips (1:1 for stablecoins; native amounts credited as PP per deployment rules). Deposit addresses are shown in Portfolio → Deposit with crypto.</p>

      <h2>Withdrawals</h2>
      <p>In Portfolio, request a withdrawal by entering amount, destination address, network (Ethereum or Polygon), and token (USDC or native). A fee (e.g. 2%, min 1 PP) applies. Funds are sent from the platform wallet; status appears under &quot;Your withdrawal requests&quot;.</p>

      <h2>Operator APIs (reference)</h2>
      <ul>
        <li><code>POST /api/deposit-with-tx</code> — user-initiated wallet deposit with tx verification and signature.</li>
        <li><code>POST /api/deposit-crypto</code> — credit Pips after an incoming transfer (automation or manual ops).</li>
        <li><code>GET /api/deposit-addresses</code> — platform deposit addresses for the UI.</li>
        <li><code>POST /api/process-withdrawals</code> — send queued withdrawals from the platform wallet (server-side).</li>
        <li><code>GET|POST /api/get-user-balance</code> — balance for a party (query or JSON body <code>userParty</code>).</li>
        <li><code>POST /api/add-credits</code> — testing / admin: add Pips. When <code>PRIVILEGED_API_SECRET</code> or <code>AUTO_MARKETS_CRON_SECRET</code> is set on Pages, requires <code>X-Privileged-Secret</code> / <code>X-Cron-Secret</code> (see <code>docs/API.md</code>).</li>
      </ul>
    </div>
  )
}

function PortfolioContent() {
  return (
    <div className="doc-section">
      <h1>Portfolio</h1>

      <p>
        Your hub for <strong>balance</strong>, <strong>deposits</strong>, <strong>withdrawals</strong>, and <strong>positions</strong>. Tabs: <strong>Balance</strong>, <strong>Positions</strong>, <strong>Activity</strong> (in-app activity). For stored records across templates (legacy contract list), use <strong>Resources → Activity</strong> (<code>/activity</code>).
      </p>

      <h2>Balance tab</h2>
      <ul>
        <li><strong>Balance (PP):</strong> Your current Pips balance.</li>
        <li><strong>Deposit from wallet:</strong> Connect a Web3 wallet and send USDC (Ethereum), native ETH, or native MATIC (Polygon). Pips are credited after confirmation and verification signature.</li>
        <li><strong>Deposit with crypto:</strong> Platform addresses and your account ID for memo. Send USDC or native ETH/MATIC; we credit Pips when the platform wallet receives funds.</li>
        <li><strong>Withdraw Pips:</strong> Enter amount, destination address, network (Ethereum or Polygon), and token (USDC or native). A fee applies; requests appear in &quot;Your withdrawal requests&quot;.</li>
      </ul>

      <h2>Positions tab</h2>
      <p>All your active positions: market, outcome (Yes/No), size, and link to the market. Resolved positions are settled and Pips returned to your balance.</p>

      <h2>Activity tab</h2>
      <p>Chronological log of your activity (e.g. position creation, deposits). Newest first.</p>

      <h2>Data source</h2>
      <p>Balance and positions are stored in Cloudflare D1 and loaded via the app API.</p>
    </div>
  )
}

function BlockchainContent() {
  return (
    <div className="doc-section">
      <h1>Infrastructure</h1>

      <h2>Cloudflare-first backend</h2>
      <p>
        The live API is implemented as <strong>Cloudflare Pages Functions</strong> (<code>/api/*</code>) with <strong>D1</strong> as the system of record for markets, pools, orders, positions, balances, deposits, and withdrawals. <strong>KV</strong> caches light metadata (e.g. auto-market probes). <strong>R2</strong> optionally backs up selected contract payloads.
      </p>

      <h2>On-chain touchpoints</h2>
      <p>
        <strong>Ethereum</strong> and <strong>Polygon</strong> are used for <strong>deposits and withdrawals</strong> (USDC and native ETH/MATIC) via a configured platform wallet and RPC (e.g. Alchemy). Trading and Pips balances are <strong>off-chain</strong> in D1 — no user-signed chain tx is required to trade.
      </p>

      <h2>Clients</h2>
      <p>
        <strong>Web:</strong> React + Vite, React Router, wallet connect for deposits. <strong>Desktop:</strong> Tauri wraps the same frontend with a native window, sidebar navigation, and tray sign-out. Both talk to the same API origin.
      </p>
    </div>
  )
}

function APIsAndOraclesContent() {
  return (
    <div className="doc-section">
      <h1>APIs & Oracles</h1>
      
      <h2>Overview</h2>
      <p>
        The application integrates with various APIs and oracles to provide data for market resolution 
        and blockchain interactions. This section documents all currently used APIs and oracles, as well 
        as potential future integrations.
      </p>

      <h2>Current APIs & Oracles</h2>

      <h3>RedStone Oracle ✅</h3>
      <p><strong>Status:</strong> Implemented and Active</p>
      <p><strong>Purpose:</strong> Financial market data for market resolution</p>
      <p><strong>What it provides:</strong></p>
      <ul>
        <li>Real-time price data for cryptocurrencies (BTC, ETH, USDC, USDT, etc.)</li>
        <li>Stock prices (AAPL, TSLA, GOOGL, etc.)</li>
        <li>Commodities (Gold, Oil, etc.)</li>
        <li>Market indices (S&P 500, NASDAQ, etc.)</li>
      </ul>
      <p><strong>API Endpoint:</strong> <code>GET /api/oracle?symbol={'{symbol}'}</code></p>
      <p><strong>Usage:</strong> Market resolution for price-based markets</p>
      <p><strong>Limitations:</strong> Primarily financial/crypto data, may not cover sports, politics, etc.</p>
      <p><strong>Cost:</strong> Free (no API key required for basic usage)</p>
      <p><strong>Documentation:</strong> <a href="https://docs.redstone.finance/" target="_blank" rel="noopener noreferrer">RedStone Documentation</a></p>

      <h3>Cloudflare D1 ✅</h3>
      <p><strong>Status:</strong> Implemented and Active</p>
      <p><strong>Purpose:</strong> Data storage (markets, positions, balances, contracts)</p>
      <p><strong>What it provides:</strong></p>
      <ul>
        <li>Market and pool data</li>
        <li>Position tracking</li>
        <li>User balances (Credits)</li>
        <li>Contract metadata</li>
      </ul>
      <p><strong>API:</strong> All <code>/api/*</code> routes are served by Cloudflare Pages Functions and read/write D1 (and optional KV/R2).</p>

      <h2>Potential Future APIs & Oracles</h2>

      <h3>The Odds API (Sports) ✅</h3>
      <p><strong>Status:</strong> Implemented and Active</p>
      <p><strong>Purpose:</strong> Sports event odds and results for market creation and resolution</p>
      <p><strong>Usage:</strong> Automated markets such as &quot;Will [Home Team] win vs [Away Team]?&quot; Resolved via The Odds API scores after the game. Set <code>THE_ODDS_API_KEY</code> in Cloudflare env.</p>

      <h3>Political/Election APIs ⚠️</h3>
      <p><strong>Status:</strong> Not Implemented</p>
      <p><strong>Purpose:</strong> Election results and political data</p>
      <p><strong>Recommended Providers:</strong></p>
      <ul>
        <li><strong>NewsAPI</strong> - News aggregation (free tier available)</li>
        <li><strong>Official Election APIs</strong> - Government election results</li>
        <li><strong>RealClearPolitics API</strong> - Political polling data</li>
      </ul>
      <p><strong>Use Cases:</strong> &quot;Will Candidate X win the election?&quot; markets</p>
      <p><strong>Trust Level:</strong> Very High for official results, Medium for polling</p>
      <p><strong>Priority:</strong> Medium</p>

      <h3>OpenWeatherMap &amp; WeatherAPI.com (Weather) ✅</h3>
      <p><strong>Status:</strong> Implemented and Active</p>
      <p><strong>Purpose:</strong> Weather forecasts for binary markets (e.g. &quot;Will it rain in [city] on [date]?&quot;). Set <code>OPENWEATHER_API_KEY</code> or <code>WEATHERAPI_API_KEY</code> in Cloudflare env.</p>

      <h3>GNews, Perigon, NewsAPI.ai, NewsData.io (News) ✅</h3>
      <p><strong>Status:</strong> Implemented and Active</p>
      <p><strong>Purpose:</strong> News headlines and topic search for headline/topic-based markets. Set <code>GNEWS_API_KEY</code>, <code>PERIGON_API_KEY</code>, <code>NEWSAPI_AI_KEY</code>, or <code>NEWSDATA_API_KEY</code> in Cloudflare env.</p>

      <h2>Oracle Selection by Market Type</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Market Type</th>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Recommended Oracle</th>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Trust Level</th>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <td style={{ padding: '0.75rem' }}>Crypto Prices</td>
            <td style={{ padding: '0.75rem' }}>RedStone</td>
            <td style={{ padding: '0.75rem' }}>High</td>
            <td style={{ padding: '0.75rem', color: 'var(--color-success)' }}>✅ Implemented</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <td style={{ padding: '0.75rem' }}>Stock Prices</td>
            <td style={{ padding: '0.75rem' }}>RedStone</td>
            <td style={{ padding: '0.75rem' }}>High</td>
            <td style={{ padding: '0.75rem', color: 'var(--color-success)' }}>✅ Implemented</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <td style={{ padding: '0.75rem' }}>Sports Results</td>
            <td style={{ padding: '0.75rem' }}>The Odds API</td>
            <td style={{ padding: '0.75rem' }}>High</td>
            <td style={{ padding: '0.75rem', color: 'var(--color-success)' }}>✅ Implemented</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <td style={{ padding: '0.75rem' }}>Elections</td>
            <td style={{ padding: '0.75rem' }}>Official Election APIs</td>
            <td style={{ padding: '0.75rem' }}>Very High</td>
            <td style={{ padding: '0.75rem', color: 'var(--color-warning)' }}>⚠️ Not Implemented</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <td style={{ padding: '0.75rem' }}>Weather</td>
            <td style={{ padding: '0.75rem' }}>OpenWeatherMap / WeatherAPI.com</td>
            <td style={{ padding: '0.75rem' }}>High</td>
            <td style={{ padding: '0.75rem', color: 'var(--color-success)' }}>✅ Implemented</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <td style={{ padding: '0.75rem' }}>News / Headlines</td>
            <td style={{ padding: '0.75rem' }}>GNews / Perigon / NewsAPI.ai / NewsData.io</td>
            <td style={{ padding: '0.75rem' }}>Medium-High</td>
            <td style={{ padding: '0.75rem', color: 'var(--color-success)' }}>✅ Implemented</td>
          </tr>
        </tbody>
      </table>

      <h2>Oracle expansion</h2>
      <p>
        <strong>Shipped today:</strong> sports, stocks/crypto trends, weather, and multi-provider news seeding + resolution paths wired in the worker. <strong>Next wave:</strong> first-class political/election resolution (official results providers, dedicated event builders) — see <code>docs/ORACLE_STRATEGY.md (Phase 2)</code>. Market rows already carry <code>oracleSource</code> and <code>oracleConfig</code> for adding types without breaking older markets.
      </p>

      <h2>Oracle Requirements</h2>
      <p>All oracles must meet these minimum requirements:</p>
      <ul>
        <li><strong>Reliability:</strong> 99%+ uptime</li>
        <li><strong>Accuracy:</strong> Data from official/trusted sources</li>
        <li><strong>Timeliness:</strong> Real-time or near-real-time data</li>
        <li><strong>API Access:</strong> Public API or reasonable pricing</li>
        <li><strong>Documentation:</strong> Clear API documentation</li>
        <li><strong>Rate Limits:</strong> Sufficient for market resolution needs</li>
      </ul>

      <h2>Security & Best Practices</h2>
      <ul>
        <li><strong>API Key Management:</strong> Store keys securely in environment variables</li>
        <li><strong>Rate Limiting:</strong> Implement rate limiting to prevent abuse</li>
        <li><strong>Data Validation:</strong> Validate oracle data before using for resolution</li>
        <li><strong>Multiple Sources:</strong> Consider aggregating from multiple sources for critical markets</li>
        <li><strong>Timestamp Verification:</strong> Ensure data timestamps are recent and valid</li>
      </ul>

      <h2>Documentation</h2>
      <p>For more detailed information, see:</p>
      <ul>
        <li><strong>Oracle Strategy:</strong> <code>docs/ORACLE_STRATEGY.md</code> - Comprehensive oracle strategy and recommendations</li>
        <li><strong>API Reference:</strong> See API Reference section for endpoint documentation</li>
      </ul>
    </div>
  )
}

function ArchitectureContent() {
  return (
    <div className="doc-section">
      <h1>Architecture</h1>
      
      <h2>Overview</h2>
      <p>
        Trading uses <strong>Pips</strong> stored in <strong>Cloudflare D1</strong>. Deposits: crypto (wallet or platform address). Markets are automated from APIs; resolution runs on oracles and due dates.
      </p>

      <h2>Technology stack</h2>
      <ul>
        <li><strong>Frontend:</strong> React (Vite), React Router, contexts for account and Web3 wallet</li>
        <li><strong>Desktop:</strong> Tauri 2 (Rust shell) + same web bundle</li>
        <li><strong>API:</strong> Cloudflare Pages Functions router in <code>functions/api/[[path]].js</code></li>
        <li><strong>Database:</strong> D1 (markets, pools, orders, positions, balances, contracts)</li>
        <li><strong>Auth:</strong> Email/password via <code>/api/register</code> and <code>/api/sign-in</code>; session in <code>localStorage</code></li>
        <li><strong>Crypto rails:</strong> viem for verify/send; USDC + native on Ethereum and Polygon</li>
      </ul>

      <h2>Data flow</h2>
      <ul>
        <li><strong>Deposit:</strong> Wallet flow (<code>deposit-with-tx</code>) or ops crediting (<code>deposit-crypto</code>) → Pips in D1</li>
        <li><strong>AMM trade:</strong> <code>POST /api/trade</code> adjusts pool + position</li>
        <li><strong>Limit order:</strong> <code>POST /api/orders</code> matches or rests on book</li>
        <li><strong>Tip:</strong> <code>POST /api/transfer-pips</code> moves balance between parties</li>
        <li><strong>Resolution:</strong> Scheduled <code>POST /api/resolve-markets</code></li>
        <li><strong>Withdraw:</strong> User request row + <code>POST /api/process-withdrawals</code> (or equivalent ops) sends on-chain</li>
      </ul>

      <h2>API overview</h2>
      <ul>
        <li><strong>Auth &amp; account:</strong> <code>register</code>, <code>sign-in</code>, <code>account</code></li>
        <li><strong>Balance &amp; tips:</strong> <code>get-user-balance</code>, <code>update-user-balance</code>, <code>transfer-pips</code>, <code>add-credits</code> (<code>update-user-balance</code> / <code>add-credits</code> require ops secret headers when configured on Pages)</li>
        <li><strong>Markets:</strong> <code>markets</code>, <code>pools</code>, <code>trade</code>, <code>auto-markets</code>, <code>resolve-markets</code>, <code>update-market-status</code></li>
        <li><strong>Orders:</strong> <code>orders</code> (GET list, POST create/cancel)</li>
        <li><strong>Deposits &amp; withdrawals:</strong> <code>deposit-addresses</code>, <code>deposit-with-tx</code>, <code>deposit-crypto</code>, <code>deposit-records</code>, <code>withdraw-request</code>, <code>withdrawal-requests</code>, <code>process-withdrawals</code></li>
        <li><strong>Legacy contracts:</strong> <code>get-contracts</code>, <code>store-contract</code>, <code>update-contract-status</code>, <code>create-position</code> (<code>store-contract</code> / <code>create-position</code> / <code>resolve-markets</code> use ops secret headers when configured)</li>
        <li><strong>Health &amp; oracle:</strong> <code>health</code>, <code>oracle?symbol=</code></li>
      </ul>

      <h2>Storage</h2>
      <ul>
        <li><strong>D1:</strong> Markets, pools, positions, balances, deposits, withdrawal requests</li>
        <li><strong>KV/R2:</strong> Optional cache and backup</li>
        <li><strong>localStorage:</strong> Session (accountId, display name)</li>
      </ul>
    </div>
  )
}

function SecurityContent() {
  return (
    <div className="doc-section">
      <h1>Security</h1>

      <h2>Display name vs account ID</h2>
      <p>
        Your <strong>display name</strong> is public (navbar, tips, order book). It is not a secret, but it <strong>identifies</strong> you in the ledger. Your <strong>account ID</strong> is used in deposit memos and should be treated as sensitive reference data — do not post it publicly.
      </p>

      <h2>Authentication</h2>
      <p>
        Email and password authenticate you to the product. After sign-in, the browser stores session fields in <code>localStorage</code> under a virtual-account key. <strong>Sign out / Disconnect</strong> clears it; on desktop, the tray can also sign you out.
      </p>
      <ul>
        <li>Use a strong, unique password.</li>
        <li>On shared computers, always sign out when done.</li>
      </ul>

      <h2>Authorization model</h2>
      <p>
        API calls from the UI send your <strong>party</strong> (display name) for balance, trade, and withdraw actions. Production deployments should continue to harden this (session tokens, CSRF, rate limits, server-side authorization where needed). Wallet signatures are used where deposit verification requires them.
      </p>

      <h2>Data security</h2>
      <ul>
        <li>D1 and secrets are only reachable from the worker — not from the browser.</li>
        <li>Platform private keys and API keys belong in Cloudflare environment variables, never in the client bundle.</li>
        <li>Restrict or remove <code>add-credits</code>, <code>auto-markets</code>, and similar power endpoints in public production (API key, IP allowlist, or Workers Access).</li>
      </ul>
    </div>
  )
}

function RoadmapContent() {
  return (
    <div className="doc-section">
      <h1>Roadmap</h1>
      <p>
        High-level plan aligned with the live codebase and <code>docs/PLATFORM_VISION_AND_ROADMAP.md</code>. Status reflects intent for the public product — timelines shift with shipping priorities.
      </p>

      <div className="docs-roadmap" aria-label="Product roadmap timeline">
        <div className="docs-roadmap-track">
          <article className="docs-roadmap-card docs-roadmap-card--live">
            <span className="docs-roadmap-badge">Live</span>
            <h2 className="docs-roadmap-card-title">Core platform</h2>
            <ul>
              <li>Email accounts, Dashboard, Profile, Portfolio (deposits, withdrawals, positions, activity)</li>
              <li>Pips ledger in D1; crypto deposit/withdraw on Ethereum &amp; Polygon (USDC + native)</li>
              <li>Automated market seeding (<code>auto-markets</code>) and resolution (<code>resolve-markets</code>)</li>
              <li>Discover categories, market detail, AMM trades, limit order book, tips (<code>transfer-pips</code>)</li>
              <li>Desktop app (Tauri) + web client; documentation and download pages</li>
            </ul>
          </article>

          <article className="docs-roadmap-card docs-roadmap-card--next">
            <span className="docs-roadmap-badge">Next</span>
            <h2 className="docs-roadmap-card-title">Operations &amp; hardening</h2>
            <ul>
              <li>Scheduled cron (or Worker trigger) for <code>auto-markets</code> and <code>resolve-markets</code></li>
              <li>Lock down privileged routes (<code>add-credits</code>, bulk seed) behind auth or secrets</li>
              <li>Monitoring, alerts, and withdrawal queue runbooks (<code>docs/GET_APP_UP_AND_RUNNING.md</code>)</li>
            </ul>
          </article>

          <article className="docs-roadmap-card docs-roadmap-card--explore">
            <span className="docs-roadmap-badge">Exploring</span>
            <h2 className="docs-roadmap-card-title">Markets &amp; rails</h2>
            <ul>
              <li>Political / election oracles and richer news verification (<code>docs/ORACLE_STRATEGY.md (Phase 2)</code>)</li>
              <li>Additional EVM chains or assets for deposit/withdraw</li>
              <li>AMM upgrades (e.g. alternative curves, LP incentives) per vision doc</li>
              <li>Scalar (range buckets) and conditional (linked market id) in create flow; deeper analytics</li>
            </ul>
          </article>
        </div>
      </div>

      <figure className="docs-roadmap-diagram" aria-label="Roadmap flow diagram">
        <figcaption className="docs-roadmap-diagram-caption">Directional flow</figcaption>
        <pre className="docs-roadmap-ascii">{`  [ Live: trade + Pips + auto markets ]
              │
              ▼
  [ Next: cron + security + ops polish ]
              │
              ▼
  [ Explore: new oracles, chains, AMM v2, new market shapes ]`}</pre>
      </figure>
    </div>
  )
}

function APIReferenceContent() {
  return (
    <div className="doc-section">
      <h1>API reference</h1>
      <p>All paths are under <code>/api/</code> on your Pages domain unless proxied. Method shown when not GET.</p>

      <h2>Account &amp; auth</h2>
      <ul>
        <li><code>POST /api/register</code> — create account (email, password, displayName, fundChoice).</li>
        <li><code>POST /api/sign-in</code> — session payload with account fields.</li>
        <li><code>GET /api/account?accountId=…</code> / <code>POST /api/account</code> — read/update stored account metadata.</li>
      </ul>

      <h2>Balance &amp; P2P</h2>
      <ul>
        <li><code>GET|POST /api/get-user-balance</code> — <code>userParty</code> in query or JSON body; returns <code>{'{ success, balance }'}</code> with <code>balance</code> as a decimal string.</li>
        <li><code>POST /api/update-user-balance</code> — admin-style add/subtract with <code>userParty</code>, <code>amount</code>, <code>operation</code> (<code>add</code> | <code>subtract</code>). Ops secret headers when <code>PRIVILEGED_API_SECRET</code> / cron secret is set on Pages.</li>
        <li><code>POST /api/transfer-pips</code> — body <code>{'{ fromParty, toParty, amount }'}</code>; moves Pips between parties.</li>
        <li><code>POST /api/add-credits</code> — add Pips (dev/test); ops secret headers when configured on Pages.</li>
      </ul>

      <h2>Markets, pools, AMM</h2>
      <ul>
        <li><code>GET /api/markets</code> — list market contracts.</li>
        <li><code>GET /api/pools?marketId=…</code> — pool state for AMM quotes.</li>
        <li><code>POST /api/trade</code> — execute pool trade (spend Pips for shares).</li>
        <li><code>GET|POST /api/auto-markets</code> — list events, probe env, or <code>seed</code> / <code>seed_all</code> markets from configured APIs.</li>
        <li><code>POST /api/resolve-markets</code> — resolve due markets from oracle data. Ops secret headers when configured; cron Worker sends them.</li>
        <li><code>POST /api/update-market-status</code> — administrative status changes.</li>
        <li><code>POST /api/create-position</code> — legacy/helper position creation; ops secret when configured.</li>
      </ul>

      <h2>Limit orders</h2>
      <ul>
        <li><code>GET /api/orders?marketId=…&amp;outcome=…</code> — open orders.</li>
        <li><code>POST /api/orders</code> — place a limit order (<code>marketId</code>, <code>outcome</code>, <code>side</code>, <code>amount</code>, <code>price</code>, <code>owner</code>) or cancel (<code>cancel</code>, <code>orderId</code>, <code>owner</code>).</li>
      </ul>

      <h2>Deposits &amp; withdrawals</h2>
      <ul>
        <li><code>GET /api/deposit-addresses</code> — addresses shown in the UI.</li>
        <li><code>POST /api/deposit-with-tx</code> — verify on-chain transfer + credit Pips.</li>
        <li><code>POST /api/deposit-crypto</code> — operator crediting path after detecting deposits.</li>
        <li><code>GET /api/deposit-records?userParty=…</code> — history.</li>
        <li><code>POST /api/withdraw-request</code> — enqueue withdrawal.</li>
        <li><code>GET /api/withdrawal-requests?userParty=…</code> — list user requests.</li>
        <li><code>POST /api/process-withdrawals</code> — platform wallet payout worker.</li>
      </ul>

      <h2>Legacy contract storage (admin / history UI)</h2>
      <ul>
        <li><code>GET|POST /api/get-contracts</code> — filter by <code>party</code>, <code>templateType</code>, <code>status</code>.</li>
        <li><code>POST /api/store-contract</code> — persist a contract payload; ops secret when configured.</li>
        <li><code>PUT|PATCH /api/update-contract-status</code> — approve/reject flows.</li>
      </ul>

      <h2>Oracle &amp; health</h2>
      <ul>
        <li><code>GET /api/oracle?symbol=…</code> — price-style oracle (RedStone-backed in deployment).</li>
        <li><code>GET /api/health</code> — liveness.</li>
      </ul>

      <h2>Errors</h2>
      <p>JSON body typically includes <code>error</code> and optional <code>message</code> / <code>details</code>; HTTP status follows REST conventions.</p>
    </div>
  )
}
