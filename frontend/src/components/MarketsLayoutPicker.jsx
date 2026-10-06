import { MARKETS_LAYOUT_OPTIONS } from '../utils/marketsLayout'

export default function MarketsLayoutPicker({ layout, onChange, labelledBy = 'markets-layout-label' }) {
  return (
    <div className="markets-layout-picker" role="group" aria-label="Market layout">
      <span className="markets-layout-picker-label" id={labelledBy}>
        View
      </span>
      <div className="markets-layout-picker-btns" aria-labelledby={labelledBy}>
        {MARKETS_LAYOUT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`markets-layout-btn${layout === opt.value ? ' markets-layout-btn--active' : ''}`}
            aria-pressed={layout === opt.value}
            title={opt.title}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
