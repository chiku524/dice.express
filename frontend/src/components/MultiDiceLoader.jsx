import './DiceLoader.css'
import './MultiDiceLoader.css'
import RollingVectorDie from './RollingVectorDie'

const DICE_COUNT = 3

/**
 * Three vector 3D dice tumbling out of phase — loops while this component stays mounted
 * (i.e. until loading UI is removed). Block loading and Suspense fallbacks.
 * @param {'xs' | 'sm' | 'md' | 'lg'} [size='md']
 * @param {string} [label]
 * @param {string} [sublabel]
 * @param {boolean} [inline=false]
 * @param {boolean} [decorative=false]
 */
export default function MultiDiceLoader({
  size = 'md',
  label,
  sublabel,
  className = '',
  inline = false,
  decorative = false,
}) {
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
        {Array.from({ length: DICE_COUNT }, (_, dieIndex) => (
          <div key={dieIndex} className="multi-dice-loader__die-wrap">
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
