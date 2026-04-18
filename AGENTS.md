## Learned User Preferences

- When work touches automated market creation, prioritize diversity of sources and topics plus semantic, readable headers and descriptions; tune for variety and per-run dynamism where the pipeline supports it.
- Prefer market-facing copy that is short and punchy, semantically clear, and may use emojis; avoid unnecessary filler in generated market text.
- Iterating on documentation (editing, merging, pruning redundancy) is encouraged; keep a single essentials-style overview for the app.
- Often asks for changes to be committed and pushed to GitHub, including updated release tags for deployment and for the Tauri desktop app to pick up frontend changes.
- Values simple, effective UI: immersive markets experience, quick trading paths, readable topics, and optional layouts (for example card vs list) on markets, community, and similar surfaces.
- Wants “Similar markets” messaging on the market detail view only, not on browse or list views.
- Desktop app: prefers full-width layout for profile and settings where it helps readability.

## Learned Workspace Facts

- dice.express is a prediction-markets product built on Cloudflare (frontend on Pages; API and workers logic under `functions/` with D1 and related bindings) using Pips as the in-app currency.
- A Tauri desktop app ships alongside the web app; release tags matter when verifying that UI changes appear in the desktop build.
- Automated market seeding and variety utilities live under `functions/lib` (for example auto-market variety and data source gathering) with coverage in `tests/`.
- GitHub-based deployment is the typical path after push; many tasks explicitly target auto-deployment on main.
