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
      <p>Welcome to dice.express — prediction markets with virtual Credits; multi-chain deposit and withdraw. Your choice. Your chance.</p>
      
      <h2>Overview</h2>
      <p>
        Create, manage, and trade on prediction markets. All activity on the platform uses virtual <strong>Credits</strong>. 
        Only <strong>deposits</strong> (crypto → Credits) and <strong>withdrawals</strong> (Credits → crypto) touch real blockchain networks.
      </p>

      <h2>Prerequisites</h2>
      <ul>
        <li>A wallet (Party ID or supported chain wallet)</li>
        <li>Keycloak credentials for authentication</li>
        <li>TokenBalance contracts for CC deposits/withdrawals (created via /test page)</li>
      </ul>

      <h2>Quick Start</h2>
      <ol>
        <li><strong>Connect Your Wallet:</strong> Open the Wallet & Authentication modal and enter your Party ID</li>
        <li><strong>Get Authentication Token:</strong> Use Keycloak credentials to obtain a JWT token</li>
        <li><strong>Create TokenBalance Contracts:</strong> Visit the /test page to create TokenBalance contracts for CC transfers</li>
        <li><strong>Deposit CC:</strong> Use the Portfolio page to deposit CC to the platform wallet (on-chain)</li>
        <li><strong>Markets:</strong> Markets are created and managed automatically; browse from the home page</li>
        <li><strong>Trade:</strong> Use the AMM on any market to buy Yes or No shares</li>
      </ol>

      <h2>Key Concepts</h2>
      <ul>
        <li><strong>Virtual CC Tracking:</strong> Market creation and position creation use database-backed virtual tracking (not on-chain transfers)</li>
        <li><strong>On-Chain Transfers:</strong> Only deposit and withdraw operations perform actual on-chain CC transfers</li>
        <li><strong>Party ID:</strong> Your public identifier on the connected ledger (similar to a wallet address)</li>
        <li><strong>Authentication Token:</strong> JWT token from Keycloak that authorizes blockchain interactions</li>
      </ul>
    </div>
  )
}

function WalletAuthenticationContent() {
  return (
    <div className="doc-section">
      <h1>Wallet & Authentication</h1>
      
      <h2>Connecting Your Wallet</h2>
      <p>
        To interact with the platform, connect your wallet by providing your Party ID (or connect a supported chain wallet).
      </p>
      
      <h3>Party ID Format</h3>
      <p>The Party ID follows the format: <code>{'{user-id}'}::{'{party-id}'}</code></p>
      
      <h3>Steps to Connect</h3>
      <ol>
        <li>Click on the wallet icon in the navigation bar</li>
        <li>Enter your Party ID in the input field</li>
        <li>Click "Connect Wallet"</li>
        <li>Your wallet connection status will be displayed</li>
      </ol>

      <h2>Authentication Token</h2>
      <p>
        To interact with the ledger, you need an authentication token (JWT) from Keycloak.
      </p>

      <h3>Getting a Token</h3>
      <ol>
        <li>Open the Wallet & Authentication modal</li>
        <li>Click "Get Token from Keycloak"</li>
        <li>Enter your Keycloak username and password</li>
        <li>Click "Get Token"</li>
        <li>The token will be automatically saved to localStorage</li>
      </ol>

      <h3>Manual Token Entry</h3>
      <p>Alternatively, you can manually enter a JWT token if you have one from another source.</p>
      <ol>
        <li>Open the Wallet & Authentication modal</li>
        <li>Paste your JWT token in the token input field</li>
        <li>Click "Save Token"</li>
      </ol>

      <h3>Token Management</h3>
      <ul>
        <li><strong>Auto-Refresh:</strong> Tokens are automatically refreshed before expiration</li>
        <li><strong>Clear Token:</strong> Use the "Clear Token" button to remove the stored token</li>
        <li><strong>Storage:</strong> Tokens are stored in browser localStorage</li>
      </ul>

      <h2>Security Notes</h2>
      <ul>
        <li>Party IDs are public identifiers (similar to Ethereum addresses)</li>
        <li>Authentication tokens are private and must be kept secure</li>
        <li>Never share your Keycloak credentials or JWT tokens</li>
        <li>Tokens are stored locally in your browser's localStorage</li>
      </ul>
    </div>
  )
}

