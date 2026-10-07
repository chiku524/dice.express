import { Navigate } from 'react-router-dom'

/** Activity lives on Portfolio → Activity tab. Keep /activity as a stable redirect. */
export default function Activity() {
  return <Navigate to="/portfolio?tab=activity" replace />
}
