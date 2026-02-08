/**
 * Cloudflare Pages Function: proxy /api/* to an external backend (e.g. Vercel).
 * Set BACKEND_URL in Cloudflare (Dashboard → Pages → Settings → Environment variables)
 * to your API origin (e.g. https://your-app.vercel.app). If unset, returns 503.
 *
 * This lets you deploy the frontend on Cloudflare (dice.express) while keeping
 * the existing Node/Vercel API elsewhere until you migrate to Workers.
 */
export async function onRequest(context) {
  const { request, env } = context
  const path = context.params?.path ?? ''
  const backendBase = env.BACKEND_URL || env.VITE_VERCEL_URL

  if (!backendBase) {
    return new Response(
      JSON.stringify({
        error: 'API proxy not configured',
        hint: 'Set BACKEND_URL (or VITE_VERCEL_URL) in Cloudflare Pages environment variables to your API origin.',
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
        },
      }
    )
  }

  const base = backendBase.replace(/\/$/, '')
  const url = new URL(request.url)
  const targetPath = path ? `/api/${path}` : '/api'
  const targetUrl = `${base}${targetPath}${url.search}`

  const headers = new Headers(request.headers)
  // Host can confuse the origin server; remove or set to backend host
  headers.delete('Host')
  headers.delete('cf-connecting-ip')
  headers.delete('cf-ray')
  headers.delete('x-forwarded-host')
  const forwardedHost = url.host
  if (forwardedHost) headers.set('X-Forwarded-Host', forwardedHost)

  const init = {
    method: request.method,
    headers,
    redirect: 'follow',
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body
  }

  let res
  try {
    res = await fetch(targetUrl, init)
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Proxy request failed', message: err?.message }),
      { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  }

  const resHeaders = new Headers(res.headers)
  resHeaders.set('Access-Control-Allow-Origin', '*')
  resHeaders.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  resHeaders.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization')

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
  })
}
