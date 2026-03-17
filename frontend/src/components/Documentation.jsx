import { useState, useRef, useCallback } from 'react'
import './Documentation.css'

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('getting-started')
  const tocNavRef = useRef(null)

  /* Mouse wheel scrolls TOC horizontally (wheel down = scroll right); only capture when TOC can scroll */
  const handleTocWheel = useCallback((e) => {
    const el = tocNavRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    if (maxScroll <= 2) return /* no overflow, let event bubble */
    const canScrollRight = el.scrollLeft < maxScroll - 2
    const canScrollLeft = el.scrollLeft > 2
    const scrollingDown = e.deltaY > 0
    const scrollingUp = e.deltaY < 0
    if ((scrollingDown && !canScrollRight) || (scrollingUp && !canScrollLeft)) return
    e.preventDefault()
    el.scrollLeft += e.deltaY
  }, [])

  const sections = [
    { id: 'getting-started', title: 'Getting Started' },
    { id: 'wallet-authentication', title: 'Wallet & Authentication' },
    { id: 'market-creation', title: 'Market Creation' },
    { id: 'amm-fees', title: 'AMM & Fees' },
    { id: 'position-creation', title: 'Position Creation' },
    { id: 'deposit-withdraw', title: 'Deposit & Withdraw' },
    { id: 'portfolio', title: 'Portfolio' },
    { id: 'admin-dashboard', title: 'Admin Dashboard' },
    { id: 'blockchain', title: 'Blockchain Integration' },
    { id: 'apis-oracles', title: 'APIs & Oracles' },
    { id: 'architecture', title: 'Architecture' },
    { id: 'security', title: 'Security' },
    { id: 'api-reference', title: 'API Reference' }
  ]

  const renderContent = () => {
    switch (activeSection) {
      case 'getting-started':
        return <GettingStartedContent />
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
      case 'admin-dashboard':
        return <AdminDashboardContent />
      case 'blockchain':
        return <BlockchainContent />
      case 'apis-oracles':
        return <APIsAndOraclesContent />
      case 'architecture':
        return <ArchitectureContent />
      case 'security':
        return <SecurityContent />
      case 'api-reference':
        return <APIReferenceContent />
      default:
        return <GettingStartedContent />
    }
  }

  return (
    <div className="documentation-container">
      {/* TOC bar: single row below navbar, above content — block layout so it never collapses */}
      <header className="documentation-toc-bar" aria-label="Documentation sections">
        <nav
          ref={tocNavRef}
          className="documentation-nav"
          onWheel={handleTocWheel}
        >
          <ul>
            {sections.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  className={activeSection === section.id ? 'active' : ''}
                  onClick={() => setActiveSection(section.id)}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <div
        className="documentation-content"
        role="region"
        aria-label="Documentation content"
        tabIndex={0}
      >
        {renderContent()}
      </div>
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
        Trade on prediction markets. Deposit with <strong>card (Stripe)</strong> or <strong>crypto</strong> to get <strong>Pips</strong> (1 PP = $1 USD). Use Pips to buy Yes/No shares; withdraw earnings (fee applies). Markets are created automatically from real-world data; you only trade. All data runs on Cloudflare (D1, KV, R2).
      </p>

      <h2>Prerequisites</h2>
      <ul>
        <li>An account — create one (email + password) or sign in from the nav</li>
      </ul>

      <h2>Quick Start</h2>
      <ol>
        <li><strong>Create account:</strong> Click &quot;Create account&quot;, enter email, password, and display name. Choose how you&apos;ll add funds (card, crypto, or later).</li>
        <li><strong>Add Pips:</strong> In Portfolio, use &quot;Deposit with card&quot; (pick $5, $10, $25, $50, or $100) or enter a custom amount. Or deposit crypto; we credit Pips 1:1.</li>
        <li><strong>Discover markets:</strong> Browse All Markets or categories (Global Events, Industry, etc.). Markets are automated — no user-created markets.</li>
        <li><strong>Trade:</strong> Open a market and use the trade panel to buy Yes or No with Pips. View positions and balance in Portfolio.</li>
      </ol>

      <h2>Key Concepts</h2>
      <ul>
        <li><strong>Pips (PP):</strong> In-platform currency. 1 PP = $1 USD. You get Pips by depositing (card or crypto); you spend them to trade and can withdraw (fee applies).</li>
        <li><strong>Display name / Party:</strong> Your public identifier; used for positions and balance. Account is stored locally and optionally on the server.</li>
      </ul>
    </div>
  )
}

