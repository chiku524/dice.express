import { useEffect, useRef } from 'react'
import './AnimatedBackground.css'

/** Primary engraved vein — continuous path (viewBox 0 0 1000 2000), boing.express-style slate + teal accent */
const MAIN_PATH_D =
  'M 480 0 C 720 120 920 280 820 420 S 520 520 320 640 S 80 820 280 960 S 520 1100 760 1240 S 820 1480 540 1660 S 280 1820 500 2000'

/**
 * Full-viewport backdrop inspired by boing.express: cool stone slab (#06080c family), fine grain,
 * diagonal micro-scratches, soft SVG veins, floating teal/blue/violet neon orbs and accents — with motion.
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
      const nx = (e.clientX / window.innerWidth - 0.5) * 22
      const ny = (e.clientY / window.innerHeight - 0.5) * 22
      targetX = nx
      targetY = ny
    }

    const smooth = () => {
      currentX += (targetX - currentX) * 0.055
      currentY += (targetY - currentY) * 0.055
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
      <div className="animated-background-grain" aria-hidden />

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

        <g ref={parallaxRef} className="animated-background-parallax">
          <path
            className="ab-vein-shadow"
            d={MAIN_PATH_D}
            fill="none"
            stroke="#020308"
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            className="ab-vein-shadow"
            d={MAIN_PATH_D}
            fill="none"
            stroke="#0a0e14"
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
