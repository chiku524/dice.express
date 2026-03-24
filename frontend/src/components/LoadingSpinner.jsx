import DiceLoader from './DiceLoader'

/** Full-width loading block for Suspense and full-page waits. */
export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="loading">
      <DiceLoader size="md" label={message} />
    </div>
  )
}
