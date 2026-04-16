import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BRAND_NAME } from '../constants/brand'
import {
  WHITEPAPER_PATH,
  WHITEPAPER_SECTIONS,
  whitepaperHashToSectionId,
} from '../constants/whitepaperSections'
import './Documentation.css'
import './Whitepaper.css'

function hashForWhitepaper(location) {
  const router = location.hash || ''
  const win = typeof window !== 'undefined' ? window.location.hash || '' : ''
  if (router.length > 1) return router
  return win
}

function isTauriShell() {
  return typeof window !== 'undefined' && !!window.__TAURI__
}

export default function Whitepaper() {
  const location = useLocation()
  const navigate = useNavigate()
  const mainRef = useRef(null)
  const tauriShell = isTauriShell()
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window === 'undefined') return 'abstract'
    return whitepaperHashToSectionId(window.location.hash)
  })

  useLayoutEffect(() => {
    setActiveSection(whitepaperHashToSectionId(hashForWhitepaper(location)))
  }, [location])

  useEffect(() => {
    const syncFromWindow = () => {
      setActiveSection(whitepaperHashToSectionId(window.location.hash))
    }
    window.addEventListener('hashchange', syncFromWindow)
    window.addEventListener('popstate', syncFromWindow)
    return () => {
      window.removeEventListener('hashchange', syncFromWindow)
      window.removeEventListener('popstate', syncFromWindow)
    }
  }, [])

  useLayoutEffect(() => {
    mainRef.current?.scrollTo(0, 0)
    window.scrollTo(0, 0)
  }, [activeSection])

  const selectSection = (sectionId) => {
    navigate({ pathname: WHITEPAPER_PATH, hash: `#${sectionId}` })
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'abstract':
        return <AbstractContent />
      case 'introduction':
        return <IntroductionContent />
      case 'pips-economy':
        return <PipsEconomyContent />
      case 'markets-resolution':
        return <MarketsResolutionContent />
      case 'trading':
        return <TradingContent />
      case 'automation':
        return <AutomationContent />
      case 'architecture':
        return <ArchitectureContent />
      case 'security':
        return <SecurityContent />
      case 'governance':
        return <GovernanceContent />
      case 'risks':
        return <RisksContent />
      case 'glossary':
        return <GlossaryContent />
      default:
        return <AbstractContent />
    }
  }

  return (
    <div className="docs-page">
      <div className="docs-layout">
        <nav className="docs-toc" aria-label="Whitepaper table of contents">
          <h2 className="docs-toc-title">Contents</h2>
          <ul className="docs-toc-list">
            {WHITEPAPER_SECTIONS.map((section) => {
              const isCurrent = activeSection === section.id
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    className={`docs-toc-link${isCurrent ? ' docs-toc-link--active' : ''}`}
                    aria-current={isCurrent ? 'location' : undefined}
                    onClick={() => selectSection(section.id)}
                  >
                    {section.title}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        <main ref={mainRef} className="docs-main" role="region" aria-label="Whitepaper content">
          {tauriShell && (
            <div className="whitepaper-tauri-jump">
              <label htmlFor="whitepaper-section-select">Section</label>
              <select
                id="whitepaper-section-select"
                value={activeSection}
                onChange={(e) => selectSection(e.target.value)}
              >
                {WHITEPAPER_SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <p className="docs-nav-hint">
            {tauriShell ? (
              <>
                Use the <strong>Section</strong> dropdown above to move between chapters (the desktop shell hides the
                left column table of contents used on web).
              </>
            ) : (
              <>
                Use <strong>Contents</strong> or the site <strong>Resources → Whitepaper</strong> link. Deep links use{' '}
                <code>#section-id</code> (for example <code>#architecture</code>).
              </>
            )}
          </p>
          <div className="docs-content-inner">{renderContent()}</div>
        </main>
      </div>
    </div>
  )
}

function AbstractContent() {
  return (
    <div className="doc-section">
      <h1>{BRAND_NAME} whitepaper</h1>
      <p className="text-secondary">
        Version 1.0 · Living document · Last updated April 2026
      </p>

      <h2>Abstract</h2>
      <p>
        {BRAND_NAME} is a prediction markets platform that lets participants trade on real-world outcomes using{' '}
        <strong>Pips</strong>, an in-platform accounting unit designed for transparent pricing and settlement. Markets
        are listed continuously from automated data pipelines (sports, weather, macro, news, science, politics, and
        related domains) alongside user-visible discovery and trading surfaces on the web and in a native desktop
        shell.
      </p>
      <p>
        This whitepaper summarizes the product model, economic framing of Pips, market lifecycle and resolution,
        trading modes, systems architecture at a high level, and explicit risks. It is not legal or investment advice;
        jurisdictional availability, fees, and rules of use are defined in the Terms of Service and operational
        configuration of each deployment.
      </p>
    </div>
  )
}

function IntroductionContent() {
  return (
    <div className="doc-section">
      <h1>Introduction</h1>
      <p>
        Prediction markets aggregate dispersed information into prices. {BRAND_NAME} targets a practical middle ground:
        retail-accessible UX, API-driven automation so catalogs stay current, and conservative platform choices around
        liquidity and settlement that can be documented and observed.
      </p>
      <h2>Goals</h2>
      <ul>
        <li><strong>Transparency:</strong> Clear criteria for resolution, visible market metadata, and operator-facing automation status.</li>
        <li><strong>Accessibility:</strong> Account-based onboarding, optional crypto rails for funding, and discoverable categories.</li>
        <li><strong>Resilience:</strong> Stateless edge APIs, durable storage for authoritative records, and rate limits where appropriate.</li>
      </ul>
      <h2>Non-goals</h2>
      <ul>
        <li>On-chain settlement of every trade (the product is not a generic L2 DEX whitepaper).</li>
        <li>Unrestricted user-authored market creation without review (public builders are out of scope for this document).</li>
      </ul>
    </div>
  )
}

function PipsEconomyContent() {
  return (
    <div className="doc-section">
      <h1>Pips &amp; economy</h1>
      <p>
        <strong>Pips (PP)</strong> are the platform&apos;s internal unit for quoting balances, trades, and fees. Display
        conventions treat 1 PP as equivalent to one USD for user-facing labels; actual regulatory classification of
        Pips depends on deployment and jurisdiction.
      </p>
      <h2>Funding and withdrawal</h2>
      <p>
        Users may credit Pips through supported crypto deposit flows. Withdrawals convert Pips back to crypto subject
        to published fees, minimums, and fraud controls. The implementation uses server-side verification of deposits
        and auditable ledger-style updates for balances where the API exposes them.
      </p>
      <h2>Fees</h2>
      <p>
        Trading fees (AMM and/or limit-order flows), withdrawal fees, and any promotional mechanics are configured at
        the deployment layer. The documentation describes current defaults; this whitepaper stays descriptive rather
        than prescriptive on exact basis points.
      </p>
    </div>
  )
}

function MarketsResolutionContent() {
  return (
    <div className="doc-section">
      <h1>Markets &amp; resolution</h1>
      <p>
        Markets are typically <strong>binary</strong> (Yes/No) or <strong>multi-outcome</strong> where the product
        supports them. Each market carries structured metadata: title, description, resolution deadline, oracle hints,
        and provenance linking back to the feed or operator configuration used at creation time.
      </p>
      <h2>Lifecycle</h2>
      <ol>
        <li><strong>Seeding:</strong> Automated jobs or privileged operators create approved market records.</li>
        <li><strong>Trading:</strong> While status is active and before resolution, eligible users trade within policy.</li>
        <li><strong>Resolution:</strong> Outcomes are determined by oracle pipelines, manual operator steps where configured, or hybrid flows.</li>
        <li><strong>Settlement:</strong> Positions and pools are updated; user-visible history reflects final states.</li>
      </ol>
      <h2>Oracle philosophy</h2>
      <p>
        Where possible, resolution re-fetches the same public or licensed API surface documented at market creation,
        with deterministic thresholds (counts, price crosses, headline token overlap, etc.). Operator-manual markets
        exist for edge cases but are labeled accordingly in the product.
      </p>
    </div>
  )
}

function TradingContent() {
  return (
    <div className="doc-section">
      <h1>Trading &amp; liquidity</h1>
      <p>
        The platform may expose <strong>AMM</strong> pool trading for immediate execution and/or <strong>limit
        orders</strong> for peer-to-peer matching, depending on feature flags and risk posture per deployment. When AMM
        inventory is disabled or constrained, limit-order flow remains the primary way to express prices.
      </p>
      <h2>Open interest</h2>
      <p>
        Resting orders and pool inventory are tracked server-side. Discover views can sort by activity so traders see
        where matching is more likely. Nothing in this document guarantees minimum liquidity.
      </p>
    </div>
  )
}

function AutomationContent() {
  return (
    <div className="doc-section">
      <h1>Automation &amp; feeds</h1>
      <p>
        Automated market creation pulls candidate events from external providers (sports odds, weather APIs, market
        data vendors, news aggregators, government open data, etc.). Dedupe and embedding-based similarity checks reduce
        duplicate questions. Rate limits and idempotency protect upstream APIs and the operator database.
      </p>
      <h2>Observability</h2>
      <p>
        The Automation status screen surfaces recent job health where enabled, aligning operator expectations with what
        traders see in Discover.
      </p>
    </div>
  )
}

function ArchitectureContent() {
  return (
    <div className="doc-section">
      <h1>Architecture</h1>
      <p>
        The production footprint described in repository documentation centers on <strong>Cloudflare Pages</strong> for
        static assets and edge functions, <strong>D1</strong> for relational data, optional <strong>KV</strong> for
        cache and rate limiting, <strong>R2</strong> for object storage, and <strong>Workers</strong> for API routing.
        The web client is a React single-page application; the desktop client embeds the same bundle in a Tauri shell.
      </p>
      <h2>APIs</h2>
      <p>
        HTTP JSON APIs cover markets, pools, orders, accounts, deposits, withdrawals, and maintenance tasks protected
        by secrets where mutating. See the in-app <strong>Documentation → API reference</strong> for paths and
        examples.
      </p>
    </div>
  )
}

function SecurityContent() {
  return (
    <div className="doc-section">
      <h1>Security &amp; trust</h1>
      <ul>
        <li><strong>Transport:</strong> TLS for browser and API traffic.</li>
        <li><strong>Authentication:</strong> Account sessions for registered users; signed messages or monitored addresses for certain crypto flows.</li>
        <li><strong>Authorization:</strong> Privileged routes require operator secrets; cron and maintenance endpoints are not anonymously callable.</li>
        <li><strong>Data minimization:</strong> Collect what is needed to operate markets and meet compliance; refer to the Privacy Policy.</li>
      </ul>
      <p>
        Security is process plus code: dependency updates, logging, and incident response are expected of any operator
        running this stack in production.
      </p>
    </div>
  )
}

function GovernanceContent() {
  return (
    <div className="doc-section">
      <h1>Governance &amp; roadmap</h1>
      <p>
        Day-to-day parameter changes (fees, feature flags, feed enablement) are <strong>operator governance</strong>, not
        on-chain token voting in the baseline product. Roadmap items include broader market coverage, liquidity tooling,
        and continued hardening of resolution paths; see Documentation → Roadmap for a product-facing list.
      </p>
    </div>
  )
}

function RisksContent() {
  return (
    <div className="doc-section">
      <h1>Risks &amp; limitations</h1>
      <ul>
        <li><strong>Oracle / feed risk:</strong> Bad data, API outages, or specification ambiguity can delay or dispute resolution.</li>
        <li><strong>Liquidity risk:</strong> Thin books widen spreads and may prevent exit at desired prices.</li>
        <li><strong>Regulatory risk:</strong> Prediction markets face uneven treatment globally; users must self-assess legality.</li>
        <li><strong>Smart-contract / custody risk:</strong> Where crypto is used, standard wallet and chain risks apply.</li>
        <li><strong>Platform credit risk:</strong> Pips are platform-ledger obligations, not on-chain assets in the default model.</li>
      </ul>
    </div>
  )
}

function GlossaryContent() {
  return (
    <div className="doc-section">
      <h1>Glossary</h1>
      <dl>
        <dt><strong>AMM</strong></dt>
        <dd>Automated market maker — pool-based pricing curve for instant trades.</dd>
        <dt><strong>Limit order</strong></dt>
        <dd>Resting instruction to buy or sell at a stated price; matched against counterparties.</dd>
        <dt><strong>Oracle</strong></dt>
        <dd>Mechanism that fetches or accepts evidence to set the resolved outcome.</dd>
        <dt><strong>Pips (PP)</strong></dt>
        <dd>In-platform accounting unit for trading and balances.</dd>
        <dt><strong>Resolution deadline</strong></dt>
        <dd>Time after which the market is eligible for resolution logic, subject to rules.</dd>
      </dl>
    </div>
  )
}
