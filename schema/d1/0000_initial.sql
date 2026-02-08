-- D1 schema for dice.express (contracts + user_balances)
-- Run: npx wrangler d1 execute dice-express-db --remote --file=./schema/d1/0000_initial.sql

CREATE TABLE IF NOT EXISTS contracts (
  contract_id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',  -- JSON
  party TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  update_id TEXT,
  completion_offset TEXT,
  explorer_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contracts_template_id ON contracts(template_id);
CREATE INDEX IF NOT EXISTS idx_contracts_party ON contracts(party);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at DESC);

CREATE TABLE IF NOT EXISTS user_balances (
  party TEXT PRIMARY KEY,
  balance TEXT NOT NULL DEFAULT '0',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
