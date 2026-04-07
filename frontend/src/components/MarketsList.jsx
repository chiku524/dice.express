import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { SkeletonMarketGrid, SkeletonMarketList } from './SkeletonLoader'
import LoadingSpinner from './LoadingSpinner'
import ErrorState from './ErrorState'
import { fetchMarkets } from '../services/marketsApi'
import { useDebounce } from '../utils/useDebounce'
import { MARKET_CATEGORIES, getSourceLabel, sourceForFilter, categoryForFilter, getCategoryEmoji, buildMarketShareDescription, DISCOVER_SOURCE_TO_CATEGORY } from '../constants/marketConfig'
import {
  isOutcomeBasedMarket,
  marketCreatedThisWeek,
  readWatchlist,
} from '../utils/marketUX'
import DiscoverMarketEntry from './DiscoverMarketEntry'
import { useToastContext } from '../contexts/ToastContext'
import { getAbsoluteMarketUrl, copyTextToClipboard, canUseWebShare, shareMarketNative } from '../utils/marketLinks'

const MARKETS_CACHE_KEY = 'dice.markets.cache.v1'
const MARKETS_LAYOUT_STORAGE_KEY = 'dice.markets.layout.v1'
const VALID_MARKETS_LAYOUTS = new Set(['cards', 'list', 'compact'])

function readMarketsLayout() {
  try {
    const v = localStorage.getItem(MARKETS_LAYOUT_STORAGE_KEY)
    if (v && VALID_MARKETS_LAYOUTS.has(v)) return v
  } catch {
    /* ignore */
  }
  return 'cards'
}

const CATEGORY_TOGGLE_OPTIONS = [
  { value: 'trending', label: 'Trending' },
  { value: 'all', label: 'All' },
  ...MARKET_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
]

