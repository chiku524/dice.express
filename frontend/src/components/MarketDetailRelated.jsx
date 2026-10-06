import DiscoverMarketEntry from './DiscoverMarketEntry'
import MarketsLayoutPicker from './MarketsLayoutPicker'
import { layoutContainerClass } from '../utils/marketsLayout'
import { useMarketsLayout } from '../hooks/useMarketsLayout'

/** Similar markets on market detail only (not browse/list). */
export default function MarketDetailRelated({ relatedMarkets }) {
  const [layout, setLayout] = useMarketsLayout()

  if (!relatedMarkets?.length) return null

  return (
    <section className="market-detail-related" aria-label="Similar markets">
      <div className="market-detail-related-head">
        <h3 className="market-detail-related-title">Similar markets</h3>
        <MarketsLayoutPicker
          layout={layout}
          onChange={setLayout}
          labelledBy="similar-markets-layout-label"
        />
      </div>
      <div className={layoutContainerClass(layout)}>
        {relatedMarkets.map((rm) => (
          <DiscoverMarketEntry
            key={rm.contractId || rm.payload?.marketId}
            layout={layout}
            market={rm}
            chrome="related"
          />
        ))}
      </div>
    </section>
  )
}
