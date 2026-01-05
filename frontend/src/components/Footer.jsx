import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Navigation</h3>
            <ul>
              <li><Link to="/">Markets</Link></li>
              <li><Link to="/create">Create Market</Link></li>
              <li><Link to="/portfolio">Portfolio</Link></li>
              <li><Link to="/admin">Admin Dashboard</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>Resources</h3>
            <ul>
              <li><Link to="/docs">Documentation</Link></li>
              <li><Link to="/test">Test Contracts</Link></li>
              <li><Link to="/history">Contract History</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>About</h3>
            <p>
              Prediction Markets platform built on Canton blockchain.
              Hybrid architecture with on-chain CC transfers and database-backed virtual tracking.
            </p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Canton Prediction Markets. All rights reserved.</p>
          <p className="footer-tech">
            Built with React, Canton, and Supabase
          </p>
        </div>
      </div>
    </footer>
  )
}
