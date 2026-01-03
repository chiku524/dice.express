# Quick Supabase Setup - Your Project

## Your Supabase Credentials

✅ **Project URL**: `https://jjhggmbrdtscgdqyirwd.supabase.co`  
✅ **Service Role Key**: `sb_secret_iojbf1uwRiXE5AkbZE5S1g_awoB09pf` (this is your Secret Key)

## Step 1: Set Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `upwork-canton-daml-project`
3. Go to **Settings** → **Environment Variables**
4. Add these two variables:

### Variable 1:
- **Key**: `SUPABASE_URL`
- **Value**: `https://jjhggmbrdtscgdqyirwd.supabase.co`
- **Environment**: Select all (Production, Preview, Development)
- Click **Save**

### Variable 2:
- **Key**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: `sb_secret_iojbf1uwRiXE5AkbZE5S1g_awoB09pf`
- **Environment**: Select all (Production, Preview, Development)
- Click **Save**

## Step 2: Create the Database Table

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

## Step 3: Redeploy Your Vercel Project

1. After setting environment variables, go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger deployment

## Step 4: Test the Setup

1. After deployment, go to your app
2. Create a new market contract
3. Check the browser console - you should see:
   ```
   [ContractStorage] ✅ Contract stored in cloud: ...
   ```
4. Go to Supabase dashboard → **Table Editor** → `contracts` table
5. You should see your contract with all the data (title, description, etc.)

## About the Service Role Key

The **Secret Key** (`sb_secret_...`) you provided is the **Service Role Key** in Supabase's newer format. This is correct and will work.

Supabase uses two key formats:
- **Old format**: JWT tokens starting with `eyJ...`
- **New format**: Keys starting with `sb_secret_...` or `sb_publishable_...`

Your `sb_secret_iojbf1uwRiXE5AkbZE5S1g_awoB09pf` is the correct Service Role Key.

## Verification Checklist

- [ ] Environment variables set in Vercel
- [ ] Database table created in Supabase
- [ ] Vercel project redeployed
- [ ] Test contract created successfully
- [ ] Contract appears in Supabase Table Editor
- [ ] Contract appears in Admin Dashboard

## Troubleshooting

### "Supabase not configured" error
- Verify environment variables are set in Vercel
- Make sure you redeployed after adding variables
- Check Vercel logs for environment variable errors

### "Table does not exist" error
- Run the SQL from Step 2 above
- Verify the table exists in Supabase Table Editor
- Check table name is exactly `contracts` (lowercase)

### Contracts not appearing
- Check Supabase Table Editor - do contracts exist?
- Verify `party` field matches your wallet party ID
- Check browser console for detailed error messages
- Check Vercel logs for API endpoint errors