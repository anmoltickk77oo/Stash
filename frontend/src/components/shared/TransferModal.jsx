import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

const PREDEFINED_CATEGORIES = ['Transfer', 'Groceries', 'Rent', 'Salary', 'Freelance', 'Utilities'];

export default function TransferModal({ isOpen, onClose, onSuccess, currentBalance, currentUserWalletId }) {
  const [recipientInput, setRecipientInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Transfer');
  const [memo, setMemo] = useState('');
  
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const searchTimeoutRef = useRef(null);

  // Reset modal state on close/open
  useEffect(() => {
    if (!isOpen) {
      setRecipientInput('');
      setSearchResults([]);
      setSelectedRecipient(null);
      setAmount('');
      setCategory('Transfer');
      setMemo('');
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Debounced recipient username resolver
  useEffect(() => {
    if (recipientInput.trim() === '' || selectedRecipient) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/auth/search-users?query=${encodeURIComponent(recipientInput)}`);
        setSearchResults(res.data.users);
        setShowDropdown(true);
      } catch (err) {
        console.error('Failed to search recipients:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [recipientInput, selectedRecipient]);

  if (!isOpen) return null;

  const handleSelectRecipient = (recipient) => {
    setSelectedRecipient(recipient);
    setRecipientInput(recipient.username);
    setShowDropdown(false);
  };

  const handleClearRecipient = () => {
    setSelectedRecipient(null);
    setRecipientInput('');
    setSearchResults([]);
  };

  const initiateTransfer = async (e) => {
    e.preventDefault();
    setError(null);

    let recipientWalletId = selectedRecipient ? selectedRecipient.wallet_id : null;

    // If recipient is typed but not selected, try parsing as direct wallet ID first
    if (!recipientWalletId) {
      const parsedId = parseInt(recipientInput);
      if (!isNaN(parsedId) && parsedId.toString() === recipientInput.trim()) {
        recipientWalletId = parsedId;
      }
    }

    // If it's not a numeric ID, attempt dynamic resolution in background
    if (!recipientWalletId && recipientInput.trim() !== '') {
      setLoading(true);
      try {
        const res = await api.get(`/auth/search-users?query=${encodeURIComponent(recipientInput.trim())}`);
        const matches = res.data.users;
        const exactMatch = matches.find(
          u => u.username.toLowerCase() === recipientInput.trim().toLowerCase() ||
               u.email.toLowerCase() === recipientInput.trim().toLowerCase()
        );

        if (exactMatch) {
          recipientWalletId = exactMatch.wallet_id;
          setSelectedRecipient(exactMatch);
        } else if (matches.length === 1) {
          recipientWalletId = matches[0].wallet_id;
          setSelectedRecipient(matches[0]);
        }
      } catch (err) {
        console.error('Failed to auto-resolve recipient:', err);
      } finally {
        setLoading(false);
      }
    }

    const parsedAmount = parseFloat(amount);

    if (!recipientWalletId || isNaN(recipientWalletId) || recipientWalletId <= 0) {
      setError('Please resolve a valid recipient username, email, or wallet ID.');
      return;
    }

    if (recipientWalletId === parseInt(currentUserWalletId)) {
      setError('Self-transfers are strictly prohibited by system invariant.');
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please specify a positive transfer amount.');
      return;
    }

    if (parsedAmount > parseFloat(currentBalance)) {
      setError('Insufficient liquidity in your wallet balance.');
      return;
    }

    // Directly execute transfer
    setLoading(true);
    try {
      const res = await api.post('/wallet/transfer', {
        receiver_wallet_id: recipientWalletId,
        amount: parsedAmount,
        category,
        memo
      });
      
      onSuccess(res.data.transaction);
      onClose();
    } catch (err) {
      console.error('Transfer settle crash:', err);
      setError(err.response?.data?.error || 'Failed to settle ledger atomic transfer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        
        <div className="modal-header">
          <h3>💸 Instant P2P Transfer</h3>
          <button className="close-btn" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="auth-alert auth-alert-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={initiateTransfer}>
          {/* Recipient Search & Autocomplete */}
          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label">Recipient User</label>
            
            {selectedRecipient ? (
              /* Resolved Recipient avatar chip */
              <div className="selected-recipient-chip" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(124, 58, 237, 0.08)',
                border: '1px solid rgba(124, 58, 237, 0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--gradient-neon)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }}>
                    {selectedRecipient.username[0].toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>@{selectedRecipient.username}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Wallet Ref ID #{selectedRecipient.wallet_id}</span>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={handleClearRecipient}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              /* Asynchronous Recipient Input Search */
              <>
                <input
                  type="text"
                  placeholder="Type username or email (e.g. alice)"
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  className="form-input"
                  disabled={loading}
                  required
                />
                
                {searching && (
                  <span className="spinner-small" style={{ position: 'absolute', right: '14px', bottom: '14px' }}></span>
                )}

                {/* Glassmorphic Auto-complete suggestions list */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="glass-panel autocomplete-dropdown" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    zIndex: 200,
                    maxHeight: '180px',
                    overflowY: 'auto',
                    padding: '6px',
                    marginTop: '4px',
                    background: 'rgba(15, 12, 33, 0.95)',
                    borderColor: 'rgba(255, 255, 255, 0.08)'
                  }}>
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleSelectRecipient(user)}
                        className="autocomplete-dropdown-item"
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.85rem',
                          transition: 'background 0.2s ease'
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>@{user.username}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({user.email})</span>
                      </div>
                    ))}
                  </div>
                )}

                {showDropdown && searchResults.length === 0 && recipientInput.trim() !== '' && !searching && (
                  <div className="glass-panel autocomplete-no-results" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    zIndex: 200,
                    padding: '12px',
                    marginTop: '4px',
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(15, 12, 33, 0.95)'
                  }}>
                    No matching users found.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Amount input */}
          <div className="input-group">
            <label className="input-label">Amount ($ USD)</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="form-input"
              disabled={loading}
              required
            />
          </div>

          {/* Predefined Categories */}
          <div className="input-group">
            <label className="input-label">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-input category-select"
              disabled={loading}
              style={{ cursor: 'pointer' }}
            >
              {PREDEFINED_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* optional Memo input */}
          <div className="input-group">
            <label className="input-label">Memo / Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Dinner share, rent part"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="form-input"
              maxLength={120}
              disabled={loading}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-neon" disabled={loading || (!selectedRecipient && recipientInput.trim() === '')}>
              {loading ? 'Settling Transfer...' : 'Transfer Funds'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
