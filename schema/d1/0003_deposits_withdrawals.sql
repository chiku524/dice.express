-- Deposit records (audit) and withdrawal requests (platform wallet sends crypto)
-- Run: npx wrangler d1 execute dice-express-db --remote --file=./schema/d1/0003_deposits_withdrawals.sql

CREATE TABLE IF NOT EXISTS deposit_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  party TEXT NOT NULL,
  amount_guap REAL NOT NULL,
  source TEXT NOT NULL,
  reference_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_deposit_records_party ON deposit_records(party);
CREATE INDEX IF NOT EXISTS idx_deposit_records_reference ON deposit_records(reference_id);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  party TEXT NOT NULL,
  amount_guap REAL NOT NULL,
  fee_guap REAL NOT NULL DEFAULT 0,
  net_guap REAL NOT NULL,
  destination TEXT NOT NULL,
  network_id TEXT NOT NULL DEFAULT 'ethereum',
  status TEXT NOT NULL DEFAULT 'pending',
  tx_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_party ON withdrawal_requests(party);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
