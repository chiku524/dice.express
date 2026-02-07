# Canton Prediction Markets

A privacy-preserving prediction markets application built on the Canton blockchain network.

## Features

- **Binary and Multi-Outcome Markets**: Support for yes/no and multi-choice prediction markets
- **Privacy-Preserving**: Individual positions are private, only aggregated data is visible
- **Admin Approval Flow**: Market creation requires 100 CC deposit and admin approval
- **Oracle Integration**: RedStone oracle integration for market resolution
- **Multi-Step Settlement**: Time-based and event-based settlement with explicit steps
- **Configurable Fees**: Adjustable fees for market creation, position changes, and settlement
- **Wallet Integration**: Secure wallet with passkey support
- **Real-Time Updates**: Direct connection to Canton ledger for real-time state synchronization

## Project Structure

```
.
├── contracts/               # DAML smart contracts (source)
│   ├── PredictionMarkets.daml
│   ├── AMM.daml
│   ├── Token.daml
│   └── Setup.daml
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── constants/
│   └── package.json
├── api/                     # Serverless API (e.g. Vercel)
├── scripts/                 # Deployment and utility scripts
├── docs/                    # Documentation
├── daml.yaml                # DAML project config (source: contracts)
└── package.json
```

## Prerequisites

- DAML SDK 2.8.0 or later
- Node.js 18+ and npm
- Access to Canton test environment
- RedStone API access (for oracle integration)

## Setup

### 1. Install Dependencies

```bash
# Install DAML dependencies (handled by daml build)
daml build

# Install frontend dependencies
cd frontend
npm install
```

### 2. Configure Environment

Create a `.env` file in the frontend directory:

```env
VITE_LEDGER_URL=https://participant.dev.canton.wolfedgelabs.com
```

### 3. Build DAML Contracts

```bash
daml build
```

### 4. Deploy to Canton

```bash
# Make deploy script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh
```

### 5. Start Frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Usage

### Creating a Market

1. Connect your wallet
2. Navigate to "Create Market"
3. Fill in market details:
   - Title and description
   - Market type (Binary or Multi-Outcome)
   - Settlement trigger (Time-based, Event-based, or Manual)
   - Resolution criteria
4. Submit (requires 100 CC deposit)
5. Wait for admin approval

### Trading

1. Browse active markets
2. Select a market to view details
3. Create a position:
   - Choose position type (Yes/No or specific outcome)
   - Enter amount and price
   - Submit transaction

### Portfolio

View all your positions and their status in the Portfolio section.

## Architecture

### DAML Contracts

- **MarketConfig**: Global configuration for fees and settings
- **MarketCreationRequest**: Pending market creation requests awaiting admin approval
- **Market**: Core market contract with lifecycle management
- **Position**: Private position contracts for each user
- **OracleDataFeed**: Oracle data feed contracts

### Frontend

- React-based SPA with direct Canton ledger connection
- Real-time state synchronization via WebSocket
- Wallet management with passkey support
- Responsive design for desktop and mobile

### Oracle Integration

- RedStone oracle integration for external data feeds
- Event-driven and time-based resolution triggers
- Automatic market resolution based on oracle data

## Development

### Running Tests

```bash
daml test
```

### Building for Production

```bash
# Build DAML
daml build

# Build frontend
cd frontend
npm run build
```

## API Endpoints

The application uses the Canton JSON API:
- Base URL: `https://participant.dev.canton.wolfedgelabs.com`
- Documentation: https://docs.digitalasset.com/build/3.4/reference/json-api/openapi.html

## Key Design Decisions

1. **Privacy Model**: Positions are private to owners, only aggregated market data is public
2. **Multi-Step Settlement**: Settlement is broken into explicit steps for transparency and flexibility
3. **Configurable Fees**: All fees are configurable and can be set to zero
4. **Admin Controls**: Admin can approve/reject markets and override disputes
5. **Oracle Integration**: RedStone oracle for reliable external data feeds

## Security Considerations

- All transactions are on-ledger and immutable
- Wallet authentication uses passkeys for security
- Privacy boundaries are enforced at the contract level
- Admin actions are fully traceable on-ledger

## License

MIT
