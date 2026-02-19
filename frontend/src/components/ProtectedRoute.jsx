import { Navigate, useLocation } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'

/**
 * Wraps content that requires an authenticated (connected) user.
 * Redirects to /sign-in when not connected, preserving the intended destination.
 */
export default function ProtectedRoute({ children }) {
  const { wallet } = useWallet()
  const location = useLocation()

  if (!wallet) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />
  }

  return children
}
