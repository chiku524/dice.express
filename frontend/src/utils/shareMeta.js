/**
 * Share / SEO tags for crawlers and link previews.
 * Route-level PageSEO resets these on pathname change; market detail applies richer values while viewing a market.
 */

export function setShareDescription(description) {
  if (typeof document === 'undefined' || !description) return
  const pairs = [
    ['meta[property="og:description"]', 'content'],
    ['meta[name="description"]', 'content'],
    ['meta[name="twitter:description"]', 'content'],
  ]
  for (const [sel, attr] of pairs) {
    const el = document.querySelector(sel)
    if (el) el.setAttribute(attr, description)
  }
}

function setMetaProperty(property, content) {
  if (typeof document === 'undefined' || !content) return
  const el = document.querySelector(`meta[property="${property}"]`)
  if (el) el.setAttribute('content', content)
}

function setMetaName(name, content) {
  if (typeof document === 'undefined' || !content) return
  const el = document.querySelector(`meta[name="${name}"]`)
  if (el) el.setAttribute('content', content)
}

/**
 * @param {{ description?: string, canonicalUrl?: string, ogTitle?: string }} opts
 */
export function applyMarketPageShareMeta({ description, canonicalUrl, ogTitle }) {
  if (typeof document === 'undefined') return
  if (description) setShareDescription(description)
  if (canonicalUrl) {
    let link = document.querySelector('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
    }
    link.setAttribute('href', canonicalUrl)
    setMetaProperty('og:url', canonicalUrl)
  }
  if (ogTitle) {
    setMetaProperty('og:title', ogTitle)
    setMetaName('twitter:title', ogTitle)
  }
}
