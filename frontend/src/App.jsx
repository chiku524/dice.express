import { useState, useEffect, useRef } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
  Outlet,
} from 'react-router-dom'
import { WalletProvider, useWallet } from './contexts/WalletContext'
import { Suspense } from 'react'
import LoadingSpinner from './components/LoadingSpinner'
import { lazyWithRetry } from './utils/lazyWithRetry'

const MarketsList = lazyWithRetry(() => import('./components/MarketsList'))
const MarketDetail = lazyWithRetry(() => import('./components/MarketDetail'))
const AutomatedMarketsInfo = lazyWithRetry(() => import('./components/AutomatedMarketsInfo'))
const Portfolio = lazyWithRetry(() => import('./components/Portfolio'))
const Documentation = lazyWithRetry(() => import('./components/Documentation'))
const Activity = lazyWithRetry(() => import('./components/Activity'))
const Dashboard = lazyWithRetry(() => import('./components/Dashboard'))
const Profile = lazyWithRetry(() => import('./components/Profile'))
const SignIn = lazyWithRetry(() => import('./components/SignIn'))
const Register = lazyWithRetry(() => import('./components/Register'))
const SplashScreen = lazyWithRetry(() => import('./components/SplashScreen'))
const DesktopLaunch = lazyWithRetry(() => import('./components/DesktopLaunch'))
const Download = lazyWithRetry(() => import('./components/Download'))
const AutomationStatus = lazyWithRetry(() => import('./components/AutomationStatus'))
const PrivacyPolicy = lazyWithRetry(() => import('./components/PrivacyPolicy'))
const TermsOfService = lazyWithRetry(() => import('./components/TermsOfService'))
const ExecutiveSummary = lazyWithRetry(() => import('./components/ExecutiveSummary'))
import { analytics } from './utils/analytics'
import AnimatedBackground from './components/AnimatedBackground'
import WalletModal from './components/WalletModal'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import DesktopSidebar from './components/DesktopSidebar'
import TauriTrayBridge from './components/TauriTrayBridge'
import MarketAlertsPoller from './components/MarketAlertsPoller'
import PageSEO from './components/PageSEO'
import { ToastContainer } from './components/Toast'
import { ToastProvider, useToastContext } from './contexts/ToastContext'
import { AccountModalProvider } from './contexts/AccountModalContext'
import { Web3WalletProvider } from './contexts/Web3WalletContext'
import ProtectedRoute from './components/ProtectedRoute'
import './styles/theme.css'
import './App.css'
/* After App.css so .app--desktop-shell wins over .app { flex-direction: column } */
import './styles/desktop-app.css'

if (typeof document !== 'undefined' && typeof window !== 'undefined' && window.__TAURI__) {
  document.documentElement.classList.add('desktop-app')
} else if (typeof document !== 'undefined') {
  document.documentElement.classList.remove('desktop-app')
}

function isTauriApp() {
  return typeof window !== 'undefined' && window.__TAURI__
}