function MarketCreationContent() {
  return (
    <div className="doc-section">
      <h1>Market Creation</h1>
      
      <p>
        Prediction markets on this platform are <strong>created and managed automatically</strong>. 
        You can browse all markets and trade using the AMM (Automated Market Maker) — no need to create a market yourself.
      </p>

      <h2>How to trade</h2>
      <ol>
        <li>Browse markets from the home page or Discover menu</li>
        <li>Open a market to see details and current Yes/No probabilities</li>
        <li>Use the Trade section to buy Yes or No shares with Credits (AMM sets the price)</li>
        <li>View your positions and balance in Portfolio</li>
      </ol>

      <h2>Market Types</h2>
      
      <h3>Binary Markets</h3>
      <p>Markets with two possible outcomes: Yes or No.</p>
      <ul>
        <li>Simpler structure</li>
        <li>Easier to understand</li>
        <li>Best for clear yes/no questions</li>
      </ul>

      <h3>Multi-Outcome Markets</h3>
      <p>Markets with multiple possible outcomes.</p>
      <ul>
        <li>More flexible</li>
        <li>Can handle complex scenarios</li>
        <li>Requires comma-separated outcomes</li>
      </ul>

      <h2>Settlement Types</h2>
      
      <h3>Time-Based Settlement</h3>
      <p>The market settles at a specific date and time.</p>
      
      <h3>Event-Based Settlement</h3>
      <p>The market settles when a specific event occurs.</p>
      
      <h3>Manual Settlement</h3>
      <p>The market is settled manually by an admin.</p>

      <h2>Market Creation Process</h2>
      <ol>
        <li><strong>Submission:</strong> Market creation request is submitted and stored in the database</li>
        <li><strong>Pending Approval:</strong> Market appears in the Admin Dashboard with "Pending Approval" status</li>
        <li><strong>Admin Review:</strong> Admin reviews the market details</li>
        <li><strong>Approval/Rejection:</strong> Admin approves or rejects the market</li>
        <li><strong>Active Market:</strong> Approved markets appear in the Markets List</li>
      </ol>

      <h2>Important Notes</h2>
      <ul>
        <li>Market creation uses virtual CC tracking (database-only)</li>
        <li>No actual on-chain CC transfer occurs during market creation</li>
        <li>Markets require admin approval before becoming active</li>
        <li>All market data is stored in the Supabase database</li>
      </ul>
    </div>
  )
}

function AMMFeesContent() {
  return (
    <div className="doc-section">
      <h1>AMM &amp; Fees</h1>
      <p>
        Markets on dice.express use an <strong>Automated Market Maker (AMM)</strong> for trading. 
        You buy Yes or No shares with virtual <strong>Credits</strong>; the AMM sets prices based on the current pool state.
      </p>

      <h2>How the AMM Works</h2>
      <p>
        The AMM maintains a liquidity pool for each market. When you trade, you pay Credits and receive shares (or vice versa). 
        Prices are derived from the pool so that larger orders move the price more than smaller ones. This provides continuous liquidity without requiring a counterparty.
      </p>

      <h2>Trading with Credits</h2>
      <ul>
        <li>All trading uses <strong>virtual Credits</strong> — no on-chain transfer at trade time.</li>
        <li>You deposit real assets (e.g. CC) via Deposit to get Credits; you withdraw Credits via Withdraw to get assets back.</li>
        <li>Buying Yes or No shares spends Credits; selling or settling positions returns Credits to your balance.</li>
      </ul>

      <h2>Fees</h2>
      <p>
        Fee structure is set per deployment. Typically:
      </p>
      <ul>
        <li><strong>Trading:</strong> A small fee may be applied on each trade (e.g. a percentage of the trade size) to support the pool and platform.</li>
        <li><strong>Deposit / Withdraw:</strong> Network or ledger fees may apply when moving assets on-chain; the UI shows estimated costs where applicable.</li>
      </ul>
      <p>
        Exact fee rates and any minimums are shown in the Trade and Portfolio flows when you place an order or initiate a deposit/withdrawal.
      </p>

      <h2>Quotes and Slippage</h2>
      <p>
        Before you confirm a trade, the UI shows a quote (e.g. &quot;You pay X CR, receive ~Y shares&quot;). 
        Quotes are based on the current pool state; if the pool changes before your transaction is processed, your execution may differ slightly (slippage). 
        You can set a minimum acceptable amount to limit downside from slippage.
      </p>
    </div>
  )
}

