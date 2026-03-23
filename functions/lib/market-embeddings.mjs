/**
 * Vectorize + Workers AI embeddings for paraphrase / near-duplicate prediction markets.
 * Uses @cf/baai/bge-base-en-v1.5 (768 dims, cosine). Requires VECTORIZE + AI bindings.
 */

import {
  outcomesFingerprint,
  outcomeTextBundle,
  resolutionDateKey,
} from './market-dedupe.mjs'

const EMBED_MODEL = '@cf/baai/bge-base-en-v1.5'
const EMBED_DIM = 768

/** Rich English document for embedding (same calendar day + outcomes enforced in metadata filter). */
export function embeddingDocumentFromPayload(p) {
  const day = resolutionDateKey(p)
  const outcomes = outcomesFingerprint(p)
  const bundle = outcomeTextBundle(p)
  return `Prediction market. Binary outcomes: ${outcomes}. Resolution calendar day ${day}. ${bundle}`.trim()
}

function cosineSimilarity(a, b) {
  if (!a?.length || a.length !== b?.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const d = Math.sqrt(na) * Math.sqrt(nb)
  return d === 0 ? 0 : dot / d
}

/**
 * @param {unknown} env
 * @param {string} text
 * @returns {Promise<number[] | null>}
 */
export async function embedText(env, text) {
  const ai = env?.AI
  if (!ai || typeof text !== 'string' || !text.trim()) return null
  try {
    const res = await ai.run(EMBED_MODEL, { text: [text.slice(0, 8000)] })
    const data = res?.data
    const row = Array.isArray(data) ? data[0] : data
    const vec = row && Array.isArray(row) ? row : null
    if (!vec || vec.length !== EMBED_DIM) return null
    return vec
  } catch {
    return null
  }
}

function parseMinScore(env) {
  const v = env?.MARKET_EMBED_SIMILARITY_MIN
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN
  if (Number.isFinite(n) && n > 0 && n <= 1) return n
  return 0.86
}

/** Cosine similarity threshold for embedding duplicate detection (env `MARKET_EMBED_SIMILARITY_MIN`, default 0.86). */
export function marketEmbedMinScore(env) {
  return parseMinScore(env)
}

/**
 * Same-batch guard: compare to vectors already accepted in this request.
 * @param {number[]} vec
 * @param {Array<{ vec: number[], resolutionDay: string, outcomesFp: string }>} batch
 * @param {string} resolutionDay
 * @param {string} outcomesFp
 * @param {number} minScore
 */
export function isNearDuplicateInBatch(vec, batch, resolutionDay, outcomesFp, minScore) {
  if (!vec?.length || !batch?.length) return false
  for (const e of batch) {
    if (e.resolutionDay !== resolutionDay || e.outcomesFp !== outcomesFp) continue
    if (cosineSimilarity(vec, e.vec) >= minScore) return true
  }
  return false
}

/**
 * Query Vectorize for paraphrase duplicates (same resolution day + same outcomes fingerprint).
 * @param {unknown} env
 * @param {Record<string, unknown>} payload
 * @param {{ excludeId?: string, precomputedVec?: number[] | null }} [opts]
 */
export async function findParaphraseDuplicate(env, payload, opts = {}) {
  if (!env?.VECTORIZE || !env?.AI) {
    return { duplicate: false, reason: 'no_bindings' }
  }
  const text = embeddingDocumentFromPayload(payload)
  const vec =
    opts.precomputedVec != null && Array.isArray(opts.precomputedVec)
      ? opts.precomputedVec
      : await embedText(env, text)
  if (!vec) return { duplicate: false, reason: 'embed_failed' }

  const resolutionDay = resolutionDateKey(payload)
  const outcomesFp = outcomesFingerprint(payload)
  const minScore = parseMinScore(env)
  const excludeId = opts.excludeId

  try {
    const res = await env.VECTORIZE.query(vec, {
      topK: 16,
      returnMetadata: 'indexed',
    })
    const matches = res?.matches || []
    for (const m of matches) {
      if (excludeId != null && m.id === excludeId) continue
      const meta = m.metadata || {}
      if (meta.resolutionDay !== resolutionDay) continue
      if (meta.outcomesFp !== outcomesFp) continue
      const score = typeof m.score === 'number' ? m.score : 0
      if (score >= minScore) {
        return { duplicate: true, matchId: m.id, score, reason: 'vector_match' }
      }
    }
  } catch {
    return { duplicate: false, reason: 'query_failed' }
  }
  return { duplicate: false }
}

/**
 * Upsert embedding for a market (call after D1 insert succeeds).
 * @param {unknown} env
 * @param {string} contractId
 * @param {Record<string, unknown>} payload
 * @param {{ precomputedVec?: number[] | null }} [opts]
 */
export async function upsertMarketEmbedding(env, contractId, payload, opts = {}) {
  if (!env?.VECTORIZE || !env?.AI || !contractId) {
    return { ok: false, reason: 'no_bindings' }
  }
  const text = embeddingDocumentFromPayload(payload)
  const vec =
    opts.precomputedVec != null && Array.isArray(opts.precomputedVec)
      ? opts.precomputedVec
      : await embedText(env, text)
  if (!vec) return { ok: false, reason: 'embed_failed' }
  const resolutionDay = resolutionDateKey(payload)
  const outcomesFp = outcomesFingerprint(payload)
  try {
    await env.VECTORIZE.upsert([
      {
        id: String(contractId),
        values: vec,
        metadata: {
          resolutionDay,
          outcomesFp,
        },
      },
    ])
    return { ok: true }
  } catch {
    return { ok: false, reason: 'upsert_failed' }
  }
}
