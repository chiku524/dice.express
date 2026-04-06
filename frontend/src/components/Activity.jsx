import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ContractStorage } from '../utils/contractStorage'
import { useWallet } from '../contexts/WalletContext'
import './Activity.css'

export default function Activity() {
  const { wallet } = useWallet()
  const [contracts, setContracts] = useState([])
  const [filter, setFilter] = useState('all') // 'all', 'markets', 'requests'

  useEffect(() => {
    if (!wallet) {
      setContracts([])
      return
    }

    const loadContracts = async () => {
      try {
        const allContracts = await ContractStorage.getContractsByParty(wallet.party)

        let filtered = allContracts
        if (filter === 'markets') {
          filtered = allContracts.filter(
            (c) =>
              c.templateId &&
              c.templateId.includes('Market') &&
              !c.templateId.includes('MarketCreationRequest')
          )
        } else if (filter === 'requests') {
          filtered = allContracts.filter(
            (c) => c.templateId && c.templateId.includes('MarketCreationRequest')
          )
        }

        filtered.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0)
          const dateB = new Date(b.createdAt || 0)
          return dateB - dateA
        })

        setContracts(filtered)
      } catch (error) {
        console.error('[Activity] Error loading records:', error)
        setContracts([])
      }
    }

    loadContracts()
  }, [wallet, filter])

  const getRecordTypeLabel = (templateId) => {
    if (!templateId) return 'Record'
    if (templateId.includes('MarketCreationRequest')) return 'Market request'
    if (templateId.includes('Market')) return 'Market'
    if (templateId.includes('TokenBalance')) return 'Token balance'
    if (templateId.includes('Position')) return 'Position'
    return 'Record'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (!wallet) {
    return (
      <div className="card">
        <p>Sign in to view stored market records and legacy contract activity.</p>
      </div>
    )
  }

  return (
    <div className="activity-page">
      <div className="history-header">
        <h2>Activity</h2>
        <div className="filter-buttons">
          <button
            type="button"
            className={filter === 'all' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={filter === 'markets' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setFilter('markets')}
          >
            Markets
          </button>
          <button
            type="button"
            className={filter === 'requests' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setFilter('requests')}
          >
            Requests
          </button>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="card">
          <p>No stored records yet. Trade on a market — your positions and related entries will show here.</p>
          <Link to="/">
            <button type="button" className="btn-primary mt-md">
              Browse markets
            </button>
          </Link>
        </div>
      ) : (
        <div className="contracts-list">
          {contracts.map((contract) => (
            <div key={contract.contractId} className="contract-item">
              <div className="contract-header">
                <div>
                  <h3>{getRecordTypeLabel(contract.templateId)}</h3>
                  <p className="contract-time">{formatDate(contract.createdAt)}</p>
                </div>
                <span className="contract-id-badge">
                  {contract.contractId.substring(0, 16)}...
                </span>
              </div>

              {contract.payload && (
                <div className="contract-details">
                  {contract.payload.title && (
                    <p>
                      <strong>Title:</strong> {contract.payload.title}
                    </p>
                  )}
                  {contract.payload.marketId && (
                    <p>
                      <strong>Market ID:</strong> {contract.payload.marketId}
                    </p>
                  )}
                  {contract.payload.status && (
                    <p>
                      <strong>Status:</strong> {contract.payload.status}
                    </p>
                  )}
                </div>
              )}

              <div className="contract-actions">
                {contract.payload && contract.payload.marketId && (
                  <Link to={`/market/${contract.payload.marketId}`}>
                    <button type="button" className="btn-secondary">
                      View market
                    </button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
