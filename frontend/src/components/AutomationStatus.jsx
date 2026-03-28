import { useState, useEffect } from 'react'
import { fetchAutoMarketsProbe } from '../services/marketsApi'
import { Link } from 'react-router-dom'
import LoadingDiceProgress from './LoadingDiceProgress'
import './AutomationStatus.css'

/** Public view of last automation ticks (from GET /api/auto-markets?action=probe). */
export default function AutomationStatus() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchAutoMarketsProbe()
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setErr(null)
        }
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.message || 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const hb = data?.automationHeartbeat
  const lastSeed = data?.lastSeed
  const rq = data?.resolveQueueSummary

  const appVersion =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION
      ? String(import.meta.env.VITE_APP_VERSION)
      : null

  return (
    <div className="automation-status-page">
      <div className="page-header">
        <h1>Automation status</h1>
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
            <dt>Last seed (KV)</dt>
            <dd>
              {lastSeed?.at ? (
                <>
                  {new Date(lastSeed.at).toLocaleString()} — created {lastSeed.count ?? '—'}
                  {lastSeed.bySource && (
                    <pre className="automation-status-pre">{JSON.stringify(lastSeed.bySource, null, 2)}</pre>
                  )}
                </>
              ) : (
                'Not recorded (KV may be unset or first run pending)'
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
        Operator notes: see repo <code>docs/PREDICTION_OPS_PLAYBOOK.md</code> and{' '}
        <Link to="/docs">Documentation</Link> (prediction markets &amp; auto-markets).
      </p>
    </div>
  )
}
