import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getSEOForPath } from '../constants/seo'

/**
 * Sets document title and meta description on route change for SEO.
 * Renders nothing.
 */
export default function PageSEO() {
  const { pathname } = useLocation()

  useEffect(() => {
    const { title, description } = getSEOForPath(pathname)
    document.title = title

    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = description
  }, [pathname])

  return null
}
