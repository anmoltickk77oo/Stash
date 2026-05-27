import React, { useState } from 'react';
import api from '../../services/api';

export default function FaucetModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleRequestFaucet = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/wallet/faucet');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Faucet request error:', err);
      setError(err.response?.data?.error || 'Failed to mint faucet liquidity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
        
        <div className="modal-header" style={{ justifyContent: 'center', borderBottom: 'none', paddingBottom: 0 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Developer Faucet
          </h3>
        </div>

        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Mint **$500.00** instantly to your ledger wallet to test transfers in demonstration environments.
          </p>
          
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.05)', 
            border: '1px solid rgba(16, 185, 129, 0.15)', 
            borderRadius: '12px', 
            padding: '14px', 
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <span className="pulse-dot online"></span>
            ACID Sandbox Liquidity Engine Ready
          </div>
        </div>

        {error && (
          <div className="auth-alert auth-alert-error" style={{ marginBottom: '16px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <div className="form-actions" style={{ justifyContent: 'center', gap: '12px', marginTop: '8px' }}>
          <button type="button" className="btn" onClick={onClose} disabled={loading} style={{ flex: 1 }}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-neon" 
            onClick={handleRequestFaucet} 
            disabled={loading} 
            style={{ 
              flex: 1, 
              borderColor: 'var(--color-success)', 
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.2)' 
            }}
          >
            {loading ? 'Minting...' : 'Mint $500.00'}
          </button>
        </div>

      </div>
    </div>
  );
}
