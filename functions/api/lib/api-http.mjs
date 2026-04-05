/** Shared JSON + CORS headers for Pages Functions API routes. */

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS,DELETE',
  'Access-Control-Allow-Headers':
    'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization, Idempotency-Key, X-Request-Id',
}

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...extraHeaders },
  })
}
