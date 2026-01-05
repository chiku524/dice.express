# User Balance Tracking Setup

## Overview

The application now tracks virtual CC (Canton Coin) balances for each user in the database. This allows:
- ✅ Position creation checks user balance before allowing trades
- ✅ Deposits increase user balance
- ✅ Position creation deducts from user balance
- ✅ Withdrawals decrease user balance
- ✅ Balance is displayed in the Portfolio page

## Database Schema

You need to create a `user_balances` table in your Supabase database.

### Step 1: Create the Table

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the sidebar
3. Click **"New query"**
4. Copy and paste this SQL:

```sql
-- Create user_balances table for tracking virtual CC balances
CREATE TABLE IF NOT EXISTS user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party TEXT NOT NULL UNIQUE,
  balance TEXT NOT NULL DEFAULT '0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_balances_party ON user_balances(party);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_user_balances_updated_at BEFORE UPDATE ON user_balances
FOR EACH ROW EXECUTE FUNCTION update_user_balances_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (we handle auth in API layer)
CREATE POLICY "Allow all operations" ON user_balances
FOR ALL
USING (true)
WITH CHECK (true);
```

5. Click **"Run"** (or press `Ctrl+Enter`)
6. You should see: **"Success. No rows returned"**

## How It Works

### Balance Flow

1. **Initial State**: When a user first interacts, their balance is `0`
2. **Deposit**: When user deposits CC via `/api/deposit`:
   - On-chain transfer occurs (CC moves from user wallet to platform wallet)
   - User's virtual balance in database is **increased** by the deposit amount
3. **Position Creation**: When user creates a position via `/api/create-position`:
   - System checks if user has sufficient balance
   - If insufficient, returns error: "Insufficient balance"
   - If sufficient, creates position and **deducts** amount from user balance
4. **Withdrawal**: When user withdraws CC via `/api/withdraw`:
   - On-chain transfer occurs (CC moves from platform wallet to user wallet)
   - User's virtual balance in database is **decreased** by the withdrawal amount

### API Endpoints

- **GET/POST `/api/get-user-balance`**: Get user's current virtual CC balance
- **POST `/api/update-user-balance`**: Update user's balance (add or subtract)

## Testing

1. **Check Initial Balance**:
   - Go to Portfolio page
   - You should see "Virtual CC Balance: 0.00 CC"

2. **Deposit CC**:
   - Deposit 10 CC via Portfolio page
   - Balance should update to "10.00 CC"

3. **Create Position**:
   - Try creating a position with amount 5 CC
   - Should succeed and balance should decrease to "5.00 CC"

4. **Insufficient Balance**:
   - Try creating a position with amount 10 CC when balance is 5 CC
   - Should show error: "Insufficient balance"

## Important Notes

- **Virtual Balance**: This is a database-tracked balance, separate from on-chain TokenBalance contracts
- **On-Chain vs Virtual**: 
  - Deposits/withdrawals perform actual on-chain transfers
  - Position creation uses virtual balance (database-only)
- **Balance Sync**: Balance is automatically updated when:
  - Depositing CC (increases balance)
  - Creating positions (decreases balance)
  - Withdrawing CC (decreases balance)
