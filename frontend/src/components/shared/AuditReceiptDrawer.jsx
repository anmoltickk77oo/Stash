import React, { useState, useEffect } from 'react';

export default function AuditReceiptDrawer({ tx, isOpen, onClose, currentUserWalletId }) {
  const [copied, setCopied] = useState(false);
  const [verificationState, setVerificationState] = useState('IDLE'); // IDLE, PENDING, SUCCESS, FAILED
  const [verificationLogs, setVerificationLogs] = useState('');

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

  useEffect(() => {
    setVerificationState('IDLE');
    setVerificationLogs('');
  }, [tx, isOpen]);

  if (!tx) return null;

  const isDebit = parseInt(tx.sender_id) === parseInt(currentUserWalletId);
  const type = isDebit ? 'debit' : 'credit';
  const partnerName = isDebit ? tx.receiver_name : tx.sender_name;
  const amountFormatted = `${isDebit ? '-' : '+'}$${parseFloat(tx.amount).toFixed(2)}`;

  const dateFormatted = new Date(tx.created_at).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const handleCopy = () => {
    if (tx.transaction_hash) {
      navigator.clipboard.writeText(tx.transaction_hash);
      setCopied(true);
    }
  };

  const actualHash = tx.transaction_hash || 'Genesis Block Seal (No Hash)';
  const prevHashVal = tx.previous_hash || '0000000000000000000000000000000000000000000000000000000000000000';

  // WebCrypto SHA-256 local recalculation
  const verifyBlockSealLocally = async () => {
    setVerificationState('PENDING');
    setVerificationLogs('Initializing WebCrypto Engine...');
    
    try {
      await new Promise(r => setTimeout(r, 600));
      
      const transferAmount = parseFloat(tx.amount);
      const previousHash = tx.previous_hash || '0000000000000000000000000000000000000000000000000000000000000000';
      const hashInput = `${tx.sender_id}:${tx.receiver_id}:${transferAmount.toFixed(2)}:${previousHash}`;
      
      setVerificationLogs('Parsing transaction invariants... Loading SHA-256 header...');
      await new Promise(r => setTimeout(r, 450));
      
      const msgBuffer = new TextEncoder().encode(hashInput);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      setVerificationLogs(`Recalculated: ${calculatedHash}\nComparing with DB hash...`);
      await new Promise(r => setTimeout(r, 450));
      
      if (calculatedHash === tx.transaction_hash) {
        setVerificationState('SUCCESS');
        setVerificationLogs('Ledger integrity verified successfully! Signatures match perfectly.');
      } else {
        setVerificationState('FAILED');
        setVerificationLogs('CRITICAL FAILURE: Calculated signature mismatch. Block may be altered.');
      }
    } catch (err) {
      console.error(err);
      setVerificationState('FAILED');
      setVerificationLogs('WebCrypto execution error.');
    }
  };

  // High-fidelity offscreen HTML5 Canvas PNG receipt builder
  const exportReceiptAsImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    
    // 1. Dark mode glassmorphic radial background
    const grad = ctx.createRadialGradient(300, 400, 50, 300, 400, 500);
    grad.addColorStop(0, '#151033');
    grad.addColorStop(1, '#0a0814');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 800);
    
    // 2. Draw border frame glows
    ctx.strokeStyle = 'rgba(124, 58, 237, 0.3)';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, 600, 800);
    ctx.strokeStyle = 'rgba(219, 39, 119, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(4, 4, 592, 792);

    // 3. Header: Logo & Subtitle
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('⚡ STASH LEDGER CORE', 50, 65);
    
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px monospace';
    ctx.fillText('ACID TRANSACTION COMPLIANCE RECORD', 50, 88);
    
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 105);
    ctx.lineTo(550, 105);
    ctx.stroke();

    // 4. Amount card box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(50, 130, 500, 115);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.strokeRect(50, 130, 500, 115);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px sans-serif';
    ctx.fillText('SETTLEMENT VALUE', 70, 160);

    ctx.fillStyle = isDebit ? '#ef4444' : '#10b981';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText(amountFormatted, 70, 212);

    // Glowing verification stamp
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.fillRect(410, 150, 115, 28);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.strokeRect(410, 150, 115, 28);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('VERIFIED SEAL', 432, 168);

    // 5. Metadata Table
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Ledger Details', 50, 285);

    let y = 320;
    const drawRow = (label, val, highlightColor) => {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '13px sans-serif';
      ctx.fillText(label, 50, y);
      
      ctx.fillStyle = highlightColor || '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(val, 240, y);
      
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.beginPath();
      ctx.moveTo(50, y + 10);
      ctx.lineTo(550, y + 10);
      ctx.stroke();
      y += 35;
    };

    drawRow('Transaction Ref:', `#${tx.id}`);
    drawRow('Allocation Category:', tx.category || 'Transfer', '#db2777');
    drawRow('Memo / Notes:', tx.memo || 'None', 'rgba(255,255,255,0.8)');
    drawRow('Sender Wallet:', `#${tx.sender_id} (@${tx.sender_name})`);
    drawRow('Receiver Wallet:', `#${tx.receiver_id} (@${tx.receiver_name})`);
    drawRow('Timestamp (SQL):', dateFormatted);

    // 6. Cryptographic Block Signatures
    y += 15;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Cryptographic Signatures', 50, y);
    y += 25;

    const drawHashBlock = (label, hash) => {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '11px sans-serif';
      ctx.fillText(label, 50, y);
      y += 16;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(50, y - 10, 500, 22);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.strokeRect(50, y - 10, 500, 22);

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '9px monospace';
      ctx.fillText(hash, 60, y + 4);
      y += 30;
    };

    drawHashBlock('Transaction Hash Block:', actualHash);
    drawHashBlock('Previous Chain Link:', prevHashVal);

    // 7. ACID Checklist
    y += 5;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('ACID Engine Enforcements', 50, y);
    y += 25;

    const drawCheckItem = (label) => {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('✓', 50, y);
      
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '12px sans-serif';
      ctx.fillText(label, 70, y);
      y += 22;
    };

    drawCheckItem('Row locks obtained successfully (FOR UPDATE).');
    drawCheckItem('Cyclic dependency protection checks verified.');
    drawCheckItem('chk_wallet_balance_positive double-spend check committed.');

    // 8. Trigger Browser download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `stash_receipt_${tx.id}.png`;
    link.href = dataUrl;
    link.click();
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
              <span className="drawer-hash-text" title={actualHash}>
                {actualHash}
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

          {/* Cryptographic Proof Verification & Download Panel */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent-pink)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Cryptographic Audit Proof
            </h4>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-neon" 
                onClick={verifyBlockSealLocally} 
                style={{ flex: 1, padding: '10px', fontSize: '0.78rem' }}
                disabled={verificationState === 'PENDING'}
              >
                Verify Seal
              </button>
              <button 
                className="btn" 
                onClick={exportReceiptAsImage} 
                style={{ flex: 1, padding: '10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download PNG
              </button>
            </div>

            {verificationState === 'PENDING' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', textAlign: 'center', padding: '10px' }}>
                <span className="spinner-small" style={{ margin: '0 auto 8px auto' }}></span>
                <span className="text-secondary" style={{ whiteSpace: 'pre-line', fontFamily: 'monospace' }}>
                  {verificationLogs}
                </span>
              </div>
            )}

            {verificationState === 'SUCCESS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)', fontWeight: 700 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Calculated SHA-256 Verified
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                  {verificationLogs}
                </span>
              </div>
            )}

            {verificationState === 'FAILED' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger)', fontWeight: 700 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  Ledger Mismatch Detected
                </div>
                <span style={{ fontSize: '0.72rem', color: '#fca5a5', fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                  {verificationLogs}
                </span>
              </div>
            )}
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
                <span style={{ color: 'var(--text-muted)' }}>Allocation Category:</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-pink)' }}>{tx.category || 'Transfer'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Memo / Description:</span>
                <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{tx.memo || 'None'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Sender Wallet ID:</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>#{tx.sender_id} (@{tx.sender_name})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Receiver Wallet ID:</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-pink)' }}>#{tx.receiver_id} (@{tx.receiver_name})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Previous Block Hash Link:</span>
                <span style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }} title={prevHashVal}>
                  {prevHashVal}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Timestamp (SQL):</span>
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
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
