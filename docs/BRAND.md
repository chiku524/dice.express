# Brand, Theme & Assets

Platform brand (Foresight / dice.express), theme colors, and asset paths for favicon, logo, and social images.

---

## 1. Platform model (reminder)

All platform activity is **virtual (Credits)**. Only **deposits** (crypto → Credits) and **withdrawals** (Credits → crypto) touch real blockchain. The app is framed around the **blockchain ecosystem** (multi-chain), not a single network.

---

## 2. Brand

- **Name**: Foresight  
- **Tagline**: Prediction Markets  
- **Defined in**: `frontend/src/constants/brand.js`

To change the app name or tagline, edit `BRAND` in that file. The navbar logo, footer copyright, and `index.html` title use these values (or import from `brand.js`).

**Other names (for later):** Nexus, Outcome, Pulse, Meridian, Clarity. Set `BRAND.name` and `BRAND.tagline` in `brand.js`.

---

## 3. Theme (colors)

- **Modes**: **Dark** is the product default (current design). **Light** is a cool slate companion using the same tokens. Preference is stored in `localStorage` (`dice.theme`); OS `prefers-color-scheme` is not followed.
- **UI**: Profile → Appearance; compact toggle in web nav, auth pages, and desktop sidebar footer.
- **Defined in**: `frontend/src/styles/theme.css` (`:root` / `[data-theme]` variables), `theme-surfaces.css`, and `ThemeContext` / `ThemeToggle`.

Adjust `--color-primary`, `--color-primary-hover`, `--color-primary-light`, `--color-primary-border`, `--shadow-primary`, and chrome tokens (`--color-chrome-*`, `--color-glass-*`). Keep light mode cool slate — not cream/terracotta.

---

## 4. Favicon & logos (`frontend/public/`)

| File | Use |
|------|-----|
| **favicon-48.png** | Browser favicon (48×48). Referenced in `index.html`. |
| **logo.svg** | Vector logo (dice + pip). Use where SVG is supported. |
| **logo-512.png** | Square logo 512×512 — app icons, social profile. |
| **og-image.png** | Social sharing 1200×630 — **Open Graph / Twitter** when links are shared. |

**Social:** `og-image.png` is set as default `og:image` and `twitter:image` in `index.html`. Replace the domain in those meta tags if you use a custom domain.

---

## 5. Brand & accent colors

| Name | Hex | Use |
|------|-----|-----|
| **Brand color (primary)** | **`#8b5cf6`** | Primary brand (violet). |
| **Accent color** | **`#14b8a6`** | Teal (dice/logo accent). Links and buttons. |

These match the app theme in `frontend/src/styles/theme.css` (`--color-primary`, `--color-teal`).
