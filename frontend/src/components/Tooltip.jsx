import { useState, useRef, useEffect } from 'react'
import './Tooltip.css'

/**
 * Tooltip Component
 * Displays helpful information on hover
 */
export function Tooltip({ children, content, position = 'top', disabled = false }) {
  const [isVisible, setIsVisible] = useState(false)
  const tooltipRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!isVisible || !tooltipRef.current || !triggerRef.current) return

    const tooltip = tooltipRef.current
    const trigger = triggerRef.current
    const rect = trigger.getBoundingClientRect()

    // Position tooltip
    switch (position) {
      case 'top':
        tooltip.style.bottom = `${window.innerHeight - rect.top + 8}px`
        tooltip.style.left = `${rect.left + rect.width / 2}px`
        tooltip.style.transform = 'translateX(-50%)'
        break
      case 'bottom':
        tooltip.style.top = `${rect.bottom + 8}px`
        tooltip.style.left = `${rect.left + rect.width / 2}px`
        tooltip.style.transform = 'translateX(-50%)'
        break
      case 'left':
        tooltip.style.right = `${window.innerWidth - rect.left + 8}px`
        tooltip.style.top = `${rect.top + rect.height / 2}px`
        tooltip.style.transform = 'translateY(-50%)'
        break
      case 'right':
        tooltip.style.left = `${rect.right + 8}px`
        tooltip.style.top = `${rect.top + rect.height / 2}px`
        tooltip.style.transform = 'translateY(-50%)'
        break
    }
  }, [isVisible, position])

  if (disabled || !content) {
    return children
  }

  return (
    <>
      <span
        ref={triggerRef}
        className="tooltip-trigger"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-describedby={isVisible ? 'tooltip' : undefined}
      >
        {children}
      </span>
      {isVisible && (
        <div
          ref={tooltipRef}
          id="tooltip"
          className={`tooltip tooltip-${position}`}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </>
  )
}
