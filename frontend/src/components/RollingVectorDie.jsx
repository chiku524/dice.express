import { useId } from 'react'

/** Pip centers in 100×100 viewBox (standard die layouts) */
const PIPS = {
  1: [[50, 50]],
  2: [
    [30, 30],
    [70, 70],
  ],
  3: [
    [30, 30],
    [50, 50],
    [70, 70],
  ],
  4: [
    [30, 30],
    [70, 30],
    [30, 70],
    [70, 70],
  ],
  5: [
    [30, 30],
    [70, 30],
    [50, 50],
    [30, 70],
    [70, 70],
  ],
  6: [
    [30, 28],
    [30, 50],
    [30, 72],
    [70, 28],
    [70, 50],
    [70, 72],
  ],
}

/** Standard opposites: 1↔6, 2↔5, 3↔4 — mapped to cube faces */
const FACE_BY_SIDE = {
  front: 1,
  back: 6,
  right: 2,
  left: 5,
  top: 3,
  bottom: 4,
}

function DieFaceSvg({ value }) {
  const raw = useId()
  const uid = raw.replace(/:/g, '')
  const points = PIPS[value]
  const pipR = 9
  const strokeW = 1.75

  return (
    <svg
      className="rolling-die__svg"
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}-face`} x1="8%" y1="6%" x2="92%" y2="94%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
          <stop offset="48%" stopColor="rgba(241,245,249,0.96)" />
          <stop offset="100%" stopColor="rgba(203,213,225,0.92)" />
        </linearGradient>
        <radialGradient id={`${uid}-pip`} cx="32%" cy="28%" r="75%">
          <stop offset="0%" stopColor="var(--color-primary-hover, #a78bfa)" />
          <stop offset="46%" stopColor="var(--color-primary, #8b5cf6)" />
          <stop offset="100%" stopColor="#5b21b6" />
        </radialGradient>
      </defs>
      <rect
        x={5 + strokeW / 2}
        y={5 + strokeW / 2}
        width={100 - 5 * 2 - strokeW}
        height={100 - 5 * 2 - strokeW}
        rx={15}
        ry={15}
        fill={`url(#${uid}-face)`}
        stroke="rgba(139, 92, 246, 0.32)"
        strokeWidth={strokeW}
      />
      {points.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={pipR}
          fill={`url(#${uid}-pip)`}
        />
      ))}
    </svg>
  )
}

/**
 * Single vector (SVG) die as a CSS 3D cube — tumbles on a loop while mounted.
 */
export default function RollingVectorDie() {
  return (
    <div className="rolling-die">
      <div className="rolling-die__cube">
        <div className="rolling-die__face rolling-die__face--front">
          <DieFaceSvg value={FACE_BY_SIDE.front} />
        </div>
        <div className="rolling-die__face rolling-die__face--back">
          <DieFaceSvg value={FACE_BY_SIDE.back} />
        </div>
        <div className="rolling-die__face rolling-die__face--right">
          <DieFaceSvg value={FACE_BY_SIDE.right} />
        </div>
        <div className="rolling-die__face rolling-die__face--left">
          <DieFaceSvg value={FACE_BY_SIDE.left} />
        </div>
        <div className="rolling-die__face rolling-die__face--top">
          <DieFaceSvg value={FACE_BY_SIDE.top} />
        </div>
        <div className="rolling-die__face rolling-die__face--bottom">
          <DieFaceSvg value={FACE_BY_SIDE.bottom} />
        </div>
      </div>
    </div>
  )
}
