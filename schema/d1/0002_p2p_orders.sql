-- P2P orders and matched pairs for peer-to-peer prediction trading
-- Run: npx wrangler d1 execute dice-express-db --remote --file=./schema/d1/0002_p2p_orders.sql

CREATE TABLE IF NOT EXISTS p2p_orders (
  order_id TEXT PRIMARY KEY,
  market_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  side TEXT NOT NULL,
  amount_real REAL NOT NULL,
  price_real REAL NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  counterparty_order_id TEXT,
  position_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_p2p_orders_market ON p2p_orders(market_id);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_owner ON p2p_orders(owner);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_status ON p2p_orders(status);
