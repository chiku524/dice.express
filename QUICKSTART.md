# Quick Start Guide

## Getting Started in 5 Minutes

### 1. Prerequisites Check

```bash
# Check DAML SDK
daml version  # Should be 2.8.0 or later

# Check Node.js
node --version  # Should be 18 or later
npm --version
```

### 2. Build the Project

```bash
# Build DAML contracts
daml build

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Configure Environment

```bash
# Copy environment template
cp frontend/.env.example frontend/.env

# Edit frontend/.env and set (example for Canton):
# VITE_LEDGER_URL=https://participant.dev.canton.wolfedgelabs.com
# Platform uses virtual Credits; ledger is for deposit/withdraw (multi-chain).
```

### 4. Start Development

```bash
# Terminal 1: Start frontend (from project root)
cd frontend
npm run dev

# Terminal 2: Start oracle service (optional, for oracle integration)
cd oracle
npm install
npm run monitor
```

### 5. Access the Application

Open your browser to: `http://localhost:3000`

## First Steps

1. **Connect Wallet**: Click "Connect Wallet" and enter a party name
2. **Browse Markets**: View existing markets (if any)
3. **Create Market**: Create your first prediction market
   - Requires 100 CC deposit
   - Waits for admin approval
4. **Trade**: Once approved, create positions in markets

## Common Tasks

### Create a Market

1. Navigate to "Create Market"
2. Fill in:
   - Title: "Will Bitcoin reach $100k by 2025?"
   - Description: Market description
   - Market Type: Binary
   - Settlement: Time-based or Event-based
   - Resolution Criteria: How the market resolves
3. Submit (100 CC deposit required)

### Create a Position

1. Browse to a market
2. Enter position details:
   - Type: Yes or No
   - Amount: Position size
   - Price: Price per share (0.0 - 1.0)
3. Submit transaction

### View Portfolio

Navigate to "Portfolio" to see all your positions.

## Troubleshooting

### Frontend won't connect to ledger
- Check `VITE_LEDGER_URL` in `.env` (and any chain-specific env)
- Verify the configured ledger/participant is accessible (e.g. Canton)
- Check browser console for errors

### DAML build errors
- Run `daml clean` then `daml build`
- Check `daml.yaml` dependencies
- Verify DAML SDK version

### Oracle service errors
- Check RedStone API access
- Verify `LEDGER_URL` environment variable
- Check oracle party permissions

## Next Steps

- Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design
- Read [docs/README.md](docs/README.md) for full doc index
- Read [docs/API.md](docs/API.md) for API reference

## Getting Help

- Check the documentation in `docs/` directory
- Review contract code in `contracts/` directory
- Check Canton documentation: https://docs.digitalasset.com

