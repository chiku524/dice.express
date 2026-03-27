import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { SkeletonMarketGrid } from './SkeletonLoader'
import LoadingSpinner from './LoadingSpinner'
import ErrorState from './ErrorState'
import { fetchMarkets } from '../services/marketsApi'
import { useDebounce } from '../utils/useDebounce'
import { MARKET_CATEGORIES, PREDICTION_STYLES, getSourceLabel, sourceForFilter, categoryForFilter, getCategoryDisplay, getMarketApiAttribution, getCategoryEmoji, getMarketOneLiner, formatResolutionDeadline, DISCOVER_SOURCE_TO_CATEGORY } from '../constants/marketConfig'
import { formatPips } from '../constants/currency'
import {
  isOutcomeBasedMarket,
  getMarketStaleness,
  marketCreatedThisWeek,
  readWatchlist,
  toggleWatchlist,
  isWatched,
} from '../utils/marketUX'

const MARKETS_CACHE_KEY = 'dice.markets.cache.v1'

const CATEGORY_TOGGLE_OPTIONS = [
  { value: 'trending', label: 'Trending' },
  { value: 'all', label: 'All' },
  ...MARKET_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
]

export default function MarketsList({ source: sourceFromRoute, variant = 'default' }) {
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
  const [fromCacheBanner, setFromCacheBanner] = useState(false)
  const [watchListVersion, setWatchListVersion] = useState(0)
  const MARKETS_PER_PAGE = 12

  /** Discover routes narrow by source; home (/) shows all sources. */
  const listSourceFilter = sourceFromRoute || 'all'

  useEffect(() => {
    if (isWatchlistPage) setQuickFilter('watchlist')
  }, [isWatchlistPage])

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
    return count
  }, [debouncedSearchQuery, selectedCategory, selectedTopic, selectedType, selectedStatus, quickFilter, isWatchlistPage])

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
  [markets, debouncedSearchQuery, selectedCategory, selectedTopic, selectedType, selectedStatus, listSourceFilter, sortBy, quickFilter, watchListVersion])

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
  }, [debouncedSearchQuery, selectedCategory, selectedTopic, selectedType, selectedStatus, sortBy, quickFilter])

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
      ? `Markets from ${getSourceLabel(sourceFromRoute).toLowerCase()}. P2P limit orders match peer-to-peer; pools may have zero liquidity.`
      : 'Trade with virtual Credits (Pips). P2P limit orders; browse without crypto.'

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
          <LoadingSpinner message="Loading markets…" sublabel="Fetching the latest markets." />
        </div>
        <SkeletonMarketGrid count={6} />
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
                placeholder="Search by title, description, or market ID..."
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
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select"
                >
                  <option value="volume">Volume (High to Low)</option>
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
                }}
              >
                Clear All
              </button>
            </div>
          )}

          <div className="filter-results filter-results--markets">
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
                    }}
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="market-grid market-grid--below-toolbar">
                {paginatedMarkets.map((market) => {
                  const oneLiner = getMarketOneLiner(market.payload)
                  const categoryLabel = getCategoryDisplay(market.payload)
                  const apiAttr = getMarketApiAttribution(market.payload)
                  const stale = getMarketStaleness(market.payload)
                  const watched = isWatched(market.contractId) || isWatched(market.payload?.marketId)
                  return (
                  <div key={market.contractId} className="market-card-wrap">
                    <button
                      type="button"
                      className={`market-card-watch${watched ? ' market-card-watch--on' : ''}`}
                      title={watched ? 'Remove from watchlist' : 'Watchlist (saved in this browser)'}
                      aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleWatchlist(market.payload?.marketId || market.contractId)
                        setWatchListVersion((t) => t + 1)
                      }}
                    >
                      {watched ? '★' : '☆'}
                    </button>
                  <Link
                    to={`/market/${market.payload.marketId}`}
                    className="market-card-link"
                  >
                    <div className="market-card">
                      <div>
                        <div className="market-card-tags">
                          <span className="market-card-tag market-card-tag-category">
                            {getCategoryEmoji(categoryLabel)} {categoryLabel}
                          </span>
                          {(market.openOrderCount || 0) > 0 && (
                            <span
                              className="market-card-tag market-card-tag-p2p"
                              title="Open P2P limit orders on the book"
                            >
                              P2P · {market.openOrderCount} open
                            </span>
                          )}
                          {apiAttr.same ? (
                            <span
                              className="market-card-tag market-card-tag-api"
                              title="Data source for creating and resolving this market"
                            >
                              {apiAttr.creation}
                            </span>
                          ) : (
                            <>
                              <span
                                className="market-card-tag market-card-tag-creation"
                                title="Feed/API used when this market was created"
                              >
                                Create · {apiAttr.creation}
                              </span>
                              <span
                                className="market-card-tag market-card-tag-resolution"
                                title="Data source or process used to resolve this market"
                              >
                                Resolve · {apiAttr.resolution}
                              </span>
                            </>
                          )}
                          {stale === 'pending_resolution' && (
                            <span className="market-card-tag market-card-tag-stale" title="Past resolution time">
                              Pending resolution
                            </span>
                          )}
                        </div>
                        <h3>{market.payload.title}</h3>
                        <span className={`status ${getStatusClass(market.payload.status)}`}>
                          {market.payload.status}
                        </span>
                      </div>
                      <p className="market-card-oneliner" title={oneLiner}>
                        🎯 {oneLiner.length > 72 ? oneLiner.slice(0, 72).trim() + '…' : oneLiner}
                      </p>
                      <p className="mt-md market-card-desc">
                        {market.payload.description ? (market.payload.description.length > 120 ? market.payload.description.substring(0, 120).trim() + '…' : market.payload.description) : ''}
                      </p>
                      {market.payload.resolutionDeadline && (
                        <p className="market-card-resolves" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-teal)', marginTop: 'var(--spacing-xs)' }}>
                          ⏱️ Resolves by {formatResolutionDeadline(market.payload.resolutionDeadline, true)}
                        </p>
                      )}
                      <div className="mt-md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <span className="text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                          Volume: {formatPips(market.payload.totalVolume ?? 0)}
                        </span>
                        <span className="text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                          {market.payload.marketType === 'Binary' ? (PREDICTION_STYLES.find(s => s.value === market.payload?.styleLabel)?.label || 'Binary') : 'Multi-Outcome'}
                        </span>
                      </div>
                    </div>
                  </Link>
                  </div>
                  )
                })}
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

