-- Speeds up get-contracts and server paths that filter by payload.marketId
-- Apply: npx wrangler d1 execute dice-express-db --remote --file=./schema/d1/0007_contracts_payload_market_id_index.sql
-- (use --local for dev DB)

CREATE INDEX IF NOT EXISTS idx_contracts_payload_market_id ON contracts (json_extract(payload, '$.marketId'));
