import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_TAGLINE } from '../constants/brand'
import { categoryForFilter } from '../constants/marketConfig'
import { formatPips } from '../constants/currency'
import { fetchMarkets } from '../services/marketsApi'
import { getMarketStaleness } from '../utils/marketUX'
import LoadingSpinner from './LoadingSpinner'
import './LegalPage.css'
import './ExecutiveSummary.css'

function computeAggregates(markets) {
  let totalVolume = 0
  let withVolume = 0
  let totalOpenOrders = 0
  let active = 0
  let binary = 0
  let multi = 0
  let pendingResolution = 0
  let newThisWeek = 0
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const byCategory = new Map()

  for (const m of markets) {
    const p = m.payload || {}
    const vol = Number(p.totalVolume) || 0
    totalVolume += vol
    if (vol > 0) withVolume += 1
    totalOpenOrders += typeof m.openOrderCount === 'number' ? m.openOrderCount : 0
    if (p.status === 'Active') active += 1
    if (p.marketType === 'MultiOutcome') multi += 1
    else binary += 1
    if (getMarketStaleness(p) === 'pending_resolution') pendingResolution += 1
    const created = p.createdAt ? new Date(p.createdAt).getTime() : NaN
    if (!Number.isNaN(created) && now - created < weekMs) newThisWeek += 1
    const cat = categoryForFilter(p)
    byCategory.set(cat, (byCategory.get(cat) || 0) + 1)
  }

  const topCategories = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  return {
    total: markets.length,
    active,
    withVolume,
    totalVolume,
    totalOpenOrders,
    binary,
    multi,
    pendingResolution,
    newThisWeek,
    topCategories,
  }
}

function StatTile({ label, value }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile__value">{value}</div>
      <div className="stat-tile__label">{label}</div>
    </div>
  )
}