function PositionCreationContent() {
  return (
    <div className="doc-section">
      <h1>Position Creation</h1>
      
      <p>
        Create positions on active markets to trade. Position creation uses virtual CC tracking 
        (database-only), assuming you have already deposited CC via the deposit feature.
      </p>

      <h2>Creating a Position</h2>
      <ol>
        <li>Navigate to a market's detail page from the Markets List</li>
        <li>Fill in the position details:</li>
        <ul>
          <li><strong>Position Type:</strong> Select the outcome you're betting on</li>
          <ul>
            <li>For Binary markets: "Yes" or "No"</li>
            <li>For Multi-Outcome markets: Choose from the available outcomes</li>
          </ul>
          <li><strong>Amount:</strong> The amount of CC you want to invest</li>
          <li><strong>Price per Share:</strong> Your prediction of the probability (0.0 to 1.0)</li>
        </ul>
        <li>Click "Create Position"</li>
        <li>Your position will be created and stored in the database</li>
      </ol>

      <h2>Position Types</h2>
      
      <h3>Binary Market Positions</h3>
      <ul>
        <li><strong>Yes:</strong> Betting that the market outcome will be "Yes"</li>
        <li><strong>No:</strong> Betting that the market outcome will be "No"</li>
      </ul>

      <h3>Multi-Outcome Market Positions</h3>
      <p>Select from the available outcomes defined when the market was created.</p>

      <h2>Price per Share</h2>
      <p>
        The price per share represents your prediction of the probability that your chosen outcome 
        will occur. It must be between 0.0 and 1.0.
      </p>
      <ul>
        <li><strong>0.0:</strong> You believe the outcome has 0% probability</li>
        <li><strong>0.5:</strong> You believe the outcome has 50% probability</li>
        <li><strong>1.0:</strong> You believe the outcome has 100% probability</li>
      </ul>

      <h2>Position Creation Process</h2>
      <ol>
        <li><strong>Validation:</strong> Market is verified to exist and be active</li>
        <li><strong>Position Creation:</strong> Position is created with your chosen parameters</li>
        <li><strong>Volume Update:</strong> Market volumes are updated in the database</li>
        <li><strong>Storage:</strong> Position is stored in Supabase database</li>
        <li><strong>Portfolio:</strong> Position appears in your Portfolio page</li>
      </ol>

      <h2>Important Notes</h2>
      <ul>
        <li>Position creation uses virtual CC tracking (database-only)</li>
        <li>No actual on-chain CC transfer occurs during position creation</li>
        <li>Positions assume you have already deposited CC via the deposit feature</li>
        <li>All position data is stored in the Supabase database</li>
        <li>Positions are linked to your wallet Party ID</li>
        <li>Market volumes (total, yes, no, outcome volumes) are updated automatically</li>
      </ul>
    </div>
  )
}

function DepositWithdrawContent() {
  return (
    <div className="doc-section">
      <h1>Deposit & Withdraw</h1>
      
      <p>
        <strong>Deposit</strong> (crypto → Credits) and <strong>withdraw</strong> (Credits → crypto) are the only operations 
        that perform actual blockchain transactions. All other platform activity is in virtual Credits.
      </p>

      <h2>Prerequisites</h2>
      <ul>
        <li>Connected wallet (Party ID)</li>
        <li>Authentication token (JWT)</li>
        <li>TokenBalance contract for your wallet (created via /test page)</li>
        <li>Platform TokenBalance contract ID (for withdrawals)</li>
      </ul>

      <h2>Depositing CC</h2>
      <p>
        Transfer CC from your wallet to the platform wallet using on-chain blockchain transactions.
      </p>
      
      <h3>Steps to Deposit</h3>
      <ol>
        <li>Navigate to the Portfolio page</li>
        <li>Find the "Deposit / Withdraw Credits" section</li>
        <li>Enter the amount you want to deposit</li>
        <li>Click "Deposit"</li>
        <li>Wait for the blockchain transaction to complete</li>
        <li>Your deposit will be tracked in the database</li>
      </ol>

      <h3>Deposit Requirements</h3>
      <ul>
        <li>User TokenBalance contract ID must be stored in localStorage as <code>userTokenBalanceContractId</code></li>
        <li>You must have sufficient CC balance in your TokenBalance contract</li>
        <li>Valid authentication token</li>
      </ul>

      <h2>Withdrawing CC</h2>
      <p>
        Transfer CC from the platform wallet back to your wallet using on-chain blockchain transactions.
      </p>
      
      <h3>Steps to Withdraw</h3>
      <ol>
        <li>Navigate to the Portfolio page</li>
        <li>Find the "Deposit / Withdraw Credits" section</li>
        <li>Enter the amount you want to withdraw</li>
        <li>Click "Withdraw"</li>
        <li>Wait for the blockchain transaction to complete</li>
        <li>Your withdrawal will be tracked in the database</li>
      </ol>

      <h3>Withdrawal Requirements</h3>
      <ul>
        <li>Platform TokenBalance contract ID must be stored in localStorage as <code>platformTokenBalanceContractId</code></li>
        <li>Platform wallet must have sufficient CC balance</li>
        <li>Valid authentication token</li>
      </ul>

      <h2>On-Chain Transactions</h2>
      <p>
        Deposit and withdraw use the connected ledger to perform on-chain transfers. 
        Your balance is credited or debited in platform Credits accordingly.
      </p>
      
      <ul>
        <li><strong>Deposit:</strong> Transfers CC from your TokenBalance to the platform wallet's TokenBalance</li>
        <li><strong>Withdraw:</strong> Transfers CC from the platform wallet's TokenBalance to your TokenBalance</li>
      </ul>

      <h2>Transaction Tracking</h2>
      <p>
        All deposit and withdraw transactions are tracked in the Supabase database for history and auditing.
      </p>

      <h2>Important Notes</h2>
      <ul>
        <li>Deposit and withdraw are the ONLY operations that perform on-chain CC transfers</li>
        <li>Market creation and position creation use virtual CC tracking (database-only)</li>
        <li>You must create TokenBalance contracts before depositing/withdrawing</li>
        <li>Use the /test page to create TokenBalance contracts</li>
        <li>Store contract IDs in localStorage for the deposit/withdraw features to work</li>
        <li>Transactions may take a few seconds to complete on the blockchain</li>
      </ul>
    </div>
  )
}

