import MultiDiceLoader from './MultiDiceLoader'

/** Full-width loading block for Suspense and full-page waits. */
export default function LoadingSpinner({ message = 'Loading...', sublabel }) {
  return (
    <div className="loading">
      <MultiDiceLoader size="md" label={message} sublabel={sublabel} />
    </div>
  )
}
