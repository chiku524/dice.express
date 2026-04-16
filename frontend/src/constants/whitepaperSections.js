/**
 * Whitepaper sections — hash routing on `/whitepaper` (same pattern as Documentation).
 */
export const WHITEPAPER_PATH = '/whitepaper'

export const WHITEPAPER_SECTIONS = [
  { id: 'abstract', title: 'Abstract' },
  { id: 'introduction', title: 'Introduction' },
  { id: 'pips-economy', title: 'Pips & economy' },
  { id: 'markets-resolution', title: 'Markets & resolution' },
  { id: 'trading', title: 'Trading & liquidity' },
  { id: 'automation', title: 'Automation & feeds' },
  { id: 'architecture', title: 'Architecture' },
  { id: 'security', title: 'Security & trust' },
  { id: 'governance', title: 'Governance & roadmap' },
  { id: 'risks', title: 'Risks & limitations' },
  { id: 'glossary', title: 'Glossary' },
]

export function whitepaperHashToSectionId(hash) {
  let raw = typeof hash === 'string' ? hash.replace(/^#/, '').trim() : ''
  if (!raw) return 'abstract'
  try {
    raw = decodeURIComponent(raw)
  } catch {
    /* keep raw */
  }
  return WHITEPAPER_SECTIONS.some((s) => s.id === raw) ? raw : 'abstract'
}
