import { useWallet } from '../hooks/useWallet'

export default function WalletConnect({ onConnect }) {
  const { connectWallet } = useWallet()

  return (
    <div className="card" style={{ textAlign: 'center', maxWidth: '500px', margin: '4rem auto' }}>
      <h2>Connect Your Wallet</h2>
      <p style={{ marginBottom: '2rem', color: 'rgba(255, 255, 255, 0.6)' }}>
        Connect your Canton wallet to start trading on prediction markets.
        Your wallet uses passkey authentication for secure access.
      </p>
      <div style={{ 
        background: 'rgba(100, 108, 255, 0.1)', 
        padding: '1rem', 
        borderRadius: '8px', 
        marginBottom: '2rem',
        fontSize: '0.9rem',
        color: 'rgba(255, 255, 255, 0.8)'
      }}>
        <strong>Party ID Format Required:</strong>
        <p style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
          {user-id}::{party-id}
        </p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
          Example: ee15aa3d-0bd4-44f9-9664-b49ad7e308aa::122087fa379c37332a753379c58e18d397e39cb82c68c15e4af7134be46561974292
        </p>
        <ul style={{ textAlign: 'left', marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
          <li>Enter your full Canton Party ID (format: user-id::party-id)</li>
          <li>Leave blank to use the default test party ID</li>
          <li>Your wallet will be saved locally in your browser</li>
          <li>Find your party ID in the block explorer or from your Canton admin</li>
        </ul>
      </div>
      <button className="btn-primary" onClick={connectWallet} style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
        Connect Wallet
      </button>
    </div>
  )
}

