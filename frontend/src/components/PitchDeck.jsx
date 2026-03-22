import { useLocation } from 'react-router-dom'
import { BRAND_NAME } from '../constants/brand'
import './PitchDeck.css'

const CYRENEAI_LAUNCH_URL = 'https://cyreneai.com/launch'

/** Indicative pre-money valuation in USD (pre-revenue; for discussion only). */
const PRE_MONEY_VALUATION_USD_LABEL = '$5,000,000 – $8,000,000 USD'

/**
 * Executive summary / pitch for supporters — aligned with the CyreneAI (Solana) launch.
 * Routes: /pitch, /investors (same content; subtitle varies slightly).
 */
export default function PitchDeck() {
  const { pathname } = useLocation()
  const isInvestorsRoute = pathname === '/investors'

  return (
    <div className="pitch-deck">
      <div className="pitch-deck__container">
        <header className="pitch-deck__header">
          <img src="/logo.svg" alt="" className="pitch-deck__logo" width={64} height={64} />
          <h1 className="pitch-deck__title">{BRAND_NAME}</h1>
          <p className="pitch-deck__subtitle">
            {isInvestorsRoute
              ? 'Investor brief — participate via CyreneAI on Solana'
              : 'Executive summary & tokenized fundraise (CyreneAI)'}
          </p>
          <div className="pitch-deck__header-cta">
            <a
              className="pitch-deck__cta pitch-deck__cta--primary"
              href={CYRENEAI_LAUNCH_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open CyreneAI launch
            </a>
            <span className="pitch-deck__header-cta-note">
              Connect a wallet on CyreneAI to view launch terms, allocation, and vesting.
            </span>
          </div>
        </header>

        <section className="pitch-deck__section">
          <h2 className="pitch-deck__section-title">Fundraise overview</h2>
          <div className="pitch-deck__grid">
            <div className="pitch-deck__card">
              <h3 className="pitch-deck__card-title">Target raise</h3>
              <p className="pitch-deck__card-value">$500,000 – $1,000,000</p>
              <p className="pitch-deck__card-desc">
                Capital to accelerate product development, distribution, and infrastructure ahead of broader go-to-market.
              </p>
            </div>
            <div className="pitch-deck__card">
              <h3 className="pitch-deck__card-title">Pre-money valuation (USD)</h3>
              <p className="pitch-deck__card-value">{PRE_MONEY_VALUATION_USD_LABEL}</p>
              <p className="pitch-deck__card-desc">
                Indicative pre-money range for this round while the company is <strong>pre-revenue</strong>. Not audited;
                final economics may differ and should match CyreneAI launch terms and any parallel cap-table agreements.
              </p>
            </div>
            <div className="pitch-deck__card">
              <h3 className="pitch-deck__card-title">Launch platform</h3>
              <p className="pitch-deck__card-value">CyreneAI</p>
              <p className="pitch-deck__card-desc">
                Tokenized capital infrastructure on Solana — transparent fundraising, community participation, and
                on-chain workflows (see CyreneAI for the live instrument and mechanics).
              </p>
            </div>
            <div className="pitch-deck__card">
              <h3 className="pitch-deck__card-title">Instrument</h3>
              <p className="pitch-deck__card-value">On-chain (Solana)</p>
              <p className="pitch-deck__card-desc">
                Exact supply, pricing, vesting, and eligibility are defined on the CyreneAI launch — not on this page.
                In-app <strong>Pips</strong> are platform credits for trading; they are separate from any launch token.
              </p>
            </div>
          </div>
        </section>

        <section className="pitch-deck__section">
          <h2 className="pitch-deck__section-title">What supporters may receive</h2>
          <p className="pitch-deck__section-lead">
            Benefits depend on the CyreneAI launch configuration. The list below is illustrative; binding terms appear only
            on CyreneAI and related offering materials.
          </p>
          <div className="pitch-deck__benefits">
            <div className="pitch-deck__benefit">
              <div className="pitch-deck__benefit-icon">⛓️</div>
              <div>
                <h3 className="pitch-deck__benefit-title">On-chain participation</h3>
                <p className="pitch-deck__benefit-desc">
                  Wallet-based participation in the fundraise on Solana via CyreneAI&apos;s launch and liquidity
                  infrastructure (e.g. vesting and discovery as offered for your project).
                </p>
              </div>
            </div>
            <div className="pitch-deck__benefit">
              <div className="pitch-deck__benefit-icon">🎯</div>
              <div>
                <h3 className="pitch-deck__benefit-title">Strategic Input</h3>
                <p className="pitch-deck__benefit-desc">
                  Advisory role in product direction, market expansion, and partnership opportunities.
                </p>
              </div>
            </div>
            <div className="pitch-deck__benefit">
              <div className="pitch-deck__benefit-icon">🚀</div>
              <div>
                <h3 className="pitch-deck__benefit-title">Early Access</h3>
                <p className="pitch-deck__benefit-desc">
                  Priority access to new features, beta testing, and exclusive market opportunities.
                </p>
              </div>
            </div>
            <div className="pitch-deck__benefit">
              <div className="pitch-deck__benefit-icon">💎</div>
              <div>
                <h3 className="pitch-deck__benefit-title">Pips (in-app)</h3>
                <p className="pitch-deck__benefit-desc">
                  Where offered as part of the relationship, Pips are <strong>in-platform credits</strong> for trading on{' '}
                  {BRAND_NAME} — not the same asset as the CyreneAI launch token unless explicitly stated in the official
                  terms.
                </p>
              </div>
            </div>
            <div className="pitch-deck__benefit">
              <div className="pitch-deck__benefit-icon">🤝</div>
              <div>
                <h3 className="pitch-deck__benefit-title">Network Access</h3>
                <p className="pitch-deck__benefit-desc">
                  Connections to other investors, industry leaders, and potential strategic partners.
                </p>
              </div>
            </div>
            <div className="pitch-deck__benefit">
              <div className="pitch-deck__benefit-icon">📊</div>
              <div>
                <h3 className="pitch-deck__benefit-title">Regular Updates</h3>
                <p className="pitch-deck__benefit-desc">
                  Quarterly reports on metrics, milestones, and strategic initiatives.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="pitch-deck__section">
          <h2 className="pitch-deck__section-title">Use Case & Market Opportunity</h2>
          <div className="pitch-deck__content">
            <h3 className="pitch-deck__content-title">The Problem</h3>
            <p className="pitch-deck__content-text">
              Traditional prediction markets are complex, require cryptocurrency expertise, and have high barriers to entry. 
              Most platforms lack real-world event coverage and user-friendly interfaces, limiting mainstream adoption.
            </p>

            <h3 className="pitch-deck__content-title">Our Solution</h3>
            <p className="pitch-deck__content-text">
              {BRAND_NAME} is a prediction market platform built for real-world outcomes: users fund with crypto, trade in{' '}
              <strong>Pips</strong> (platform credits), and can withdraw subject to fees. Markets are powered by automated
              data sources and APIs; matching and liquidity include <strong>P2P</strong> order flow and an optional{' '}
              <strong>AMM</strong>, with the stack running on <strong>Cloudflare</strong> (Pages, D1, KV, R2) plus a{' '}
              <strong>Tauri</strong> desktop client.
            </p>

            <h3 className="pitch-deck__content-title">Key Differentiators</h3>
            <ul className="pitch-deck__list">
              <li>
                <strong>Virtual-first trading:</strong> Pips for positions and fees; blockchain used where it matters for
                moving value in and out
              </li>
              <li>
                <strong>Automated markets:</strong> Seeded from sports, news, weather, crypto, and other sources via API —
                scalable catalog without relying on casual user-created markets
              </li>
              <li>
                <strong>P2P + optional AMM:</strong> Order book matching alongside pool-style trading when enabled
              </li>
              <li>
                <strong>Edge-native stack:</strong> Fast global API and web app on Cloudflare; desktop app with updates for a
                focused trading experience
              </li>
              <li>
                <strong>Solana fundraise rail:</strong> Community and capital aligned through CyreneAI&apos;s tokenized
                infrastructure
              </li>
            </ul>

            <h3 className="pitch-deck__content-title">Market Opportunity</h3>
            <p className="pitch-deck__content-text">
              The global prediction market industry is projected to reach $XX billion by 2028, driven by increasing interest in 
              decentralized finance, sports betting regulation, and the gamification of financial markets. {BRAND_NAME} positions 
              itself at the intersection of DeFi, traditional betting, and social trading.
            </p>

            <h3 className="pitch-deck__content-title">Traction & Milestones</h3>
            <ul className="pitch-deck__list">
              <li>Platform live with core trading functionality</li>
              <li>Desktop application deployed (Windows, macOS, Linux)</li>
              <li>Automated market creation for multiple data sources</li>
              <li>User registration and virtual balance system operational</li>
              <li>Active development on advanced features and market expansion</li>
            </ul>
          </div>
        </section>

        <section className="pitch-deck__section">
          <h2 className="pitch-deck__section-title">Use of Funds</h2>
          <div className="pitch-deck__allocation">
            <div className="pitch-deck__allocation-item">
              <div className="pitch-deck__allocation-bar" style={{ width: '40%' }} />
              <div className="pitch-deck__allocation-label">
                <span>Product Development (40%)</span>
                <span>Feature expansion, mobile app, API development</span>
              </div>
            </div>
            <div className="pitch-deck__allocation-item">
              <div className="pitch-deck__allocation-bar" style={{ width: '30%' }} />
              <div className="pitch-deck__allocation-label">
                <span>Marketing & Growth (30%)</span>
                <span>User acquisition, partnerships, brand awareness</span>
              </div>
            </div>
            <div className="pitch-deck__allocation-item">
              <div className="pitch-deck__allocation-bar" style={{ width: '20%' }} />
              <div className="pitch-deck__allocation-label">
                <span>Operations & Infrastructure (20%)</span>
                <span>Cloud infrastructure, security, compliance</span>
              </div>
            </div>
            <div className="pitch-deck__allocation-item">
              <div className="pitch-deck__allocation-bar" style={{ width: '10%' }} />
              <div className="pitch-deck__allocation-label">
                <span>Team & Talent (10%)</span>
                <span>Key hires, advisors, legal</span>
              </div>
            </div>
          </div>
        </section>

        <section className="pitch-deck__section">
          <h2 className="pitch-deck__section-title">Next steps</h2>
          <div className="pitch-deck__contact">
            <p className="pitch-deck__contact-text">
              Review the live launch on CyreneAI (wallet required). For questions not covered there, reach out by email.
            </p>
            <div className="pitch-deck__cta-row">
              <a
                className="pitch-deck__cta pitch-deck__cta--primary"
                href={CYRENEAI_LAUNCH_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Participate on CyreneAI
              </a>
            </div>
            <p className="pitch-deck__contact-email">
              Contact: <a href="mailto:investors@dice.express">investors@dice.express</a>
            </p>
          </div>
        </section>

        <footer className="pitch-deck__footer">
          <p className="pitch-deck__footer-text">
            This page is for informational purposes only and is not investment, legal, or tax advice. Offering terms,
            eligibility, and risks are governed by CyreneAI and applicable law. This document is confidential and intended
            solely for the use of the individual or entity to whom it is addressed.
          </p>
        </footer>
      </div>
    </div>
  )
}
