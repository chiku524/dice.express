-- Add token type to withdrawal requests: 'usdc' (default) or 'native' (ETH/MATIC).
-- Required for withdraw-request with token selection and immediate send.
-- Run once: npx wrangler d1 execute dice-express-db --remote --file=./schema/d1/0006_withdrawal_token.sql

ALTER TABLE withdrawal_requests ADD COLUMN token TEXT NOT NULL DEFAULT 'usdc';
