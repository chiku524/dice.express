# SEO setup for dice.express

The webapp is configured for search and social with page-specific titles, descriptions, Open Graph, Twitter Card, structured data, and crawler hints.

---

## What’s in place

### 1. Per-page SEO (`frontend/src/constants/seo.js`)

- **Titles** — Keyword-focused, e.g. “Prediction Markets — Trade on Real-World Outcomes | dice.express”, “Portfolio — Balance, Deposit & Withdraw Pips | dice.express”.
- **Meta descriptions** — Unique per route, mentioning Pips, prediction markets, deposit/withdraw, sports/crypto/weather, peer-to-peer.
- **Keywords** — Optional per-page keywords for main routes (home, discover, portfolio, market, docs, etc.).
- **Routes covered** — `/`, `/discover/*`, `/market`, `/portfolio`, `/dashboard`, `/create`, `/docs`, `/privacy`, `/terms`, `/sign-in`, `/register`, and others.

### 2. `index.html` (default and fallback)

- **Meta** — Default title, description, keywords, author, `robots` (index, follow), canonical.
- **Open Graph** — `og:type`, `og:url`, `og:title`, `og:description`, `og:image`, `og:locale`, `og:site_name`.
- **Twitter Card** — `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt`.
- **JSON-LD** — `WebApplication` (name, description, url, applicationCategory, offers) and `WebSite` (name, url, description, publisher). Descriptions match the product: prediction markets, Pips, deposit/withdraw.

### 3. Dynamic updates (`frontend/src/components/PageSEO.jsx`)

- On route change, **PageSEO** updates:
  - `document.title`
  - `meta name="description"`
  - `meta name="keywords"` (when defined for the page)
  - `meta property="og:title"`, `og:description`, `og:url`
  - `meta name="twitter:title"`, `twitter:description`
  - `link rel="canonical"` (using current origin + pathname)

### 4. Market detail pages

- **MarketDetail** sets `document.title` to the market title (e.g. “Will Team X win? | dice.express”) when viewing a market, and restores the default market title on leave.

### 5. Crawlers

- **`frontend/public/robots.txt`** — `User-agent: *`, `Allow: /`, `Sitemap: https://dice-express.pages.dev/sitemap.xml`.
- **`frontend/public/sitemap.xml`** — Main routes (/, discover, portfolio, dashboard, create, docs, privacy, terms, sign-in, register) with `changefreq` and `priority`.

---

## Using your own domain

If you deploy at a custom domain (e.g. `https://diceexpress.com`), replace `https://dice-express.pages.dev` in:

1. **`frontend/index.html`** — `link rel="canonical"`, `og:url`, `og:image`, `twitter:image`, and both JSON-LD `url` fields.
2. **`frontend/public/robots.txt`** — `Sitemap:` URL.
3. **`frontend/public/sitemap.xml`** — Every `<loc>` URL.

Canonical, OG, and Twitter tags are updated per page at runtime using `window.location.origin`, so after the first load they will reflect the actual domain. The sitemap and `robots.txt` must be edited to match your production URL.

---

## Optional improvements

- **Social image** — Replace `og:image` and `twitter:image` with a dedicated 1200×630 image (e.g. `/og-image.png`) for better previews when sharing links.
- **Market-level sitemap** — If you have many public markets, consider generating a sitemap that includes `/market/:id` URLs (e.g. via a build step or API).
- **Structured data for markets** — For important markets you could add `ItemList` or custom schema for “prediction market” if you want rich results (implementation depends on your CMS/data source).
