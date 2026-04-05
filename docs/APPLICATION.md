# dice.express — application essentials

**dice.express** is a **virtual prediction markets** product: users hold **Pips** (platform credits), trade **Yes/No** (and some **multi-outcome**) markets, and settle via **automated oracles** or **operator-manual** news heuristics. **Blockchain** is used for **deposits and withdrawals** where configured; **all trading and balances** in the live stack live in **Cloudflare D1**.

This page is the **single overview** operators and developers should read first. Deeper runbooks are linked at the end.

---

## What users experience

1. **Account** — Register and sign in; balance and positions are stored per user identity in D1.
2. **Pips** — Virtual currency used for orders, positions, and fees. Users can add Pips via **test top-up** (`POST /api/add-credits`) or, in production, **crypto deposit** after you wire `**POST /api/deposit-crypto`** and a watcher (see `**PIPS_DEPOSIT_WITHDRAW_FLOW.md**`).
3. **Markets** — Browse `**GET /api/markets`** (often `**sort=activity**` for P2P depth). Markets are **created by automation** (`POST /api/auto-markets`); **end-user market creation is disabled** (`source: 'user'` rejected).
4. **Trading** — **P2P limit orders** (`/api/orders`) match two users; **AMM** (`/api/trade`) trades against a pool when liquidity exists. Production `**wrangler.toml`** defaults favor **P2P-first** (`**AUTO_MARKETS_ZERO_LIQUIDITY`**, `**DISABLE_AMM_TRADE**`) so the platform does not seed pool risk until you opt in.
5. **Resolution** — `**POST /api/resolve-markets`** (cron, e.g. from `**workers/auto-markets-cron**`) resolves due markets from price/sports/weather/news APIs; **custom news** markets use `**operator_manual`** logic (`**OPERATOR_MANUAL_RESOLUTION.md**`). Settlement applies a **2% fee** on the P2P settlement path; **Void** refunds stakes.

---

## Technical stack


| Layer                    | Technology                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**             | React (Vite); optional **Tauri** desktop (`**RELEASE_DESKTOP.md`**).                                                                  |
| **API**                  | Cloudflare **Pages Functions** — `functions/api/[[path]].js` and routed handlers under `functions/api/`.                              |
| **Database**             | **D1** — markets, positions, pools, users, balances, orders.                                                                          |
| **Cache / objects / AI** | **KV** (market list cache), **R2** (contract JSON backup), **Vectorize** + **Workers AI** (embedding dedupe for auto-seeded markets). |
| **Automation**           | Separate **cron Worker** posts to your site’s `**/api/auto-markets`** then `**/api/resolve-markets**`.                                |


Architecture detail: `**ARCHITECTURE.md**`. Deploy, bindings, migrations, crypto go-live: `**DEPLOYMENT.md**`.

---

## Money and risk (short version)

- **Custody:** Deposited crypto is verified on-chain; Pips are ledger entries in D1. Withdrawals debit Pips and require an **off-platform process** to send assets and update `**withdrawal_requests`**.
- **Trading risk:** If the platform **seeds AMM liquidity**, it can face **inventory risk** at resolution. **P2P-only** mode (**zero initial pool liquidity**, AMM trades off) avoids the platform acting as counterparty; see `**USER_FLOWS_TRADING_AND_RISK.md`** and `**P2P_AND_GROWTH_STRATEGY.md**`.

---

## Security and production hygiene

- Set `**PRIVILEGED_API_SECRET**` / `**AUTO_MARKETS_CRON_SECRET**` on Pages before real traffic so ops routes are not world-writable. `**GET /api/health**` reports `**privilegedRoutesGated**`.
- Deposit and withdrawal endpoints use **shared secrets** and RPC keys — see `**DEPLOYMENT.md`** (Part 3) and `**PIPS_DEPOSIT_WITHDRAW_FLOW.md**`.

---

## Documentation map


| Topic                                                | Doc                                                                   |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| **Deploy, D1, cron, go-live checklist**              | `**DEPLOYMENT.md`**                                                   |
| **System architecture**                              | `**ARCHITECTURE.md`**                                                 |
| **HTTP API (current)**                               | `**API.md`**                                                          |
| **Pips, deposit/withdraw, on-chain verification**    | `**PIPS_DEPOSIT_WITHDRAW_FLOW.md`**                                   |
| **Auto-markets Worker, API keys, troubleshooting**   | `**AUTO_MARKETS.md`**                                                 |
| **Prediction styles, data sources, maintenance**     | `**PREDICTION_MARKETS.md`**                                           |
| **Oracle sources and strategy**                      | `**ORACLE_STRATEGY.md`**                                              |
| **Operator-manual news markets (Void, preview API)** | `**OPERATOR_MANUAL_RESOLUTION.md`**                                   |
| **User journeys, AMM vs P2P, platform risk**         | `**USER_FLOWS_TRADING_AND_RISK.md`**                                  |
| **AMM math and implementation**                      | `**AMM.md`**                                                          |
| **P2P-only growth playbook**                         | `**P2P_AND_GROWTH_STRATEGY.md`**                                      |
| **Vision and roadmap**                               | `**PLATFORM_VISION_AND_ROADMAP.md`**                                  |
| **Brand / SEO / UX notes**                           | `**BRAND.md`**, `**SEO.md**`, `**UX_HISTORY_AND_RECOMMENDATIONS.md**` |
| **Desktop release**                                  | `**RELEASE_DESKTOP.md`**                                              |
| **Change history**                                   | `**CHANGELOG.md`**                                                    |
| **Canton/DAML (archived)**                           | `**HISTORICAL_CANTON_DAML_API.md`**                                   |


Full index: `**docs/README.md**`.