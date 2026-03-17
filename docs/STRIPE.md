# Stripe Integration & Business Verification

Covers **integrating** Stripe (env, webhook, testing) and **copy for Stripe business verification** (description of products/services, how you use Stripe).

---

# Part 1 — Integration (next steps)

You’ve created the 5 Pips products in Stripe. Follow these steps to go live.

---

## 1. Set environment variables (Cloudflare)

Your Pages project needs **both** Stripe secrets. Set them in **Cloudflare Dashboard → Pages → dice-express → Settings → Environment variables** (or `wrangler pages secret put`). Use **Production** (and Preview if you test on preview URLs).

| Variable | Where to get it | Purpose |
|----------|-----------------|---------|
| **STRIPE_SECRET_KEY** | Stripe Dashboard → Developers → API keys → **Secret key** (sk_test_ or sk_live_) | Creates Checkout sessions. **Required** or “Deposit with card” returns “Stripe not configured”. |
| **STRIPE_WEBHOOK_SECRET** | Webhook destination → **Signing secret** (Reveal; whsec_...) | Verifies webhooks and credits Pips. |

For **test mode**: use `sk_test_...` and the signing secret from your test webhook. For **live**: use `sk_live_...` and create a live webhook; set both env vars to the live values.

---

## 2. Add the webhook in Stripe (Developers → Webhooks → Add destination)

Your app only needs one event: **`checkout.session.completed`**.

- **Events from**: “Events from Your account” (not Connected/v2).
- **API version**: Default Stripe shows (e.g. 2026-01-28.clover).
- **Select events**: **`checkout.session.completed`** only.
- **Destination type**: Webhook / Web endpoint (HTTP POST to a URL).
- **Endpoint URL**: `https://<your-production-domain>/api/stripe-webhook` (e.g. `https://dice-express.pages.dev/api/stripe-webhook` or `https://dice.express/api/stripe-webhook`).
- After creating: open the webhook → **Signing secret** → Reveal → copy into **STRIPE_WEBHOOK_SECRET** in Cloudflare.

The webhook must use **HTTPS** and your **deployed** domain. For local testing use Stripe CLI to forward events.

---

## 3. Test purchasing Pips

1. Ensure **STRIPE_SECRET_KEY** and **STRIPE_WEBHOOK_SECRET** are set for Production in Cloudflare.
2. Deploy the latest code.
3. Open the app, sign in, go to **Portfolio** → **Deposit with card** → enter amount (e.g. 5) → complete Stripe Checkout (test card: **4242 4242 4242 4242**).
4. You’re redirected to Portfolio with success; balance updates (webhook credits Pips). Optional: Stripe Dashboard → Webhooks → Recent deliveries → confirm `checkout.session.completed` returned **200**.

---

## 4. Stripe Product IDs (wrangler.toml)

Portfolio has **Packages** ($5, $10, $25, $50, $100) and **Custom amount**. Product IDs are in **`wrangler.toml`** under `[vars]`: `STRIPE_PRODUCT_5`, `STRIPE_PRODUCT_10`, etc. Frontend loads package config via **GET /api/stripe-packages**. Ensure each Pips product in Stripe has a **default price**. Local dev: same vars from `wrangler.toml`; optional `frontend/.env.example` for standalone Vite build.

---

## 5. Go live checklist

- [ ] **STRIPE_SECRET_KEY** and **STRIPE_WEBHOOK_SECRET** set in Cloudflare (production).
- [ ] Webhook added in Stripe with URL `https://<your-domain>/api/stripe-webhook` and event `checkout.session.completed`.
- [ ] Test payment in test mode: balance updates after checkout.
- [ ] For real money: switch to live API key, create live webhook, update both env vars to live values.

---

# Part 2 — Business verification copy

Use the text below when Stripe asks for a description of your products/services and public details. Replace placeholders (e.g. your domain, legal entity name) with your real information.

---

## 1. Business / industry

- “Software / SaaS” or “Marketplace” or “Digital goods / in-app currency”
- **Short line:** **Prediction market platform (software).** We provide a web platform where users trade on the outcomes of real-world events using an in-platform currency.

---

## 2. Description of products or services

**Short (~200–300 chars):**

> dice.express is a prediction market platform. Users buy in-platform currency (Pips) via card or crypto, use it to trade on event outcomes (sports, markets, weather, etc.), and may withdraw earnings (subject to fees). We do not offer gambling or real-money betting; we provide software and payment processing for the purchase of platform currency used within our service.

**Medium (~400–500 chars):**

> dice.express operates a prediction market platform where users trade on the outcomes of real-world events (e.g. sports, finance, weather). We offer: (1) Sale of in-platform currency (Pips) via card (Stripe) or crypto; 1 Pips = 1 USD. (2) A web application to place and settle prediction market positions (peer-to-peer and order book). Markets are created from external data sources and resolved when outcomes are known. (3) Withdrawal of Pips to crypto (subject to fees). We do not operate as a bookmaker or casino; we provide software and payment services for the purchase and use of platform currency only.

**Long (fuller description):** Expand as needed: sale of Pips (card/crypto), prediction market trading (P2P, resolution from data), withdrawals to crypto; no traditional gambling, casino, or real-money sportsbook.

---

## 3. How you’ll use Stripe

> We use Stripe to accept card payments for the purchase of our in-platform currency (Pips). When a user chooses “Deposit with card,” they are redirected to Stripe Checkout to pay in USD. After successful payment, we credit their platform account with the corresponding amount of Pips (1 Pips = 1 USD). We do not use Stripe for payouts to users; withdrawals are processed via cryptocurrency.

---

## 4. Public details

- **Business / site name:** dice.express  
- **Website URL:** https://[your-production-domain]  
- **Public one-liner:** Prediction market platform: trade on real-world outcomes with Pips. Deposit via card or crypto, trade, withdraw earnings.  
- **Public short description:** dice.express lets users trade on the outcomes of real-world events (sports, markets, weather, and more). Users deposit funds as Pips (in-platform currency), place positions on prediction markets, and may withdraw earnings. Deposits can be made by card or cryptocurrency; withdrawals are in crypto subject to fees.

---

## 5. Things to have ready

- **Legal business name** (company or DBA as registered).  
- **Business address** (physical address).  
- **Website** live at the URL you give.  
- **Terms of Service and Privacy Policy** URLs (full URLs on your domain).  
- **Support contact** (email or contact page).

---

## 6. Statement descriptor (card statements)

Short line that appears on customers’ card statements. Suggested: `dice.express` or `DICE.EXPRESS PIPS`. Avoid words that might trigger extra scrutiny (e.g. “bet,” “wager”).

---

*Adjust any wording to match your actual product, jurisdiction, and legal advice. This is a template to help with Stripe verification, not legal counsel.*
