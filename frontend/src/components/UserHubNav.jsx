import { Link, useLocation } from 'react-router-dom'
import './UserHubNav.css'

const TABS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/portfolio', label: 'Portfolio' },
  { path: '/watchlist', label: 'Watchlist' },
  { path: '/profile', label: 'Profile' },
]

export default function UserHubNav() {
  const location = useLocation()

  return (
    <nav className="user-hub-nav" aria-label="Your account">
      <div className="user-hub-nav-inner">
        {TABS.map(({ path, label }) => {
          const isActive = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`user-hub-tab ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
