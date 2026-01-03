# Final Setup Checklist - Get Your App Running

## ✅ Completed Steps

- [x] Supabase project created
- [x] Environment variables set in Vercel:
  - [x] `SUPABASE_URL` = `https://jjhggmbrdtscgdqyirwd.supabase.co`
  - [x] `SUPABASE_SERVICE_ROLE_KEY` = `sb_secret_iojbf1uwRiXE5AkbZE5S1g_awoB09pf`

## 🔲 Remaining Steps

### Step 1: Create Database Table (REQUIRED)

1. Go to your Supabase project: [https://supabase.com/dashboard/project/jjhggmbrdtscgdqyirwd](https://supabase.com/dashboard/project/jjhggmbrdtscgdqyirwd)
2. Click **SQL Editor** in the left sidebar
3. Click **"New query"**
4. Copy and paste this SQL:

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
CREATE POLICY "Allow all operations" ON contracts
FOR ALL
USING (true)
WITH CHECK (true);
```

5. Click **"Run"** (or press `Ctrl+Enter`)
6. You should see: **"Success. No rows returned"**

### Step 2: Redeploy Vercel Project (REQUIRED)

After setting environment variables, you need to redeploy:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Deployments** tab
4. Click **"..."** on the latest deployment
5. Click **"Redeploy"**
6. Wait for deployment to complete

**OR** simply push a new commit to trigger automatic deployment.

### Step 3: Test the Setup

1. **Create a Test Contract**:
   - Go to your app
   - Connect wallet (enter Party ID)
   - Get a token (username/password or manual entry)
   - Create a new market contract

2. **Verify in Supabase**:
   - Go to Supabase → **Table Editor** → `contracts` table
   - You should see your contract with all data

3. **Verify in Admin Dashboard**:
   - Go to Admin Dashboard
   - You should see your contract listed
   - Check browser console for: `[AdminDashboard] ✅ Database query succeeded`

## 🎯 Verification Checklist

- [ ] Database table `contracts` exists in Supabase
- [ ] Vercel project redeployed after setting environment variables
- [ ] Can create a market contract successfully
- [ ] Contract appears in Supabase Table Editor
- [ ] Contract appears in Admin Dashboard
- [ ] No errors in browser console
- [ ] No errors in Vercel logs

## 🐛 Troubleshooting

### "Supabase not configured" error
- ✅ Check environment variables are set in Vercel
- ✅ Verify you redeployed after adding variables
- ✅ Check Vercel logs for environment variable errors

### "Table does not exist" error
- ✅ Run the SQL from Step 1 above
- ✅ Verify table exists in Supabase Table Editor
- ✅ Check table name is exactly `contracts` (lowercase)

### Contracts not appearing
- ✅ Check Supabase Table Editor - do contracts exist?
- ✅ Verify `party` field matches your wallet party ID
- ✅ Check browser console for detailed error messages
- ✅ Check Vercel logs for API endpoint errors

### Token expiration issues
- ✅ See `docs/TOKEN_EXPIRATION_SOLUTION.md` for solutions
- ✅ Automatic refresh is enabled (checks every 30 seconds)
- ✅ Token refreshes proactively before expiration

## 🚀 You're Ready!

Once all steps are complete:
1. ✅ Database table created
2. ✅ Vercel redeployed
3. ✅ Test contract created successfully

Your app should be fully functional!