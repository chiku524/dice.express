# Prediction markets — operator playbook

Concise runbook for **dice.express** automated markets while keeping **outcome-only** policy (no feed-topic headline churn).

## Scheduled automation

1. **Cron Worker** (`workers/auto-markets-cron`) calls `POST /api/auto-markets` (seed) then `POST /api/resolve-markets`.
2. **Heartbeat** — After each successful seed or resolve, the API updates D1 contract `system-cron-heartbeat-v1` (template `CronHeartbeat`) and may still write KV `auto_markets:last_seed`.
3. **Public check** — `GET /api/auto-markets?action=probe` returns policy flags, `lastSeed` (KV), `automationHeartbeat` (D1), and `keysPresent`. The site page **Resources → Automation status** (`/automation`) reads this.

## Multi-outcome markets

- **Creation** — `POST /api/markets` with `source` ≠ `user`, `marketType: "MultiOutcome"`, and `outcomes: ["A","B",…]` (2–8 unique labels). Pools are created automatically; **P2P limit orders stay binary-only** in the API.
- **Trading** — Users trade on the **AMM pool** only (`POST /api/trade` with `side` set to the exact outcome label).
- **Resolution** — `resolve-markets` **does not** auto-settle multi-outcome markets today. Use **`POST /api/update-market-status`** with `status: "Settled"` and `resolvedOutcome` equal to the **winning outcome string** (must match one of `outcomes`).

## Manual settlement (binary or multi)

- **`POST /api/update-market-status`** — privileged secret if configured. Sets `resolvedOutcome` and runs P2P winner payouts where positions match.
- **AMM-only positions** (no `counterpartyPositionId`) may not follow the same payout path as matched P2P; confirm balances and product rules before promising users a specific AMM redemption.

## Congestion and policy

- **User-created markets** remain disabled (`source: user` → 403).
- **`AUTO_MARKETS_OUTCOME_ONLY=1`** — keeps automated seeding aligned with checkable outcomes; feed-topic markets stay off unless you explicitly allow them.
- **Do not** bulk-create multi-outcome markets without resolution discipline — each extra outcome adds ops surface area.

## When things look stuck

1. Cloudflare Worker logs for `dice-express-auto-markets-cron`.
2. `GET …/api/auto-markets?action=probe` — keys, last seed, heartbeat timestamps.
3. `GET …/api/auto-markets?action=events&source=…&limit=2` — per-source smoke test.

See also **`AUTO_MARKETS.md`** and **`PREDICTION_MARKETS.md`**.
