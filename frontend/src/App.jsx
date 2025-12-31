import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useLedger } from './hooks/useLedger'
import { WalletProvider, useWallet } from './contexts/WalletContext'
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
const ContractHistory = lazy(() => import('./components/ContractHistory'))
import { analytics } from './utils/analytics'
import ConnectionStatus from './components/ConnectionStatus'
import ApiStatusBanner from './components/ApiStatusBanner'
import AnimatedBackground from './components/AnimatedBackground'
import WalletModal from './components/WalletModal'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
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

function AppContent() {
  const { ledger, isConnected } = useLedger()
  const { wallet, connectWallet, disconnectWallet } = useWallet()
  const [showWalletModal, setShowWalletModal] = useState(false)

  return (
    <>
      <PageViewTracker />
      <AnimatedBackground />
      <ApiStatusBanner />
      <div className="app">
        <Navbar 
          showWalletModal={showWalletModal}
          setShowWalletModal={setShowWalletModal}
        />

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
                    <Route path="/history" element={<ContractHistory />} />
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
    </>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <WalletProvider>
          <AppContent />
        </WalletProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App

