# Cloud Storage Setup Guide

## Overview

The application now uses **Supabase** (PostgreSQL database) for cloud storage of contracts, with local storage as a fallback. This provides:

- ✅ Cross-device access to contracts
- ✅ Reliable cloud-based storage
- ✅ Better scalability than local storage
- ✅ Automatic fallback to local storage if cloud is unavailable

## Architecture

```
Contract Creation Flow:
1. Create contract on blockchain → Get updateId/completionOffset
2. Store contract in Supabase (cloud database)
3. If cloud fails → Fall back to local storage

Contract Retrieval Flow (AdminDashboard):
1. Query blockchain first (primary source of truth)
2. If blockchain query fails → Query Supabase (cloud storage)
3. If cloud fails → Fall back to local storage
```

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Project Name**: `canton-prediction-markets` (or your choice)
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to your users
5. Wait for project to be created (~2 minutes)

### 2. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Key** (keep this secret! It has admin access)
   - **Anon Key** (public key, safe to use in frontend if needed)

### 3. Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important**: 
- Use `SUPABASE_SERVICE_ROLE_KEY` (not anon key) for server-side API endpoints
- The service role key bypasses Row Level Security (RLS), which is needed for our API endpoints

### 4. Create the Database Table

The database table will be created automatically when you first use the API, OR you can create it manually:

1. Go to **SQL Editor** in Supabase dashboard
2. Run this SQL:

```sql
-- Create contracts table for storing contract metadata
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT NOT NULL UNIQUE,
  template_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  party TEXT NOT NULL,
  status TEXT DEFAULT 'PendingApproval',
  update_id TEXT,
  completion_offset BIGINT,
  explorer_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_contracts_party ON contracts(party);
CREATE INDEX IF NOT EXISTS idx_contracts_template_id ON contracts(template_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_party_status ON contracts(party, status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (we handle auth in API layer)
-- For production, you'd want more restrictive policies
CREATE POLICY "Allow all operations" ON contracts
FOR ALL
USING (true)
WITH CHECK (true);
```

### 5. Install Dependencies

The Supabase client is already added to `package.json`. If deploying to Vercel, it will install automatically. For local development:

```bash
npm install
```

### 6. Test the Setup

1. Deploy your changes to Vercel (or run locally)
2. Create a new market contract
3. Check the browser console for logs like:
   - `[ContractStorage] ✅ Contract stored in cloud: ...`
4. Check Supabase dashboard → **Table Editor** → `contracts` table to see stored contracts

## API Endpoints

### Store Contract
**POST** `/api/store-contract`

```json
{
  "contractId": "contract-id-here",
  "templateId": "b87ef31c...:PredictionMarkets:MarketCreationRequest",
  "payload": { ... },
  "party": "party-id-here",
  "updateId": "update-id-here",
  "completionOffset": 123456,
  "explorerUrl": "https://...",
  "status": "PendingApproval"
}
```

### Get Contracts
**GET** `/api/get-contracts?party=...&templateType=...&status=...`

Query parameters:
- `party` (optional): Filter by party ID
- `templateType` (optional): Filter by template type (e.g., "MarketCreationRequest")
- `status` (optional): Filter by status (e.g., "PendingApproval")
- `limit` (optional): Limit results (default: 100)

## Fallback Behavior

The system gracefully handles failures:

1. **Cloud storage fails** → Falls back to local storage
2. **Both fail** → Returns empty array
3. **All logs indicate** which storage method was used

## Security Considerations

- ✅ Service Role Key is only used server-side (in API endpoints)
- ✅ Row Level Security (RLS) is enabled on the table
- ⚠️ Current policy allows all operations (update for production)
- 💡 For production, implement proper authentication and RLS policies

## Troubleshooting

### "Cloud storage not configured" error
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel
- Redeploy after adding environment variables

### "Failed to store contract" error
- Check Supabase dashboard for table existence
- Verify the table schema matches the expected structure
- Check Supabase logs for detailed errors

### Contracts not appearing
- Check browser console for storage method used
- Verify contracts exist in Supabase dashboard
- Check that party IDs match between creation and retrieval

## Migration from Local Storage

Existing local storage contracts will continue to work as fallback. To migrate them to cloud storage:

1. Contracts are automatically stored in cloud when created
2. Old local storage contracts remain as backup
3. New contracts prioritize cloud storage

## Next Steps

- [ ] Set up proper RLS policies for production
- [ ] Add authentication to API endpoints
- [ ] Implement contract cleanup/archival
- [ ] Add monitoring/analytics for storage operations