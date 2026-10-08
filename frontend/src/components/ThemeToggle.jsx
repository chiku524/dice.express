import { useTheme } from '../contexts/ThemeContext'
import './ThemeToggle.css'

/**
 * Appearance control — dark (default / current design) ↔ light.
 * @param {{ variant?: 'row' | 'compact' | 'menu' }} props
 */
export default function ThemeToggle({ variant = 'row' }) {
  const { theme, setTheme, isDark } = useTheme()

  if (variant === 'compact') {
    return (
      <button
        type="button"
        className="theme-toggle theme-toggle--compact"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Light mode' : 'Dark mode'}
      >
        <span className={`theme-toggle__glyph theme-toggle__glyph--${isDark ? 'sun' : 'moon'}`} aria-hidden />
      </button>
    )
  }

  if (variant === 'menu') {
    return (
      <button
        type="button"
        className="theme-toggle theme-toggle--menu"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
      >
        {isDark ? 'Light mode' : 'Dark mode'}
      </button>
    )
  }

  return (
    <div className="theme-toggle theme-toggle--row" role="group" aria-label="Color theme">
      <p className="profile-hint theme-toggle__hint">
        Dark matches the current look. Choice is saved on this device.
      </p>
      <div className="theme-toggle__segmented">
        <button
          type="button"
          className={`theme-toggle__option${theme === 'dark' ? ' is-active' : ''}`}
          onClick={() => setTheme('dark')}
          aria-pressed={theme === 'dark'}
        >
          Dark
        </button>
        <button
          type="button"
          className={`theme-toggle__option${theme === 'light' ? ' is-active' : ''}`}
          onClick={() => setTheme('light')}
          aria-pressed={theme === 'light'}
        >
          Light
        </button>
      </div>
    </div>
  )
}
