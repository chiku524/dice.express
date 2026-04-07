import { Link } from 'react-router-dom'
import {
  PREDICTION_STYLES,
  getCategoryDisplay,
  getMarketApiAttribution,
  getCategoryEmoji,
  getMarketOneLiner,
  getCardResolutionLine,
  getMarketDataConfidence,
  oneLinerAddsBeyondTitle,
} from '../constants/marketConfig'
import { formatPips } from '../constants/currency'
import { getMarketStaleness, toggleWatchlist, isWatched } from '../utils/marketUX'
import MarketQuickTrade from './MarketQuickTrade'
import { getAbsoluteMarketUrl } from '../utils/marketLinks'

/** Single market row/card on the discover list (layout: cards | list | compact). */
export default function DiscoverMarketEntry({
  layout,
  market,
  getStatusClass,
  webShareEnabled,
  expandedQuickTradeId,
  quickTradeSeed,
  setExpandedQuickTradeId,
  setQuickTradeSeed,
  copyCardMarketLink,
  shareCardMarket,
  refreshMarketsList,
  onWatchlistChanged,
}) {
  const oneLiner = getMarketOneLiner(market.payload)
  const categoryLabel = getCategoryDisplay(market.payload)
  const apiAttr = getMarketApiAttribution(market.payload)
  const stale = getMarketStaleness(market.payload)
  const confidence = getMarketDataConfidence(market.payload, market.openOrderCount || 0)
  const resolveLine = getCardResolutionLine(market.payload)
  const watched = isWatched(market.contractId) || isWatched(market.payload?.marketId)
  const mid = market.payload?.marketId
  const quickOpen = Boolean(mid && expandedQuickTradeId === mid)
  const apiTooltip = apiAttr.same
    ? `Data source: ${apiAttr.creation}`
    : `Create: ${apiAttr.creation} · Resolve: ${apiAttr.resolution}`
  const showOneLiner = oneLinerAddsBeyondTitle(market.payload.title, oneLiner)
  const topicBody = (market.payload.description || '').trim()
  const isBinary = market.payload.marketType === 'Binary'
  const isMulti = market.payload.marketType === 'MultiOutcome'
  const multiChips = isMulti && Array.isArray(market.payload.outcomes) ? market.payload.outcomes.slice(0, 4) : []

  const tagStrip = (
    <div className="market-card-tags market-card-tags--inline">
      <span className="market-card-tag market-card-tag-category" title={apiTooltip}>
        {getCategoryEmoji(categoryLabel)} {categoryLabel}
      </span>
      {(market.openOrderCount || 0) > 0 && (
        <span className="market-card-tag market-card-tag-p2p" title="Open P2P limit orders on the book">
          P2P · {market.openOrderCount} open
        </span>
      )}
      {stale === 'pending_resolution' && (
        <span className="market-card-tag market-card-tag-stale" title="Past resolution time">
          Pending resolution
        </span>
      )}
      {confidence.label && (
        <span
          className={`market-card-tag market-card-tag-confidence${confidence.level === 'thin' ? ' market-card-tag-confidence--thin' : ''}`}
          title={confidence.hint || undefined}
        >
          {confidence.label}
        </span>
      )}
    </div>
  )

  const predictBinaryRow =
    market.payload?.status === 'Active' && mid && isBinary ? (
      <div className="market-card-predict-row" role="group" aria-label="Pick a side to quick trade">
        <button
          type="button"
          className="market-card-predict-chip market-card-predict-chip--yes"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setQuickTradeSeed('Yes')
            setExpandedQuickTradeId(mid)
          }}
        >
          Yes
        </button>
        <button
          type="button"
          className="market-card-predict-chip market-card-predict-chip--no"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setQuickTradeSeed('No')
            setExpandedQuickTradeId(mid)
          }}
        >
          No
        </button>
      </div>
    ) : null

  const predictMultiRow =
    market.payload?.status === 'Active' && mid && multiChips.length > 0 ? (
      <div className="market-card-predict-row market-card-predict-row--wrap" role="group" aria-label="Pick an outcome to quick trade">
        {multiChips.map((outcome) => (
          <button
            key={outcome}
            type="button"
            className="market-card-predict-chip"
            title={outcome}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setQuickTradeSeed(outcome)
              setExpandedQuickTradeId(mid)
            }}
          >
            {outcome}
          </button>
        ))}
      </div>
    ) : null

  const toolbar =
    mid ? (
      <div
        className={[
          'market-card-toolbar',
          market.payload?.status === 'Active' ? 'market-card-toolbar--split' : '',
          !webShareEnabled && market.payload?.status !== 'Active' ? 'market-card-toolbar--end' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="market-card-toolbar-actions">
          <button
            type="button"
            className="market-card-copy-link"
            title={getAbsoluteMarketUrl(mid)}
            aria-label={`Copy link to market: ${(market.payload.title || 'market').slice(0, 120)}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void copyCardMarketLink(mid, market.payload.title || '')
            }}
          >
            Copy link
          </button>
          {webShareEnabled && (
            <button
              type="button"
              className="market-card-share-link"
              title="Share via your device (Messages, social apps, etc.)"
              aria-label={`Share market: ${(market.payload.title || 'market').slice(0, 120)}`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                void shareCardMarket(market.payload)
              }}
            >
              Share…
            </button>
          )}
        </div>
        {market.payload?.status === 'Active' && (
          <button
            type="button"
            className={`market-card-quick-trade-btn${quickOpen ? ' market-card-quick-trade-btn--open' : ''}`}
            aria-expanded={quickOpen}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setExpandedQuickTradeId((id) => {
                if (id === mid) {
                  setQuickTradeSeed(null)
                  return null
                }
                setQuickTradeSeed(null)
                return mid
              })
            }}
          >
            {quickOpen ? 'Close quick trade' : 'Quick trade'}
          </button>
        )}
      </div>
    ) : null

  const quickTradePanel =
    market.payload?.status === 'Active' && mid && quickOpen ? (
      <MarketQuickTrade
        key={`${mid}-${quickTradeSeed ?? 'default'}`}
        market={market}
        initialTradeSide={quickTradeSeed ?? undefined}
        onTradeSuccess={refreshMarketsList}
      />
    ) : null

  const watchBtn = (
    <button
      type="button"
      className={`market-card-watch${watched ? ' market-card-watch--on' : ''}`}
      title={watched ? 'Remove from watchlist' : 'Watchlist (saved in this browser)'}
      aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleWatchlist(market.payload?.marketId || market.contractId)
        onWatchlistChanged()
      }}
    >
      {watched ? '★' : '☆'}
    </button>
  )

  if (layout === 'cards') {
    return (
      <div className="market-card-wrap">
        {watchBtn}
        <Link to={`/market/${market.payload.marketId}`} className="market-card-link">
          <div className="market-card market-card--discover">
            <div>
              {tagStrip}
              <div className="market-card-title-row">
                <h3>{market.payload.title}</h3>
                <span className={`market-card-status-pill status ${getStatusClass(market.payload.status)}`}>
                  {market.payload.status}
                </span>
              </div>
            </div>
            {showOneLiner && (
              <p className="market-card-oneliner" title={oneLiner}>
                {oneLiner}
              </p>
            )}
            {topicBody ? (
              <p className="market-card-topic" title={topicBody}>
                {topicBody}
              </p>
            ) : null}
            {resolveLine && <p className="market-card-resolves">{resolveLine}</p>}
            <div className="market-card-footer-meta">
              <span className="text-secondary">Volume: {formatPips(market.payload.totalVolume ?? 0)}</span>
              <span className="text-secondary">
                {isBinary ? (PREDICTION_STYLES.find((s) => s.value === market.payload?.styleLabel)?.label || 'Binary') : 'Multi-Outcome'}
              </span>
            </div>
          </div>
        </Link>
        {predictBinaryRow}
        {predictMultiRow}
        {toolbar}
        {quickTradePanel}
      </div>
    )
  }

  const isCompact = layout === 'compact'
  return (
    <article className={`market-list-row${isCompact ? ' market-list-row--compact' : ''}`}>
      {watchBtn}
      <div className="market-list-row__core">
        <Link to={`/market/${market.payload.marketId}`} className="market-list-row__link">
          {tagStrip}
          <div className="market-list-row__title-line">
            <h3 className="market-list-row__title">{market.payload.title}</h3>
            <span className={`market-list-row__status status ${getStatusClass(market.payload.status)}`}>{market.payload.status}</span>
          </div>
          {showOneLiner && !isCompact && (
            <p className="market-list-row__oneliner" title={oneLiner}>
              {oneLiner}
            </p>
          )}
          {topicBody && !isCompact ? (
            <p className="market-list-row__topic" title={topicBody}>
              {topicBody}
            </p>
          ) : null}
          {showOneLiner && isCompact ? (
            <p className="market-list-row__oneliner market-list-row__oneliner--compact" title={oneLiner}>
              {oneLiner}
            </p>
          ) : null}
          {resolveLine && !isCompact ? <p className="market-list-row__resolves">{resolveLine}</p> : null}
        </Link>
        <div className="market-list-row__meta">
          <span className="market-list-row__meta-vol">Vol. {formatPips(market.payload.totalVolume ?? 0)}</span>
          <span className="market-list-row__meta-type">
            {isBinary ? (PREDICTION_STYLES.find((s) => s.value === market.payload?.styleLabel)?.label || 'Binary') : 'Multi'}
          </span>
        </div>
      </div>
      <div className="market-list-row__actions">
        {predictBinaryRow}
        {predictMultiRow}
        {toolbar}
        {quickTradePanel}
      </div>
    </article>
  )
}
