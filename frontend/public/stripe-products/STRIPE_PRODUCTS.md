# Stripe products for Pips (1:1 USD)

**Pips is 1:1 with USD.** 1 PP = $1 USD. Use these when creating products in Stripe Dashboard (Products → Add product).

Create one product per row below. For **Image**, upload the corresponding file from this folder (`pips-5.png`, etc.) to Stripe, or use the image URL once deployed (e.g. `https://your-domain.com/stripe-products/pips-5.png`).

| Amount (USD) | Name | Description | Stripe amount (cents) | Image file |
|--------------|------|--------------|------------------------|------------|
| $5 | 5 Pips | Add 5 PP to your balance. 1 Pip = $1 USD. Use Pips to trade prediction markets and withdraw anytime (fee applies). | 500 | pips-5.png |
| $10 | 10 Pips | Add 10 PP to your balance. 1 Pip = $1 USD. Use Pips to trade prediction markets and withdraw anytime (fee applies). | 1000 | pips-10.png |
| $25 | 25 Pips | Add 25 PP to your balance. 1 Pip = $1 USD. Use Pips to trade prediction markets and withdraw anytime (fee applies). | 2500 | pips-25.png |
| $50 | 50 Pips | Add 50 PP to your balance. 1 Pip = $1 USD. Use Pips to trade prediction markets and withdraw anytime (fee applies). | 5000 | pips-50.png |
| $100 | 100 Pips | Add 100 PP to your balance. 1 Pip = $1 USD. Use Pips to trade prediction markets and withdraw anytime (fee applies). | 10000 | pips-100.png |

## Copy-paste (Name, Description, Amount)

**Product 1 — $5**
- **Name:** 5 Pips
- **Description:** Add 5 PP to your balance. 1 Pip = $1 USD. Use Pips to trade prediction markets and withdraw anytime (fee applies).
- **Amount:** $5.00 (500 cents)
- **Image:** Upload `pips-5.png` from this folder.

**Product 2 — $10**
- **Name:** 10 Pips
- **Description:** Add 10 PP to your balance. 1 Pip = $1 USD. Use Pips to trade prediction markets and withdraw anytime (fee applies).
- **Amount:** $10.00 (1000 cents)
- **Image:** Upload `pips-10.png` from this folder.

**Product 3 — $25**
- **Name:** 25 Pips
- **Description:** Add 25 PP to your balance. 1 Pip = $1 USD. Use Pips to trade prediction markets and withdraw anytime (fee applies).
- **Amount:** $25.00 (2500 cents)
- **Image:** Upload `pips-25.png` from this folder.

**Product 4 — $50**
- **Name:** 50 Pips
- **Description:** Add 50 PP to your balance. 1 Pip = $1 USD. Use Pips to trade prediction markets and withdraw anytime (fee applies).
- **Amount:** $50.00 (5000 cents)
- **Image:** Upload `pips-50.png` from this folder.

**Product 5 — $100**
- **Name:** 100 Pips
- **Description:** Add 100 PP to your balance. 1 Pip = $1 USD. Use Pips to trade prediction markets and withdraw anytime (fee applies).
- **Amount:** $100.00 (10000 cents)
- **Image:** Upload `pips-100.png` from this folder.

## Note

The current checkout flow uses a **custom amount** (user enters PP in the app; we create a one-off price). To use these **fixed products** instead, you can create these 5 products in Stripe, then add a "Quick add" UI that passes the Stripe Price ID for $5, $10, $25, $50, or $100 so Checkout shows the product name and image.
