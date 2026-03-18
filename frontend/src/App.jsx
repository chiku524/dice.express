import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { WalletProvider, useWallet } from './contexts/WalletContext'
import { Suspense } from 'react'
import LoadingSpinner from './components/LoadingSpinner'
import { lazyWithRetry } from './utils/lazyWithRetry'

// Lazy load components for code splitting with retry logic
const MarketsList = lazyWithRetry(() => import('./components/MarketsList'))
const MarketDetail = lazyWithRetry(() => import('./components/MarketDetail'))
const AutomatedMarketsInfo = lazyWithRetry(() => import('./components/AutomatedMarketsInfo'))
const WalletConnect = lazyWithRetry(() => import('./components/WalletConnect'))
const Portfolio = lazyWithRetry(() => import('./components/Portfolio'))
const Documentation = lazyWithRetry(() => import('./components/Documentation'))
const AdminDashboard = lazyWithRetry(() => import('./components/AdminDashboard'))
const ContractHistory = lazyWithRetry(() => import('./components/ContractHistory'))
const Dashboard = lazyWithRetry(() => import('./components/Dashboard'))
const Profile = lazyWithRetry(() => import('./components/Profile'))
const SignIn = lazyWithRetry(() => import('./components/SignIn'))
const Register = lazyWithRetry(() => import('./components/Register'))
const PrivacyPolicy = lazyWithRetry(() => import('./components/PrivacyPolicy'))
const TermsOfService = lazyWithRetry(() => import('./components/TermsOfService'))
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
import { Web3WalletProvider } from './contexts/Web3WalletContext'
import ProtectedRoute from './components/ProtectedRoute'
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
        <Navbar setShowWalletModal={setShowWalletModal} />

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
                  <Route path="/sign-in" element={<SignIn />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/account" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/create" element={<AutomatedMarketsInfo />} />
                  <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/history" element={<ContractHistory />} />
                  <Route path="/docs" element={<Documentation />} />
                  <Route path="/documentation" element={<Documentation />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
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
            <Web3WalletProvider>
              <AppContent />
            </Web3WalletProvider>
          </WalletProvider>
        </ToastProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App

