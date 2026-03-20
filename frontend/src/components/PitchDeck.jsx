import { BRAND_NAME } from '../constants/brand'
import './PitchDeck.css'

/**
 * Executive summary / pitch deck for potential investors.
 * Not linked from the main website - direct URL access only.
 */
export default function PitchDeck() {
  return (
    <div className="pitch-deck">
      <div className="pitch-deck__container">
        <header className="pitch-deck__header">
          <img src="/logo.svg" alt="" className="pitch-deck__logo" width={64} height={64} />
          <h1 className="pitch-deck__title">{BRAND_NAME}</h1>
          <p className="pitch-deck__subtitle">Executive Summary & Investment Opportunity</p>
        </header>

        <section className="pitch-deck__section">
          <h2 className="pitch-deck__section-title">Investment Overview</h2>
          <div className="pitch-deck__grid">
            <div className="pitch-deck__card">
              <h3 className="pitch-deck__card-title">Amount Raising</h3>
              <p className="pitch-deck__card-value">$500,000 - $1,000,000</p>
              <p className="pitch-deck__card-desc">
                Seed round to accelerate platform development, expand market reach, and build strategic partnerships.
              </p>
            </div>
            <div className="pitch-deck__card">
              <h3 className="pitch-deck__card-title">Valuation</h3>
              <p className="pitch-deck__card-value">$5M - $8M</p>
              <p className="pitch-deck__card-desc">
                Pre-money valuation based on traction, market opportunity, and comparable platforms.
              </p>
            </div>
            <div className="pitch-deck__card">
              <h3 className="pitch-deck__card-title">Equity Allocation</h3>
              <p className="pitch-deck__card-value">10% - 20%</p>
              <p className="pitch-deck__card-desc">
                Equity stake available based on investment amount and strategic value.
              </p>
            </div>
          </div>
        </section>

        <section className="pitch-deck__section">
          <h2 className="pitch-deck__section-title">What Supporters Receive</h2>
          <div className="pitch-deck__benefits">
            <div className="pitch-deck__benefit">
              <div className="pitch-deck__benefit-icon">📈</div>
              <div>
                <h3 className="pitch-deck__benefit-title">Equity Stake</h3>
                <p className="pitch-deck__benefit-desc">
                  Direct ownership in the company with potential for significant returns as the platform scales.
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
                <h3 className="pitch-deck__benefit-title">Platform Credits</h3>
                <p className="pitch-deck__benefit-desc">
                  Significant platform credits (Pips) for trading and market creation, plus reduced fees.
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
              {BRAND_NAME} is a next-generation prediction market platform that democratizes access to trading on real-world outcomes. 
              Users can deposit via crypto or card, trade on sports, global events, tech trends, and more, then withdraw earnings seamlessly.
            </p>

            <h3 className="pitch-deck__content-title">Key Differentiators</h3>
            <ul className="pitch-deck__list">
              <li>
                <strong>Fiat & Crypto Support:</strong> Deposit with credit card or cryptocurrency, lowering entry barriers
              </li>
              <li>
                <strong>Automated Markets:</strong> AI-powered market creation for sports, news, weather, and trending topics
              </li>
              <li>
                <strong>Desktop Application:</strong> Native desktop app with auto-updates, providing a professional trading experience
              </li>
              <li>
                <strong>User-Created Markets:</strong> Community-driven market creation for niche events and interests
              </li>
              <li>
                <strong>Virtual Balance System:</strong> "Pips" credits system for easy onboarding without immediate crypto setup
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
          <h2 className="pitch-deck__section-title">Next Steps</h2>
          <div className="pitch-deck__contact">
            <p className="pitch-deck__contact-text">
              Interested in learning more or discussing investment opportunities?
            </p>
            <p className="pitch-deck__contact-email">
              Contact: <a href="mailto:investors@dice.express">investors@dice.express</a>
            </p>
          </div>
        </section>

        <footer className="pitch-deck__footer">
          <p className="pitch-deck__footer-text">
            This document is confidential and intended solely for the use of the individual or entity to whom it is addressed.
          </p>
        </footer>
      </div>
    </div>
  )
}
