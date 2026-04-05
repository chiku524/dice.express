/**
 * D1 API: d1-public
 */
import * as d1 from '../lib/d1-shared.mjs'

export async function tryD1PublicRoutes(ctx) {
  const { db, kv, r2, env, request, path, method, query, body, requestId, jsonResponse } = ctx
  void requestId

// GET /api/health
if (path === 'health' && method === 'GET') {
  const priv = (env.PRIVILEGED_API_SECRET || '').toString().trim()
  const cron = (env.AUTO_MARKETS_CRON_SECRET || '').toString().trim()
  return jsonResponse({
    ok: true,
    provider: 'cloudflare',
    /** False when neither secret is set: ops/cron routes accept requests without privileged headers (dev default). */
    privilegedRoutesGated: Boolean(priv || cron),
  })
}

// GET /api/public-config — client UX flags (no secrets)
if (path === 'public-config' && method === 'GET') {
  const ammDisabled = d1.envFlagTrue(env, 'DISABLE_AMM_TRADE')
  return jsonResponse({
    success: true,
    ammTradeEnabled: !ammDisabled,
    tradingMode: ammDisabled ? 'p2p_only' : 'amm_and_p2p',
    /** SMS/push-to-phone requires operator Twilio (or similar) env; not wired until configured. */
    smsAlertsAvailable: Boolean(
      (env.TWILIO_ACCOUNT_SID || '').toString().trim() && (env.TWILIO_AUTH_TOKEN || '').toString().trim()
    ),
  })
}

// GET /api/oracle?symbol= — proxy to RedStone (e.g. for price oracles)
if (path === 'oracle' && method === 'GET') {
  const symbol = query.symbol
  if (!symbol) return jsonResponse({ error: 'Symbol parameter is required' }, 400)
  try {
    const res = await fetch(
      `https://api.redstone.finance/prices?symbol=${encodeURIComponent(symbol)}&provider=redstone`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) throw new Error(`Oracle returned ${res.status}`)
    const data = await res.json()
    return jsonResponse(data)
  } catch (err) {
    return jsonResponse({ error: 'Oracle request failed', message: err?.message }, 502)
  }
}

  return null
}
