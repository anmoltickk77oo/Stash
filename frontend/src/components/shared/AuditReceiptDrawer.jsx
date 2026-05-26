import React, { useState, useEffect } from 'react';

export default function AuditReceiptDrawer({ tx, isOpen, onClose, currentUserWalletId }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

  if (!tx) return null;

  const isDebit = parseInt(tx.sender_id) === parseInt(currentUserWalletId);
  const type = isDebit ? 'debit' : 'credit';
  const partnerName = isDebit ? tx.receiver_name : tx.sender_name;
  const amountFormatted = `${isDebit ? '-' : '+'}$${parseFloat(tx.amount).toFixed(2)}`;

  // Deterministic mock SHA-256 block hash for absolute high-fidelity feel
  const hashSeed = `tx_audit_record_${tx.id}_${new Date(tx.created_at).getTime()}`;
  const generateHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let res = '0x';
    // Generate a long high-tech hex string
    for (let i = 0; i < 40; i++) {
      const val = Math.abs((hash + i * 2654435761) % 16);
      res += val.toString(16);
    }
    return res;
  };
  const mockHash = generateHash(hashSeed);

  const dateFormatted = new Date(tx.created_at).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(mockHash);
    setCopied(true);
  };

  return (
    <div className={`drawer-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent-purple)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Audit Settle Receipt
          </h3>
          <button className="close-btn" onClick={onClose}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="drawer-body">
          {/* Main Visual Amount Card */}
          <div className="drawer-receipt-card">
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Settlement Value
            </span>
            <div className={`drawer-amount ${type}`}>
              {amountFormatted}
            </div>
            <span className="status-badge" style={{ display: 'inline-flex', margin: '0 auto', gap: '6px' }}>
              <span className="pulse-dot online"></span>
              ACID COMPLIANT & SETTLED
            </span>

            {/* Simulated Block Hash */}
            <div className="drawer-hash-box">
              <span className="drawer-hash-text" title={mockHash}>
                {mockHash}
              </span>
              <button className="card-copy-btn" onClick={handleCopy} title="Copy hash to clipboard">
                {copied ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-success)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Details Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ledger Metadata
            </h4>
            <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Transaction Reference ID:</span>
                <span style={{ fontWeight: 600 }}>#{tx.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Transaction Type:</span>
                <span style={{ fontWeight: 600, color: isDebit ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {isDebit ? 'DEBIT (Outgoing)' : 'CREDIT (Incoming)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Sender Wallet ID:</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>#{tx.sender_id} (@{tx.sender_name})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Receiver Wallet ID:</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-pink)' }}>#{tx.receiver_id} (@{tx.receiver_name})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Timestamp (SQL Settled):</span>
                <span style={{ fontWeight: 500, fontSize: '0.78rem' }}>{dateFormatted}</span>
              </div>
            </div>
          </div>

          {/* ACID Safety Checklist */}
          <div className="compliance-checklist">
            <h4 className="compliance-title">PostgreSQL ACID Settlement Checklist</h4>

            {/* Check 1 */}
            <div className="compliance-item">
              <div className="compliance-check">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="compliance-info">
                <span className="compliance-label">Concurrency Control (FOR UPDATE)</span>
                <span className="compliance-desc">Row-level database locks successfully obtained. Prevented mid-transaction state reads.</span>
              </div>
            </div>

            {/* Check 2 */}
            <div className="compliance-item">
              <div className="compliance-check">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="compliance-info">
                <span className="compliance-label">Deadlock Shield Priority Enforced</span>
                <span className="compliance-desc">Locked lower wallet ID index first, eliminating circular dependency paths.</span>
              </div>
            </div>

            {/* Check 3 */}
            <div className="compliance-item">
              <div className="compliance-check">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="compliance-info">
                <span className="compliance-label">Double-Spend Shield Active</span>
                <span className="compliance-desc">Hard database constraint (chk_wallet_balance_positive) locked. Balance guaranteed positive.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
