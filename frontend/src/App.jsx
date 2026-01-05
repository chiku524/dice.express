import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { useLedger } from './hooks/useLedger'
import { WalletProvider, useWallet } from './contexts/WalletContext'
import { Suspense } from 'react'
import LoadingSpinner from './components/LoadingSpinner'
import { lazyWithRetry } from './utils/lazyWithRetry'

// Lazy load components for code splitting with retry logic
const MarketsList = lazyWithRetry(() => import('./components/MarketsList'))
const MarketDetail = lazyWithRetry(() => import('./components/MarketDetail'))
const CreateMarket = lazyWithRetry(() => import('./components/CreateMarket'))
const WalletConnect = lazyWithRetry(() => import('./components/WalletConnect'))
const Portfolio = lazyWithRetry(() => import('./components/Portfolio'))
const Documentation = lazyWithRetry(() => import('./components/Documentation'))
const ContractTester = lazyWithRetry(() => import('./components/ContractTester'))
const AdminDashboard = lazyWithRetry(() => import('./components/AdminDashboard'))
const ContractHistory = lazyWithRetry(() => import('./components/ContractHistory'))
const ActiveContractsTest = lazyWithRetry(() => import('./components/ActiveContractsTest'))
import { analytics } from './utils/analytics'
import ConnectionStatus from './components/ConnectionStatus'
import ApiStatusBanner from './components/ApiStatusBanner'
import AnimatedBackground from './components/AnimatedBackground'
import WalletModal from './components/WalletModal'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
// Import theme.css FIRST to ensure variables are available
import './styles/theme.css'
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
  const { toasts, removeToast } = useToast()

  // Global toast context (can be accessed via context if needed)
  useEffect(() => {
    window.showToast = (message, type, duration) => {
      // This will be replaced with a proper context provider
      console.log('Toast:', message, type)
    }
    return () => {
      delete window.showToast
    }
  }, [])

  return (
    <>
      <PageViewTracker />
      <AnimatedBackground />
      <ApiStatusBanner />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
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
                    <Route path="/docs" element={<Documentation />} />
                    <Route path="/documentation" element={<Documentation />} />
                    <Route path="/test-active-contracts" element={<ActiveContractsTest />} />
                  </>
                )}
              </Routes>
            </Suspense>
          </div>
        </main>
        <ConnectionStatus />
        <Footer />
        
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