function WalletAuthenticationContent() {
  return (
    <div className="doc-section">
      <h1>Account & Sign-in</h1>
      
      <h2>Creating an account</h2>
      <p>
        Create an account with <strong>email and password</strong>. You choose a display name and how you&apos;ll add funds (card, crypto, or later). Your account is identified by display name and account ID (stored locally and on the server).
      </p>
      
      <h3>Registration steps</h3>
      <ol>
        <li><strong>Step 1 — Account:</strong> Enter email, password, confirm password, and display name.</li>
        <li><strong>Step 2 — Fund your account:</strong> Choose &quot;Card (Stripe)&quot;, &quot;Crypto&quot;, or &quot;Add funds later&quot;. If you choose card, you&apos;ll go to Portfolio after signup to pick a package ($5–$100).</li>
        <li><strong>Step 3 — Complete:</strong> Review and click &quot;Create account&quot;. You&apos;re then taken to Dashboard (or Portfolio if you chose card, to add Pips).</li>
      </ol>

      <h2>Signing in</h2>
      <p>
        Use &quot;Sign in&quot; and enter your <strong>email and password</strong> to restore your session. You&apos;ll land on Dashboard (or the page you were trying to open).
      </p>

      <h2>Account page</h2>
      <p>When signed in, use &quot;Account&quot; in the nav to view your display name, account ID, and links to Dashboard, Profile, and Portfolio.</p>

      <h2>Security notes</h2>
      <ul>
        <li>Display name and account ID are used for positions and Pips balance</li>
        <li>Session data is stored in browser localStorage and optionally synced to the server</li>
      </ul>
    </div>
  )
}

function MarketCreationContent() {
  return (
    <div className="doc-section">
      <h1>Markets & Discovery</h1>
      
      <p>
        Prediction markets on dice.express are <strong>created automatically</strong> from external data (sports, crypto, weather, news, etc.). 
        <strong> Users do not create markets.</strong> You browse and trade only.
      </p>

      <h2>How to trade</h2>
      <ol>
        <li>Go to <strong>Discover</strong> → All Markets or a category (Global Events, Industry, Virtual Realities)</li>
        <li>Open a market to see details, resolution time, and current Yes/No odds</li>
        <li>Use the <strong>Trade</strong> panel to buy Yes or No with Pips (AMM sets the price)</li>
        <li>View positions and balance in <strong>Portfolio</strong></li>
      </ol>

      <h2>Market sources</h2>
      <p>Markets are seeded from APIs (e.g. The Odds API, CoinGecko, OpenWeatherMap, GNews). They auto-resolve when the outcome is known. No manual market creation or approval flow for users.</p>

      <h2>Market types</h2>
      <p>Most markets are <strong>binary</strong> (Yes/No). Multi-outcome markets are supported where the data source provides multiple outcomes.</p>

      <h2>Important notes</h2>
      <ul>
        <li>All market and position data is stored in Cloudflare D1</li>
        <li>Resolution is driven by oracles and due dates; no user-submitted resolution</li>
      </ul>
    </div>
  )
}