export default function MarketsList({ source: sourceFromRoute, variant = 'default' }) {
  const { showToast } = useToastContext()
  const isWatchlistPage = variant === 'watchlist'
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pollIntervalRef = useRef(null)
  const apiRoutesWorkingRef = useRef(true)
  const isMountedRef = useRef(true)
  const marketsListTopRef = useRef(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('trending')
  const [selectedTopic, setSelectedTopic] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [sortBy, setSortBy] = useState('volume') // 'volume', 'p2p', 'newest', 'oldest', 'ending_soon'
  const [currentPage, setCurrentPage] = useState(1)
  const [retryCount, setRetryCount] = useState(0)
  const [quickFilter, setQuickFilter] = useState('all')
  /** Spotlight row: narrows list without changing sort (composable with Quick filters). */
  const [stripFilter, setStripFilter] = useState('all')
  const [fromCacheBanner, setFromCacheBanner] = useState(false)
  const [watchListVersion, setWatchListVersion] = useState(0)
  /** `marketId` of card with expanded quick trade (Discover / categories / watchlist). */
  const [expandedQuickTradeId, setExpandedQuickTradeId] = useState(null)
  /** When opening from a card chip, seed Yes/No or multi outcome (see MarketQuickTrade `key`). */
  const [quickTradeSeed, setQuickTradeSeed] = useState(null)
  const [marketsLayout, setMarketsLayout] = useState(() => readMarketsLayout())
  const sortUserOverrideRef = useRef(false)
  const MARKETS_PER_PAGE = 12

  const copyCardMarketLink = useCallback(
    async (id, titleHint) => {
      const url = getAbsoluteMarketUrl(id)
      if (!url) return
      const ok = await copyTextToClipboard(url)
      if (ok) showToast('Market link copied to clipboard', 'success')
      else {
        showToast(
          titleHint
            ? `Could not copy — open "${titleHint.slice(0, 40)}${titleHint.length > 40 ? '…' : ''}" and use Copy link`
            : 'Could not copy — open the market page and use Copy link',
          'error'
        )
      }
    },
    [showToast]
  )

  const webShareEnabled = useMemo(() => canUseWebShare(), [])

  const shareCardMarket = useCallback(
    async (payload) => {
      const id = payload?.marketId
      const url = getAbsoluteMarketUrl(id)
      if (!url) return
      const result = await shareMarketNative({
        title: payload?.title?.trim() || 'Prediction market',
        text: buildMarketShareDescription(payload),
        url,
      })
      if (!result.ok && result.reason === 'error') {
        showToast('Could not open the share sheet — try Copy link instead', 'error')
      }
    },
    [showToast]
  )

  const refreshMarketsList = useCallback(async () => {
    try {
      const list = await fetchMarkets(null, { sort: 'activity' })
      setMarkets(list)
      setError(null)
      setFromCacheBanner(false)
      try {
        localStorage.setItem(MARKETS_CACHE_KEY, JSON.stringify(list))
      } catch {
        /* ignore */
      }
      apiRoutesWorkingRef.current = true
    } catch (err) {
      console.warn('[MarketsList] refresh after trade failed', err?.message)
    }
  }, [])

  useEffect(() => {
    setExpandedQuickTradeId(null)
    setQuickTradeSeed(null)
  }, [currentPage])

  useEffect(() => {
    try {
      localStorage.setItem(MARKETS_LAYOUT_STORAGE_KEY, marketsLayout)
    } catch {
      /* ignore */
    }
  }, [marketsLayout])

  /** Discover routes narrow by source; home (/) shows all sources. */
  const listSourceFilter = sourceFromRoute || 'all'

  useEffect(() => {
    if (isWatchlistPage) setQuickFilter('watchlist')
  }, [isWatchlistPage])

  useEffect(() => {
    sortUserOverrideRef.current = false
  }, [sourceFromRoute, variant])

  useEffect(() => {
    if (sortUserOverrideRef.current || isWatchlistPage) return
    const src = sourceFromRoute || 'all'
    if (src === 'sports') setSortBy('ending_soon')
    else if (src === 'industry') setSortBy('p2p')
    else if (DISCOVER_SOURCE_TO_CATEGORY[src]) setSortBy('newest')
    else if (src === 'global_events' || src === 'virtual_realities' || src === 'user') setSortBy('newest')
    else setSortBy('volume')
  }, [sourceFromRoute, variant, isWatchlistPage])

  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Extract unique topics from markets
  // Topics can come from payload.topic or be extracted from title/description
  const availableTopics = useMemo(() => {
    const topics = new Set()
    markets.forEach(market => {
      // Check for explicit topic field
      if (market.payload.topic) {
        topics.add(market.payload.topic)
      }
      // Extract topic from title if it follows a pattern like "[Topic] Question"
      const titleMatch = market.payload.title?.match(/^\[([^\]]+)\]/)
      if (titleMatch) {
        topics.add(titleMatch[1])
      }
    })
    return Array.from(topics).sort()
  }, [markets])
  
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (debouncedSearchQuery.trim()) count++
    if (selectedCategory !== 'all' && selectedCategory !== 'trending') count++
    if (selectedTopic !== 'all') count++
    if (selectedType !== 'all') count++
    if (selectedStatus !== 'all') count++
    const quickCounts =
      quickFilter !== 'all' && !(isWatchlistPage && quickFilter === 'watchlist')
    if (quickCounts) count++
    if (stripFilter !== 'all') count++
    return count
  }, [debouncedSearchQuery, selectedCategory, selectedTopic, selectedType, selectedStatus, quickFilter, stripFilter, isWatchlistPage])

  useEffect(() => {
    isMountedRef.current = true
    
    const loadMarkets = async () => {
      if (!isMountedRef.current || !apiRoutesWorkingRef.current || document.hidden) return

      try {
        const list = await fetchMarkets(null, { sort: 'activity' })
        if (!isMountedRef.current) return
        setMarkets(list)
        setError(null)
        setFromCacheBanner(false)
        try {
          localStorage.setItem(MARKETS_CACHE_KEY, JSON.stringify(list))
        } catch {
          /* ignore quota / private mode */
        }
        apiRoutesWorkingRef.current = true
      } catch (err) {
        if (!isMountedRef.current) return
        apiRoutesWorkingRef.current = false
        try {
          const raw = localStorage.getItem(MARKETS_CACHE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMarkets(parsed)
              setFromCacheBanner(true)
              setError(null)
              apiRoutesWorkingRef.current = true
            } else {
              setMarkets([])
              setFromCacheBanner(false)
              setError(err.message)
            }
          } else {
            setMarkets([])
            setFromCacheBanner(false)
            setError(err.message)
          }
        } catch {
          setMarkets([])
          setFromCacheBanner(false)
          setError(err.message)
        }
      } finally {
        if (isMountedRef.current) setLoading(false)
      }
    }

    loadMarkets()

    // Only poll if API routes are working and tab is visible
    // Poll for updates every 30 seconds (increased to reduce load)
    // Use a flag to prevent setting up polling if API routes are already known to be broken
    const setupPolling = () => {
      if (apiRoutesWorkingRef.current && !pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          // Only poll if tab is visible and API routes are still working
          if (!document.hidden && apiRoutesWorkingRef.current) {
            loadMarkets()
          } else if (!apiRoutesWorkingRef.current) {
            // Stop polling if API routes are broken
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
          }
        }, 30000) // 30 seconds
      }
    }
    
    // Delay polling setup to allow initial fetch to complete and check if it succeeded
    // Only start polling if we got a successful response (even if empty)
    const pollingTimeout = setTimeout(() => {
      // Start polling once initial fetch path is known working (empty list is valid).
      if (apiRoutesWorkingRef.current) {
        setupPolling()
      }
    }, 3000) // Wait 3 seconds before starting to poll

    // Handle visibility change - pause/resume polling
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden, pause polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      } else {
        // Tab is visible, resume polling if API routes are working
        if (apiRoutesWorkingRef.current && !pollIntervalRef.current) {
          loadMarkets()
          setupPolling()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMountedRef.current = false
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      if (pollingTimeout) {
        clearTimeout(pollingTimeout)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [retryCount])

  // WebSocket support removed - using polling instead

  const getStatusClass = useMemo(() => {
    const statusMap = {
      Active: 'status-active',
      Resolving: 'status-resolving',
      Settled: 'status-settled',
      PendingApproval: 'status-pending',
      AutoPending: 'status-pending',
      AutoRejected: 'status-pending',
    }
    return (status) => statusMap[status] || 'status-pending'
  }, [])

  // Memoize filtered/sorted markets for performance
  const filteredAndSortedMarkets = useMemo(() => {
    let filtered = [...markets]
    
    // Apply search filter (using debounced value)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase()
      filtered = filtered.filter(market => 
        market.payload.title?.toLowerCase().includes(query) ||
        market.payload.description?.toLowerCase().includes(query) ||
        market.payload.marketId?.toLowerCase().includes(query)
      )
    }
    
    const effectiveSource = listSourceFilter
    if (effectiveSource === 'active') {
      filtered = filtered.filter(market => (market.payload?.totalVolume || 0) > 0)
    } else if (DISCOVER_SOURCE_TO_CATEGORY[effectiveSource]) {
      const category = DISCOVER_SOURCE_TO_CATEGORY[effectiveSource]
      filtered = filtered.filter(market => categoryForFilter(market.payload) === category)
    } else if (effectiveSource !== 'all') {
      filtered = filtered.filter(market => sourceForFilter(market.payload) === effectiveSource)
    }

    if (selectedCategory !== 'all' && selectedCategory !== 'trending') {
      filtered = filtered.filter(market => categoryForFilter(market.payload) === selectedCategory)
    }

    // Apply topic filter
    if (selectedTopic !== 'all') {
      filtered = filtered.filter(market => {
        // Check explicit topic field
        if (market.payload.topic === selectedTopic) return true
        // Check if topic is in title pattern [Topic]
        const titleMatch = market.payload.title?.match(/^\[([^\]]+)\]/)
        if (titleMatch && titleMatch[1] === selectedTopic) return true
        return false
      })
    }
    
    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(market => {
        if (selectedType === 'binary') return market.payload.marketType === 'Binary'
        if (selectedType === 'multi') return market.payload.marketType === 'MultiOutcome'
        return true
      })
    }
    
    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(market => market.payload.status === selectedStatus)
    }

    if (quickFilter === 'outcome_only') {
      filtered = filtered.filter((m) => isOutcomeBasedMarket(m.payload))
    }
    if (quickFilter === 'new_week') {
      filtered = filtered.filter((m) => marketCreatedThisWeek(m.payload))
    }
    if (quickFilter === 'high_vol') {
      filtered = filtered.filter((m) => (parseFloat(m.payload?.totalVolume) || 0) >= 25)
    }
    if (quickFilter === 'watchlist') {
      const w = readWatchlist()
      filtered = filtered.filter(
        (m) => w.includes(m.contractId) || w.includes(m.payload?.marketId)
      )
    }

    if (stripFilter === 'new_24h') {
      const cutoff = Date.now() - 24 * 3600 * 1000
      filtered = filtered.filter((m) => {
        const t = m.payload?.createdAt ? new Date(m.payload.createdAt).getTime() : 0
        return t >= cutoff
      })
    }
    if (stripFilter === 'resolves_48h') {
      const now = Date.now()
      const end = now + 48 * 3600 * 1000
      filtered = filtered.filter((m) => {
        const d = m.payload?.resolutionDeadline
        if (!d) return false
        const t = new Date(d).getTime()
        return t >= now && t <= end
      })
    }
    if (stripFilter === 'hot_p2p') {
      filtered = filtered.filter((m) => (m.openOrderCount || 0) >= 2)
    }
    
    const effectiveSort = selectedCategory === 'trending' ? 'trending_blend' : sortBy
    filtered.sort((a, b) => {
      if (effectiveSort === 'trending_blend') {
        const aO = a.openOrderCount || 0
        const bO = b.openOrderCount || 0
        if (bO !== aO) return bO - aO
        const aVol = a.payload.totalVolume || 0
        const bVol = b.payload.totalVolume || 0
        const aHas = aVol > 0 ? 1 : 0
        const bHas = bVol > 0 ? 1 : 0
        if (bHas !== aHas) return bHas - aHas
        return bVol - aVol
      }
      if (effectiveSort === 'volume') {
        const aVol = a.payload.totalVolume || 0
        const bVol = b.payload.totalVolume || 0
        const aHas = aVol > 0 ? 1 : 0
        const bHas = bVol > 0 ? 1 : 0
        if (bHas !== aHas) return bHas - aHas
        return bVol - aVol
      }
      if (effectiveSort === 'p2p') {
        const aO = a.openOrderCount || 0
        const bO = b.openOrderCount || 0
        if (bO !== aO) return bO - aO
        return (b.payload.totalVolume || 0) - (a.payload.totalVolume || 0)
      }
      if (effectiveSort === 'newest') {
        return b.contractId.localeCompare(a.contractId)
      } else if (effectiveSort === 'oldest') {
        return a.contractId.localeCompare(b.contractId)
      } else if (effectiveSort === 'ending_soon') {
        const aDeadline = a.payload?.resolutionDeadline ? new Date(a.payload.resolutionDeadline).getTime() : Infinity
        const bDeadline = b.payload?.resolutionDeadline ? new Date(b.payload.resolutionDeadline).getTime() : Infinity
        return aDeadline - bDeadline
      }
      const statusOrder = { Active: 0, Resolving: 1, PendingApproval: 2, Settled: 3 }
      const statusDiff = (statusOrder[a.payload.status] || 99) - (statusOrder[b.payload.status] || 99)
      if (statusDiff !== 0) return statusDiff
      return (b.payload.totalVolume || 0) - (a.payload.totalVolume || 0)
    })

    return filtered
  },
  // eslint-disable-next-line react-hooks/exhaustive-deps -- watchListVersion invalidates watchlist filter without appearing in body
  [markets, debouncedSearchQuery, selectedCategory, selectedTopic, selectedType, selectedStatus, listSourceFilter, sortBy, quickFilter, stripFilter, watchListVersion])

  // Pagination: slice to current page and reset page when results change
  const totalFiltered = filteredAndSortedMarkets.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / MARKETS_PER_PAGE))
  const effectivePage = Math.min(currentPage, totalPages)
  const paginatedMarkets = useMemo(() => {
    const start = (effectivePage - 1) * MARKETS_PER_PAGE
    return filteredAndSortedMarkets.slice(start, start + MARKETS_PER_PAGE)
  }, [filteredAndSortedMarkets, effectivePage])

  // Reset to page 1 when filters or sort change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchQuery, selectedCategory, selectedTopic, selectedType, selectedStatus, sortBy, quickFilter, stripFilter])

  const pageTitle = isWatchlistPage
    ? 'Watchlist'
    : sourceFromRoute
      ? getSourceLabel(sourceFromRoute)
      : 'Prediction Markets'
  const pageSubtitle = isWatchlistPage
    ? (
      <>
        Markets you have starred on this device. Turn on watchlist alerts under{' '}
        <Link to="/profile#notification-settings">Profile → Notification settings</Link>.
      </>
    )
    : sourceFromRoute
      ? `Markets from ${getSourceLabel(sourceFromRoute).toLowerCase()}. Trade with Pips — P2P orders; pool liquidity varies by market.`
      : 'Trade with Pips. Browse markets, place P2P orders, or use the pool when liquidity is available.'

  const scrollMarketsListToTop = () => {
    requestAnimationFrame(() => {
      marketsListTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  if (loading) {
    return (
      <div>
        <h1>{pageTitle}</h1>
        <div className="markets-list-loading-dice">
          <LoadingSpinner
            message="Loading markets…"
            sublabel="Fetching the latest markets."
            progressSteps={['Rolling the dice…', 'Syncing markets…', 'Applying filters…', 'Almost ready…']}
          />
        </div>
        {marketsLayout === 'cards' ? <SkeletonMarketGrid count={6} /> : <SkeletonMarketList count={8} />}
      </div>
    )
  }

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    apiRoutesWorkingRef.current = true
    setRetryCount((c) => c + 1)
  }

  if (error) {
    return (
      <div className="card">
        <ErrorState
          title="Error loading markets"
          message={`${error} Check your connection or set VITE_API_ORIGIN in .env when running locally.`}
          onRetry={handleRetry}
          retryLabel="Try again"
        />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header" ref={marketsListTopRef}>
        <h1>{pageTitle}</h1>
        <p>{pageSubtitle}</p>
      </div>

      {fromCacheBanner && (
        <div className="alert-info mb-md" role="status">
          Showing saved markets from your last successful load. Reconnect to refresh live data.
        </div>
      )}
      
      {/* Filters: always visible; Market Type, Status, Sort as separate dropdowns above the grid */}
      {(!loading && !error) && (
        <div className="card mb-xl filters-card markets-filters-card">
          {!isWatchlistPage && (
            <div className="markets-spotlight-strip" role="group" aria-label="Quick discovery">
              <span className="markets-spotlight-label">Spotlight</span>
              {[
                { id: 'new_24h', label: 'New (24h)' },
                { id: 'resolves_48h', label: 'Resolves in 48h' },
                { id: 'hot_p2p', label: 'Hot P2P (2+ orders)' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`markets-spotlight-btn${stripFilter === id ? ' markets-spotlight-btn--active' : ''}`}
                  aria-pressed={stripFilter === id}
                  onClick={() => {
                    setStripFilter((f) => (f === id ? 'all' : id))
                    setCurrentPage(1)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="markets-filters-toolbar">
            <div className="filter-group filter-group-full">
              <label htmlFor="search">
                <span>Search Markets</span>
                {searchQuery && (
                  <button
                    type="button"
                    className="filter-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </label>
              <input
                id="search"
                type="text"
                placeholder="Search title, description, or market ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="markets-category-toggles" role="group" aria-label="Category">
              <span className="markets-category-toggles-label" id="markets-category-label">
                Category
              </span>
              <div className="markets-category-toggles-row" aria-labelledby="markets-category-label">
                {CATEGORY_TOGGLE_OPTIONS.map((opt) => {
                  const isActive = selectedCategory === opt.value
                  const emoji =
                    opt.value === 'trending' ? '🔥' : opt.value === 'all' ? '🌐' : getCategoryEmoji(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`markets-category-toggle${isActive ? ' markets-category-toggle--active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => setSelectedCategory(opt.value)}
                    >
                      <span className="markets-category-toggle-emoji" aria-hidden>
                        {emoji}
                      </span>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {availableTopics.length > 0 && (
              <div className="filters-container markets-filters-secondary">
                <div className="filter-group">
                  <label htmlFor="topic">Topic</label>
                  <select
                    id="topic"
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Topics</option>
                    {availableTopics.map(topic => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {!isWatchlistPage && (
              <div className="markets-quick-filters mb-md" role="group" aria-label="Quick filters">
                <span className="markets-category-toggles-label">Quick</span>
                <div className="markets-quick-filters-row">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'outcome_only', label: 'Outcome-based' },
                    { value: 'new_week', label: 'New (7d)' },
                    { value: 'high_vol', label: 'Volume 25+' },
                    { value: 'watchlist', label: 'Watchlist' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`markets-quick-filter-btn${quickFilter === opt.value ? ' markets-quick-filter-btn--active' : ''}`}
                      aria-pressed={quickFilter === opt.value}
                      onClick={() => setQuickFilter(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div
              className="markets-filters-quick-row"
              role="group"
              aria-label="Market type, status, and sort"
            >
              <div className="markets-filter-dropdown">
                <label htmlFor="type">Market Type</label>
                <select
                  id="type"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Types</option>
                  <option value="binary">Binary</option>
                  <option value="multi">Multi-Outcome</option>
                </select>
              </div>
              <div className="markets-filter-dropdown">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Resolving">Resolving</option>
                  <option value="Settled">Settled</option>
                  <option value="PendingApproval">Pending Approval</option>
                </select>
              </div>
              <div className="markets-filter-dropdown">
                <label htmlFor="sort">Sort By</label>
                <select
                  id="sort"
                  value={sortBy}
                  onChange={(e) => {
                    sortUserOverrideRef.current = true
                    setSortBy(e.target.value)
                  }}
                  className="filter-select"
                >
                  <option value="volume">Volume (High to Low)</option>
                  <option value="p2p">P2P activity (open orders)</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="ending_soon">Ending Soon</option>
                </select>
              </div>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="active-filters">
              {debouncedSearchQuery && (
                <span className="filter-chip">
                  Search: &quot;{debouncedSearchQuery}&quot;
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="filter-chip-remove"
                    aria-label="Remove search filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedCategory !== 'all' && selectedCategory !== 'trending' && (
                <span className="filter-chip">
                  Category: {selectedCategory}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('trending')}
                    className="filter-chip-remove"
                    aria-label="Remove category filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedTopic !== 'all' && (
                <span className="filter-chip">
                  Topic: {selectedTopic}
                  <button
                    type="button"
                    onClick={() => setSelectedTopic('all')}
                    className="filter-chip-remove"
                    aria-label="Remove topic filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedType !== 'all' && (
                <span className="filter-chip">
                  Type: {selectedType === 'binary' ? 'Binary' : 'Multi-Outcome'}
                  <button
                    type="button"
                    onClick={() => setSelectedType('all')}
                    className="filter-chip-remove"
                    aria-label="Remove type filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedStatus !== 'all' && (
                <span className="filter-chip">
                  Status: {selectedStatus}
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('all')}
                    className="filter-chip-remove"
                    aria-label="Remove status filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {stripFilter !== 'all' && (
                <span className="filter-chip">
                  Spotlight:{' '}
                  {stripFilter === 'new_24h'
                    ? 'New (24h)'
                    : stripFilter === 'resolves_48h'
                      ? 'Resolves in 48h'
                      : 'Hot P2P'}
                  <button
                    type="button"
                    onClick={() => setStripFilter('all')}
                    className="filter-chip-remove"
                    aria-label="Remove spotlight filter"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                type="button"
                className="filter-chip-clear-all"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('trending')
                  setSelectedTopic('all')
                  setSelectedType('all')
                  setSelectedStatus('all')
                  setSortBy('volume')
                  setQuickFilter(isWatchlistPage ? 'watchlist' : 'all')
                  setStripFilter('all')
                  sortUserOverrideRef.current = false
                }}
              >
                Clear All
              </button>
            </div>
          )}

          <div className="filter-results filter-results--markets">
            <div className="filter-results-row">
              <span className="filter-results-text">
                {activeFilterCount > 0 && (
                  <span className="filter-badge filter-badge--inline">{activeFilterCount} active</span>
                )}
                {totalFiltered === 0
                  ? 'No markets match.'
                  : (
                    <>
                      Showing <strong>{(effectivePage - 1) * MARKETS_PER_PAGE + 1}</strong>–<strong>{Math.min(effectivePage * MARKETS_PER_PAGE, totalFiltered)}</strong> of <strong>{totalFiltered}</strong> markets{totalFiltered !== markets.length && ` (of ${markets.length} total)`}
                    </>
                  )}
              </span>
              <div className="markets-layout-picker" role="group" aria-label="Market layout">
                <span className="markets-layout-picker-label" id="markets-layout-label">
                  View
                </span>
                <div className="markets-layout-picker-btns" aria-labelledby="markets-layout-label">
                  {[
                    { value: 'cards', label: 'Cards', title: 'Grid of cards' },
                    { value: 'list', label: 'List', title: 'Rows with topic text' },
                    { value: 'compact', label: 'Compact', title: 'Dense rows' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`markets-layout-btn${marketsLayout === opt.value ? ' markets-layout-btn--active' : ''}`}
                      aria-pressed={marketsLayout === opt.value}
                      title={opt.title}
                      onClick={() => setMarketsLayout(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {activeFilterCount > 0 && filteredAndSortedMarkets.length === 0 && (
              <span className="filter-no-results">
                No markets match your filters. Try adjusting your criteria.
              </span>
            )}
          </div>
        </div>
      )}
      {!apiRoutesWorkingRef.current ? (
        <div className="card">
          <div className="alert-warning">
            <h3>Markets API unavailable</h3>
            <p>Could not load markets. Check your connection and that the API (Cloudflare) is reachable.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
              <button type="button" className="btn-primary" onClick={handleRetry}>
                Try again
              </button>
              <Link to="/activity">
                <button className="btn-secondary">View History</button>
              </Link>
            </div>
          </div>
        </div>
      ) : markets.length === 0 ? (
        <div className="card">
          <p>No markets available yet. Markets are added automatically — check back soon or try clearing filters.</p>
          <Link to="/">
            <button className="btn-primary mt-md">View all markets</button>
          </Link>
        </div>
      ) : (
        <>
          {filteredAndSortedMarkets.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-content">
                <h3>No markets found</h3>
                <p>
                  {isWatchlistPage
                    ? readWatchlist().length === 0
                      ? 'You have not starred any markets yet. Browse all markets and use the star on a card to add it here.'
                      : activeFilterCount > 0
                        ? 'No watched markets match your current filters. Try clearing search or other filters.'
                        : 'None of your watched markets appear in the current list. They may have been removed, or try refreshing after reconnecting.'
                    : sourceFromRoute && sourceFromRoute !== 'active'
                      ? `No markets in "${getSourceLabel(sourceFromRoute)}" yet. Markets are added automatically — check back soon or browse All Markets.`
                      : activeFilterCount > 0
                        ? 'No markets match your current filters. Try adjusting your search criteria.'
                        : 'No markets available yet. Markets are added automatically — check back soon or try clearing filters.'}
                </p>
                <Link to="/">
                  <button className="btn-primary mt-md" style={{ marginRight: 'var(--spacing-sm)' }}>
                    All Markets
                  </button>
                </Link>
                {activeFilterCount > 0 && (
                  <button
                    className="btn-secondary mt-md"
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedCategory('trending')
                      setSelectedTopic('all')
                      setSelectedType('all')
                      setSelectedStatus('all')
                      setSortBy('volume')
                      setQuickFilter(isWatchlistPage ? 'watchlist' : 'all')
                      setStripFilter('all')
                      sortUserOverrideRef.current = false
                    }}
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div
                className={
                  marketsLayout === 'cards'
                    ? 'market-grid market-grid--below-toolbar'
                    : 'market-list market-list--below-toolbar'
                }
              >
                {paginatedMarkets.map((market) => (
                  <DiscoverMarketEntry
                    key={market.contractId}
                    layout={marketsLayout}
                    market={market}
                    getStatusClass={getStatusClass}
                    webShareEnabled={webShareEnabled}
                    expandedQuickTradeId={expandedQuickTradeId}
                    quickTradeSeed={quickTradeSeed}
                    setExpandedQuickTradeId={setExpandedQuickTradeId}
                    setQuickTradeSeed={setQuickTradeSeed}
                    copyCardMarketLink={copyCardMarketLink}
                    shareCardMarket={shareCardMarket}
                    refreshMarketsList={refreshMarketsList}
                    onWatchlistChanged={() => setWatchListVersion((t) => t + 1)}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <nav className="pagination" aria-label="Markets pagination">
                  <div className="pagination-inner">
                    <button
                      type="button"
                      className="btn-secondary pagination-btn"
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1))
                        scrollMarketsListToTop()
                      }}
                      disabled={effectivePage === 1}
                      aria-label="Previous page"
                    >
                      Previous
                    </button>
                    <span className="pagination-info">
                      Page <strong>{effectivePage}</strong> of <strong>{totalPages}</strong>
                    </span>
                    <button
                      type="button"
                      className="btn-secondary pagination-btn"
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                        scrollMarketsListToTop()
                      }}
                      disabled={effectivePage === totalPages}
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </div>
                </nav>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

