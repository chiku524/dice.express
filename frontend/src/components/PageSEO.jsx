import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getSEOForPath } from '../constants/seo'

/** Ensure a meta tag exists; create or update by name or property. */
function setMeta(attr, value, content) {
  const selector = attr === 'name' ? `meta[name="${value}"]` : `meta[property="${value}"]`
  let el = document.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, value)
    document.head.appendChild(el)
  }
  if (content) el.setAttribute('content', content)
}

/** Ensure link rel="canonical" exists and set href. */
function setCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

/**
 * Sets document title, meta description, keywords, Open Graph, Twitter Card, and canonical on route change.
 */
export default function PageSEO() {
  const { pathname } = useLocation()

  useEffect(() => {
    const seo = getSEOForPath(pathname)
    const { title, description, keywords } = seo
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const canonicalUrl = origin ? `${origin}${pathname}` : ''

    document.title = title || 'dice.express'

    setMeta('name', 'description', description)
    if (keywords) setMeta('name', 'keywords', keywords)

    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    if (canonicalUrl) {
      setMeta('property', 'og:url', canonicalUrl)
      setCanonical(canonicalUrl)
    }

    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
  }, [pathname])

  return null
}
