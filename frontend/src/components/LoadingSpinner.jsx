import LoadingDiceProgress from './LoadingDiceProgress'

/**
 * Full-width loading block for Suspense and full-page waits.
 * @param {string} [message]
 * @param {string} [sublabel]
 * @param {number | null} [progress] - optional 0–100 determinate bar
 * @param {string[] | false | null} [progressSteps] - rotating status lines; false/[] to hide
 * @param {boolean} [showProgressBar=true]
 * @param {'xs'|'sm'|'md'|'lg'} [size='md']
 */
export default function LoadingSpinner({
  message = 'Loading...',
  sublabel,
  progress = null,
  progressSteps,
  showProgressBar = true,
  size = 'md',
}) {
  return (
    <div className="loading">
      <LoadingDiceProgress
        message={message}
        sublabel={sublabel}
        progress={progress}
        progressSteps={progressSteps}
        showProgressBar={showProgressBar}
        size={size}
      />
    </div>
  )
}
