# Stripe integration: next steps

You’ve created the 5 Pips products in Stripe. Follow these steps to go live.

---

## 1. Set environment variables (Cloudflare)

Your Pages project needs **both** Stripe secrets. Set them in **Cloudflare Dashboard → Pages → dice-express → Settings → Environment variables** (or use `wrangler pages secret put`). Use **Production** (and Preview if you test on preview URLs).

| Variable | Where to get it | Purpose |
|----------|-----------------|---------|
| **STRIPE_SECRET_KEY** | Stripe Dashboard → Developers → API keys → **Secret key** (starts with `sk_test_` or `sk_live_`) | Creates Checkout sessions. **Required** or “Deposit with card” returns “Stripe not configured”. |
| **STRIPE_WEBHOOK_SECRET** | Webhook destination → **Signing secret** (Reveal; starts with `whsec_`) | Verifies webhooks and credits Pips. |

- For **test mode**: use `sk_test_...` and the signing secret from your test webhook (e.g. `pips-purchase` → `https://dice.express/api/stripe-webhook`).
- For **live**: use `sk_live_...` and create a live webhook; set both env vars to the live values.

---

## 2. Add the webhook in Stripe (Developers → Webhooks → Add destination)

Your app only needs one event: **`checkout.session.completed`**. Follow these steps in the Stripe UI.

### Step A: Events from account & API version

When you click **Add destination**:

1. **Events from**  
   Choose **“Events from Your account”** (not “Connected and v2 accounts”). Your checkout and Pips crediting use your own Stripe account.

2. **API version**  
   Use the default Stripe shows (e.g. **2026-01-28.clover** or whatever is selected). The backend expects the standard Stripe webhook payload; that version is fine. Click **Continue** (or equivalent) to go to the next step.

### Step B: Select events

3. **Select events**  
   - In the event picker, search or browse for **`checkout.session.completed`**.  
   - Select **only** that event (no need to add payment_intent or invoice events).  
   - This is the event Stripe sends when a Checkout session completes; your handler uses it to credit Pips.  
   - Continue to **Choose destination type**.

### Step C: Destination type

4. **Destination type**  
   Choose **“Webhook”** or **“Web endpoint”** (the option that sends HTTP POST requests to a URL). Do **not** choose something like “Send to Stripe CLI” or “Queue” unless you only want to test locally.

### Step D: Configure destination

5. **Endpoint URL**  
   Enter your live webhook URL (HTTPS, deployed domain):

   `https://<your-production-domain>/api/stripe-webhook`

   Examples:
   - `https://dice-express.pages.dev/api/stripe-webhook`
   - Or your custom domain, e.g. `https://dice.express/api/stripe-webhook`

6. **Description** (optional)  
   e.g. “Pips credit on checkout” so you can tell it apart from other destinations later.

7. Finish by clicking **Add destination** (or **Create** / **Save**).

### Step E: Get the signing secret

8. Open the new webhook destination in the list.
9. Find **Signing secret** and click **Reveal**.
10. Copy the value (starts with `whsec_...`) and set it as **STRIPE_WEBHOOK_SECRET** in Cloudflare (step 1).

Important: the webhook must use **HTTPS** and your **deployed** domain so Stripe can reach it. For local testing you can use Stripe CLI to forward events (see step 4).

**Quick reference for “Add destination”:**

| Step | What to choose |
|------|----------------|
| Events from | **Your account** |
| API version | Default (e.g. **2026-01-28.clover**) |
| Events | **`checkout.session.completed`** only |
| Destination type | **Webhook** / **Web endpoint** |
| URL | `https://dice-express.pages.dev/api/stripe-webhook` (or your domain) |

---

## 3. Test purchasing Pips on dice.express

1. **Cloudflare:** Ensure **both** env vars are set for **Production**: **STRIPE_SECRET_KEY** (e.g. `sk_test_...`) and **STRIPE_WEBHOOK_SECRET** (e.g. `whsec_...` from your `pips-purchase` webhook).
2. **Deploy** the latest code so the app and `/api/stripe-webhook` are live on dice.express.
3. Open **https://dice.express**, sign in, go to **Portfolio**.
4. Under **Deposit with card**, enter an amount (e.g. **5**), click **Deposit with card**.
5. Complete Stripe Checkout (test card: **4242 4242 4242 4242**, any future expiry, any CVC).
6. You’re redirected to Portfolio with a success message; your balance updates within a few seconds (webhook credits Pips). If not, refresh the page.
7. Optional: Stripe Dashboard → Developers → Webhooks → **pips-purchase** → **Recent deliveries** → confirm `checkout.session.completed` returned **200**.

---

## 4. Deploy and test the flow

1. **Deploy** your app (e.g. push to the branch connected to Pages) so the latest API and env vars are live.
2. **Test purchase (custom amount):**
   - Open your app, go to Portfolio, connect a wallet.
   - Under “Deposit with card”, enter an amount (e.g. 5) and click **Deposit with card**.
   - You should be redirected to Stripe Checkout. Use test card `4242 4242 4242 4242`, any future expiry, any CVC.
   - After payment, you should be redirected back to Portfolio. The webhook will run and credit your balance (may take a few seconds).
3. **Verify:** Check your balance on the Portfolio page. Optionally in Stripe Dashboard → Developers → Webhooks → your endpoint, check **Recent deliveries** to confirm `checkout.session.completed` was sent and returned 200.

If the webhook fails (e.g. 500), check Cloudflare Pages/Workers logs and ensure **STRIPE_WEBHOOK_SECRET** matches the signing secret shown in the Stripe webhook details.

---

## 5. Stripe Product IDs for package buttons (optional)

Portfolio has **Packages** ($5, $10, $25, $50, $100) and **Custom amount**. To show your Stripe product name and image in Checkout for packages:

1. **Stripe Dashboard:** Ensure each Pips product has a **default price** (Products → [product] → Pricing → one price marked default).
2. Set **build-time** env vars with your **Stripe Product IDs** (prod_xxx):
   - `VITE_STRIPE_PRODUCT_5`, `VITE_STRIPE_PRODUCT_10`, `VITE_STRIPE_PRODUCT_25`, `VITE_STRIPE_PRODUCT_50`, `VITE_STRIPE_PRODUCT_100`
3. **Cloudflare Pages:** Dashboard → dice-express → Settings → Environment variables → **Build** → Add each variable (or bulk paste from `frontend/.env.example`).
4. **Local build:** Copy `frontend/.env.example` to `frontend/.env` so Vite sees the vars.

The API accepts **productId** (prod_xxx) and resolves it to the product’s default price via Stripe, so Checkout shows the correct product. **Custom amount** always works (user enters PP; we create a one-off price). The webhook credits Pips from **`amount_total`** for both.

---

## 6. Go live checklist

- [ ] **STRIPE_SECRET_KEY** and **STRIPE_WEBHOOK_SECRET** set in Cloudflare (production env).
- [ ] Webhook endpoint added in Stripe with URL `https://<your-domain>/api/stripe-webhook` and event `checkout.session.completed`.
- [ ] Test payment in test mode: balance updates after checkout.
- [ ] When ready for real money: switch to **live** API key and create a **live** webhook; update the two env vars to the live values.

You’re integrated when a test payment completes and your Pips balance increases after redirect.
