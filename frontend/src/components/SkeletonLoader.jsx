/**
 * Skeleton Loader Component
 * Provides loading placeholders for better UX
 */

export function SkeletonCard() {
  return (
    <div className="card" style={{ 
      opacity: 0.7,
      animation: 'pulse 1.5s ease-in-out infinite'
    }}>
      <div style={{ 
        height: '24px', 
        width: '60%', 
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        marginBottom: '1rem'
      }} />
      <div style={{ 
        height: '16px', 
        width: '100%', 
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        marginBottom: '0.5rem'
      }} />
      <div style={{ 
        height: '16px', 
        width: '80%', 
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px'
      }} />
    </div>
  )
}

export function SkeletonMarketCard() {
  return (
    <div className="market-card" style={{ 
      opacity: 0.7,
      animation: 'pulse 1.5s ease-in-out infinite'
    }}>
      <div style={{ 
        height: '28px', 
        width: '70%', 
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        marginBottom: '1rem'
      }} />
      <div style={{ 
        height: '20px', 
        width: '40%', 
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        marginBottom: '1rem'
      }} />
      <div style={{ 
        height: '16px', 
        width: '100%', 
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        marginBottom: '0.5rem'
      }} />
      <div style={{ 
        height: '16px', 
        width: '90%', 
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        marginBottom: '1rem'
      }} />
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '1rem'
      }}>
        <div style={{ 
          height: '16px', 
          width: '80px', 
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px'
        }} />
        <div style={{ 
          height: '16px', 
          width: '60px', 
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px'
        }} />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  )
}

export function SkeletonMarketGrid({ count = 6 }) {
  return (
    <div className="market-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonMarketCard key={i} />
      ))}
    </div>
  )
}

const skeletonPulse = {
  opacity: 0.7,
  animation: 'pulse 1.5s ease-in-out infinite',
}

export function SkeletonMarketList({ count = 8 }) {
  return (
    <div className="market-list market-list--below-toolbar">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="market-list-skeleton-row"
          style={{
            ...skeletonPulse,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            padding: 'var(--spacing-md) var(--spacing-lg)',
            borderRadius: 'var(--radius-xl, 12px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.03)',
          }}
        >
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <div
              style={{
                height: '14px',
                width: '40%',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                marginBottom: 10,
              }}
            />
            <div
              style={{
                height: '20px',
                width: '92%',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                marginBottom: 8,
              }}
            />
            <div
              style={{
                height: '14px',
                width: '75%',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 4,
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <div style={{ height: 14, width: 72, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 4 }} />
            <div style={{ height: 14, width: 56, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