function PageViewTracker() {
  const location = useLocation()
  const lastPathRef = useRef('')

  useEffect(() => {
    if (location.pathname !== lastPathRef.current) {
      lastPathRef.current = location.pathname
      const timeoutId = setTimeout(() => {
        analytics.trackPageView(location.pathname)
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [location.pathname])

  return null
}

/** Redirects to sign-in when not authenticated; otherwise renders child routes. */
function RequireAuth() {
  const { wallet } = useWallet()
  const location = useLocation()
  if (!wallet) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />
  }
  return <Outlet />
}

/** Full-viewport shell for sign-in/register (no Navbar/Footer/sidebar). */
function AuthLayout({ children }) {
  return (
    <>
      <AnimatedBackground />
      <div className="app app--auth">
        <Suspense
          fallback={
            <LoadingSpinner
              message="Loading…"
              sublabel="Preparing this screen."
              progressSteps={['Rolling the dice…', 'Loading module…', 'Almost ready…']}
            />
          }
        >
          {children}
        </Suspense>
      </div>
    </>
  )
}

/** Web: top nav + footer. Tauri: left sidebar, no footer, route transitions. */
function RootLayout({ showWalletModal, setShowWalletModal }) {
  const isTauri = isTauriApp()
  const location = useLocation()

  const outlet = (
    <AccountModalProvider open={() => setShowWalletModal(true)}>
      <Suspense
        fallback={
          <LoadingSpinner
            message="Loading…"
            sublabel="Preparing this screen."
            progressSteps={['Rolling the dice…', 'Loading module…', 'Almost ready…']}
          />
        }
      >
        <div
          key={location.pathname}
          className={isTauri ? 'desktop-main-inner desktop-route-enter' : undefined}
        >
          <Outlet />
        </div>
      </Suspense>
    </AccountModalProvider>
  )

  if (isTauri) {
    return (
      <>
        {/* Same full-viewport backdrop as web; was missing here so desktop never showed it */}
        <AnimatedBackground />
        <div className="app app--desktop-shell">
          <DesktopSidebar />
          <main className="app-main-desktop">{outlet}</main>
          <WalletModal
            isOpen={showWalletModal}
            onClose={() => setShowWalletModal(false)}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <AnimatedBackground />
      <div className="app">
        <Navbar />
        <main className="app-main">
          <div className="container">{outlet}</div>
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

function AppContent() {
  const [showWalletModal, setShowWalletModal] = useState(false)
  const { toasts, removeToast } = useToastContext()
  const location = useLocation()
  const skipMarketingChrome =
    location.pathname === '/splashscreen' || location.pathname === '/launch'

  return (
    <>
      <PageViewTracker />
      {!skipMarketingChrome && <PageSEO />}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Routes>
        <Route
          path="/splashscreen"
          element={
            <div className="app app--frameless-shell">
              <Suspense fallback={null}>
                <SplashScreen />
              </Suspense>
            </div>
          }
        />
        <Route
          path="/launch"
          element={
            <div className="app app--frameless-shell">
              <Suspense fallback={null}>
                <DesktopLaunch />
              </Suspense>
            </div>
          }
        />
        <Route
          path="/sign-in"
          element={
            <AuthLayout>
              <SignIn />
            </AuthLayout>
          }
        />
        <Route
          path="/register"
          element={
            <AuthLayout>
              <Register />
            </AuthLayout>
          }
        />
        <Route element={<RequireAuth />}>
          <Route
            element={
              <RootLayout
                showWalletModal={showWalletModal}
                setShowWalletModal={setShowWalletModal}
              />
            }
          >
            <Route path="/" element={<MarketsList />} />
            <Route path="/discover/active" element={<MarketsList source="active" />} />
            <Route path="/discover/sports" element={<MarketsList source="sports" />} />
            <Route path="/discover/global-events" element={<MarketsList source="global_events" />} />
            <Route path="/discover/industry" element={<MarketsList source="industry" />} />
            <Route path="/discover/tech-ai" element={<MarketsList source="tech_ai" />} />
            <Route path="/discover/politics" element={<MarketsList source="politics" />} />
            <Route path="/discover/entertainment" element={<MarketsList source="entertainment" />} />
            <Route path="/discover/science" element={<MarketsList source="science" />} />
            <Route path="/discover/virtual-realities" element={<MarketsList source="virtual_realities" />} />
            <Route path="/discover/user" element={<MarketsList source="user" />} />
            <Route path="/watchlist" element={<MarketsList variant="watchlist" />} />
            <Route path="/market/:marketId" element={<MarketDetail />} />
            <Route path="/account" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
            <Route path="/create" element={<AutomatedMarketsInfo />} />
            <Route
              path="/automation"
              element={
                <Suspense
                  fallback={
                    <LoadingSpinner
                      message="Loading…"
                      sublabel="Opening automation status."
                      progressSteps={['Rolling the dice…', 'Loading module…', 'Almost ready…']}
                    />
                  }
                >
                  <AutomationStatus />
                </Suspense>
              }
            />
          <Route
            path="/portfolio"
            element={
              <ProtectedRoute>
                <Portfolio />
              </ProtectedRoute>
            }
          />
          <Route path="/admin" element={<Navigate to="/" replace />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/history" element={<Navigate to="/activity" replace />} />
          <Route path="/download" element={<Download />} />
          <Route path="/docs" element={<Documentation />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/executive-summary" element={<ExecutiveSummary />} />
          </Route>
        </Route>
      </Routes>
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
              <TauriTrayBridge />
              <MarketAlertsPoller />
              <AppContent />
            </Web3WalletProvider>
          </WalletProvider>
        </ToastProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
