/**
 * Pips packages for Stripe Checkout.
 * Set VITE_STRIPE_PRODUCT_5 … VITE_STRIPE_PRODUCT_100 to your Stripe Product IDs (prod_xxx).
 * The API resolves each product to its default price so Checkout shows the correct name and image.
 * If unset, quick-add uses amount only (generic "Pips" line item).
 */
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}

export const PIPS_PACKAGES = [
  { amount: 5, productId: env.VITE_STRIPE_PRODUCT_5 || null, label: '$5' },
  { amount: 10, productId: env.VITE_STRIPE_PRODUCT_10 || null, label: '$10' },
  { amount: 25, productId: env.VITE_STRIPE_PRODUCT_25 || null, label: '$25' },
  { amount: 50, productId: env.VITE_STRIPE_PRODUCT_50 || null, label: '$50' },
  { amount: 100, productId: env.VITE_STRIPE_PRODUCT_100 || null, label: '$100' },
]
