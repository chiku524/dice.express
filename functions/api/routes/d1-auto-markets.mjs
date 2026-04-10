/**
 * D1 API: d1-auto-markets
 */
import * as storage from '../../lib/cf-storage.mjs'
import * as d1 from '../lib/d1-shared.mjs'
import {
  createPoolState,
  createPoolStateMulti,
} from '../../lib/amm.mjs'
import * as dataSources from '../../lib/data-sources.mjs'
import { enrichNewsEvent } from '../../lib/custom-news-markets.mjs'
import { finalizeNewsFeedTopicMarket, isFeedTopicOnlyNewsCandidate } from '../../lib/news-market-topic.mjs'
import { promoteNewsArticleToOutcomeMarket } from '../../lib/outcome-news-markets.mjs'
import { applyPlayfulOutcomePresentation } from '../../lib/market-presentation.mjs'
import * as marketDedupe from '../../lib/market-dedupe.mjs'
import {
  embedText,
  embeddingDocumentFromPayload,
  findParaphraseDuplicate,
  isNearDuplicateInBatch,
  marketEmbedMinScore,
  upsertMarketEmbedding,
} from '../../lib/market-embeddings.mjs'
import { activateAutoPendingMarketsBatch } from '../../lib/auto-market-activation.mjs'
import { predictionLog } from '../../lib/prediction-observability.mjs'
import * as resolveMarkets from '../../lib/resolve-markets.mjs'
import {
  appendSeedRunHistory,
  attachAutoMarketCreationAudit,
  autoPendingActivationEnabled,
  computeStableAutoMarketFingerprint,
  CONTRACT_STATUS_AUTO_PENDING,
  evaluateAutoMarketQualityGates,
  filterAutoMarketSourcesByHealth,
  maxEventsScannedPerRun,
  maxMarketsCreatedPerRun,
  mergeSourceHealthSnapshot,
  seedShadowModeEnabled,
  sourcePauseFailureThreshold,
} from '../../lib/auto-market-seed.mjs'

