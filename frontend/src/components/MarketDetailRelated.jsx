import DiscoverMarketEntry from './DiscoverMarketEntry'
import { layoutContainerClass } from '../utils/marketsLayout'

/** Similar markets on market detail only (not browse/list). Fixed list layout — no second picker. */
export default function MarketDetailRelated({ relatedMarkets }) {
  if (!relatedMarkets?.length) return null

  return (
    <section className="market-detail-related" aria-label="Similar markets">
      <div className="market-detail-related-head">
        <h3 className="market-detail-related-title">Similar markets</h3>
      </div>
      <div className={layoutContainerClass('list')}>
        {relatedMarkets.map((rm) => (
          <DiscoverMarketEntry
            key={rm.contractId || rm.payload?.marketId}
            layout="list"
            market={rm}
            chrome="related"
          />
        ))}
      </div>
    </section>
  )
}
