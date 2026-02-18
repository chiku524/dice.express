import { useEffect, useRef } from 'react'
import './AnimatedBackground.css'

/**
 * Animated background component for prediction markets app
 * Features:
 * - Market-themed animations (graph lines, data points, probability curves)
 * - Neon colors with opacity variations
 * - Subtle, elegant movements
 * - Canvas-based particles and CSS-based overlays
 */
export default function AnimatedBackground() {
  const canvasRef = useRef(null)
  const animationFrameRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      console.error('[AnimatedBackground] Canvas ref is null')
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('[AnimatedBackground] Could not get 2d context')
      return
    }
    
    console.log('[AnimatedBackground] Starting animation')
    let particles = []
    let graphLines = []
    let geometricShapes = []
    let glowingOrbs = []
    let pulsingRings = []
    let time = 0

    // Set canvas size - use getBoundingClientRect to match CSS sizing
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      console.log('[AnimatedBackground] Canvas resized to:', canvas.width, 'x', canvas.height)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Cohesive color palette — violet/indigo/blue (matches theme primary; logo keeps green)
    const colorPalettes = {
      primary: [
        { r: 139, g: 92, b: 246 },     // Violet (theme primary)
        { r: 124, g: 58, b: 237 },     // Violet-600
        { r: 99, g: 102, b: 241 },     // Indigo
        { r: 129, g: 140, b: 248 },   // Light indigo
      ],
      secondary: [
        { r: 139, g: 92, b: 246 },    // Violet
        { r: 167, g: 139, b: 250 },   // Light violet
        { r: 96, g: 165, b: 250 },    // Soft blue
        { r: 196, g: 181, b: 253 },   // Lavender
      ],
      // Accent palette - warm tones for orbs and rings
      accent: [
        { r: 255, g: 100, b: 200 },    // Pink
        { r: 255, g: 150, b: 100 },    // Coral
        { r: 200, g: 100, b: 255 },    // Lavender
        { r: 100, g: 200, b: 255 },    // Sky Blue
      ],
      subtle: [
        { r: 139, g: 92, b: 246 },    // Muted violet
        { r: 99, g: 102, b: 241 },    // Muted indigo
        { r: 129, g: 140, b: 248 },   // Muted light indigo
        { r: 196, g: 181, b: 253 },   // Muted lavender
      ]
    }
    
    // Helper to get random color from a palette
    const getColor = (palette = 'primary') => {
      const colors = colorPalettes[palette]
      return colors[Math.floor(Math.random() * colors.length)]
    }

    // Particle class for floating data points with varied opacity
    class Particle {
      constructor() {
        this.reset()
      }

      reset() {
        // More dynamic initial positions - cluster some, spread others
        const cluster = Math.random() < 0.3 // 30% chance to cluster
        if (cluster) {
          const clusterX = Math.random() * canvas.width
          const clusterY = Math.random() * canvas.height
          const spread = 100
          this.x = clusterX + (Math.random() - 0.5) * spread
          this.y = clusterY + (Math.random() - 0.5) * spread
        } else {
          this.x = Math.random() * canvas.width
          this.y = Math.random() * canvas.height
        }
        
        this.size = Math.random() * 3 + 0.5
        this.speedX = (Math.random() - 0.5) * 0.8
        this.speedY = (Math.random() - 0.5) * 0.8
        this.color = getColor('primary')
        
        // Varied opacity levels - some very subtle, some more visible
        const opacityType = Math.random()
        if (opacityType < 0.3) {
          this.opacity = Math.random() * 0.15 + 0.05 // Very subtle (5-20%)
        } else if (opacityType < 0.7) {
          this.opacity = Math.random() * 0.25 + 0.15 // Medium (15-40%)
        } else {
          this.opacity = Math.random() * 0.3 + 0.4 // More visible (40-70%)
        }
        
        this.pulseSpeed = Math.random() * 0.03 + 0.01
        this.pulsePhase = Math.random() * Math.PI * 2
        this.pulseAmplitude = Math.random() * 0.2 + 0.1
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY
        this.pulsePhase += this.pulseSpeed

        // Wrap around edges
        if (this.x < 0) this.x = canvas.width
        if (this.x > canvas.width) this.x = 0
        if (this.y < 0) this.y = canvas.height
        if (this.y > canvas.height) this.y = 0

        // Pulsing opacity with varied amplitude
        this.currentOpacity = this.opacity + Math.sin(this.pulsePhase) * this.pulseAmplitude
      }

      draw() {
        // Add subtle trail effect
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2)
        gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.currentOpacity})`)
        gradient.addColorStop(0.5, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.currentOpacity * 0.5})`)
        gradient.addColorStop(1, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0)`)

        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        // Glow effect
        ctx.shadowBlur = 8
        ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.currentOpacity * 0.6})`
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    // Graph line class for market trend visualization - more dynamic and less distracting
    class GraphLine {
      constructor() {
        this.reset()
      }

      reset() {
        this.points = []
        this.numPoints = 15 + Math.floor(Math.random() * 20) // Fewer points for smoother lines
        
        // More dynamic positioning - prefer edges and corners
        const positionType = Math.random()
        if (positionType < 0.4) {
          // Start from edges
          const edge = Math.floor(Math.random() * 4)
          if (edge === 0) { // Top
            this.startX = Math.random() * canvas.width
            this.startY = -50
          } else if (edge === 1) { // Right
            this.startX = canvas.width + 50
            this.startY = Math.random() * canvas.height
          } else if (edge === 2) { // Bottom
            this.startX = Math.random() * canvas.width
            this.startY = canvas.height + 50
          } else { // Left
            this.startX = -50
            this.startY = Math.random() * canvas.height
          }
        } else {
          this.startX = Math.random() * canvas.width
          this.startY = Math.random() * canvas.height
        }
        
        this.amplitude = 20 + Math.random() * 80 // Smaller amplitude
        this.frequency = 0.003 + Math.random() * 0.015 // Lower frequency for smoother waves
        this.color = getColor('secondary')
        
        // Much more subtle opacity - make them less distracting
        this.opacity = Math.random() * 0.12 + 0.05 // 5-17% - very subtle
        this.baseOpacity = this.opacity
        
        this.speed = 0.05 + Math.random() * 0.25 // Slower movement
        this.offset = Math.random() * Math.PI * 2
        this.life = 0
        this.maxLife = Math.random() * 300 + 200 // Lines fade in/out
        this.fadeIn = true

        // Generate points for smooth curve
        for (let i = 0; i < this.numPoints; i++) {
          this.points.push({
            x: this.startX + i * (canvas.width / this.numPoints),
            y: this.startY
          })
        }
      }

      update() {
        this.life++
        this.offset += this.speed * 0.008 // Slower wave motion

        // Fade in/out effect for less distraction
        const lifeProgress = this.life / this.maxLife
        if (lifeProgress < 0.2) {
          this.opacity = this.baseOpacity * (lifeProgress / 0.2) // Fade in
        } else if (lifeProgress > 0.8) {
          this.opacity = this.baseOpacity * (1 - (lifeProgress - 0.8) / 0.2) // Fade out
        } else {
          this.opacity = this.baseOpacity
        }

        // Reset when faded out
        if (this.life > this.maxLife) {
          this.reset()
          this.life = 0
        }

        // Update points to create smoother, more organic wave motion
        this.points.forEach((point, i) => {
          // Use multiple sine waves for more organic movement
          const wave1 = Math.sin(i * this.frequency + this.offset) * this.amplitude
          const wave2 = Math.sin(i * this.frequency * 2 + this.offset * 1.5) * (this.amplitude * 0.3)
          point.y = this.startY + wave1 + wave2
          point.x += this.speed

          // Wrap around smoothly
          if (point.x > canvas.width + 50) {
            point.x = -50
            this.startX = -50
          } else if (point.x < -50) {
            point.x = canvas.width + 50
            this.startX = canvas.width + 50
          }
        })
      }

      draw() {
        // Only draw if opacity is significant
        if (this.opacity < 0.02) return

        ctx.beginPath()
        ctx.moveTo(this.points[0].x, this.points[0].y)

        // Draw smoother curve through points with better interpolation
        for (let i = 1; i < this.points.length; i++) {
          const prev = this.points[i - 1]
          const curr = this.points[i]
          const next = this.points[i + 1] || curr

          // Better control points for smoother curves
          const cp1x = prev.x + (curr.x - prev.x) * 0.6
          const cp1y = prev.y + (curr.y - prev.y) * 0.6
          const cp2x = curr.x - (next.x - curr.x) * 0.6
          const cp2y = curr.y - (next.y - curr.y) * 0.6

          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y)
        }

        // Thinner, more subtle lines
        ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`
        ctx.lineWidth = 1
        ctx.shadowBlur = 10
        ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity * 0.3})`
        ctx.stroke()
        ctx.shadowBlur = 0
      }
    }

    // Initialize particles - ensure minimum visibility
    const numParticles = Math.max(50, Math.floor((canvas.width * canvas.height) / 10000))
    console.log('[AnimatedBackground] Canvas size:', canvas.width, 'x', canvas.height)
    console.log('[AnimatedBackground] Initializing', numParticles, 'particles')
    for (let i = 0; i < numParticles; i++) {
      particles.push(new Particle())
    }

    // Geometric Shape class - triangles, hexagons, etc.
    class GeometricShape {
      constructor() {
        this.reset()
      }

      reset() {
        // Dynamic positioning - prefer edges and corners
        const positionType = Math.random()
        if (positionType < 0.4) {
          // Near edges
          const edge = Math.floor(Math.random() * 4)
          if (edge === 0) { // Top
            this.x = Math.random() * canvas.width
            this.y = Math.random() * 100
          } else if (edge === 1) { // Right
            this.x = canvas.width - Math.random() * 100
            this.y = Math.random() * canvas.height
          } else if (edge === 2) { // Bottom
            this.x = Math.random() * canvas.width
            this.y = canvas.height - Math.random() * 100
          } else { // Left
            this.x = Math.random() * 100
            this.y = Math.random() * canvas.height
          }
        } else {
          this.x = Math.random() * canvas.width
          this.y = Math.random() * canvas.height
        }

        this.size = Math.random() * 15 + 5
        this.rotation = Math.random() * Math.PI * 2
        this.rotationSpeed = (Math.random() - 0.5) * 0.02
        this.speedX = (Math.random() - 0.5) * 0.3
        this.speedY = (Math.random() - 0.5) * 0.3
        this.color = getColor('primary')
        this.shapeType = Math.floor(Math.random() * 3) // 0: triangle, 1: hexagon, 2: diamond
        
        // Varied opacity
        const opacityType = Math.random()
        if (opacityType < 0.5) {
          this.opacity = Math.random() * 0.15 + 0.08 // Subtle (8-23%)
        } else {
          this.opacity = Math.random() * 0.2 + 0.15 // Medium (15-35%)
        }
        this.pulsePhase = Math.random() * Math.PI * 2
        this.pulseSpeed = Math.random() * 0.02 + 0.01
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY
        this.rotation += this.rotationSpeed
        this.pulsePhase += this.pulseSpeed

        // Wrap around
        if (this.x < -50) this.x = canvas.width + 50
        if (this.x > canvas.width + 50) this.x = -50
        if (this.y < -50) this.y = canvas.height + 50
        if (this.y > canvas.height + 50) this.y = -50

        this.currentOpacity = this.opacity + Math.sin(this.pulsePhase) * 0.1
      }

      draw() {
        ctx.save()
        ctx.translate(this.x, this.y)
        ctx.rotate(this.rotation)
        ctx.globalAlpha = this.currentOpacity
        ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.currentOpacity})`
        ctx.lineWidth = 1.5
        ctx.shadowBlur = 20
        ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.currentOpacity * 0.5})`

        ctx.beginPath()
        if (this.shapeType === 0) {
          // Triangle
          ctx.moveTo(0, -this.size)
          ctx.lineTo(-this.size * 0.866, this.size * 0.5)
          ctx.lineTo(this.size * 0.866, this.size * 0.5)
          ctx.closePath()
        } else if (this.shapeType === 1) {
          // Hexagon
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i
            const x = Math.cos(angle) * this.size
            const y = Math.sin(angle) * this.size
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
        } else {
          // Diamond
          ctx.moveTo(0, -this.size)
          ctx.lineTo(this.size, 0)
          ctx.lineTo(0, this.size)
          ctx.lineTo(-this.size, 0)
          ctx.closePath()
        }
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.restore()
      }
    }

    // Glowing Orb class - large, slow-moving orbs
    class GlowingOrb {
      constructor() {
        this.reset()
      }

      reset() {
        // Prefer corners and center areas
        const positionType = Math.random()
        if (positionType < 0.3) {
          // Corner
          const corner = Math.floor(Math.random() * 4)
          if (corner === 0) { this.x = 0; this.y = 0 }
          else if (corner === 1) { this.x = canvas.width; this.y = 0 }
          else if (corner === 2) { this.x = canvas.width; this.y = canvas.height }
          else { this.x = 0; this.y = canvas.height }
        } else if (positionType < 0.6) {
          // Center area
          this.x = canvas.width / 2 + (Math.random() - 0.5) * 300
          this.y = canvas.height / 2 + (Math.random() - 0.5) * 300
        } else {
          this.x = Math.random() * canvas.width
          this.y = Math.random() * canvas.height
        }

        this.size = Math.random() * 80 + 40
        this.speedX = (Math.random() - 0.5) * 0.15
        this.speedY = (Math.random() - 0.5) * 0.15
        this.color = getColor('subtle')
        this.opacity = Math.random() * 0.15 + 0.05 // Very subtle
        this.pulseSpeed = Math.random() * 0.01 + 0.005
        this.pulsePhase = Math.random() * Math.PI * 2
        this.pulseAmplitude = Math.random() * 0.1 + 0.05
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY
        this.pulsePhase += this.pulseSpeed

        // Wrap around
        if (this.x < -100) this.x = canvas.width + 100
        if (this.x > canvas.width + 100) this.x = -100
        if (this.y < -100) this.y = canvas.height + 100
        if (this.y > canvas.height + 100) this.y = -100

        this.currentOpacity = this.opacity + Math.sin(this.pulsePhase) * this.pulseAmplitude
        this.currentSize = this.size + Math.sin(this.pulsePhase * 1.5) * 10
      }

      draw() {
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.currentSize)
        gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.currentOpacity})`)
        gradient.addColorStop(0.5, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.currentOpacity * 0.5})`)
        gradient.addColorStop(1, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0)`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.currentSize, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Pulsing Ring class - expanding/contracting rings with multiple layers
    class PulsingRing {
      constructor() {
        this.reset()
      }

      reset() {
        // More strategic positioning - near particles or in interesting areas
        const positionType = Math.random()
        if (positionType < 0.4 && particles.length > 0) {
          // Near a random particle
          const particle = particles[Math.floor(Math.random() * particles.length)]
          this.x = particle.x + (Math.random() - 0.5) * 100
          this.y = particle.y + (Math.random() - 0.5) * 100
        } else {
          this.x = Math.random() * canvas.width
          this.y = Math.random() * canvas.height
        }
        
        this.maxRadius = Math.random() * 100 + 50
        this.minRadius = this.maxRadius * 0.3
        this.currentRadius = this.minRadius
        this.speed = Math.random() * 0.2 + 0.1 // Much slower - was 0.3-1.1, now 0.1-0.3
        this.color = getColor('accent')
        this.opacity = Math.random() * 0.15 + 0.1 // More subtle - was 0.2-0.5, now 0.1-0.25
        this.expanding = true
        this.life = 0
        this.maxLife = Math.random() * 400 + 300 // Longer life - was 80-230, now 300-700
        this.numRings = 2 + Math.floor(Math.random() * 2) // 2-3 concentric rings
      }

      update() {
        this.life++
        if (this.life > this.maxLife) {
          this.reset()
          this.life = 0
        }

        if (this.expanding) {
          this.currentRadius += this.speed
          if (this.currentRadius >= this.maxRadius) {
            this.expanding = false
          }
        } else {
          this.currentRadius -= this.speed
          if (this.currentRadius <= this.minRadius) {
            this.expanding = true
          }
        }

        // Very gradual fade in/out for subtlety
        const lifeProgress = this.life / this.maxLife
        if (lifeProgress < 0.4) {
          this.currentOpacity = this.opacity * (lifeProgress / 0.4) // Slow fade in
        } else if (lifeProgress > 0.6) {
          this.currentOpacity = this.opacity * (1 - (lifeProgress - 0.6) / 0.4) // Slow fade out
        } else {
          this.currentOpacity = this.opacity // Full opacity in middle (only 20% of life)
        }
      }

      draw() {
        // Draw multiple concentric rings for more visibility
        for (let i = 0; i < this.numRings; i++) {
          const ringRadius = this.currentRadius - (i * 15)
          if (ringRadius < this.minRadius) continue
          
          const ringOpacity = this.currentOpacity * (1 - i * 0.3)
          ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${ringOpacity})`
          ctx.lineWidth = 2 + i * 0.5
          ctx.shadowBlur = 20
          ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${ringOpacity * 0.6})`
          ctx.beginPath()
          ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.shadowBlur = 0
      }
    }

    // Initialize graph lines - fewer, more subtle
    const numGraphLines = 2 + Math.floor(Math.random() * 2) // 2-3 lines instead of 3-6
    console.log('[AnimatedBackground] Initializing', numGraphLines, 'graph lines')
    for (let i = 0; i < numGraphLines; i++) {
      graphLines.push(new GraphLine())
    }
    
    // Initialize geometric shapes
    const numShapes = 8 + Math.floor(Math.random() * 5)
    console.log('[AnimatedBackground] Initializing', numShapes, 'geometric shapes')
    for (let i = 0; i < numShapes; i++) {
      geometricShapes.push(new GeometricShape())
    }
    
    // Initialize glowing orbs
    const numOrbs = 3 + Math.floor(Math.random() * 3)
    console.log('[AnimatedBackground] Initializing', numOrbs, 'glowing orbs')
    for (let i = 0; i < numOrbs; i++) {
      glowingOrbs.push(new GlowingOrb())
    }
    
    // Initialize pulsing rings - fewer, slower, more subtle
    const numRings = 3 + Math.floor(Math.random() * 3) // 3-5 rings (reduced from 5-8)
    console.log('[AnimatedBackground] Initializing', numRings, 'pulsing rings')
    for (let i = 0; i < numRings; i++) {
      pulsingRings.push(new PulsingRing())
    }

    // Animation loop
    const animate = () => {
      time += 0.01

      // Clear canvas with slight fade for trail effect
      // Use a darker base to ensure particles stand out
      // Slightly more fade for smoother trails
      ctx.fillStyle = 'rgba(18, 18, 18, 0.25)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update and draw all elements in layers
      // Background layer: glowing orbs
      glowingOrbs.forEach(orb => {
        orb.update()
        orb.draw()
      })

      // Mid layer: graph lines
      graphLines.forEach(line => {
        line.update()
        line.draw()
      })

      // Foreground layer: geometric shapes
      geometricShapes.forEach(shape => {
        shape.update()
        shape.draw()
      })

      // Foreground layer: particles
      particles.forEach(particle => {
        particle.update()
        particle.draw()
      })

      // Top layer: pulsing rings
      pulsingRings.forEach(ring => {
        ring.update()
        ring.draw()
      })

      // Draw connections between nearby particles (network effect)
      particles.forEach((particle, i) => {
        particles.slice(i + 1).forEach(otherParticle => {
          const dx = particle.x - otherParticle.x
          const dy = particle.y - otherParticle.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 120) {
            // Varied connection opacity based on distance - more subtle
            const baseOpacity = (1 - distance / 120)
            const opacity = baseOpacity * (0.05 + Math.random() * 0.08) // 5-13% range - more subtle
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(otherParticle.x, otherParticle.y)
            // Use accent palette color for connections
            const connectionColor = getColor('accent')
            ctx.strokeStyle = `rgba(${connectionColor.r}, ${connectionColor.g}, ${connectionColor.b}, ${opacity})`
            ctx.lineWidth = 0.3 + Math.random() * 0.4
            ctx.stroke()
          }
        })
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <div className="animated-background">
      <canvas ref={canvasRef} className="animated-background-canvas" />
      <div className="animated-background-overlay" />
    </div>
  )
}

