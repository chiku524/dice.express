-- P2P partial fill: match orders with different sizes (e.g. $100 Yes vs $1 No)
-- Run: npx wrangler d1 execute dice-express-db --remote --file=./schema/d1/0004_p2p_partial_fill.sql

ALTER TABLE p2p_orders ADD COLUMN amount_remaining REAL;

UPDATE p2p_orders SET amount_remaining = amount_real WHERE amount_remaining IS NULL AND status = 'open';
