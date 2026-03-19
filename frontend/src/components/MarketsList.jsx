import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { SkeletonMarketGrid } from './SkeletonLoader'
import ErrorState from './ErrorState'
import { fetchMarkets } from '../services/marketsApi'
import { useDebounce } from '../utils/useDebounce'
import { MARKET_CATEGORIES, PREDICTION_STYLES, MARKET_SOURCES, getSourceLabel, sourceForFilter, categoryForFilter, getCategoryDisplay, getApiSourceLabel, getCategoryEmoji, getMarketOneLiner, formatResolutionDeadline, DISCOVER_SOURCE_TO_CATEGORY } from '../constants/marketConfig'
import { formatPips } from '../constants/currency'

export default function MarketsList({ source: sourceFromRoute }) {
  const { wallet } = useWallet()
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pollIntervalRef = useRef(null)
  const apiRoutesWorkingRef = useRef(true)
  const isMountedRef = useRef(true)
  
  // Filter states (when on /, allow picking source; when on /discover/:source, fix to that source)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('trending')
  const [selectedTopic, setSelectedTopic] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedSource, setSelectedSource] = useState(sourceFromRoute || 'all')
  const [sortBy, setSortBy] = useState('volume') // 'volume', 'newest', 'oldest', 'ending_soon'
  const [currentPage, setCurrentPage] = useState(1)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const MARKETS_PER_PAGE = 12

  // Keep selectedSource in sync with route (e.g. when navigating to /discover/industry)
  useEffect(() => {
    setSelectedSource(sourceFromRoute || 'all')
  }, [sourceFromRoute])

  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const PACKAGE_ID = 'b87ef31c8ea5c53a940a7f71a4bc6513cf44048730c0551f1fc2e02adc7271f0'
  
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
  
  // Count active filters (trending/all and source from route don't count)
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (debouncedSearchQuery.trim()) count++
    if (selectedCategory !== 'all' && selectedCategory !== 'trending') count++
    if (selectedTopic !== 'all') count++
    if (selectedType !== 'all') count++
    if (selectedStatus !== 'all') count++
    if (!sourceFromRoute && selectedSource !== 'all') count++
    return count
  }, [debouncedSearchQuery, selectedCategory, selectedTopic, selectedType, selectedStatus, selectedSource, sourceFromRoute])

  useEffect(() => {
    isMountedRef.current = true
    
    const loadMarkets = async () => {
      if (!isMountedRef.current || !apiRoutesWorkingRef.current || document.hidden) return

      try {
        const list = await fetchMarkets()
        if (!isMountedRef.current) return
        setMarkets(list)
        setError(null)
        apiRoutesWorkingRef.current = true
      } catch (err) {
        if (!isMountedRef.current) return
        apiRoutesWorkingRef.current = false
        setMarkets([])
        setError(err.message)
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
      // Only start polling if we haven't detected that API routes are broken
      // and if we have markets or if we got a successful empty response
      if (apiRoutesWorkingRef.current && markets.length >= 0) {
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
    
    // Apply source filter (sports, global_events, industry, tech_ai, politics, etc.; category-based sources filter by category)
    const effectiveSource = sourceFromRoute || selectedSource
    if (effectiveSource === 'active') {
      filtered = filtered.filter(market => (market.payload?.totalVolume || 0) > 0)
    } else if (DISCOVER_SOURCE_TO_CATEGORY[effectiveSource]) {
      const category = DISCOVER_SOURCE_TO_CATEGORY[effectiveSource]
      filtered = filtered.filter(market => categoryForFilter(market.payload) === category)
    } else if (effectiveSource !== 'all') {
      filtered = filtered.filter(market => sourceForFilter(market.payload) === effectiveSource)
    }

    // Apply category filter (trending = no category filter, just sort by volume later)
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
    
    // Apply sorting (trending = always by volume). When sorting by volume: markets with volume > 0 first, then by volume desc.
    const effectiveSort = selectedCategory === 'trending' ? 'volume' : sortBy
    filtered.sort((a, b) => {
      if (effectiveSort === 'volume') {
        const aVol = a.payload.totalVolume || 0
        const bVol = b.payload.totalVolume || 0
        const aHas = aVol > 0 ? 1 : 0
        const bHas = bVol > 0 ? 1 : 0
        if (bHas !== aHas) return bHas - aHas
        return bVol - aVol
      } else if (effectiveSort === 'newest') {
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
  }, [markets, debouncedSearchQuery, selectedCategory, selectedTopic, selectedType, selectedStatus, selectedSource, sourceFromRoute, sortBy])

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
  }, [debouncedSearchQuery, selectedCategory, selectedTopic, selectedType, selectedStatus, selectedSource, sortBy])

  const pageTitle = sourceFromRoute ? getSourceLabel(sourceFromRoute) : 'Prediction Markets'
  const pageSubtitle = sourceFromRoute
    ? `Markets from ${getSourceLabel(sourceFromRoute).toLowerCase()}. Trade with AMM-backed liquidity.`
    : 'Trade with virtual Credits (Pips). No crypto required to browse.'

  if (loading) {
    return (
      <div>
        <h1>{pageTitle}</h1>
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
      <div className="page-header">
        <h1>{pageTitle}</h1>
        <p>{pageSubtitle}</p>
      </div>
      
      {/* Filters Section — always show when loaded so discover pages (e.g. Sports, Virtual Realities) show filters even if category is empty */}
      {(!loading && !error) && (
        <div className="card mb-xl filters-card">
          <button
            type="button"
            className="filters-header filters-header-btn"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            aria-expanded={filtersExpanded}
            aria-label={filtersExpanded ? 'Collapse filters' : 'Expand filters'}
          >
            <div className="filters-header-left">
              <h3 className="filters-title">Filters</h3>
              {activeFilterCount > 0 && (
                <span className="filter-badge">{activeFilterCount} active</span>
              )}
            </div>
            <span className={`filters-header-chevron ${filtersExpanded ? 'icon-chevron-up' : 'icon-chevron-down'}`} aria-hidden>
              {filtersExpanded ? '▲' : '▼'}
            </span>
          </button>
          
          {filtersExpanded && (
            <>
              <div className="filters-container">
                {/* Search */}
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

            {/* Source Filter (only when on All Markets; on discover routes source is fixed) */}
            {!sourceFromRoute && (
              <div className="filter-group">
                <label htmlFor="source">Source</label>
                <select
                  id="source"
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="filter-select"
                >
                  {MARKET_SOURCES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Category Filter */}
            <div className="filter-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select"
              >
                <option value="trending">Trending</option>
                <option value="all">All Categories</option>
                {MARKET_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            
            {/* Topic Filter */}
            {availableTopics.length > 0 && (
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
            )}
            
            {/* Type Filter */}
            <div className="filter-group">
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
            
            {/* Status Filter */}
            <div className="filter-group">
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
            
            {/* Sort */}
            <div className="filter-group">
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
              
              {/* Active Filter Badges */}
              {activeFilterCount > 0 && (
                <div className="active-filters">
                  {debouncedSearchQuery && (
                    <span className="filter-chip">
                      Search: "{debouncedSearchQuery}"
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
                  {!sourceFromRoute && selectedSource !== 'all' && (
                    <span className="filter-chip">
                      Source: {getSourceLabel(selectedSource)}
                      <button
                        type="button"
                        onClick={() => setSelectedSource('all')}
                        className="filter-chip-remove"
                        aria-label="Remove source filter"
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
                      setSelectedSource('all')
                      setSortBy('volume')
                    }}
                  >
                    Clear All
                  </button>
                </div>
              )}
              
              {/* Clear Filters Button */}
              {activeFilterCount > 0 && (
                <div className="filters-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-clear-filters"
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedCategory('trending')
                      setSelectedTopic('all')
                      setSelectedType('all')
                      setSelectedStatus('all')
                      setSelectedSource('all')
                      setSortBy('volume')
                    }}
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </>
          )}
          
          {/* Results Count */}
          <div className="filter-results">
            <span className="filter-results-text">
              {totalFiltered === 0
                ? 'No markets match.'
                : <>Showing <strong>{(effectivePage - 1) * MARKETS_PER_PAGE + 1}</strong>–<strong>{Math.min(effectivePage * MARKETS_PER_PAGE, totalFiltered)}</strong> of <strong>{totalFiltered}</strong> markets{totalFiltered !== markets.length && ` (of ${markets.length} total)`}</>}
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
              <Link to="/history">
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
                  {sourceFromRoute && sourceFromRoute !== 'active'
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
                      setSelectedSource('all')
                      setSortBy('volume')
                    }}
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="market-grid">
                {paginatedMarkets.map((market) => {
                  const oneLiner = getMarketOneLiner(market.payload)
                  const categoryLabel = getCategoryDisplay(market.payload)
                  return (
                  <Link
                    key={market.contractId}
                    to={`/market/${market.payload.marketId}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="market-card">
                      <div>
                        <div className="market-card-tags">
                          <span className="market-card-tag market-card-tag-category">
                            {getCategoryEmoji(categoryLabel)} {categoryLabel}
                          </span>
                          <span className="market-card-tag market-card-tag-api">
                            {getApiSourceLabel(market.payload)}
                          </span>
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
                  )
                })}
              </div>
              {totalPages > 1 && (
                <nav className="pagination" aria-label="Markets pagination">
                  <div className="pagination-inner">
                    <button
                      type="button"
                      className="btn-secondary pagination-btn"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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