export default function ExecutiveSummary() {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fetchedAt, setFetchedAt] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchMarkets(null, { sort: 'activity' })
      .then((rows) => {
        if (!cancelled) {
          setMarkets(rows)
          setFetchedAt(new Date())
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Could not load market statistics.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => computeAggregates(markets), [markets])

  const refreshedLabel = fetchedAt
    ? fetchedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : null

  return (
    <div className="executive-summary">
      <div className="legal-page">
        <h1>Executive summary</h1>
        <p className="legal-updated">
          {BRAND_NAME} — {BRAND_TAGLINE}
        </p>

        <h2>Overview</h2>
        <p>
          {BRAND_NAME} is a prediction markets platform where participants trade on real-world outcomes using Pips,
          an in-app balance designed for fast settlement and a straightforward trading experience. Users can fund
          activity through crypto deposits, trade on active markets, and withdraw earnings according to platform rules.
        </p>
      </div>

      <section className="pitch-deck" aria-labelledby="pitch-deck-heading">
        <h2 id="pitch-deck-heading" className="executive-summary__section-title">
          Pitch deck
        </h2>
        <p className="pitch-deck__intro">
          A concise narrative for operators and partners. Each card mirrors a typical deck slide; use browser print
          (optional) for a single-page handout alongside the live statistics below.
        </p>
        <div className="pitch-slides">
          <article className="pitch-slide">
            <span className="pitch-slide__label">Slide 1 — Vision</span>
            <h3>Belief markets, built for clarity</h3>
            <p>
              {BRAND_NAME} turns real-world uncertainty into tradable Yes/No (and multi-outcome) markets with transparent
              rules, in-platform Pips, and paths to fund and withdraw via crypto where supported.
            </p>
          </article>
          <article className="pitch-slide">
            <span className="pitch-slide__label">Slide 2 — Problem</span>
            <h3>Opaque odds, fragmented rails</h3>
            <ul>
              <li>Retail prediction and event products are often black-box, region-locked, or disconnected from how people already move money.</li>
              <li>Creators of outcome markets need automation so catalogs stay fresh without manual overhead.</li>
            </ul>
          </article>
          <article className="pitch-slide">
            <span className="pitch-slide__label">Slide 3 — Solution</span>
            <h3>Automated catalog + trader-first UX</h3>
            <ul>
              <li>Continuous seeding from vetted data feeds (sports, weather, finance, news, science, politics, and more).</li>
              <li>Web and desktop clients with discoverability, watchlists, portfolio, and optional alerts.</li>
              <li>Peer-to-peer limit flow alongside configurable AMM policy — structured for risk controls you can document.</li>
            </ul>
          </article>
          <article className="pitch-slide">
            <span className="pitch-slide__label">Slide 4 — Model</span>
            <h3>Pips, deposits, and withdrawals</h3>
            <p>
              Traders operate in Pips for pricing and settlement simplicity; crypto deposits credit Pips and withdrawals
              return value subject to published fees and compliance posture. The stack is API-first for observability and
              partner integrations.
            </p>
          </article>
          <article className="pitch-slide">
            <span className="pitch-slide__label">Slide 5 — Traction</span>
            <h3>Signals from the live catalog</h3>
            <p>
              The &quot;Market statistics&quot; section below is computed from the same public markets feed as Discover — active
              counts, volume rollups, open interest via resting orders, and category mix update when you refresh the page.
            </p>
          </article>
          <article className="pitch-slide">
            <span className="pitch-slide__label">Slide 6 — Roadmap &amp; ask</span>
            <h3>Scale coverage, liquidity, and trust</h3>
            <ul>
              <li>Expand feed coverage and resolution transparency without sacrificing safety.</li>
              <li>Deepen liquidity incentives and market-maker tooling where product policy allows.</li>
              <li>Partner with distribution (desktop, communities, APIs) aligned to responsible participation.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="market-stats" aria-labelledby="market-stats-heading">
        <h2 id="market-stats-heading" className="executive-summary__section-title">
          Market statistics
        </h2>
        {refreshedLabel && (
          <p className="market-stats__status" aria-live="polite">
            Live snapshot from the markets API · {refreshedLabel}
          </p>
        )}
        {error && <div className="market-stats__error" role="alert">{error}</div>}
        {loading && !error && (
          <LoadingSpinner
            message="Loading statistics…"
            sublabel="Fetching the same catalog used on Discover."
            size="sm"
          />
        )}
        {!loading && !error && (
          <>
            <div className="stat-grid">
              <StatTile label="Markets in catalog" value={stats.total.toLocaleString()} />
              <StatTile label="Active status" value={stats.active.toLocaleString()} />
              <StatTile label="With traded volume" value={stats.withVolume.toLocaleString()} />
              <StatTile label="Listed volume (sum)" value={formatPips(stats.totalVolume)} />
              <StatTile label="Resting orders (open)" value={stats.totalOpenOrders.toLocaleString()} />
              <StatTile label="Binary markets" value={stats.binary.toLocaleString()} />
              <StatTile label="Multi-outcome" value={stats.multi.toLocaleString()} />
              <StatTile label="Pending resolution (past deadline)" value={stats.pendingResolution.toLocaleString()} />
              <StatTile label="New in last 7 days" value={stats.newThisWeek.toLocaleString()} />
            </div>
            {stats.topCategories.length > 0 && (
              <div className="stats-breakdown">
                <div className="stats-breakdown__head">
                  <span>Category mix</span>
                  <span>Count</span>
                </div>
                {stats.topCategories.map(([name, count]) => (
                  <div key={name} className="stats-breakdown__row">
                    <span className="stats-breakdown__cat">{name}</span>
                    <span>{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="stats-footnote">
              Category labels follow Discover logic (explicit category, feed-derived topic, or text inference).
              Volume is the sum of each market&apos;s published <code>totalVolume</code> field; open orders sums{' '}
              <code>openOrderCount</code> from the activity sorted feed.
            </p>
          </>
        )}
      </section>

      <div className="legal-page">
        <h2>Problem and opportunity</h2>
        <p>
          People want transparent, market-driven ways to express views on events — from sports and weather to
          technology, politics, and industry news. Traditional offerings can be opaque, geographically constrained, or
          disconnected from how users already move value online. {BRAND_NAME} addresses that gap with a focused product
          built around discovery, liquidity, and self-custody-friendly funding rails where supported.
        </p>

        <h2>Product</h2>
        <ul>
          <li>
            <strong>Markets:</strong> Binary-style outcomes with pricing and activity surfaced in a web and desktop
            experience built for repeat use.
          </li>
          <li>
            <strong>Pips and portfolio:</strong> Balance, positions, and movement of funds are centralized in the account
            hub so traders can operate with clarity.
          </li>
          <li>
            <strong>Automation:</strong> Markets are created and maintained through automated pipelines tied to
            real-world event feeds, reducing manual overhead while keeping the catalog fresh.
          </li>
          <li>
            <strong>Distribution:</strong> Browser-first experience plus a native desktop shell for users who want an
            app-like workflow without sacrificing the same underlying product.
          </li>
        </ul>

        <h2>Go-to-market and positioning</h2>
        <p>
          {BRAND_DESCRIPTION} The platform emphasizes peer-to-peer trading dynamics, responsible participation, and
          practical tooling (documentation, activity history, optional alerts) for engaged users rather than casual
          novelty betting alone.
        </p>

        <h2>Operating priorities</h2>
        <ul>
          <li><strong>Reliability:</strong> Stable trading flows, clear error handling, and observable automation status.</li>
          <li><strong>Trust:</strong> Published terms and privacy commitments aligned with how accounts and data are handled.</li>
          <li><strong>Growth:</strong> Expand market coverage and liquidity while keeping onboarding understandable for new traders.</li>
        </ul>

        <h2>Risks and dependencies</h2>
        <p>
          Like any trading venue, outcomes depend on oracle and resolution processes, liquidity, regulatory context in
          each jurisdiction, and third-party integrations (including blockchain and payment paths). Mitigation focuses on
          transparent rules, engineering rigor, and conservative feature rollout.
        </p>

        <p>
          <Link to="/">Return to markets</Link>
        </p>
      </div>
    </div>
  )
}
