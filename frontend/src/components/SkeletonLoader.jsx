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

