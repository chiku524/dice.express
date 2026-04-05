import { useEffect, useState } from 'react'
import MultiDiceLoader from './MultiDiceLoader'
import './LoadingDiceProgress.css'

const DEFAULT_STEPS = ['Rolling the dice…', 'Fetching data…', 'Almost ready…']

const STEP_INTERVAL_MS = 2400

function resolveSteps(progressSteps) {
  if (progressSteps === false || progressSteps === null) return null
  if (progressSteps === undefined) return DEFAULT_STEPS
  if (Array.isArray(progressSteps)) return progressSteps.length > 0 ? progressSteps : null
  return DEFAULT_STEPS
}

/** Stable key so inline `progressSteps={[...]}` from parents does not reset the step timer every render. */
function progressStepsContentKey(progressSteps) {
  if (progressSteps === false) return '0'
  if (progressSteps === null) return '1'
  if (progressSteps === undefined) return '2'
  if (Array.isArray(progressSteps)) return progressSteps.join('\u0001')
  return '3'
}

/**
 * Full-width loading: rolling dice + looping progress bar + optional rotating status lines.
 * @param {string} [message]
 * @param {string} [sublabel] - static line under message (optional)
 * @param {boolean} [showProgressBar=true]
 * @param {number | null} [progress] - 0–100 for determinate bar; null/undefined = indeterminate sweep
 * @param {string[] | false | null} [progressSteps] - cycle below copy; `false` or `[]` disables; default rotating hints
 * @param {'xs'|'sm'|'md'|'lg'} [size='md']
 */
export default function LoadingDiceProgress({
  message = 'Loading…',
  sublabel,
  showProgressBar = true,
  progress = null,
  progressSteps,
  size = 'md',
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const stepsKey = progressStepsContentKey(progressSteps)
  const steps = resolveSteps(progressSteps)
  const determinate = typeof progress === 'number' && !Number.isNaN(progress)
  const pct = determinate ? Math.min(100, Math.max(0, progress)) : null

  useEffect(() => {
    setStepIndex(0)
  }, [stepsKey])

  useEffect(() => {
    if (!steps || steps.length <= 1) return undefined
    const id = setInterval(() => {
      setStepIndex((i) => (i + 1) % steps.length)
    }, STEP_INTERVAL_MS)
    return () => clearInterval(id)
  }, [steps])

  const currentStep = steps ? steps[stepIndex % steps.length] : null

  /** Reroll dice when loading copy or step list / bar mode changes (omit live `progress` so determinate % doesn’t thrash). */
  const diceShuffleKey = [
    message,
    sublabel ?? '',
    stepsKey,
    showProgressBar ? 'bar' : 'nobar',
  ].join('\u0001')

  return (
    <div
      className="loading-dice-progress"
      role="status"
      aria-busy="true"
      aria-label={[message, sublabel, currentStep].filter(Boolean).join('. ')}
    >
      <MultiDiceLoader size={size} decorative diceShuffleKey={diceShuffleKey} />
      {showProgressBar && (
        <div
          className={`loading-dice-progress__track${determinate ? ' loading-dice-progress__track--determinate' : ''}`}
          role={determinate ? 'progressbar' : undefined}
          aria-valuemin={determinate ? 0 : undefined}
          aria-valuemax={determinate ? 100 : undefined}
          aria-valuenow={determinate ? Math.round(pct) : undefined}
          aria-valuetext={determinate ? `${Math.round(pct)}%` : currentStep || message}
        >
          <div
            className={`loading-dice-progress__fill${determinate ? '' : ' loading-dice-progress__fill--indeterminate loading-dice-progress__fill--shimmer'}`}
            style={determinate ? { width: `${pct}%` } : undefined}
          />
        </div>
      )}
      {determinate && pct != null && (
        <p className="loading-dice-progress__percent">{Math.round(pct)}%</p>
      )}
      <div className="multi-dice-loader__text dice-loader__text">
        {message ? <p className="dice-loader__label">{message}</p> : null}
        {sublabel ? <p className="dice-loader__sublabel">{sublabel}</p> : null}
      </div>
      {currentStep && (
        <p key={stepIndex} className="loading-dice-progress__step loading-dice-progress__step--fade">
          {currentStep}
        </p>
      )}
    </div>
  )
}
