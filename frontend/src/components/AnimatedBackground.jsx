import './AnimatedBackground.css'

/** Primary engraved vein — continuous path (viewBox 0 0 1000 2000), boing.express-style slate + teal accent */
const MAIN_PATH_D =
  'M 480 0 C 720 120 920 280 820 420 S 520 520 320 640 S 80 820 280 960 S 520 1100 760 1240 S 820 1480 540 1660 S 280 1820 500 2000'

/** Soft dust motes: % positions, horizontal drift (px), delay (s), duration (s) */
const BACKGROUND_MOTES = [
  { left: 11, top: 88, dx: 14, delay: -0.8, duration: 22 },
  { left: 24, top: 92, dx: -18, delay: -5.2, duration: 26 },
  { left: 38, top: 85, dx: 10, delay: -2.4, duration: 20 },
  { left: 52, top: 90, dx: -12, delay: -8.1, duration: 24 },
  { left: 67, top: 87, dx: 20, delay: -3.6, duration: 21 },
  { left: 79, top: 91, dx: -9, delay: -11.0, duration: 28 },
  { left: 88, top: 84, dx: 16, delay: -6.5, duration: 23 },
  { left: 6, top: 62, dx: -11, delay: -4.0, duration: 19 },
  { left: 93, top: 58, dx: 13, delay: -9.3, duration: 25 },
  { left: 45, top: 72, dx: -15, delay: -1.1, duration: 17 },
]

/**
 * Full-viewport backdrop inspired by boing.express: cool stone slab (#06080c family), fine grain,
 * diagonal micro-scratches, soft SVG veins, floating teal/blue/violet neon orbs and accents — with motion.
 */
export default function AnimatedBackground() {
  return (
    <div className="animated-background">
      <div className="animated-background-stone" aria-hidden />
      <div className="animated-background-grain" aria-hidden />

      <div className="animated-background-drift-layer" aria-hidden>
        <div className="ab-drift-line ab-drift-line-a" />
        <div className="ab-drift-line ab-drift-line-b" />
        <div className="ab-drift-line ab-drift-line-c" />
        {BACKGROUND_MOTES.map((m, i) => (
          <span
            key={i}
            className="ab-mote"
            style={{
              left: `${m.left}%`,
              top: `${m.top}%`,
              '--ab-mote-dx': `${m.dx}px`,
              animationDelay: `${m.delay}s`,
              animationDuration: `${m.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="animated-background-neon-layer" aria-hidden>
        <div className="ab-neon ab-neon-orb ab-neon-a" />
        <div className="ab-neon ab-neon-orb ab-neon-b" />
        <div className="ab-neon ab-neon-orb ab-neon-c" />
        <div className="ab-neon ab-neon-arc ab-neon-d" />
        <div className="ab-neon ab-neon-arc ab-neon-e" />
        <div className="ab-neon ab-neon-dash ab-neon-f" />
        <div className="ab-neon ab-neon-dash ab-neon-g" />
        <div className="ab-neon ab-neon-dot ab-neon-h" />
        <div className="ab-neon ab-neon-dot ab-neon-i" />
      </div>

      <svg
        className="animated-background-svg"
        viewBox="0 0 1000 2000"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="ab-vein-lit" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(148, 163, 184, 0.14)" />
            <stop offset="50%" stopColor="rgba(0, 232, 200, 0.1)" />
            <stop offset="100%" stopColor="rgba(100, 116, 139, 0.12)" />
          </linearGradient>
          <linearGradient id="ab-trace" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(0, 232, 200, 0.45)" />
            <stop offset="100%" stopColor="rgba(56, 189, 248, 0.35)" />
          </linearGradient>
          <filter id="ab-soft-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="animated-background-vein-motion">
          <path
            className="ab-vein-shadow"
            d={MAIN_PATH_D}
            fill="none"
            stroke="#010102"
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            className="ab-vein-shadow"
            d={MAIN_PATH_D}
            fill="none"
            stroke="#040508"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(1.2 1.8)"
          />
          <path
            className="ab-vein-face"
            d={MAIN_PATH_D}
            fill="none"
            stroke="url(#ab-vein-lit)"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            className="ab-trace-glow"
            d={MAIN_PATH_D}
            fill="none"
            stroke="url(#ab-trace)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#ab-soft-glow)"
            opacity={0.35}
          />
          <path
            className="ab-trace-dash ab-trace-dash-forward"
            d={MAIN_PATH_D}
            fill="none"
            stroke="rgba(0, 232, 200, 0.55)"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#ab-soft-glow)"
          />
          <path
            className="ab-trace-dash ab-trace-dash-reverse"
            d={MAIN_PATH_D}
            fill="none"
            stroke="rgba(90, 176, 255, 0.45)"
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>

      <div className="animated-background-overlay" />
    </div>
  )
}
