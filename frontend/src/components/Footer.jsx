import { Link } from 'react-router-dom'
import { BRAND_COPYRIGHT, BRAND_TECH } from '../constants/brand'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="app-footer" role="contentinfo">
      <div className="footer-container">
        <div className="footer-content">
          <nav className="footer-section" aria-label="Discover">
            <span className="footer-heading">Discover</span>
            <ul className="footer-links">
              <li><Link to="/">All Markets</Link></li>
              <li><Link to="/create">Create Market</Link></li>
              <li><Link to="/portfolio">Portfolio</Link></li>
            </ul>
          </nav>
          <nav className="footer-section" aria-label="Platform">
            <span className="footer-heading">Platform</span>
            <ul className="footer-links">
              <li><Link to="/docs">Docs</Link></li>
              <li><Link to="/docs#amm">AMM &amp; Fees</Link></li>
              <li><Link to="/admin">Admin</Link></li>
              <li><Link to="/history">Activity</Link></li>
            </ul>
          </nav>
          <div className="footer-section footer-about">
            <span className="footer-heading">About</span>
            <p>Virtual Credits. No blockchain or crypto required.</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} {BRAND_COPYRIGHT}</p>
          <span className="footer-tech">{BRAND_TECH}</span>
        </div>
      </div>
    </footer>
  )
}
