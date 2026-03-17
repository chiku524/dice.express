-- Prevent double-credit: same tx/reference can only be credited once.
-- Run: npx wrangler d1 execute dice-express-db --remote --file=./schema/d1/0005_deposit_reference_unique.sql

CREATE UNIQUE INDEX IF NOT EXISTS idx_deposit_records_reference_unique
  ON deposit_records(reference_id) WHERE reference_id IS NOT NULL AND reference_id != '';