function PortfolioContent() {
  return (
    <div className="doc-section">
      <h1>Portfolio</h1>
      
      <p>
        View all your positions and manage your CC deposits/withdrawals.
      </p>

      <h2>Portfolio Features</h2>
      
      <h3>My Positions</h3>
      <p>View all your active positions across all markets.</p>
      <ul>
        <li>Market ID for each position</li>
        <li>Position type (Yes/No or outcome)</li>
        <li>Amount invested</li>
        <li>Price per share</li>
        <li>Deposit information</li>
        <li>Creation timestamp</li>
        <li>Link to view the market</li>
      </ul>

      <h3>Deposit / Withdraw CC</h3>
      <p>
        Manage your CC deposits and withdrawals. These are the only operations that perform 
        on-chain blockchain transactions.
      </p>

      <h3>Activity Log</h3>
      <p>
        View a chronological log of all your position creation activities, sorted by date (newest first).
      </p>
      <ul>
        <li>Position creation timestamp</li>
        <li>Market ID</li>
        <li>Position type and amount</li>
        <li>Deposit information</li>
        <li>Link to view the market</li>
      </ul>

      <h2>Data Source</h2>
      <p>
        Portfolio data is retrieved from the Supabase database, not directly from the blockchain. 
        This ensures fast, reliable access to your positions.
      </p>

      <h2>Empty Portfolio</h2>
      <p>
        If you don't have any positions yet, the Portfolio page will display a message encouraging 
        you to start trading by browsing markets.
      </p>
    </div>
  )
}

function AdminDashboardContent() {
  return (
    <div className="doc-section">
      <h1>Admin Dashboard</h1>
      
      <p>
        Review and approve/reject market creation requests. Only accessible to admin parties.
      </p>

      <h2>Market Creation Requests</h2>
      <p>
        View all pending market creation requests that require admin approval.
      </p>

      <h3>Request Details</h3>
      <p>Each request displays:</p>
      <ul>
        <li>Market title and description</li>
        <li>Market type (Binary or Multi-Outcome)</li>
        <li>Outcomes (for Multi-Outcome markets)</li>
        <li>Settlement trigger</li>
        <li>Resolution criteria</li>
        <li>Creator information</li>
        <li>Creation timestamp</li>
        <li>Contract ID</li>
      </ul>

      <h2>Approving Markets</h2>
      <ol>
        <li>Review the market creation request details</li>
        <li>Verify the market information is correct</li>
        <li>Click "Approve" button</li>
        <li>Market status is updated to "Approved" in the database</li>
        <li>Market appears in the Markets List for all users</li>
      </ol>

      <h2>Rejecting Markets</h2>
      <ol>
        <li>Review the market creation request details</li>
        <li>If the market doesn't meet requirements, click "Reject"</li>
        <li>Confirm the rejection</li>
        <li>Market status is updated to "Rejected" in the database</li>
        <li>Market is removed from pending requests</li>
      </ol>

      <h2>Data Source</h2>
      <p>
        The Admin Dashboard uses a database-first approach:
      </p>
      <ul>
        <li><strong>Primary:</strong> Queries Supabase database for pending requests</li>
        <li><strong>Fallback:</strong> Attempts blockchain queries if database fails</li>
        <li><strong>Status Updates:</strong> Updates are made directly to the database</li>
      </ul>

      <h2>Important Notes</h2>
      <ul>
        <li>Only admin parties can access the Admin Dashboard</li>
        <li>Approval/rejection updates the database status directly</li>
        <li>Approved markets immediately appear in the Markets List</li>
        <li>Market data is stored in the Supabase database</li>
      </ul>
    </div>
  )
}

