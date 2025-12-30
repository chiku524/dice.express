import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useLedger } from './hooks/useLedger'
import { useWallet } from './hooks/useWallet'
import { lazy, Suspense } from 'react'
import LoadingSpinner from './components/LoadingSpinner'

// Lazy load components for code splitting
const MarketsList = lazy(() => import('./components/MarketsList'))
const MarketDetail = lazy(() => import('./components/MarketDetail'))
const CreateMarket = lazy(() => import('./components/CreateMarket'))
const WalletConnect = lazy(() => import('./components/WalletConnect'))
const Portfolio = lazy(() => import('./components/Portfolio'))
const ContractTester = lazy(() => import('./components/ContractTester'))
const AdminDashboard = lazy(() => import('./components/AdminDashboard'))
import { analytics } from './utils/analytics'
import ConnectionStatus from './components/ConnectionStatus'
import ApiStatusBanner from './components/ApiStatusBanner'
import AnimatedBackground from './components/AnimatedBackground'
import WalletModal from './components/WalletModal'
import './App.css'

// Component to track page views
// Memoized to prevent unnecessary re-renders
function PageViewTracker() {
  const location = useLocation()
  const lastPathRef = useRef('')
  
  useEffect(() => {
    // Only track if pathname actually changed
    if (location.pathname !== lastPathRef.current) {
      lastPathRef.current = location.pathname
      // Debounce analytics to prevent rapid-fire events
      const timeoutId = setTimeout(() => {
        analytics.trackPageView(location.pathname)
      }, 100)
      
      return () => clearTimeout(timeoutId)
    }
  }, [location.pathname]) // Only depend on pathname, not entire location object
  
  return null
}

function App() {
  const { ledger, isConnected } = useLedger()
  const { wallet, connectWallet, disconnectWallet } = useWallet()
  const [showWalletModal, setShowWalletModal] = useState(false)

      return (
        <Router>
          <PageViewTracker />
          <AnimatedBackground />
          <ApiStatusBanner />
          <div className="app">
        <header className="app-header">
          <div className="container">
            <Link to="/" className="logo">
              <h1>Canton Prediction Markets</h1>
            </Link>
            <nav>
              <Link to="/">Markets</Link>
              <Link to="/create">Create Market</Link>
              <Link to="/portfolio">Portfolio</Link>
              <Link to="/admin">Admin</Link>
              <Link to="/test" style={{ 
                background: '#646cff', 
                padding: '0.5rem 1rem', 
                borderRadius: '4px',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                🧪 Test
              </Link>
              {wallet ? (
                <div className="wallet-info">
                  <span>{wallet.party.substring(0, 20)}...</span>
                  <button onClick={() => setShowWalletModal(true)}>Wallet</button>
                  <button onClick={disconnectWallet}>Disconnect</button>
                </div>
              ) : (
                <button onClick={() => setShowWalletModal(true)}>Connect Wallet</button>
              )}
            </nav>
          </div>
        </header>

        <main className="app-main">
          <div className="container">
            <Suspense fallback={<LoadingSpinner message="Loading..." />}>
              <Routes>
                <Route path="/test" element={<ContractTester />} />
                {!wallet ? (
                  <>
                    <Route path="*" element={<WalletConnect onConnect={connectWallet} />} />
                  </>
                ) : (
                  <>
                    <Route path="/" element={<MarketsList />} />
                    <Route path="/market/:marketId" element={<MarketDetail />} />
                    <Route path="/create" element={<CreateMarket />} />
                    <Route path="/portfolio" element={<Portfolio />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                  </>
                )}
              </Routes>
            </Suspense>
          </div>
        </main>
        <ConnectionStatus />
        
        <WalletModal 
          isOpen={showWalletModal} 
          onClose={() => setShowWalletModal(false)} 
        />
      </div>
    </Router>
  )
}

export default App

