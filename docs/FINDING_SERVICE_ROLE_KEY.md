# Finding Your Supabase Service Role Key

## Your Project Details

- **Project URL**: `https://jjhggmbrdtscgdqyirwd.supabase.co`
- **Project Name**: Prediction Markets - Canton fallback

## The Service Role Key

The **Secret Key** you provided (`sb_secret_iojbf1uwRiXE5AkbZE5S1g_awoB09pf`) is likely your **Service Role Key** in Supabase's newer format.

Supabase has updated their key format:
- **Old format**: JWT tokens starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **New format**: Keys starting with `sb_secret_...` or `sb_publishable_...`

## How to Find It in Supabase Dashboard

1. Go to your Supabase project: [https://supabase.com/dashboard/project/jjhggmbrdtscgdqyirwd](https://supabase.com/dashboard/project/jjhggmbrdtscgdqyirwd)

2. Click **Settings** (gear icon) in the left sidebar

3. Click **API** in the settings menu

4. Look for one of these sections:

### Option A: "Project API keys" section
- You'll see:
  - **Project URL**: `https://jjhggmbrdtscgdqyirwd.supabase.co`
  - **anon** `public` key: `sb_publishable_...` (this is your publishable key)
  - **service_role** `secret` key: `sb_secret_...` (this is your service role key) ✅

### Option B: "API Settings" section
- Look for:
  - **Project URL**
  - **API Keys** section with:
    - **Publishable Key** (anon/public)
    - **Secret Key** (service_role) ✅

### Option C: If you see JWT tokens
- Look for keys that start with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- The **service_role** key is the one you need (not the anon key)

## Which Key to Use

✅ **Use the Secret Key** (`sb_secret_iojbf1uwRiXE5AkbZE5S1g_awoB09pf`) - This is your Service Role Key

❌ **Don't use** the Publishable Key (`sb_publishable_...`) - This is for frontend use only

## Setting in Vercel

In Vercel, set:
- **Key**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: `sb_secret_iojbf1uwRiXE5AkbZE5S1g_awoB09pf`

## Verification

After setting the environment variable:
1. Redeploy your Vercel project
2. Create a test contract
3. Check Vercel logs - you should see:
   ```
   [api/store-contract] ✅ Contract stored successfully
   ```
4. Check Supabase dashboard → **Table Editor** → `contracts` table - you should see your contract

## Troubleshooting

If you still can't find it:
1. The Secret Key you provided should work - try using it directly
2. Check if there's a "Reveal" or "Show" button next to the key
3. Some projects might have it under **Settings** → **API** → **Service Role Key** (with a reveal button)
4. The key might be labeled as "Secret" or "Service Role" - both refer to the same thing