function AMMFeesContent() {
  return (
    <div className="doc-section">
      <h1>AMM &amp; Fees</h1>
      <p>
        Markets use an <strong>Automated Market Maker (AMM)</strong>. You buy Yes or No shares with <strong>Pips</strong>; the AMM sets prices from the current pool state.
      </p>

      <h2>How the AMM works</h2>
      <p>
        Each market has a liquidity pool. You pay Pips and receive shares (or sell shares for Pips). 
        Larger orders move the price more; this gives continuous liquidity without a counterparty.
      </p>

      <h2>Trading with Pips</h2>
      <ul>
        <li>All trading uses <strong>Pips (PP)</strong> — 1 PP = $1 USD.</li>
        <li>Add Pips via Portfolio: <strong>Deposit with card</strong> (Stripe: $5, $10, $25, $50, $100 or custom) or <strong>deposit crypto</strong> (we credit Pips 1:1).</li>
        <li>Buying Yes/No spends Pips; settling or selling returns Pips to your balance.</li>
      </ul>

      <h2>Fees</h2>
      <ul>
        <li><strong>Deposit (card):</strong> No extra fee; you pay the package or custom amount in USD.</li>
        <li><strong>Withdrawal:</strong> A fee applies (e.g. 2%, min 1 PP). Shown in Portfolio when you request a withdrawal.</li>
        <li><strong>Trading:</strong> Any trading fee is shown in the trade panel when you place an order.</li>
      </ul>

      <h2>Quotes and slippage</h2>
      <p>
        The UI shows a quote before you confirm (e.g. how many shares for X PP). Quotes use the current pool; execution may differ slightly if the pool changes (slippage). You can set a minimum acceptable amount to limit downside.
      </p>
    </div>
  )
}

function PositionCreationContent() {
  return (
    <div className="doc-section">
      <h1>Positions &amp; Trading</h1>
      
      <p>
        You open positions by buying Yes or No (or outcome) shares on a market, using your <strong>Pips</strong> balance. Positions are stored in Cloudflare D1. Add Pips from Portfolio (card or crypto) if needed.
      </p>

      <h2>Placing a trade</h2>
      <ol>
        <li>Open a market from Discover (All Markets or a category)</li>
        <li>In the <strong>Trade</strong> section, choose <strong>Yes</strong> or <strong>No</strong> (or the outcome for multi-outcome markets)</li>
        <li>Enter the amount of Pips you want to spend (or shares you want to buy)</li>
        <li>Review the quote and confirm. Your position is created and appears in Portfolio</li>
      </ol>

      <h2>Position types</h2>
      <ul>
        <li><strong>Yes:</strong> You profit if the market resolves to Yes</li>
        <li><strong>No:</strong> You profit if the market resolves to No</li>
        <li>Multi-outcome markets: choose one of the listed outcomes</li>
      </ul>

      <h2>Resolution</h2>
      <p>Markets auto-resolve when the outcome is known (from oracles/APIs). When resolved, winning positions are settled and Pips are credited to your balance.</p>

      <h2>Important notes</h2>
      <ul>
        <li>Positions use your Pips balance (deposit via card or crypto in Portfolio)</li>
        <li>All position data is stored in Cloudflare D1 and linked to your account (party ID)</li>
      </ul>
    </div>
  )
}

