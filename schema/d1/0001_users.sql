-- D1 users table for email/password auth (run after 0000_initial.sql)
-- Run: npx wrangler d1 execute dice-express-db --remote --file=./schema/d1/0001_users.sql

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  account_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  fund_choice TEXT,
  onboarding_completed INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_account_id ON users(account_id);
