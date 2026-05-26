import React, { useState } from 'react';
import api from '../../services/api';

export default function TransferModal({ isOpen, onClose, onSuccess, currentBalance, currentUserWalletId }) {
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const parsedRecipient = parseInt(recipientId);
    const parsedAmount = parseFloat(amount);

    // Front-end validations
    if (isNaN(parsedRecipient) || parsedRecipient <= 0) {
      setError('Please provide a valid numeric Wallet ID.');
      return;
    }

    if (parsedRecipient === parseInt(currentUserWalletId)) {
      setError('Self-transfers are prohibited by system invariant.');
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please provide a positive amount greater than zero.');
      return;
    }

    if (parsedAmount > parseFloat(currentBalance)) {
      setError('Insufficient liquidity in your wallet balance.');
      return;
    }

    setLoading(false);
    try {
      setLoading(true);
      const res = await api.post('/wallet/transfer', {
        receiver_wallet_id: parsedRecipient,
        amount: parsedAmount
      });
      
      onSuccess(res.data.transaction);
      onClose();
    } catch (err) {
      console.error('Transfer execution failure:', err);
      setError(err.response?.data?.error || 'Core transfer engine failed to settle transaction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💸 Instant P2P Transfer</h3>
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

        {error && (
          <div className="auth-alert auth-alert-error">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Recipient Wallet ID</label>
            <input
              type="number"
              placeholder="e.g. 1"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="form-input"
              disabled={loading}
              required
            />
          </div>

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

          <div className="form-actions">
            <button type="button" className="btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-neon" disabled={loading}>
              {loading ? 'Settling...' : 'Send Funds'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