function DepositWithdrawContent() {
  return (
    <div className="doc-section">
      <h1>Pips: Deposit &amp; Withdraw</h1>
      
      <p>
        <strong>Pips (PP)</strong> are the in-platform currency (1 PP = $1 USD). You get Pips by depositing with <strong>card (Stripe)</strong> or <strong>crypto</strong>. You trade with Pips and can withdraw earnings; a withdrawal fee applies. Balance is stored in Cloudflare D1.
      </p>

      <h2>Deposit with card (Stripe)</h2>
      <p>In <strong>Portfolio</strong> → Deposit with card:</p>
      <ul>
        <li><strong>Quick add:</strong> Choose $5, $10, $25, $50, or $100 — you’re sent to Stripe Checkout for that amount. After payment, Pips are credited via webhook.</li>
        <li><strong>Custom amount:</strong> Enter any amount (PP) and click &quot;Deposit with card&quot; for a one-off Stripe Checkout.</li>
      </ul>
      <p>Stripe products ($5–$100) can be configured in Stripe Dashboard; optional env vars <code>VITE_STRIPE_PRICE_5</code> etc. let the app use those product Price IDs so Checkout shows the correct name and image.</p>

      <h2>Deposit with crypto</h2>
      <p>Send supported crypto (e.g. USDC) to the platform wallet; include your account ID in the memo when possible. After confirmation, we credit Pips (1:1 for stablecoins). Deposit address and networks are provided by support or in-app.</p>

      <h2>Withdrawals</h2>
      <p>In Portfolio, request a withdrawal by entering amount, destination address, and network. A fee (e.g. 2%, min 1 PP) applies. Funds are sent from the platform wallet; status appears under &quot;Your withdrawal requests&quot;.</p>

      <h2>APIs (reference)</h2>
      <ul>
        <li><code>POST /api/stripe-create-checkout-session</code> — create Stripe Checkout (body: <code>{`{ userParty, amount }`}</code> or <code>{`{ userParty, priceId }`}</code>)</li>
        <li><code>POST /api/get-user-balance</code> — get balance (body: <code>{`{ userParty }`}</code>)</li>
        <li><code>POST /api/add-credits</code> — internal/testing: add Pips (body: <code>{`{ userParty, amount }`}</code>)</li>
      </ul>
    </div>
  )
}

