import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchAutoMarketsProbe } from '../services/marketsApi'
import { Link } from 'react-router-dom'
import LoadingDiceProgress from './LoadingDiceProgress'
import './AutomationStatus.css'

/** Public view of last automation ticks (from GET /api/auto-markets?action=probe). */
export default function AutomationStatus() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)
  const probeGenRef = useRef(0)

  const loadProbe = useCallback(() => {
    const id = ++probeGenRef.current
    setLoading(true)
    setErr(null)
    fetchAutoMarketsProbe()
      .then((d) => {
        if (probeGenRef.current !== id) return
        setData(d)
        setErr(null)
      })
      .catch((e) => {
        if (probeGenRef.current !== id) return
        setErr(e?.message || 'Failed to load')
      })
      .finally(() => {
        if (probeGenRef.current !== id) return
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    loadProbe()
  }, [loadProbe])

  const hb = data?.automationHeartbeat
  const lastSeed = data?.lastSeed
  const seedRunHistory = Array.isArray(data?.seedRunHistory) ? data.seedRunHistory : null
  const sourceHealthSnapshot =
    data?.sourceHealthSnapshot && typeof data.sourceHealthSnapshot === 'object'
      ? data.sourceHealthSnapshot
      : null
  const rq = data?.resolveQueueSummary
  const autoQ = data?.automationQueue
  const pendingQ = data?.autoPendingQueue

  const appVersion =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION
      ? String(import.meta.env.VITE_APP_VERSION)
      : null

  return (
    <div className="automation-status-page">
      <div className="page-header">
        <div className="automation-status-header-row">
          <h1>Automation status</h1>
          <button type="button" className="btn-secondary automation-status-refresh" onClick={loadProbe} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh snapshot'}
          </button>
        </div>
        <p className="text-secondary">
          Read-only snapshot from the public API probe. Seeding and resolution run on a schedule (see docs); outcomes stay{' '}
          <strong>oracle / outcome-based</strong> — feed-topic headline markets remain off in production policy.
        </p>
      </div>

      <div className="card automation-status-card">
        {loading && (
          <div className="automation-status-loading">
            <LoadingDiceProgress
              size="sm"
              message="Loading automation snapshot…"
              sublabel="Public probe from the API."
              progressSteps={['Rolling the dice…', 'Querying probe…', 'Parsing status…']}
            />
          </div>
        )}
        {err && <p className="text-error">{err}</p>}
        {!loading && !err && data && (
          <dl className="automation-status-dl">
            <dt>Outcome-only policy</dt>
            <dd>
              {data.autoMarketsPolicy?.autoMarketsOutcomeOnly ? 'Yes (feed-topic markets skipped)' : 'No / relaxed'}
            </dd>
            <dt>Skip feed-topic headlines</dt>
            <dd>{data.autoMarketsPolicy?.skipFeedTopicHeadlineMarkets ? 'Yes' : 'No'}</dd>
            <dt>Activation queue (probe)</dt>
            <dd>
              {autoQ ? (
                <>
                  Pending-first activation: <strong>{autoQ.pendingActivationEnabled ? 'On' : 'Off'}</strong>
                  {autoQ.sourcePauseFailureThreshold > 0 ? (
                    <span className="text-secondary">
                      {' '}
                      · pause source after <strong>{autoQ.sourcePauseFailureThreshold}</strong> consecutive fetch failures
                    </span>
                  ) : (
                    <span className="text-secondary"> · source pause disabled (threshold 0)</span>
                  )}
                </>
              ) : (
                '—'
              )}
            </dd>
            <dt>Markets awaiting activation (D1 AutoPending)</dt>
            <dd>
              {pendingQ ? (
                <>
                  <strong>{pendingQ.count ?? 0}</strong> row(s). Sample (up to 15):
                  {Array.isArray(pendingQ.sample) && pendingQ.sample.length > 0 ? (
                    <ul className="automation-status-resolve-queue">
                      {pendingQ.sample.map((row) => (
                        <li key={row.marketId}>
                          <code>{row.marketId}</code>
                          {row.title ? ` — ${String(row.title).slice(0, 72)}${String(row.title).length > 72 ? '…' : ''}` : ''}
                          {row.seededAt ? (
                            <span className="text-secondary"> · seeded {String(row.seededAt).slice(0, 19)}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-secondary">None in sample.</p>
                  )}
                  <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
                    Promote with privileged <code>POST /api/auto-markets</code> and{' '}
                    <code>{`{ "action": "activate_pending", "limit": 40 }`}</code> (same cron secret as seed when configured).
                  </p>
                </>
              ) : (
                '—'
              )}
            </dd>
            <dt>Last seed (KV)</dt>
            <dd>
              {lastSeed?.at ? (
                <>
                  {new Date(lastSeed.at).toLocaleString()} — created {lastSeed.count ?? '—'}
                  {lastSeed.seedRunId ? (
                    <span className="text-secondary"> · run <code>{lastSeed.seedRunId}</code></span>
                  ) : null}
                  {lastSeed.shadowPreviewCount != null ? (
                    <span className="text-secondary"> · shadow would-create {lastSeed.shadowPreviewCount}</span>
                  ) : null}
                  {lastSeed.skippedQualityGate > 0 ? (
                    <span className="text-secondary"> · quality skips {lastSeed.skippedQualityGate}</span>
                  ) : null}
                  {lastSeed.eventsScanTrimmed > 0 ? (
                    <span className="text-secondary"> · scan trimmed {lastSeed.eventsScanTrimmed}</span>
                  ) : null}
                  {lastSeed.hitMaxCreate ? (
                    <span className="text-secondary"> · hit max-create cap</span>
                  ) : null}
                  {lastSeed.bySource && (
                    <pre className="automation-status-pre">{JSON.stringify(lastSeed.bySource, null, 2)}</pre>
                  )}
                </>
              ) : (
                'Not recorded (KV may be unset or first run pending)'
              )}
            </dd>
            <dt>Recent seed runs (KV)</dt>
            <dd>
              {seedRunHistory && seedRunHistory.length > 0 ? (
                <pre className="automation-status-pre">{JSON.stringify(seedRunHistory, null, 2)}</pre>
              ) : (
                <span className="text-secondary">No history yet (empty until after seeded POST runs).</span>
              )}
            </dd>
            <dt>Source health (KV)</dt>
            <dd>
              {sourceHealthSnapshot && Object.keys(sourceHealthSnapshot).length > 0 ? (
                <pre className="automation-status-pre">{JSON.stringify(sourceHealthSnapshot, null, 2)}</pre>
              ) : (
                <span className="text-secondary">No per-source snapshot yet.</span>
              )}
            </dd>
            <dt>Heartbeat (D1)</dt>
            <dd>
              {hb ? (
                <pre className="automation-status-pre">{JSON.stringify(hb, null, 2)}</pre>
              ) : (
                'No row yet — runs after next successful seed / resolve on deployed API'
              )}
            </dd>
            <dt>Markets due for resolution (sample)</dt>
            <dd>
              {rq ? (
                <>
                  <strong>{rq.dueCount ?? 0}</strong> market(s) currently pass the due filter (same as{' '}
                  <code>POST /api/resolve-markets</code>). Sample (up to 25):
                  {Array.isArray(rq.dueSample) && rq.dueSample.length > 0 ? (
                    <ul className="automation-status-resolve-queue">
                      {rq.dueSample.map((row) => (
                        <li key={row.marketId}>
                          <code>{row.marketId}</code>
                          {row.title ? ` — ${String(row.title).slice(0, 80)}${String(row.title).length > 80 ? '…' : ''}` : ''}
                          {row.resolutionDeadline ? (
                            <span className="text-secondary"> · deadline {String(row.resolutionDeadline).slice(0, 16)}</span>
                          ) : null}
                          {row.customType ? (
                            <span className="text-secondary"> · {row.customType}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-secondary">None in sample (queue empty or all outside first 25).</p>
                  )}
                  <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
                    Ops dry-run (no writes): <code>POST /api/resolve-markets-preview</code> with the same secrets as{' '}
                    <code>resolve-markets</code>. See <code>docs/API.md</code>.
                  </p>
                </>
              ) : (
                '—'
              )}
            </dd>
            <dt>Seed limits (per request)</dt>
            <dd>
              {data.seedLimits ? (
                <pre className="automation-status-pre">
                  {JSON.stringify(data.seedLimits, null, 2)}
                </pre>
              ) : (
                '—'
              )}
            </dd>
            <dt>API keys present (names only)</dt>
            <dd>
              <pre className="automation-status-pre">
                {JSON.stringify(data.keysPresent || {}, null, 2)}
              </pre>
            </dd>
            {appVersion && (
              <>
                <dt>Web build</dt>
                <dd>{appVersion}</dd>
              </>
            )}
          </dl>
        )}
      </div>

      <p className="text-secondary mt-lg">
        Operator notes: see repo <code>docs/AUTO_MARKETS.md</code> (Operator playbook) and{' '}
        <Link to="/docs">Documentation</Link> (prediction markets &amp; auto-markets).
      </p>
    </div>
  )
}
