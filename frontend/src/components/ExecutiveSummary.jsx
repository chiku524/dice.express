import { Link } from 'react-router-dom'
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_TAGLINE } from '../constants/brand'
import './LegalPage.css'

export default function ExecutiveSummary() {
  return (
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
  )
}