function PortfolioContent() {
  return (
    <div className="doc-section">
      <h1>Portfolio</h1>
      
      <p>
        Your hub for <strong>balance</strong>, <strong>deposits</strong>, <strong>withdrawals</strong>, and <strong>positions</strong>. Use the tabs: Balance, Positions, Activity.
      </p>

      <h2>Balance tab</h2>
      <ul>
        <li><strong>Balance (PP):</strong> Your current Pips balance.</li>
        <li><strong>Add Pips:</strong> Testing-only top-up (internal API).</li>
        <li><strong>Deposit with card:</strong> Quick-add packages ($5, $10, $25, $50, $100) or enter a custom amount. Redirects to Stripe Checkout; Pips are credited after payment.</li>
        <li><strong>Deposit with crypto:</strong> Instructions and your account ID for memo. We credit Pips when the platform wallet receives funds.</li>
        <li><strong>Withdraw Pips:</strong> Enter amount, destination address, and network. A fee applies; requests appear in &quot;Your withdrawal requests&quot;.</li>
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

function AdminDashboardContent() {
  return (
    <div className="doc-section">
      <h1>Admin Dashboard</h1>
      
      <p>
        Optional admin area for reviewing and approving/rejecting market creation requests (if your deployment allows user-submitted markets). In the default dice.express setup, <strong>markets are automated</strong> from APIs, so this dashboard may be used for other admin tasks or legacy flows.
      </p>

      <h2>Access</h2>
      <p>Only users with admin privileges can access the Admin Dashboard. Typical use: review pending requests, approve or reject, and have approved markets appear in the list.</p>

      <h2>Data source</h2>
      <p>Admin data is read from and written to Cloudflare D1.</p>
    </div>
  )
}

function BlockchainContent() {
  return (
    <div className="doc-section">
      <h1>Infrastructure &amp; Data</h1>
      
      <h2>Cloudflare-first</h2>
      <p>
        Core data and API run on <strong>Cloudflare</strong>: D1 (SQL for markets, positions, balances), KV (cache), R2 (optional backup). Pips balances are in D1. No on-chain ledger is required for trading.
      </p>

      <h2>Payments</h2>
      <p><strong>Card:</strong> Stripe Checkout and webhooks; no blockchain. <strong>Crypto:</strong> Deposit/withdraw use the platform wallet; you send/receive crypto and we credit or debit Pips in D1. Supported networks (e.g. Ethereum, Polygon) are configured per deployment.</p>
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

      <h3>Sports Data APIs ⚠️</h3>
      <p><strong>Status:</strong> Not Implemented</p>
      <p><strong>Purpose:</strong> Sports event results for market resolution</p>
      <p><strong>Recommended Providers:</strong></p>
      <ul>
        <li><strong>The Odds API</strong> - Sports odds and results (~$10-50/month)</li>
        <li><strong>SportsDataIO</strong> - Comprehensive sports data (~$50-200/month)</li>
        <li><strong>API-Football</strong> - Football/soccer specific</li>
        <li><strong>RapidAPI Sports</strong> - Multiple sports coverage</li>
      </ul>
      <p><strong>Use Cases:</strong> "Will Team A win the game on [date]?" markets</p>
      <p><strong>Trust Level:</strong> High for official results, Medium for odds</p>
      <p><strong>Priority:</strong> High (popular market type)</p>

      <h3>Political/Election APIs ⚠️</h3>
      <p><strong>Status:</strong> Not Implemented</p>
      <p><strong>Purpose:</strong> Election results and political data</p>
      <p><strong>Recommended Providers:</strong></p>
      <ul>
        <li><strong>NewsAPI</strong> - News aggregation (free tier available)</li>
        <li><strong>Official Election APIs</strong> - Government election results</li>
        <li><strong>RealClearPolitics API</strong> - Political polling data</li>
      </ul>
      <p><strong>Use Cases:</strong> "Will Candidate X win the election?" markets</p>
      <p><strong>Trust Level:</strong> Very High for official results, Medium for polling</p>
      <p><strong>Priority:</strong> Medium</p>

      <h3>Weather APIs ⚠️</h3>
      <p><strong>Status:</strong> Not Implemented</p>
      <p><strong>Purpose:</strong> Weather data for climate-based markets</p>
      <p><strong>Recommended Providers:</strong></p>
      <ul>
        <li><strong>OpenWeatherMap</strong> - Weather data (free tier available)</li>
        <li><strong>WeatherAPI</strong> - Comprehensive weather (~$5-20/month)</li>
        <li><strong>NOAA API</strong> - Official US weather data (free)</li>
      </ul>
      <p><strong>Use Cases:</strong> "Will it rain in [location] on [date]?" markets</p>
      <p><strong>Trust Level:</strong> High (official weather services)</p>
      <p><strong>Priority:</strong> Low-Medium</p>

      <h3>News/General Knowledge APIs ⚠️</h3>
      <p><strong>Status:</strong> Not Implemented</p>
      <p><strong>Purpose:</strong> News events and factual information</p>
      <p><strong>Recommended Providers:</strong></p>
      <ul>
        <li><strong>NewsAPI</strong> - News aggregation (free tier available)</li>
        <li><strong>Wikipedia API</strong> - Factual information (free)</li>
        <li><strong>Fact-checking APIs</strong> - Verification services</li>
      </ul>
      <p><strong>Use Cases:</strong> General knowledge and event-based markets</p>
      <p><strong>Trust Level:</strong> Medium-High depending on source</p>
      <p><strong>Priority:</strong> Low</p>

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
            <td style={{ padding: '0.75rem' }}>The Odds API / SportsDataIO</td>
            <td style={{ padding: '0.75rem' }}>High</td>
            <td style={{ padding: '0.75rem', color: 'var(--color-warning)' }}>⚠️ Not Implemented</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <td style={{ padding: '0.75rem' }}>Elections</td>
            <td style={{ padding: '0.75rem' }}>Official Election APIs</td>
            <td style={{ padding: '0.75rem' }}>Very High</td>
            <td style={{ padding: '0.75rem', color: 'var(--color-warning)' }}>⚠️ Not Implemented</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <td style={{ padding: '0.75rem' }}>Weather</td>
            <td style={{ padding: '0.75rem' }}>OpenWeatherMap / NOAA</td>
            <td style={{ padding: '0.75rem' }}>High</td>
            <td style={{ padding: '0.75rem', color: 'var(--color-warning)' }}>⚠️ Not Implemented</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <td style={{ padding: '0.75rem' }}>News Events</td>
            <td style={{ padding: '0.75rem' }}>NewsAPI</td>
            <td style={{ padding: '0.75rem' }}>Medium-High</td>
            <td style={{ padding: '0.75rem', color: 'var(--color-warning)' }}>⚠️ Not Implemented</td>
          </tr>
        </tbody>
      </table>

      <h2>Implementation Roadmap</h2>
      <ol>
        <li><strong>Phase 1 (Current):</strong> ✅ Financial markets via RedStone Oracle</li>
        <li><strong>Phase 2 (Next):</strong> ⚠️ Sports markets - Integrate The Odds API or SportsDataIO</li>
        <li><strong>Phase 3:</strong> ⚠️ Political markets - Integrate election/news APIs</li>
        <li><strong>Phase 4:</strong> ⚠️ Weather markets - Integrate weather APIs</li>
        <li><strong>Phase 5:</strong> ⚠️ Multi-oracle support - Allow market creators to choose oracle</li>
      </ol>

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
        Trading uses <strong>Pips</strong> stored in <strong>Cloudflare D1</strong>. Deposits: Stripe (card) and crypto (platform wallet). Markets are automated from APIs; resolution runs on oracles and due dates.
      </p>

      <h2>Technology stack</h2>
      <ul>
        <li><strong>Frontend:</strong> React, React Router</li>
        <li><strong>API:</strong> Cloudflare Pages Functions (<code>/api/*</code>)</li>
        <li><strong>Database:</strong> Cloudflare D1 (markets, pools, positions, balances)</li>
        <li><strong>Auth:</strong> Email/password register and sign-in; session in localStorage</li>
        <li><strong>Payments:</strong> Stripe Checkout + webhook; crypto deposit/withdraw via platform wallet</li>
      </ul>

      <h2>Data flow</h2>
      <ul>
        <li><strong>Deposit (card):</strong> App → Stripe Checkout → webhook <code>checkout.session.completed</code> → credit Pips in D1</li>
        <li><strong>Trade:</strong> User buys Yes/No → API updates pool and position in D1</li>
        <li><strong>Resolution:</strong> Cron or manual trigger resolves due markets; winning positions credited in D1</li>
        <li><strong>Withdraw:</strong> User submits request → platform sends crypto → status stored in D1</li>
      </ul>

      <h2>API overview</h2>
      <ul>
        <li><code>/api/register</code>, <code>/api/sign-in</code> — Auth</li>
        <li><code>/api/stripe-create-checkout-session</code>, <code>/api/stripe-webhook</code> — Stripe</li>
        <li><code>/api/get-user-balance</code>, <code>/api/add-credits</code> — Balance</li>
        <li><code>/api/markets</code>, <code>/api/pools</code>, <code>/api/trade</code> — Markets and AMM</li>
        <li><code>/api/withdrawal-requests</code>, withdraw flow — Withdrawals</li>
        <li><code>/api/health</code>, <code>/api/oracle?symbol=</code> — Health and oracles</li>
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
      
      <h2>Wallet Connection Security</h2>
      
      <h3>Party IDs</h3>
      <p>
        Party IDs / display names are public identifiers. They are meant 
        to be shared publicly and are not secret.
      </p>
      <ul>
        <li>Anyone who knows a Party ID can see contracts visible to that party</li>
        <li>Party ID alone is NOT enough to authorize actions</li>
        <li>Party IDs cannot be used to steal funds or impersonate users</li>
      </ul>

      <h3>Authentication</h3>
      <p>
        Sign-in uses email and password. Session data (accountId, display name) is stored in the browser and optionally on the server.
      </p>
      <ul>
        <li>Keep your password private; never share account or session data</li>
        <li>Session is stored in browser localStorage</li>
      </ul>

      <h3>Authorization</h3>
      <p>
        Actions (trading, withdrawals) are tied to your account. Your party ID (display name) is the public identifier; the session proves you own that account.
      </p>

      <h2>Best Practices</h2>
      <ul>
        <li><strong>Never share:</strong> Your account ID or session data with others</li>
        <li><strong>Safe to share:</strong> Party IDs (they're public identifiers)</li>
        <li><strong>Token Storage:</strong> Tokens are stored in localStorage (browser-only)</li>
        <li><strong>Auto-Refresh:</strong> Enable automatic token refresh to avoid expiration issues</li>
        <li><strong>Clear Tokens:</strong> Use "Clear Token" button when using a shared computer</li>
      </ul>

      <h2>Data Security</h2>
      <ul>
        <li>D1 is only accessible from Cloudflare Workers (server-side)</li>
        <li>All writes go through API endpoints; no direct DB access from the client</li>
        <li>Credentials and secrets live in Cloudflare env (wrangler.toml / dashboard)</li>
      </ul>
    </div>
  )
}

function APIReferenceContent() {
  return (
    <div className="doc-section">
      <h1>API Reference</h1>
      
      <h2>Account &amp; Auth</h2>
      <p>Registration and sign-in: <code>POST /api/register</code>, <code>POST /api/sign-in</code>. Account data: <code>POST /api/account</code>, <code>GET /api/account?accountId=...</code>.</p>

      <h2>Stripe</h2>
      <h3>POST /api/stripe-create-checkout-session</h3>
      <p>Create a Stripe Checkout session. Body: <code>{`{ userParty, amount }`}</code> (custom amount in PP) or <code>{`{ userParty, priceId }`}</code> (Stripe Price ID for $5–$100 products). Optional: <code>successUrl</code>, <code>cancelUrl</code>. Returns <code>{ url, sessionId }</code>.</p>
      <h3>POST /api/stripe-webhook</h3>
      <p>Stripe webhook endpoint. Handles <code>checkout.session.completed</code> and credits Pips to <code>client_reference_id</code> (userParty). Requires <code>STRIPE_WEBHOOK_SECRET</code> for signature verification.</p>

      <h2>Balance</h2>
      <h3>POST /api/get-user-balance</h3>
      <p>Get Pips balance. Body: <code>{`{ userParty }`}</code>. Returns <code>{ balance }</code>.</p>
      <h3>POST /api/add-credits</h3>
      <p>Add Pips (testing/internal). Body: <code>{`{ userParty or accountId, amount }`}</code>.</p>

      <h2>Markets &amp; Trading</h2>
      <p><code>GET /api/markets</code>, <code>GET /api/pools</code>, <code>POST /api/trade</code> — markets, pool state, and placing trades. Positions and resolution use the same API surface.</p>

      <h2>Deposits &amp; withdrawals</h2>
      <p><code>GET /api/deposit-records?userParty=...</code> — list deposit history (crypto/card). <code>POST /api/deposit-crypto</code> — credit Pips (requires <code>X-Deposit-Crypto-Secret</code> when <code>DEPOSIT_CRYPTO_SECRET</code> is set; idempotent by <code>txHash</code>). <code>POST /api/withdraw-request</code> — submit withdrawal (EVM address required). <code>GET /api/withdrawal-requests?userParty=...</code> — list requests.</p>

      <h2>Oracles &amp; Health</h2>
      <p><code>GET /api/oracle?symbol=</code> — RedStone price data. <code>GET /api/health</code> — health check.</p>

      <h2>Error responses</h2>
      <p>Errors return JSON: <code>{`{ error, message?, details? }`}</code> with appropriate HTTP status.</p>
    </div>
  )
}
