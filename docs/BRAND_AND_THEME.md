# Brand & Theme

## Platform model (reminder)

All platform activity is **virtual (Credits)**. Only **deposits** (crypto → Credits) and **withdrawals** (Credits → crypto) touch real blockchain. The app is framed around the **blockchain ecosystem** (multi-chain), not a single network.

## Brand

- **Name**: Foresight  
- **Tagline**: Prediction Markets  
- **Defined in**: `frontend/src/constants/brand.js`

To change the app name or tagline, edit `BRAND` in that file. The navbar logo, footer copyright, and `index.html` title use these values (or import from `brand.js`).

## Theme (colors)

- **Primary**: Teal/cyan (`#14b8a6`) to match an ecosystem-agnostic, modern look and blend with the animated background.
- **Defined in**: `frontend/src/styles/theme.css` (`:root` variables).

To change the palette, update `--color-primary`, `--color-primary-hover`, `--color-primary-light`, `--color-primary-border`, and `--shadow-primary`. The animated background and nav/footer gradients in `AnimatedBackground.css`, `App.css`, and `Footer.css` use teal/cyan so they blend; adjust those if you change the primary.

## Other brand names (for later)

If you want to try alternatives: **Nexus**, **Outcome**, **Pulse**, **Meridian**, **Clarity**. Set `BRAND.name` and `BRAND.tagline` in `brand.js` and refresh.
