import { Link } from 'react-router-dom'
import { BRAND_DESCRIPTION, BRAND_COPYRIGHT, BRAND_TECH } from '../constants/brand'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Discover</h3>
            <ul>
              <li><Link to="/">All Markets</Link></li>
              <li><Link to="/discover/global-events">Global Events</Link></li>
              <li><Link to="/discover/industry">Industry Topics</Link></li>
              <li><Link to="/discover/virtual-realities">Virtual Realities</Link></li>
              <li><Link to="/discover/user">User-Created</Link></li>
              <li><Link to="/create">Create Market</Link></li>
              <li><Link to="/portfolio">Portfolio</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>Platform</h3>
            <ul>
              <li><Link to="/docs">Documentation</Link></li>
              <li><Link to="/docs#amm">AMM &amp; Fees</Link></li>
              <li><Link to="/admin">Admin Dashboard</Link></li>
              <li><Link to="/history">Activity</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3>About</h3>
            <p>{BRAND_DESCRIPTION}</p>
            <p className="footer-about-note">
              Trade with virtual Credits. All activity is on-platform; no blockchain or crypto required.
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} {BRAND_COPYRIGHT}. All rights reserved.</p>
          <p className="footer-tech">{BRAND_TECH}</p>
        </div>
      </div>
    </footer>
  )
}
