import { Link } from 'react-router-dom'

/** Related markets list on market detail (detail view only). */
export default function MarketDetailRelated({ relatedMarkets }) {
  if (!relatedMarkets?.length) return null
  return (
    <section className="market-detail-related" aria-label="Related markets">
      <h3 className="market-detail-related-title">Related markets</h3>
      <ul className="market-detail-related-list">
        {relatedMarkets.map((rm) => (
          <li key={rm.contractId || rm.payload?.marketId}>
            <Link to={`/market/${rm.payload?.marketId}`}>
              {rm.payload?.title || rm.payload?.marketId}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
