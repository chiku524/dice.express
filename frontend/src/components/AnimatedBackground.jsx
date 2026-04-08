import { useEffect, useRef } from 'react'
import './AnimatedBackground.css'

/** One continuous abstract path (viewBox 0 0 1000 2000) — meanders full height, all segments connected */
const MAIN_PATH_D =
  'M 480 0 C 720 120 920 280 820 420 S 520 520 320 640 S 80 820 280 960 S 520 1100 760 1240 S 820 1480 540 1660 S 280 1820 500 2000'

/** Junction / accent nodes along the path (engraved gems + neon halos) */
const PATH_NODES = [
  { cx: 480, cy: 0 },
  { cx: 820, cy: 420 },
  { cx: 320, cy: 640 },
  { cx: 280, cy: 960 },
  { cx: 760, cy: 1240 },
  { cx: 540, cy: 1660 },
  { cx: 500, cy: 2000 },
]

/**
 * Background: stone-like engraved circuit — one connected carved path, neon glow accents,
 * CSS/SVG motion (dash flow, pulse, slow drift) and light pointer parallax.
 */
export default function AnimatedBackground() {
  const parallaxRef = useRef(null)

  useEffect(() => {
    const el = parallaxRef.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches) return

    let raf = 0
    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0

    const onMove = (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 28
      const ny = (e.clientY / window.innerHeight - 0.5) * 28
      targetX = nx
      targetY = ny
    }

    const smooth = () => {
      currentX += (targetX - currentX) * 0.06
      currentY += (targetY - currentY) * 0.06
      el.style.transform = `translate3d(${currentX}px,${currentY}px,0)`
      raf = requestAnimationFrame(smooth)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    raf = requestAnimationFrame(smooth)

    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="animated-background">
      <div className="animated-background-stone" aria-hidden />

      <svg
        className="animated-background-svg"
        viewBox="0 0 1000 2000"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="engraved-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5c5f6a" />
            <stop offset="45%" stopColor="#8a8e9a" />
            <stop offset="100%" stopColor="#4a4d56" />
          </linearGradient>
          <linearGradient id="neon-cyan" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="neon-magenta" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e879f9" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <filter id="neon-glow-cyan" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
            <feGaussianBlur in="b" stdDeviation="8" result="b2" />
            <feMerge>
              <feMergeNode in="b2" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="neon-glow-violet" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
            <feGaussianBlur in="b" stdDeviation="7" result="b2" />
            <feMerge>
              <feMergeNode in="b2" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g ref={parallaxRef} className="animated-background-parallax">
          {/* Carved groove shadow (inset simulation) */}
          <path
            className="engraved-path engraved-path-shadow"
            d={MAIN_PATH_D}
            fill="none"
            stroke="#08080a"
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            className="engraved-path engraved-path-shadow"
            d={MAIN_PATH_D}
            fill="none"
            stroke="#12141a"
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(1.5 2)"
          />
          {/* Lit inner edge of groove */}
          <path
            className="engraved-path engraved-path-face"
            d={MAIN_PATH_D}
            fill="none"
            stroke="url(#engraved-stroke)"
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Neon underlay — soft wide glow */}
          <path
            className="neon-ribbon neon-ribbon-cyan"
            d={MAIN_PATH_D}
            fill="none"
            stroke="url(#neon-cyan)"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neon-glow-cyan)"
            opacity={0.55}
          />
          <path
            className="neon-ribbon neon-ribbon-magenta"
            d={MAIN_PATH_D}
            fill="none"
            stroke="url(#neon-magenta)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neon-glow-violet)"
            opacity={0.4}
          />

          {/* Traveling dashes — energy along the carved line */}
          <path
            className="neon-dash neon-dash-forward"
            d={MAIN_PATH_D}
            fill="none"
            stroke="#67e8f9"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neon-glow-cyan)"
          />
          <path
            className="neon-dash neon-dash-reverse"
            d={MAIN_PATH_D}
            fill="none"
            stroke="#d8b4fe"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neon-glow-violet)"
          />

          {/* Node accents */}
          {PATH_NODES.map((n, i) => (
            <g key={`node-${i}`} className="path-node">
              <circle
                cx={n.cx}
                cy={n.cy}
                r={9}
                fill="none"
                stroke="#050508"
                strokeWidth={4}
                className="path-node-crater"
              />
              <circle
                cx={n.cx}
                cy={n.cy}
                r={5.5}
                fill="none"
                stroke="url(#engraved-stroke)"
                strokeWidth={1.8}
                className="path-node-ring"
              />
              <circle
                cx={n.cx}
                cy={n.cy}
                r={4}
                fill="none"
                stroke="#22d3ee"
                strokeWidth={1.2}
                className="path-node-neon"
                filter="url(#neon-glow-cyan)"
              />
              <circle
                cx={n.cx}
                cy={n.cy}
                r={2.2}
                fill="#a855f7"
                fillOpacity={0.35}
                className="path-node-core"
                filter="url(#neon-glow-violet)"
              />
            </g>
          ))}
        </g>
      </svg>

      <div className="animated-background-overlay" />
    </div>
  )
}
