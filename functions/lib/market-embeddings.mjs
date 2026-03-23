/**
 * Vectorize + Workers AI embeddings for paraphrase / near-duplicate prediction markets.
 * Uses @cf/baai/bge-base-en-v1.5 (768 dims, cosine). Requires VECTORIZE + AI bindings.
 */

import {
  isFeedTopicPayload,
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
/**
 * Parse Workers AI embedding response for one or many texts.
 * @param {unknown} res
 * @param {number} expectedCount
 * @returns {(number[] | null)[]}
 */
export function parseEmbeddingBatchResponse(res, expectedCount) {
  const out = /** @type {(number[] | null)[]} */ (Array(expectedCount).fill(null))
  const data = res?.data
  if (expectedCount <= 0) return out
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0]
    if (Array.isArray(first) && typeof first[0] === 'number') {
      for (let i = 0; i < Math.min(expectedCount, data.length); i++) {
        const row = data[i]
        out[i] = Array.isArray(row) && row.length === EMBED_DIM ? row : null
      }
      return out
    }
  }
  const row = Array.isArray(data) ? data[0] : data
  const vec = row && Array.isArray(row) && row.length === EMBED_DIM ? row : null
  if (vec) out[0] = vec
  return out
}

export async function embedText(env, text) {
  const batch = await embedTextsBatch(env, [text])
  return batch[0] ?? null
}

const DEFAULT_EMBED_BATCH = 8

/**
 * Embed multiple documents in one Workers AI call when possible.
 * @param {unknown} env
 * @param {string[]} texts
 * @returns {Promise<(number[] | null)[]>}
 */
export async function embedTextsBatch(env, texts) {
  const ai = env?.AI
  if (!ai || !Array.isArray(texts) || texts.length === 0) return texts.map(() => null)
  const trimmed = texts.map((t) => (typeof t === 'string' ? t.slice(0, 8000).trim() : ''))
  const n = trimmed.length
  if (n === 0) return []
  const maxB = Math.min(
    16,
    Math.max(1, parseInt(String(env?.MARKET_EMBED_BATCH_SIZE || DEFAULT_EMBED_BATCH), 10) || DEFAULT_EMBED_BATCH)
  )
  /** @type {(number[] | null)[]} */
  const all = []
  for (let i = 0; i < n; i += maxB) {
    const chunk = trimmed.slice(i, i + maxB)
    const nonEmpty = chunk.map((t) => (t.length ? t : ' '))
    try {
      const res = await ai.run(EMBED_MODEL, { text: nonEmpty })
      const parsed = parseEmbeddingBatchResponse(res, chunk.length)
      all.push(...parsed)
    } catch {
      for (let j = 0; j < chunk.length; j++) all.push(null)
    }
  }
  return all
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

/**
 * Remove vectors for contract ids (e.g. after settlement or D1 delete).
 * @param {unknown} env
 * @param {string[]} contractIds
 */
export async function deleteMarketEmbeddings(env, contractIds) {
  const vz = env?.VECTORIZE
  if (!vz || !Array.isArray(contractIds) || contractIds.length === 0) {
    return { ok: false, reason: 'no_bindings_or_empty', deleted: 0 }
  }
  const ids = [...new Set(contractIds.map((id) => String(id)).filter(Boolean))]
  if (ids.length === 0) return { ok: true, deleted: 0 }
  try {
    await vz.deleteByIds(ids)
    return { ok: true, deleted: ids.length }
  } catch {
    return { ok: false, reason: 'delete_failed', deleted: 0 }
  }
}

function parseRowPayload(row) {
  const raw = row?.payload
  if (raw && typeof raw === 'object') return /** @type {Record<string, unknown>} */ (raw)
  if (typeof raw !== 'string') return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/**
 * Upsert embeddings for a page of D1 rows ({ contract_id, payload }).
 * Skips feed-topic and settled payloads.
 * @param {unknown} env
 * @param {Array<{ contract_id: string, payload: unknown }>} rows
 */
export async function backfillVirtualMarketsEmbeddingsChunk(env, rows) {
  if (!rows?.length) {
    return { considered: 0, upserted: 0, failed: 0, skipped: 0 }
  }
  /** @type {Array<{ id: string, payload: Record<string, unknown> }>} */
  const work = []
  let skipped = 0
  for (const row of rows) {
    const id = row.contract_id != null ? String(row.contract_id) : ''
    if (!id) {
      skipped += 1
      continue
    }
    const p = parseRowPayload(row)
    if (p.status === 'Settled') {
      skipped += 1
      continue
    }
    if (isFeedTopicPayload(p)) {
      skipped += 1
      continue
    }
    work.push({ id, payload: p })
  }
  let upserted = 0
  let failed = 0
  const texts = work.map((w) => embeddingDocumentFromPayload(w.payload))
  const vecs = await embedTextsBatch(env, texts)
  for (let j = 0; j < work.length; j++) {
    const r = await upsertMarketEmbedding(env, work[j].id, work[j].payload, { precomputedVec: vecs[j] })
    if (r.ok) upserted += 1
    else failed += 1
  }
  return { considered: work.length, upserted, failed, skipped }
}