function BlockchainContent() {
  return (
    <div className="doc-section">
      <h1>Blockchain Integration</h1>
      
      <h2>Overview</h2>
      <p>
        The application uses a <strong>dynamic blockchain integration system</strong> that allows seamless 
        support for multiple blockchain networks while maintaining a consistent interface. The architecture 
        is designed to be network-agnostic, extensible, and future-proof.
      </p>

      <h2>Virtual-first, multi-chain</h2>
      <p>
        The platform uses <strong>virtual Credits</strong> for all trading and fees; <strong>blockchain is used only for deposits and withdrawals</strong> across supported networks (e.g. Canton, with more planned). The application uses a <strong>ledger</strong> (e.g. Canton via JSON API) for command submission where applicable. Due to current limitations in some ledger APIs, a <strong>hybrid approach</strong> combines on-chain operations with database-backed storage.
      </p>

      <h3>Hybrid Architecture</h3>
      <ul>
        <li><strong>On-Chain:</strong> Contract creation, choice exercising, and deposit/withdraw (per supported chain)</li>
        <li><strong>Database-Backed:</strong> Contract queries, position tracking, and market listings</li>
        <li><strong>Rationale:</strong> Some ledger JSON APIs (e.g. Canton) do not provide general contract query endpoints</li>
      </ul>

      <h3>Supported Operations</h3>
      <ul>
        <li>✅ <strong>Contract Creation:</strong> Market creation requests submitted to ledger (e.g. Canton)</li>
        <li>✅ <strong>Choice Exercising:</strong> Admin approval/rejection, market resolution</li>
        <li>✅ <strong>CC Transfers:</strong> Deposits and withdrawals via TokenBalance contracts</li>
        <li>⚠️ <strong>Contract Querying:</strong> Limited - uses database as primary source</li>
        <li>❌ <strong>Real-Time Events:</strong> Not yet supported (requires WebSocket/gRPC)</li>
      </ul>

      <h2>Blockchain Provider System</h2>
      <p>
        The application uses a provider-based architecture that makes it easy to add support for additional 
        blockchain networks in the future.
      </p>

      <h3>Core Components</h3>
      <ul>
        <li><strong>BlockchainProvider:</strong> Abstract interface for blockchain operations</li>
        <li><strong>BlockchainRegistry:</strong> Central registry for network providers</li>
        <li><strong>CantonProvider:</strong> Implementation for Canton (one of the supported networks)</li>
      </ul>

      <h3>Provider Interface</h3>
      <p>All blockchain providers implement a consistent interface:</p>
      <pre>{`class BlockchainProvider {
  async connect()                    // Initialize connection
  async disconnect()                 // Close connection
  async getAccount()                 // Get current account/party
  async createContract(...)          // Create a contract
  async exerciseChoice(...)          // Exercise a contract choice
  async queryContracts(...)          // Query contracts
  async getContract(...)             // Get contract by ID
  getSupportedFeatures()             // List supported features
}`}</pre>

      <h2>Future: Full On-Chain Support</h2>
      <p>
        When supported ledgers (e.g. Canton) provide the necessary capabilities (contract query endpoints, real-time events, etc.), 
        the application can migrate to a full on-chain approach for those networks. The architecture is already prepared for 
        this transition. The platform remains virtual-first: trading and fees stay in Credits; blockchain is for deposit/withdraw.
      </p>

      <h3>Required Ledger Features</h3>
      <ul>
        <li><strong>Contract Query Endpoints:</strong> General contract querying via JSON API</li>
        <li><strong>Contract Retrieval:</strong> Get contract by ID endpoint</li>
        <li><strong>Real-Time Events:</strong> WebSocket/SSE support for contract updates</li>
        <li><strong>Transaction History:</strong> Query transaction history for accounts</li>
      </ul>

      <h3>Migration Path</h3>
      <p>The migration will happen in phases:</p>
      <ol>
        <li><strong>Phase 1:</strong> Add query endpoints (database as cache/fallback)</li>
        <li><strong>Phase 2:</strong> Add contract retrieval (remove database dependency)</li>
        <li><strong>Phase 3:</strong> Add real-time events (remove polling)</li>
        <li><strong>Phase 4:</strong> Full on-chain (database for indexing only)</li>
      </ol>

      <h2>Adding New Blockchain Networks</h2>
      <p>
        The provider system makes it straightforward to add support for additional blockchain networks 
        (Ethereum, Polygon, etc.) in the future. See the <code>BLOCKCHAIN_INTEGRATION.md</code> documentation 
        for detailed instructions.
      </p>

      <h2>Configuration</h2>
      <p>Blockchain providers are configured via environment variables:</p>
      <pre>{`# Ledger configuration (e.g. Canton)
VITE_CANTON_LEDGER_URL=https://participant.dev.canton.wolfedgelabs.com/json-api
VITE_CANTON_PACKAGE_ID=b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0`}</pre>

      <h2>Documentation</h2>
      <p>For more detailed information, see:</p>
      <ul>
        <li><strong>Blockchain Integration Guide:</strong> Architecture and provider system</li>
        <li><strong>Canton Integration Guide:</strong> Canton (one supported network) integration details and migration path</li>
      </ul>
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

      <h3>Ledger JSON API (e.g. Canton) ✅</h3>
      <p><strong>Status:</strong> Implemented and Active</p>
      <p><strong>Purpose:</strong> Ledger interactions for deposit/withdraw and commands (contract creation, choice exercising). Platform trading uses virtual Credits; this API is used for supported chains (Canton today, more planned).</p>
      <p><strong>What it provides:</strong></p>
      <ul>
        <li>Command submission for contract creation</li>
        <li>Choice exercising for contract interactions</li>
        <li>Limited contract querying (via active-contracts endpoint)</li>
      </ul>
      <p><strong>API Endpoints:</strong></p>
      <ul>
        <li><code>POST /api/command</code> - Proxy for ledger command submission (e.g. Canton)</li>
        <li><code>POST /api/query</code> - Proxy for ledger contract queries (e.g. Canton)</li>
      </ul>
      <p><strong>Base URL (example):</strong> <code>https://participant.dev.canton.wolfedgelabs.com/json-api</code></p>
      <p><strong>Authentication:</strong> JWT token via Keycloak</p>
      <p><strong>Limitations:</strong> General contract querying not available via some ledger JSON APIs</p>

      <h3>Keycloak Authentication API ✅</h3>
      <p><strong>Status:</strong> Implemented and Active</p>
      <p><strong>Purpose:</strong> User authentication and JWT token management</p>
      <p><strong>What it provides:</strong></p>
      <ul>
        <li>User authentication (username/password)</li>
        <li>JWT token generation</li>
        <li>Token refresh</li>
      </ul>
      <p><strong>API Endpoints:</strong></p>
      <ul>
        <li><code>POST /api/get-token</code> - Get authentication token</li>
        <li><code>POST /api/refresh-token</code> - Refresh authentication token</li>
      </ul>
      <p><strong>Usage:</strong> Required for all blockchain interactions</p>

      <h3>Supabase Database API ✅</h3>
      <p><strong>Status:</strong> Implemented and Active</p>
      <p><strong>Purpose:</strong> Data storage and retrieval (markets, positions, contracts)</p>
      <p><strong>What it provides:</strong></p>
      <ul>
        <li>Market data storage</li>
        <li>Position tracking</li>
        <li>Contract metadata storage</li>
        <li>Transaction history</li>
      </ul>
      <p><strong>API Endpoints:</strong></p>
      <ul>
        <li><code>POST /api/get-contracts</code> - Get contracts from database</li>
        <li><code>POST /api/store-contract</code> - Store contract in database</li>
        <li><code>PUT /api/update-contract-status</code> - Update contract status</li>
        <li><code>POST /api/create-position</code> - Create position (database)</li>
      </ul>
      <p><strong>Usage:</strong> Primary data source for market listings and position tracking</p>

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
        The application is <strong>virtual-first and multi-chain</strong>: all trading and fees use <strong>Credits</strong>; 
        blockchain is used only for <strong>deposits and withdrawals</strong> on supported networks (e.g. Canton). 
        Architecture combines ledger(s) for deposit/withdraw with Supabase database for market and position data.
      </p>

      <h2>Technology Stack</h2>
      <ul>
        <li><strong>Frontend:</strong> React with React Router</li>
        <li><strong>Backend API:</strong> Vercel Serverless Functions</li>
        <li><strong>Blockchain:</strong> Multi-chain; Canton (and others) for deposit/withdraw via JSON API</li>
        <li><strong>Database:</strong> Supabase (PostgreSQL)</li>
        <li><strong>Authentication:</strong> Keycloak (JWT tokens)</li>
        <li><strong>Storage:</strong> Browser localStorage (tokens, wallet info)</li>
      </ul>

      <h2>Architecture Approach</h2>
      
      <h3>Hybrid Model</h3>
      <p>
        Platform uses virtual Credits for activity; blockchain only for moving value in/out. Due to some ledger APIs lacking full query support, a hybrid approach is used:
      </p>
      <ul>
        <li><strong>On-Chain:</strong> Deposits and withdrawals (e.g. CC/TokenBalance on Canton; other chains planned)</li>
        <li><strong>Database:</strong> Markets, positions, and transaction history</li>
      </ul>

      <h3>Database-First Strategy</h3>
      <p>
        For most operations, the database is the primary source of truth:
      </p>
      <ul>
        <li>Market creation requests are stored in the database immediately</li>
        <li>Positions are stored in the database</li>
        <li>Market volumes are tracked in the database</li>
        <li>Blockchain queries are used as fallback or for on-chain transfers</li>
      </ul>

      <h2>Data Flow</h2>
      
      <h3>Market Creation</h3>
      <ol>
        <li>User submits market creation request</li>
        <li>Request is stored in Supabase database</li>
        <li>Status set to "Pending Approval"</li>
        <li>Admin reviews in Admin Dashboard</li>
        <li>Admin approves/rejects (database update)</li>
        <li>Approved markets appear in Markets List</li>
      </ol>

      <h3>Position Creation</h3>
      <ol>
        <li>User creates position on a market</li>
        <li>Position stored in Supabase database</li>
        <li>Market volumes updated in database</li>
        <li>Position appears in user's Portfolio</li>
      </ol>

      <h3>Deposits/Withdrawals</h3>
      <ol>
        <li>User initiates deposit/withdraw (on chosen supported chain)</li>
        <li>On-chain transfer executed (e.g. TokenBalance.Transfer on Canton)</li>
        <li>Transaction recorded in Supabase database</li>
        <li>User virtual balance (Credits) updated</li>
      </ol>

      <h2>API Endpoints</h2>
      <ul>
        <li><code>/api/command</code> - Proxy for ledger JSON API commands (e.g. Canton)</li>
        <li><code>/api/query</code> - Proxy for ledger JSON API queries (e.g. Canton)</li>
        <li><code>/api/get-token</code> - Get authentication token from Keycloak</li>
        <li><code>/api/refresh-token</code> - Refresh authentication token</li>
        <li><code>/api/deposit</code> - Deposit CC (on-chain transfer)</li>
        <li><code>/api/withdraw</code> - Withdraw CC (on-chain transfer)</li>
        <li><code>/api/create-position</code> - Create position (database)</li>
        <li><code>/api/get-contracts</code> - Get contracts from database</li>
        <li><code>/api/store-contract</code> - Store contract in database</li>
        <li><code>/api/update-contract-status</code> - Update contract status in database</li>
      </ul>

      <h2>Storage</h2>
      <ul>
        <li><strong>Supabase:</strong> Markets, positions, transactions, contract metadata</li>
        <li><strong>localStorage:</strong> Authentication tokens, wallet info, contract IDs</li>
        <li><strong>Ledger (e.g. Canton):</strong> TokenBalance contracts (CC balances) for deposit/withdraw</li>
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
        Party IDs (e.g. on Canton) are public identifiers, similar to Ethereum addresses. They are meant 
        to be shared publicly and are not secret.
      </p>
      <ul>
        <li>Anyone who knows a Party ID can see contracts visible to that party</li>
        <li>Party ID alone is NOT enough to authorize actions</li>
        <li>Party IDs cannot be used to steal funds or impersonate users</li>
      </ul>

      <h3>Authentication Tokens</h3>
      <p>
        Authentication tokens (JWTs) are the actual security mechanism that authorize blockchain interactions.
      </p>
      <ul>
        <li>Tokens are obtained from Keycloak using username/password</li>
        <li>Tokens must be kept secure and never shared</li>
        <li>Tokens are stored in browser localStorage</li>
        <li>Tokens expire and are automatically refreshed</li>
      </ul>

      <h3>Authorization Model</h3>
      <p>
        To interact with contracts, you need BOTH:
      </p>
      <ul>
        <li>A Party ID (public identifier)</li>
        <li>A valid authentication token (private authorization)</li>
      </ul>
      <p>
        Without a valid token, knowing a Party ID only allows you to VIEW contracts, not INTERACT with them.
      </p>

      <h2>Best Practices</h2>
      <ul>
        <li><strong>Never share:</strong> Keycloak credentials, JWT tokens, or refresh tokens</li>
        <li><strong>Safe to share:</strong> Party IDs (they're public identifiers)</li>
        <li><strong>Token Storage:</strong> Tokens are stored in localStorage (browser-only)</li>
        <li><strong>Auto-Refresh:</strong> Enable automatic token refresh to avoid expiration issues</li>
        <li><strong>Clear Tokens:</strong> Use "Clear Token" button when using a shared computer</li>
      </ul>

      <h2>Database Security</h2>
      <ul>
        <li>Database operations use Supabase service role key (server-side only)</li>
        <li>Client-side code never has direct database access</li>
        <li>All database operations go through API endpoints</li>
        <li>Contract data is stored securely in Supabase</li>
      </ul>

      <h2>Blockchain Security</h2>
      <ul>
        <li>All blockchain interactions require valid authentication tokens</li>
        <li>Transactions are signed by the Canton network</li>
        <li>CC transfers use on-chain TokenBalance contracts</li>
        <li>Transaction history is immutable on the blockchain</li>
      </ul>
    </div>
  )
}

function APIReferenceContent() {
  return (
    <div className="doc-section">
      <h1>API Reference</h1>
      
      <h2>Authentication Endpoints</h2>
      
      <h3>GET /api/get-token</h3>
      <p>Get authentication token from Keycloak.</p>
      <p><strong>Request:</strong></p>
      <pre>{`{
  "username": "string",
  "password": "string",
  "clientId": "string"
}`}</pre>
      <p><strong>Response:</strong></p>
      <pre>{`{
  "access_token": "string",
  "refresh_token": "string",
  "expires_in": number
}`}</pre>

      <h3>POST /api/refresh-token</h3>
      <p>Refresh authentication token using refresh token.</p>
      <p><strong>Request:</strong></p>
      <pre>{`{
  "refresh_token": "string",
  "clientId": "string"
}`}</pre>
      <p><strong>Response:</strong></p>
      <pre>{`{
  "access_token": "string",
  "refresh_token": "string",
  "expires_in": number
}`}</pre>

      <h2>Deposit/Withdraw Endpoints</h2>
      
      <h3>POST /api/deposit</h3>
      <p>Deposit CC to platform wallet (on-chain transfer).</p>
      <p><strong>Headers:</strong> Authorization: Bearer {'{token}'}</p>
      <p><strong>Request:</strong></p>
      <pre>{`{
  "amount": number,
  "userParty": "string",
  "userTokenBalanceContractId": "string"
}`}</pre>

      <h3>POST /api/withdraw</h3>
      <p>Withdraw CC from platform wallet (on-chain transfer).</p>
      <p><strong>Headers:</strong> Authorization: Bearer {'{token}'}</p>
      <p><strong>Request:</strong></p>
      <pre>{`{
  "amount": number,
  "userParty": "string",
  "platformTokenBalanceContractId": "string"
}`}</pre>

      <h2>Position Endpoints</h2>
      
      <h3>POST /api/create-position</h3>
      <p>Create a position on a market (database-only).</p>
      <p><strong>Request:</strong></p>
      <pre>{`{
  "marketId": "string",
  "positionType": "string",
  "amount": number,
  "price": number,
  "owner": "string"
}`}</pre>
      <p><strong>Response:</strong></p>
      <pre>{`{
  "success": true,
  "position": {...},
  "market": {...},
  "volumes": {
    "totalVolume": number,
    "yesVolume": number,
    "noVolume": number,
    "outcomeVolumes": {...}
  }
}`}</pre>

      <h2>Contract Endpoints</h2>
      
      <h3>POST /api/get-contracts</h3>
      <p>Get contracts from database.</p>
      <p><strong>Query Parameters:</strong></p>
      <ul>
        <li><code>party</code> - Filter by party</li>
        <li><code>templateType</code> - Filter by template type</li>
        <li><code>status</code> - Filter by status</li>
        <li><code>limit</code> - Limit results</li>
      </ul>

      <h3>POST /api/store-contract</h3>
      <p>Store contract in database.</p>
      <p><strong>Request:</strong></p>
      <pre>{`{
  "contractId": "string",
  "templateId": "string",
  "payload": {...},
  "party": "string",
  "updateId": "string",
  "completionOffset": "string",
  "explorerUrl": "string",
  "status": "string"
}`}</pre>

      <h3>PUT /api/update-contract-status</h3>
      <p>Update contract status in database.</p>
      <p><strong>Request:</strong></p>
      <pre>{`{
  "contractId": "string",
  "updateId": "string",
  "status": "string"
}`}</pre>

      <h2>Oracle Endpoints</h2>
      
      <h3>GET /api/oracle</h3>
      <p>Fetch price data from RedStone Oracle for market resolution.</p>
      <p><strong>Query Parameters:</strong></p>
      <ul>
        <li><code>symbol</code> - Asset symbol (e.g., "BTC", "ETH")</li>
      </ul>
      <p><strong>Response:</strong></p>
      <pre>{`{
  "symbol": "BTC",
  "value": 50000.00,
  "timestamp": 1234567890,
  "source": "redstone"
}`}</pre>

      <h2>Ledger API Proxies (e.g. Canton)</h2>
      
      <h3>POST /api/command</h3>
      <p>Proxy for ledger JSON API command submission (create contracts, exercise choices). Used for supported networks (e.g. Canton).</p>
      <p><strong>Headers:</strong> Authorization: Bearer {'{token}'}</p>
      <p><strong>Request:</strong></p>
      <pre>{`{
  "commands": {
    "party": "string",
    "applicationId": "string",
    "commandId": "string",
    "list": [
      {
        "templateId": "string",
        "payload": {...},
        "contractId": "string",
        "choice": "string",
        "argument": {...}
      }
    ]
  }
}`}</pre>
      <p><strong>Response:</strong></p>
      <pre>{`{
  "updateId": "string",
  "contractId": "string",
  "result": {...},
  "transactionHash": "string"
}`}</pre>
      
      <h3>POST /api/query</h3>
      <p>Proxy for ledger JSON API queries (active-contracts endpoint). Note: Limited support on some ledgers - returns empty array if endpoints unavailable.</p>
      <p><strong>Request:</strong></p>
      <pre>{`{
  "templateIds": ["string"],
  "query": {},
  "walletParty": "string"
}`}</pre>
      <p><strong>Response:</strong></p>
      <pre>{`[
  {
    "contractId": "string",
    "templateId": "string",
    "payload": {...}
  }
]`}</pre>

      <h2>Health & Diagnostics</h2>
      
      <h3>GET /api/health</h3>
      <p>Check API health status.</p>
      <p><strong>Response:</strong></p>
      <pre><code>{`{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00Z"
}`}</code></pre>

      <h2>Error Responses</h2>
      <p>All endpoints may return error responses in the format:</p>
      <pre>{`{
  "error": "string",
  "message": "string",
  "details": {...}
}`}</pre>
    </div>
  )
}