export async function tryD1AutoMarketsRoutes(ctx) {
  const { db, kv, r2, env, request, path, method, query, body, requestId, jsonResponse } = ctx

// GET/POST /api/auto-markets — list events from APIs or seed markets from them
if (path === 'auto-markets') {
  const cronSecretEnv = env.AUTO_MARKETS_CRON_SECRET
  const postActionEarly = method === 'POST' ? query.action || body?.action || 'seed' : ''
  if (cronSecretEnv && method === 'POST') {
    const isSeedRequest =
      postActionEarly === 'seed' ||
      postActionEarly === 'seed_all' ||
      body?.seed_all === true ||
      (Array.isArray(body?.sources) && body.sources.length > 0)
    const isActivatePendingRequest = postActionEarly === 'activate_pending'
    if (isSeedRequest || isActivatePendingRequest) {
      const providedCron = request.headers.get('X-Cron-Secret') || body?.cronSecret || ''
      if (providedCron !== cronSecretEnv) {
        return jsonResponse(
          {
            error: 'Unauthorized',
            message:
              'Invalid or missing X-Cron-Secret. Set AUTO_MARKETS_CRON_SECRET on Pages (same value as the cron Worker) to require this header for seeding.',
          },
          401
        )
      }
    }
  }
  const action = query.action || (method === 'POST' ? (body?.action || 'seed') : 'events')
  const source = query.source || body?.source || 'sports'
  const sportKey = query.sport || body?.sport || 'basketball_nba'
  const supportedSources = [
    'sports',
    'stocks',
    'stocks_trend',
    'crypto',
    'crypto_trend',
    'weather',
    'openweather',
    'weatherapi',
    'news',
    'gnews',
    'perigon',
    'newsapi_ai',
    'newsdata_io',
    'newsdata',
    'fred',
    'finnhub',
    'frankfurter',
    'forex',
    'usgs',
    'fec',
    'openfec',
    'nasa_neo',
    'congress_gov',
    'bls',
  ]

  if (method === 'GET' && action === 'probe') {
    let lastSeed = null
    let lastSeedFetchDiagnostics = null
    let seedRunHistory = null
    let sourceHealthSnapshot = null
    if (kv) {
      try {
        const raw = await kv.get('auto_markets:last_seed')
        if (raw) lastSeed = JSON.parse(raw)
      } catch (_) {}
      try {
        const h = await kv.get('auto_markets:seed_run_history')
        if (h) {
          const p = JSON.parse(h)
          seedRunHistory = Array.isArray(p) ? p : null
        }
      } catch (_) {}
      try {
        const sh = await kv.get('auto_markets:source_health')
        if (sh) sourceHealthSnapshot = JSON.parse(sh)
      } catch (_) {}
    }
    let automationHeartbeat = null
    try {
      const hb = await storage.getContractById(db, d1.CRON_HEARTBEAT_CONTRACT_ID)
      if (hb?.payload && typeof hb.payload === 'object') automationHeartbeat = hb.payload
    } catch (_) {}
    let resolveQueueSummary = null
    try {
      const allVm = await storage.getContracts(db, { limit: 500 })
      const marketRows = allVm.filter((r) => resolveMarkets.isVirtualAutoMarketRow(r))
      const dueAll = resolveMarkets.filterDueResolutionMarkets(marketRows, env)
      resolveQueueSummary = {
        dueCount: dueAll.length,
        dueSample: dueAll.slice(0, 25).map((m) => ({
          marketId: m.contractId,
          title: m.payload?.title,
          resolutionDeadline: m.payload?.resolutionDeadline,
          oracleSource: m.payload?.oracleSource || m.payload?.source,
          marketType: m.payload?.marketType,
          customType: m.payload?.oracleConfig?.customType ?? null,
        })),
      }
    } catch (_) {}
    let autoPendingQueue = null
    try {
      const pend = await storage.getContracts(db, {
        templateType: 'VirtualMarket',
        status: CONTRACT_STATUS_AUTO_PENDING,
        limit: 200,
      })
      autoPendingQueue = {
        count: pend.length,
        sample: pend.slice(0, 15).map((r) => ({
          marketId: r.contractId,
          title: r.payload?.title,
          seededAt: r.payload?.autoMarketCreation?.seededAt,
        })),
      }
    } catch (_) {}
    if (lastSeed?.bySource && typeof lastSeed.bySource === 'object') {
      lastSeedFetchDiagnostics = dataSources.buildAutoMarketFetchDiagnostics(
        lastSeed.bySource,
        dataSources.probeAutoMarketEnv(env)
      )
    }
    return jsonResponse({
      success: true,
      action: 'probe',
      keysPresent: dataSources.probeAutoMarketEnv(env),
      autoMarketsPolicy: {
        skipFeedTopicHeadlineMarkets: d1.shouldSkipFeedTopicHeadlineMarkets(env),
        allowFeedTopicHeadlineMarkets: d1.envFlagTrue(env, 'AUTO_MARKETS_ALLOW_FEED_TOPIC'),
        autoMarketsOutcomeOnly: d1.envFlagTrue(env, 'AUTO_MARKETS_OUTCOME_ONLY'),
      },
      automationQueue: {
        pendingActivationEnabled: autoPendingActivationEnabled(env),
        sourcePauseFailureThreshold: sourcePauseFailureThreshold(env),
      },
      seedSources: dataSources.AUTO_MARKET_SOURCES,
      seedSourcesEffective: dataSources.resolveDefaultSeedSources(env),
      defaultSeedEnv: {
        AUTO_MARKETS_INCLUDE_STOCKS_TREND: d1.envFlagTrue(env, 'AUTO_MARKETS_INCLUDE_STOCKS_TREND'),
      },
      probeKeysPresentButNotUsedInSeeding: dataSources.probeKeysNotUsedInAutoMarketSeeding(env),
      seedLimits: {
        defaultPerSource: dataSources.DEFAULT_SEED_PER_SOURCE_LIMIT,
        newsEnrichedPerSource: dataSources.NEWS_ENRICHED_PER_SOURCE_LIMIT,
        maxPerRequest: dataSources.MAX_SEED_EVENT_LIMIT,
      },
      ...(lastSeed && { lastSeed }),
      ...(lastSeedFetchDiagnostics &&
        Object.keys(lastSeedFetchDiagnostics).length > 0 && { lastSeedFetchDiagnostics }),
      ...(seedRunHistory && { seedRunHistory }),
      ...(sourceHealthSnapshot && typeof sourceHealthSnapshot === 'object' && { sourceHealthSnapshot }),
      ...(automationHeartbeat && { automationHeartbeat }),
      ...(resolveQueueSummary && { resolveQueueSummary }),
      ...(autoPendingQueue && { autoPendingQueue }),
    })
  }

  if (method === 'GET' && action === 'events') {
    if (!supportedSources.includes(source)) {
      return jsonResponse({ error: 'Unknown source', supported: supportedSources }, 400)
    }
    const defaultListLimit = dataSources.resolveSeedLimitForSource(source, {
      defaultLimit: dataSources.DEFAULT_SEED_PER_SOURCE_LIMIT,
      newsEnrichedLimit: dataSources.NEWS_ENRICHED_PER_SOURCE_LIMIT,
      overrides: {},
    })
    const eventsLimit = dataSources.clampSeedLimit(
      parseInt(query.limit || String(defaultListLimit), 10) || defaultListLimit
    )
    let events = []
    try {
      events = await dataSources.getEventsFromSource(env, source, {
        limit: eventsLimit,
        sportKey,
        category: query.category || 'general',
        q: query.q || body?.q || 'technology',
      })
    } catch (err) {
      console.error('[auto-markets] events', source, err)
      return jsonResponse({ error: 'Failed to fetch events', message: err?.message }, 502)
    }
    return jsonResponse({ success: true, source, events, count: events.length })
  }

  if (method === 'POST' && action === 'activate_pending') {
    const lim = Math.min(200, Math.max(1, parseInt(String(body?.limit ?? query.limit ?? '40'), 10) || 40))
    const batch = await activateAutoPendingMarketsBatch({ db, r2, env, limit: lim })
    predictionLog('auto_markets.activate_pending.complete', {
      httpRequestId: requestId,
      activated: batch.activated.length,
      rejected: batch.rejected.length,
      errors: batch.errors.length,
      scanned: batch.scanned,
    })
    return jsonResponse({ success: true, action: 'activate_pending', ...batch })
  }

  // POST seed: multi-source (sources array or seed_all) or single source
  if (method === 'POST' && (action === 'seed' || action === 'seed_all')) {
    const seedStarted = Date.now()
    const seedStartedAtIso = new Date().toISOString()
    const seedRunId = `sr-${seedStarted}-${String(requestId || 'na').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 14)}`
    const shadow = seedShadowModeEnabled(env)
    const pendingFirst = autoPendingActivationEnabled(env)
    const maxCreate = maxMarketsCreatedPerRun(env)
    const maxScan = maxEventsScannedPerRun(env)
    let sourcesSkippedDueToHealth = []
    let events = []
    let bySource = null
    let limitsBySource = null
    const sourcesList = Array.isArray(body?.sources)
      ? body.sources
      : action === 'seed_all' || body?.seed_all
        ? [...dataSources.resolveDefaultSeedSources(env)]
        : null
    const seedLimitOpts = {
      defaultLimit: dataSources.clampSeedLimit(parseInt(body?.perSourceLimit ?? '25', 10) || 25),
      newsEnrichedLimit: dataSources.clampSeedLimit(parseInt(body?.newsEnrichedPerSourceLimit ?? '50', 10) || 50),
      overrides: dataSources.normalizePerSourceOverrides(body?.perSourceLimits),
      sportKey,
      ...(body?.sportsMix === 'single' ? { sportsMix: 'single' } : {}),
    }

    if (sourcesList && sourcesList.length > 0) {
      const filtered = await filterAutoMarketSourcesByHealth(kv, env, sourcesList)
      sourcesSkippedDueToHealth = filtered.skippedDueToHealth
      if (filtered.sources.length === 0) {
        return jsonResponse(
          {
            success: true,
            message: 'All requested sources paused due to consecutive fetch failures (KV auto_markets:source_health)',
            seedRunId,
            sourcesSkippedDueToHealth,
            pendingActivationEnabled: pendingFirst,
            created: [],
            count: 0,
            skipped: 0,
          },
          200
        )
      }
      const gathered = await dataSources.gatherEventsFromAllSources(env, filtered.sources, seedLimitOpts)
      await mergeSourceHealthSnapshot(kv, gathered.sourceHealth || {})
      events = gathered.events
      bySource = gathered.bySource
      limitsBySource = gathered.limitsBySource
      if (events.length === 0 && Object.values(gathered.bySource).every((n) => n === 0)) {
        return jsonResponse(
          {
            success: true,
            message: 'No events from any source (missing keys or empty)',
            bySource: gathered.bySource,
            created: [],
            count: 0,
            skipped: 0,
            seedRunId,
            pendingActivationEnabled: pendingFirst,
            ...(sourcesSkippedDueToHealth.length > 0 ? { sourcesSkippedDueToHealth } : {}),
          },
          200
        )
      }
    } else {
      const filtSingle = await filterAutoMarketSourcesByHealth(kv, env, [source])
      sourcesSkippedDueToHealth = filtSingle.skippedDueToHealth
      if (filtSingle.sources.length === 0) {
        return jsonResponse(
          {
            success: true,
            message: 'Source paused due to consecutive fetch failures (KV auto_markets:source_health)',
            source,
            seedRunId,
            sourcesSkippedDueToHealth,
            pendingActivationEnabled: pendingFirst,
            created: [],
            count: 0,
            skipped: 0,
          },
          200
        )
      }
      try {
        const defaultOne = dataSources.resolveSeedLimitForSource(source, seedLimitOpts)
        const rawExplicit =
          body?.limit != null && body.limit !== '' ? parseInt(String(body.limit), 10) : NaN
        const oneLimit = Number.isFinite(rawExplicit)
          ? dataSources.clampSeedLimit(rawExplicit)
          : defaultOne
        const slot = dataSources.utcHourSlot()
        events = await dataSources.getEventsFromSource(env, source, {
          limit: oneLimit,
          sportKey,
          category:
            body?.category != null && String(body.category).trim() !== ''
              ? body.category
              : dataSources.rotatedNewsCategory(slot),
          q:
            body?.q != null && String(body.q).trim() !== '' ? body.q : dataSources.rotatedNewsQuery(slot),
          ...(body?.sportsMix === 'single' ? { sportsMix: 'single' } : {}),
        })
        await mergeSourceHealthSnapshot(kv, { [source]: { ok: true, count: events.length } })
      } catch (err) {
        console.error('[auto-markets] seed fetch', source, err)
        await mergeSourceHealthSnapshot(kv, {
          [source]: { ok: false, count: 0, error: err?.message || 'fetch_failed' },
        })
        return jsonResponse({ error: 'Failed to fetch events', message: err?.message }, 502)
      }
    }

    if (body?.deterministicEventOrder !== true) {
      const shuffleSeed = dataSources.varietyOffsetSlot(dataSources.utcHourSlot(), 'seed-shuffle')
      events = dataSources.deterministicShuffle(events, shuffleSeed)
    }

    let eventsScanTrimmed = 0
    if (events.length > maxScan) {
      eventsScanTrimmed = events.length - maxScan
      events = events.slice(0, maxScan)
    }

    const created = []
    const shadowPreview = []
    const usedCustomTypes = {
      election: false,
      olympics: false,
      conflict: false,
      fda_drug: false,
      court: false,
      legislation: false,
      mna_ipo: false,
      macro_data: false,
      fed_operator: false,
      summit: false,
      tech_antitrust: false,
    }
    const skipFeedTopicOnlyNews = d1.shouldSkipFeedTopicHeadlineMarkets(env)
    let skippedFeedTopicNews = 0
    let skippedQualityGate = 0
    let skippedDedupe = 0
    let skippedNearDuplicate = 0
    let skippedEmbeddingDuplicate = 0
    let embeddingEmbedFailed = 0
    let embeddingUpsertFailed = 0
    /** @type {Array<{ vec: number[], resolutionDay: string, outcomesFp: string }>} */
    const embeddingBatchScratch = []
    const existingVirtualRows = await storage.getContracts(db, { templateType: 'VirtualMarket', limit: 1500 })
    const occupiedDedupeKeys = await marketDedupe.buildOccupiedDedupeKeySet(existingVirtualRows)
    const semanticIndex = marketDedupe.buildSemanticIndex(existingVirtualRows)
    const batchDedupeKeys = new Set()
    for (const ev of events) {
      const insertedSoFar = shadow ? shadowPreview.length : created.length
      if (insertedSoFar >= maxCreate) break

      const evPromoted = await promoteNewsArticleToOutcomeMarket(env, ev)
      const evUse = enrichNewsEvent(evPromoted, { usedCustomTypes })
      if (skipFeedTopicOnlyNews && isFeedTopicOnlyNewsCandidate(evUse)) {
        skippedFeedTopicNews += 1
        continue
      }
      const evFinal = finalizeNewsFeedTopicMarket(evUse)
      const evOut = applyPlayfulOutcomePresentation(evFinal)
      const id = evOut.id ? `market-${evOut.id}` : `market-${evOut.source}-${Date.now()}-${created.length}`
      // Event-driven: only create if we don't already have a market for this event (avoids duplicates when cron runs frequently)
      const existing = await storage.getContractById(db, id)
      if (existing && (existing.templateId === d1.TEMPLATE_VIRTUAL_MARKET || (existing.templateId && existing.templateId.includes('Market')))) {
        continue // already have this event as a market, skip
      }
      const { source: displaySource, category: displayCategory } = d1.getDisplaySourceAndCategory(evOut.source)
      const topicCategory = d1.categoryFromNewsTopic(evOut.oracleConfig?.q || evOut.oracleConfig?.category || evOut.oracleConfig?.seedQuery)
      const finalCategory = evOut.categoryHint || topicCategory || displayCategory
      let resolutionDeadline = evOut.resolutionDeadline || null
      if (!resolutionDeadline && evOut.endDate && String(evOut.endDate).length >= 10) {
        resolutionDeadline = `${String(evOut.endDate).slice(0, 10)}T23:59:59.000Z`
      }
      if (!resolutionDeadline && evOut.commenceTime) {
        const d = new Date(evOut.commenceTime)
        if (!Number.isNaN(d.getTime())) {
          d.setUTCHours(d.getUTCHours() + 3)
          resolutionDeadline = d.toISOString()
        } else {
          resolutionDeadline = String(evOut.commenceTime).slice(0, 10)
        }
      }
      if (!resolutionDeadline) resolutionDeadline = evOut.endDate || evOut.date || (evOut.commenceTime ? String(evOut.commenceTime).slice(0, 10) : null)
      const eventSettlementSummary =
        (evOut.oneLiner && String(evOut.oneLiner).trim()) ||
        (evOut.resolutionCriteria && String(evOut.resolutionCriteria).trim().slice(0, 500)) ||
        evOut.title
      const multiOutcomesRaw =
        evOut.marketType === 'MultiOutcome' && Array.isArray(evOut.outcomes)
          ? [...new Set(evOut.outcomes.map((o) => String(o).trim()).filter(Boolean))].slice(0, 8)
          : null
      const isMulti = multiOutcomesRaw && multiOutcomesRaw.length >= 2
      const payload = {
        marketId: id,
        title: evOut.title,
        description: evOut.description || evOut.title,
        marketType: isMulti ? 'MultiOutcome' : 'Binary',
        outcomes: isMulti ? multiOutcomesRaw : ['Yes', 'No'],
        settlementTrigger: { tag: 'EventBased', value: eventSettlementSummary },
        resolutionCriteria: evOut.resolutionCriteria || evOut.title,
        resolutionDeadline: resolutionDeadline || null,
        oneLiner: evOut.oneLiner || null,
        status: pendingFirst ? 'AutoPending' : 'Active',
        totalVolume: 0,
        yesVolume: 0,
        noVolume: 0,
        outcomeVolumes: {},
        category: finalCategory,
        styleLabel: evOut.source,
        source: displaySource,
        oracleSource: evOut.oracleSource || evOut.source,
        oracleConfig: {
          ...(evOut.oracleConfig || {}),
          ...(evOut.seedNewsSource ? { seedNewsSource: evOut.seedNewsSource } : {}),
          ...(evOut.customType && { customType: evOut.customType }),
        },
        createdAt: new Date().toISOString(),
      }
      await marketDedupe.assignDedupeKeyToPayload(payload)
      const candidateKeys = await marketDedupe.allDedupeKeysForPayload(payload)
      const primaryDedupeKey = candidateKeys.values().next().value ?? null

      const quality = evaluateAutoMarketQualityGates(payload, env)
      if (!quality.ok) {
        skippedQualityGate += 1
        continue
      }

      const hitsKnownKey = [...candidateKeys].some((k) => occupiedDedupeKeys.has(k) || batchDedupeKeys.has(k))
      if (hitsKnownKey) {
        skippedDedupe += 1
        continue
      }
      if (marketDedupe.isSemanticNearDuplicateIndexed(payload, semanticIndex, { minTokens: 5 })) {
        skippedNearDuplicate += 1
        continue
      }
      /** @type {number[] | null} */
      let embeddingVecForUpsert = null
      if (!shadow && !marketDedupe.isFeedTopicPayload(payload) && env?.VECTORIZE && env?.AI) {
        const minSc = marketEmbedMinScore(env)
        const rd = marketDedupe.resolutionDateKey(payload)
        const ofp = marketDedupe.outcomesFingerprint(payload)
        const vec = await embedText(env, embeddingDocumentFromPayload(payload))
        if (!vec) {
          embeddingEmbedFailed += 1
        } else if (isNearDuplicateInBatch(vec, embeddingBatchScratch, rd, ofp, minSc)) {
          skippedEmbeddingDuplicate += 1
          continue
        } else {
          const embedDup = await findParaphraseDuplicate(env, payload, { precomputedVec: vec })
          if (embedDup.duplicate) {
            skippedEmbeddingDuplicate += 1
            continue
          }
          embeddingVecForUpsert = vec
        }
      }

      const stableContentFingerprint = await computeStableAutoMarketFingerprint(payload, evOut)
      attachAutoMarketCreationAudit({
        seedRunId,
        seedStartedAt: seedStartedAtIso,
        evOut,
        payload,
        primaryDedupeKey,
        stableContentFingerprint,
      })

      if (shadow) {
        shadowPreview.push({
          marketId: id,
          title: evOut.title,
          source: evOut.source,
          contractStatus: pendingFirst ? CONTRACT_STATUS_AUTO_PENDING : 'Active',
        })
        for (const k of candidateKeys) {
          if (k) batchDedupeKeys.add(k)
        }
        marketDedupe.appendSemanticIndexEntry(semanticIndex, payload)
        continue
      }

      const contractRowStatus = pendingFirst ? CONTRACT_STATUS_AUTO_PENDING : 'Active'
      payload.status = contractRowStatus === CONTRACT_STATUS_AUTO_PENDING ? 'AutoPending' : 'Active'

      await storage.upsertContract(db, {
        contract_id: id,
        template_id: d1.TEMPLATE_VIRTUAL_MARKET,
        payload,
        party: 'platform',
        status: contractRowStatus,
      })
      await d1.backupToR2(r2, undefined, id, payload)

      if (!pendingFirst) {
        const useZeroLiquidity =
          env.AUTO_MARKETS_ZERO_LIQUIDITY === '1' ||
          env.AUTO_MARKETS_ZERO_LIQUIDITY === 'true' ||
          String(env.INITIAL_POOL_LIQUIDITY || '').trim() === '0'
        const initialLiquidity = useZeroLiquidity ? 0 : 1000
        const poolState =
          payload.marketType === 'MultiOutcome' && Array.isArray(payload.outcomes) && payload.outcomes.length >= 2
            ? createPoolStateMulti(id, payload.outcomes, initialLiquidity, {})
            : createPoolState(id, initialLiquidity, initialLiquidity)
        await storage.upsertContract(db, {
          contract_id: poolState.poolId,
          template_id: 'LiquidityPool',
          payload: poolState,
          party: 'platform',
          status: 'Active',
        })
        await d1.backupToR2(r2, undefined, poolState.poolId, poolState)
      }

      for (const k of candidateKeys) {
        if (k) {
          occupiedDedupeKeys.add(k)
          batchDedupeKeys.add(k)
        }
      }
      marketDedupe.appendSemanticIndexEntry(semanticIndex, payload)
      if (embeddingVecForUpsert) {
        embeddingBatchScratch.push({
          vec: embeddingVecForUpsert,
          resolutionDay: marketDedupe.resolutionDateKey(payload),
          outcomesFp: marketDedupe.outcomesFingerprint(payload),
        })
      }
      const embedUp = await upsertMarketEmbedding(env, id, payload, { precomputedVec: embeddingVecForUpsert })
      if (embeddingVecForUpsert && !embedUp.ok) embeddingUpsertFailed += 1
      created.push({
        marketId: id,
        title: evOut.title,
        source: evOut.source,
        contractStatus: contractRowStatus,
      })
    }
    // Markets list cache will refresh on next GET (TTL)
    const produced = shadow ? shadowPreview.length : created.length
    const skipped = shadow ? events.length - shadowPreview.length : events.length - created.length
    const hitMaxCreate = produced >= maxCreate
    const res = {
      success: true,
      seedRunId,
      shadowMode: shadow,
      pendingActivationEnabled: pendingFirst,
      maxCreate,
      maxScan,
      ...(sourcesSkippedDueToHealth.length > 0 ? { sourcesSkippedDueToHealth } : {}),
      ...(eventsScanTrimmed > 0 ? { eventsScanTrimmed } : {}),
      source: bySource ? 'multiple' : source,
      created,
      count: created.length,
      ...(shadow
        ? {
            shadowPreviewCount: shadowPreview.length,
            shadowPreview: shadowPreview.slice(0, 40),
          }
        : {}),
      skipped,
      ...(skippedQualityGate > 0 ? { skippedQualityGate } : {}),
      ...(skipFeedTopicOnlyNews && skippedFeedTopicNews > 0 ? { skippedFeedTopicNews } : {}),
      ...(skippedDedupe > 0 ? { skippedDedupe } : {}),
      ...(skippedNearDuplicate > 0 ? { skippedNearDuplicate } : {}),
      ...(skippedEmbeddingDuplicate > 0 ? { skippedEmbeddingDuplicate } : {}),
      ...(embeddingEmbedFailed > 0 ? { embeddingEmbedFailed } : {}),
      ...(embeddingUpsertFailed > 0 ? { embeddingUpsertFailed } : {}),
      ...(hitMaxCreate ? { hitMaxCreate: true } : {}),
    }
    if (bySource) res.bySource = bySource
    if (limitsBySource) res.limitsBySource = limitsBySource
    const lastSeedAt = new Date().toISOString()
    predictionLog('auto_markets.seed.complete', {
      httpRequestId: requestId,
      ms: Date.now() - seedStarted,
      lastSeedAt,
      seedRunId,
      shadowMode: shadow,
      events: events.length,
      created: res.count,
      shadowPreviewCount: shadow ? shadowPreview.length : 0,
      skipped: res.skipped,
      skippedQualityGate,
      eventsScanTrimmed,
      skippedFeedTopicNews,
      skippedDedupe,
      skippedNearDuplicate,
      skippedEmbeddingDuplicate,
      embeddingEmbedFailed,
      embeddingUpsertFailed,
      hitMaxCreate,
      bySource: res.bySource ?? null,
    })
    console.log(
      '[auto-markets] seed_all completed',
      lastSeedAt,
      'seedRunId:',
      seedRunId,
      'shadow:',
      shadow,
      'created:',
      res.count,
      'shadowPreview:',
      shadow ? shadowPreview.length : 0,
      'bySource:',
      res.bySource ?? ''
    )
    if (kv) {
      try {
        await kv.put(
          'auto_markets:last_seed',
          JSON.stringify({
            at: lastSeedAt,
            seedRunId,
            count: res.count,
            ...(shadow ? { shadowPreviewCount: shadowPreview.length } : {}),
            ...(skippedQualityGate > 0 ? { skippedQualityGate } : {}),
            ...(eventsScanTrimmed > 0 ? { eventsScanTrimmed } : {}),
            ...(hitMaxCreate ? { hitMaxCreate: true } : {}),
            bySource: res.bySource ?? null,
            fetchDiagnostics: dataSources.buildAutoMarketFetchDiagnostics(
              res.bySource && typeof res.bySource === 'object' ? res.bySource : {},
              dataSources.probeAutoMarketEnv(env)
            ),
          })
        )
      } catch (_) {}
      await appendSeedRunHistory(kv, {
        seedRunId,
        at: lastSeedAt,
        shadowMode: shadow,
        created: created.length,
        shadowPreviewCount: shadowPreview.length,
        skippedQualityGate,
        eventsScanTrimmed,
        eventsConsidered: events.length,
        maxCreate,
        maxScan,
        hitMaxCreate,
        source: bySource ? 'multiple' : source,
        ...(bySource ? { bySource } : {}),
      })
    }
    try {
      await d1.upsertAutomationHeartbeat(db, r2, {
        lastSeedAt,
        lastSeedCreated: res.count,
        lastSeedBySource: res.bySource ?? null,
      })
    } catch (hbErr) {
      console.error('[auto-markets] heartbeat', hbErr?.message)
    }
    return jsonResponse(res)
  }

  return jsonResponse({ error: 'Use GET ?action=events&source=... or POST { action: "seed", source: ... } or POST { action: "seed_all" } or POST { sources: ["sports", "stocks", ...] }' }, 400)
}
  return null
}
