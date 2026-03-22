-- Wipe prediction-market state so auto-seed can start fresh.
-- Preserves: user_balances, UserAccount, deposit_records, withdrawal_requests, other contract types.
--
-- Apply to production D1:
--   npm run d1:clear-prediction-markets
--   (or: npx wrangler d1 execute dice-express-db --remote --file=./schema/d1/maintenance_clear_prediction_markets.sql)
--
-- Apply locally (pages dev / wrangler d1 local):
--   npm run d1:clear-prediction-markets:local
--   (or: npx wrangler d1 execute dice-express-db --local --file=./schema/d1/maintenance_clear_prediction_markets.sql)

DELETE FROM p2p_orders;

DELETE FROM contracts
WHERE template_id IN ('VirtualMarket', 'LiquidityPool', 'Position')
   OR template_id LIKE '%MarketCreationRequest%';
