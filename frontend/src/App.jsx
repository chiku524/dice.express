import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
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
const AdminDashboard = lazyWithRetry(() => import('./components/AdminDashboard'))
const ContractHistory = lazyWithRetry(() => import('./components/ContractHistory'))
const Dashboard = lazyWithRetry(() => import('./components/Dashboard'))
const Profile = lazyWithRetry(() => import('./components/Profile'))
import { analytics } from './utils/analytics'
import AnimatedBackground from './components/AnimatedBackground'
import WalletModal from './components/WalletModal'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import PageSEO from './components/PageSEO'
import { ToastContainer } from './components/Toast'
import { ToastProvider, useToastContext } from './contexts/ToastContext'
import { AccountModalProvider } from './contexts/AccountModalContext'
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
  const { wallet, connectWallet } = useWallet()
  const [showWalletModal, setShowWalletModal] = useState(false)
  const { toasts, removeToast } = useToastContext()

  return (
    <>
      <PageViewTracker />
      <PageSEO />
      <AnimatedBackground />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="app">
        <Navbar
          showWalletModal={showWalletModal}
          setShowWalletModal={setShowWalletModal}
        />

        <main className="app-main">
          <div className="container">
            <AccountModalProvider open={() => setShowWalletModal(true)}>
              <Suspense fallback={<LoadingSpinner message="Loading..." />}>
                <Routes>
                  <Route path="/" element={<MarketsList />} />
                  <Route path="/discover/global-events" element={<MarketsList source="global_events" />} />
                  <Route path="/discover/industry" element={<MarketsList source="industry" />} />
                  <Route path="/discover/virtual-realities" element={<MarketsList source="virtual_realities" />} />
                  <Route path="/discover/user" element={<MarketsList source="user" />} />
                  <Route path="/market/:marketId" element={<MarketDetail />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/create" element={<CreateMarket />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/history" element={<ContractHistory />} />
                  <Route path="/docs" element={<Documentation />} />
                  <Route path="/documentation" element={<Documentation />} />
                </Routes>
              </Suspense>
            </AccountModalProvider>
          </div>
        </main>
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
        <ToastProvider>
          <WalletProvider>
            <AppContent />
          </WalletProvider>
        </ToastProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App

