/**
 * Cloudflare Pages Function: /api/* router.
 * All API is served from D1 (+ optional KV cache, R2). Set env.DB in wrangler.toml.
 * If BACKEND_URL is set and DB is not bound: proxy to external origin (optional).
 */
import { CORS, jsonResponse } from './lib/api-http.mjs'
import { handleWithD1 } from './handle-d1.mjs'

function getPath(context) {
  const p = context.params?.path
  if (Array.isArray(p)) return p[p.length - 1] || ''
  return typeof p === 'string' ? p : ''
}

function newRequestId() {
  try {
    const c = globalThis.crypto
    if (c?.randomUUID) return c.randomUUID()
  } catch {}
  return 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)
}

export async function onRequest(context) {
  const { request, env } = context
  const pathSeg = getPath(context)
  const method = request.method
  const requestId = newRequestId()

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...CORS, 'X-Request-Id': requestId } })
  }

  const db = env.DB
  const kv = env.KV
  const backendBase = env.BACKEND_URL

  if (db) {
    try {
      const res = await handleWithD1(db, kv, env.R2, request, pathSeg, method, env, requestId)
      if (res) {
        const h = new Headers(res.headers)
        if (!h.has('X-Request-Id')) h.set('X-Request-Id', requestId)
        return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h })
      }
    } catch (err) {
      console.error('[api]', requestId, pathSeg, err)
      return jsonResponse(
        { error: 'Internal server error', message: err?.message, requestId },
        500,
        { 'X-Request-Id': requestId }
      )
    }
  }

  if (!backendBase) {
    return jsonResponse(
      {
        error: 'API not configured',
        hint: 'Set DB (D1) in wrangler.toml, or set BACKEND_URL in Cloudflare env to your API origin.',
        requestId,
      },
      503,
      { 'X-Request-Id': requestId }
    )
  }

  const base = backendBase.replace(/\/$/, '')
  const url = new URL(request.url)
  const targetPath = pathSeg ? '/api/' + pathSeg : '/api'
  const targetUrl = base + targetPath + url.search

  const headers = new Headers(request.headers)
  headers.delete('Host')
  headers.delete('cf-connecting-ip')
  headers.delete('cf-ray')
  headers.delete('x-forwarded-host')
  if (url.host) headers.set('X-Forwarded-Host', url.host)
  headers.set('X-Request-Id', requestId)

  const init = { method, headers, redirect: 'follow' }
  if (method !== 'GET' && method !== 'HEAD') init.body = request.body

  let res
  try {
    res = await fetch(targetUrl, init)
  } catch (err) {
    return jsonResponse({ error: 'Proxy request failed', message: err?.message, requestId }, 502, {
      'X-Request-Id': requestId,
    })
  }

  const resHeaders = new Headers(res.headers)
  Object.entries(CORS).forEach(([k, v]) => resHeaders.set(k, v))
  resHeaders.set('X-Request-Id', requestId)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: resHeaders })
}
