# Database Setup Guide - Supabase

## Overview

Since Canton's JSON API doesn't provide reliable contract querying endpoints, **Supabase (PostgreSQL) is now the primary storage** for contracts, with blockchain as a fallback. This ensures:

- ✅ Contracts are immediately visible after creation
- ✅ Reliable querying without depending on blockchain synchronization
- ✅ Cross-device access to contracts
- ✅ Better user experience

## Architecture

```
Contract Creation Flow:
1. Create contract on blockchain → Get updateId/completionOffset
2. Store contract in Supabase database (PRIMARY) ✅
3. If database fails → Fall back to local storage

Contract Retrieval Flow (AdminDashboard):
1. Query database first (PRIMARY) ✅
2. If database empty/failed → Query blockchain (fallback)
3. Merge results (database takes precedence)
```

## Step-by-Step Setup

### Step 1: Create Supabase Account and Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign up"**
3. Sign up with GitHub, Google, or email
4. Once logged in, click **"New Project"**
5. Fill in the form:
   - **Name**: `canton-prediction-markets` (or your choice)
   - **Database Password**: Create a strong password (save it securely!)
   - **Region**: Choose closest to your users (e.g., `US East (N. Virginia)`)
   - **Pricing Plan**: Free tier is fine for development
6. Click **"Create new project"**
7. Wait 2-3 minutes for project to be created

### Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, click **Settings** (gear icon in sidebar)
2. Click **API** in the settings menu
3. You'll see two important sections:

#### Project URL
- Copy the **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
- This is your `SUPABASE_URL`

#### API Keys
- **Service Role Key** (secret) - Copy this (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
  - ⚠️ **Keep this secret!** It has admin access
  - This is your `SUPABASE_SERVICE_ROLE_KEY`
- **Anon Key** (public) - You don't need this for our setup

### Step 3: Create the Database Table

1. In Supabase dashboard, click **SQL Editor** in the sidebar
2. Click **"New query"**
3. Copy and paste this SQL:

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

4. Click **"Run"** (or press `Ctrl+Enter`)
5. You should see: **"Success. No rows returned"**

### Step 4: Set Environment Variables in Vercel

1. Go to your Vercel project dashboard: [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project: `upwork-canton-daml-project` (or your project name)
3. Click **Settings** in the top navigation
4. Click **Environment Variables** in the sidebar
5. Click **"Add New"** button
6. Add the first variable:
   - **Key**: `SUPABASE_URL`
   - **Value**: Your Project URL from Step 2 (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **Environment**: Select all (Production, Preview, Development)
   - Click **"Save"**
7. Click **"Add New"** again
8. Add the second variable:
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: Your Service Role Key from Step 2 (the long JWT token)
   - **Environment**: Select all (Production, Preview, Development)
   - Click **"Save"**

### Step 5: Redeploy Your Application

1. After adding environment variables, Vercel needs to redeploy
2. Go to **Deployments** tab in Vercel
3. Click the **"..."** menu on the latest deployment
4. Click **"Redeploy"**
5. Or simply push a new commit to trigger a new deployment

### Step 6: Verify the Setup

1. After deployment, go to your app
2. Create a new market contract
3. Check the browser console - you should see:
   ```
   [ContractStorage] ✅ Contract stored in cloud: ...
   ```
4. Go to Supabase dashboard → **Table Editor** → `contracts` table
5. You should see your contract with all the data (title, description, etc.)

## Testing the Setup

### Test 1: Create a Contract

1. Create a new market in your app
2. Check Supabase **Table Editor** → `contracts` table
3. You should see a new row with all contract details

### Test 2: View in Admin Dashboard

1. Go to Admin Dashboard
2. You should see the contract you just created
3. Check browser console - should show:
   ```
   [AdminDashboard] ✅ Database query succeeded: 1 contracts found
   ```

### Test 3: Verify Data

In Supabase **Table Editor**, check that:
- ✅ `contract_id` is populated
- ✅ `template_id` contains `MarketCreationRequest`
- ✅ `payload` JSON contains: `title`, `description`, `admin`, `creator`, etc.
- ✅ `party` matches your wallet party ID
- ✅ `status` is `PendingApproval`

## Troubleshooting

### "Supabase not configured" Error

**Symptom**: `[api/get-contracts] Supabase not configured`

**Solution**:
1. Verify environment variables are set in Vercel
2. Make sure you used `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
3. Redeploy after adding environment variables
4. Check Vercel logs to see if variables are being read

### "Failed to store contract" Error

**Symptom**: `[api/store-contract] Supabase error`

**Solution**:
1. Check Supabase dashboard → **Table Editor** → verify `contracts` table exists
2. Check Supabase **Logs** for detailed error messages
3. Verify the table schema matches the SQL above
4. Check that RLS policy allows operations

### Contracts Not Appearing in Admin Dashboard

**Symptom**: Admin Dashboard shows 0 contracts

**Solution**:
1. Check Supabase **Table Editor** - do contracts exist?
2. Verify `party` field matches your wallet party ID
3. Check `status` field is `PendingApproval`
4. Check browser console for database query logs
5. Verify environment variables are set correctly

### Database Connection Timeout

**Symptom**: Timeout errors when querying database

**Solution**:
1. Check Supabase project status (might be paused on free tier)
2. Verify your region selection
3. Check Supabase dashboard for any service issues

## Database Schema Reference

### contracts Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `contract_id` | TEXT | Contract ID (unique) |
| `template_id` | TEXT | Template ID (e.g., `b87ef31c...:PredictionMarkets:MarketCreationRequest`) |
| `payload` | JSONB | Contract data (title, description, admin, creator, etc.) |
| `party` | TEXT | Party ID that created/owns the contract |
| `status` | TEXT | Contract status (e.g., `PendingApproval`) |
| `update_id` | TEXT | Update ID from blockchain (if async) |
| `completion_offset` | BIGINT | Completion offset from blockchain |
| `explorer_url` | TEXT | Link to view contract in explorer |
| `created_at` | TIMESTAMP | When contract was created |
| `updated_at` | TIMESTAMP | When contract was last updated |

### Indexes

- `idx_contracts_party` - Fast queries by party
- `idx_contracts_template_id` - Fast queries by template
- `idx_contracts_status` - Fast queries by status
- `idx_contracts_created_at` - Fast sorting by creation time
- `idx_contracts_party_status` - Fast queries by party + status

## Security Notes

⚠️ **Important Security Considerations**:

1. **Service Role Key**: 
   - Never expose in frontend code
   - Only used in server-side API endpoints
   - Has admin access - keep it secret!

2. **Row Level Security (RLS)**:
   - Currently set to allow all operations
   - For production, implement proper policies
   - Consider adding authentication checks

3. **Environment Variables**:
   - Only set in Vercel (not in code)
   - Never commit to git
   - Use different keys for production/staging

## Next Steps

After setup:
1. ✅ Test creating a contract
2. ✅ Verify it appears in Admin Dashboard
3. ✅ Check Supabase table to see the data
4. ✅ Test with multiple contracts
5. ⚠️ Consider implementing proper RLS policies for production

## Support

If you encounter issues:
1. Check Supabase **Logs** for detailed errors
2. Check Vercel **Logs** for API endpoint errors
3. Verify environment variables are set correctly
4. Ensure table was created successfully
5. Check browser console for detailed error messages