import './DiceLoader.css'

/** Pip positions for a classic “five” face (readable at small sizes). */
const PIP_FIVE = [
  { r: 1, c: 1 },
  { r: 1, c: 3 },
  { r: 2, c: 2 },
  { r: 3, c: 1 },
  { r: 3, c: 3 },
]

/**
 * Rolling die animation for loading states (web + Tauri).
 * @param {'xs' | 'sm' | 'md' | 'lg'} [size='md']
 * @param {string} [label] — visible primary line (also used for aria-label when set)
 * @param {string} [sublabel] — optional secondary line
 * @param {boolean} [inline=false] — row layout (icon + text) for tight spaces
 * @param {boolean} [decorative=false] — hide from assistive tech (use beside visible button text)
 */
export default function DiceLoader({
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
      ? 'dice-loader--xs'
      : size === 'sm'
        ? 'dice-loader--sm'
        : size === 'lg'
          ? 'dice-loader--lg'
          : 'dice-loader--md'

  return (
    <div
      className={`dice-loader ${sizeClass}${inline ? ' dice-loader--inline' : ''}${className ? ` ${className}` : ''}`.trim()}
      role={decorative ? undefined : 'status'}
      aria-busy={decorative ? undefined : true}
      aria-label={decorative ? undefined : aria}
      aria-hidden={decorative ? true : undefined}
    >
      <div className="dice-loader__scene">
        <div className="dice-loader__die" aria-hidden>
          {PIP_FIVE.map((p, i) => (
            <span
              key={i}
              className="dice-loader__pip"
              style={{ gridRow: p.r, gridColumn: p.c }}
            />
          ))}
        </div>
      </div>
      {(label || sublabel) && (
        <div className="dice-loader__text">
          {label ? <p className="dice-loader__label">{label}</p> : null}
          {sublabel ? <p className="dice-loader__sublabel">{sublabel}</p> : null}
        </div>
      )}
    </div>
  )
}
