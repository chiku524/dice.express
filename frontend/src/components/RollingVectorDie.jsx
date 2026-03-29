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

/**
 * Face-local “light from top-front” so edges read as depth (avoid CSS filters on faces — they flatten 3D).
 * @type {Record<string, { x1: string; y1: string; x2: string; y2: string; s0: string; s1: string; s2: string; stroke: string }>}
 */
const FACE_SHADE = {
  top: {
    x1: '10%',
    y1: '5%',
    x2: '90%',
    y2: '95%',
    s0: 'rgba(255,255,255,0.99)',
    s1: 'rgba(248,250,252,0.97)',
    s2: 'rgba(226,232,240,0.94)',
    stroke: 'rgba(139, 92, 246, 0.28)',
  },
  front: {
    x1: '12%',
    y1: '8%',
    x2: '88%',
    y2: '92%',
    s0: 'rgba(252,252,253,0.98)',
    s1: 'rgba(241,245,249,0.96)',
    s2: 'rgba(214,219,230,0.93)',
    stroke: 'rgba(139, 92, 246, 0.32)',
  },
  right: {
    x1: '0%',
    y1: '12%',
    x2: '100%',
    y2: '88%',
    s0: 'rgba(241,245,249,0.96)',
    s1: 'rgba(226,232,240,0.93)',
    s2: 'rgba(186,198,214,0.9)',
    stroke: 'rgba(124, 58, 237, 0.35)',
  },
  left: {
    x1: '100%',
    y1: '10%',
    x2: '0%',
    y2: '90%',
    s0: 'rgba(203,213,225,0.9)',
    s1: 'rgba(148,163,184,0.88)',
    s2: 'rgba(100,116,139,0.85)',
    stroke: 'rgba(91, 33, 182, 0.38)',
  },
  bottom: {
    x1: '8%',
    y1: '92%',
    x2: '92%',
    y2: '8%',
    s0: 'rgba(148,163,184,0.88)',
    s1: 'rgba(100,116,139,0.85)',
    s2: 'rgba(71,85,105,0.82)',
    stroke: 'rgba(76, 29, 149, 0.42)',
  },
  back: {
    x1: '88%',
    y1: '88%',
    x2: '12%',
    y2: '12%',
    s0: 'rgba(148,163,184,0.82)',
    s1: 'rgba(100,116,139,0.78)',
    s2: 'rgba(71,85,105,0.74)',
    stroke: 'rgba(67, 56, 202, 0.4)',
  },
}

function DieFaceSvg({ value, face }) {
  const raw = useId()
  const uid = raw.replace(/:/g, '')
  const points = PIPS[value]
  const pipR = 9
  const strokeW = 1.75
  const sh = FACE_SHADE[face] ?? FACE_SHADE.front

  return (
    <svg
      className="rolling-die__svg"
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}-face`} x1={sh.x1} y1={sh.y1} x2={sh.x2} y2={sh.y2}>
          <stop offset="0%" stopColor={sh.s0} />
          <stop offset="48%" stopColor={sh.s1} />
          <stop offset="100%" stopColor={sh.s2} />
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
        rx={9}
        ry={9}
        fill={`url(#${uid}-face)`}
        stroke={sh.stroke}
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
          <DieFaceSvg face="front" value={FACE_BY_SIDE.front} />
        </div>
        <div className="rolling-die__face rolling-die__face--back">
          <DieFaceSvg face="back" value={FACE_BY_SIDE.back} />
        </div>
        <div className="rolling-die__face rolling-die__face--right">
          <DieFaceSvg face="right" value={FACE_BY_SIDE.right} />
        </div>
        <div className="rolling-die__face rolling-die__face--left">
          <DieFaceSvg face="left" value={FACE_BY_SIDE.left} />
        </div>
        <div className="rolling-die__face rolling-die__face--top">
          <DieFaceSvg face="top" value={FACE_BY_SIDE.top} />
        </div>
        <div className="rolling-die__face rolling-die__face--bottom">
          <DieFaceSvg face="bottom" value={FACE_BY_SIDE.bottom} />
        </div>
      </div>
    </div>
  )
}
