import { useEffect, useRef, useState } from 'react'
import './DiceLoader.css'
import './MultiDiceLoader.css'
import RollingVectorDie from './RollingVectorDie'

const DICE_COUNT = 3

/** Seconds — must stay in sync with `--die-roll-duration` in MultiDiceLoader.css */
const BASE_DURATION_SEC = {
  xs: 1.45,
  sm: 1.65,
  md: 1.95,
  lg: 2.15,
}

const VARIANT_NAMES = ['rolling-die-tumble-a', 'rolling-die-tumble-b', 'rolling-die-tumble-c']
/** Relative to base duration (matches previous nth-child multipliers) */
const VARIANT_DURATION_MULT = [1, 1.07, 0.93]

function shuffleIndices3() {
  const order = [0, 1, 2]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

/**
 * Random phase + duration jitter; reshuffles when any shuffle input changes.
 * @param {'xs' | 'sm' | 'md' | 'lg'} size
 * @param {string | undefined} label
 * @param {string | undefined} sublabel
 * @param {string | undefined} diceShuffleKey - extra signal when `decorative` (e.g. composite external copy)
 */
function buildDieAnimationParams(size) {
  const baseSec = BASE_DURATION_SEC[size] ?? BASE_DURATION_SEC.md
  const variantBySlot = shuffleIndices3()
  return Array.from({ length: DICE_COUNT }, (_, dieSlot) => {
    const v = variantBySlot[dieSlot]
    const jitter = 0.9 + Math.random() * 0.2
    const durationMult = VARIANT_DURATION_MULT[v] * jitter
    const durationSec = baseSec * durationMult
    const delaySec = -Math.random() * durationSec
    return {
      style: {
        '--die-anim-delay': `${delaySec.toFixed(3)}s`,
        '--die-anim-duration-mult': durationMult.toFixed(4),
        '--die-anim-name': VARIANT_NAMES[v],
      },
    }
  })
}

function useDieAnimationParams(size, label, sublabel, diceShuffleKey) {
  const shuffleKey = [size, label ?? '', sublabel ?? '', diceShuffleKey ?? ''].join('\0')
  const [dieParams, setDieParams] = useState(() => buildDieAnimationParams(size))
  const skipFirstEffect = useRef(true)

  useEffect(() => {
    if (skipFirstEffect.current) {
      skipFirstEffect.current = false
      return
    }
    setDieParams(buildDieAnimationParams(size))
  }, [shuffleKey, size])

  return dieParams
}

/**
 * Three vector 3D dice tumbling out of phase — loops while this component stays mounted
 * (i.e. until loading UI is removed). Block loading and Suspense fallbacks.
 * @param {'xs' | 'sm' | 'md' | 'lg'} [size='md']
 * @param {string} [label]
 * @param {string} [sublabel]
 * @param {string} [diceShuffleKey] - when this string changes, dice re-randomize (use with `decorative` for external copy); `label` / `sublabel` also trigger on their own
 * @param {boolean} [inline=false]
 * @param {boolean} [decorative=false]
 */
export default function MultiDiceLoader({
  size = 'md',
  label,
  sublabel,
  diceShuffleKey,
  className = '',
  inline = false,
  decorative = false,
}) {
  const dieParams = useDieAnimationParams(size, label, sublabel, diceShuffleKey)
  const aria = label || sublabel || 'Loading'
  const sizeClass =
    size === 'xs'
      ? 'multi-dice-loader--xs'
      : size === 'sm'
        ? 'multi-dice-loader--sm'
        : size === 'lg'
          ? 'multi-dice-loader--lg'
          : 'multi-dice-loader--md'

  return (
    <div
      className={`multi-dice-loader ${sizeClass}${inline ? ' multi-dice-loader--inline' : ''}${className ? ` ${className}` : ''}`.trim()}
      role={decorative ? undefined : 'status'}
      aria-busy={decorative ? undefined : true}
      aria-label={decorative ? undefined : aria}
      aria-hidden={decorative ? true : undefined}
    >
      <div className="multi-dice-loader__scene" aria-hidden>
        {dieParams.map((params, dieIndex) => (
          <div key={dieIndex} className="multi-dice-loader__die-wrap" style={params.style}>
            <RollingVectorDie />
          </div>
        ))}
      </div>
      {(label || sublabel) && (
        <div className="multi-dice-loader__text dice-loader__text">
          {label ? <p className="dice-loader__label">{label}</p> : null}
          {sublabel ? <p className="dice-loader__sublabel">{sublabel}</p> : null}
        </div>
      )}
    </div>
  )
}
