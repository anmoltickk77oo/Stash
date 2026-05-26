import React from 'react';

export default function LedgerRow({ tx, currentUserWalletId, onClick }) {
  // Determine if this transaction is a DEBIT or a CREDIT relative to the current user's wallet
  const isDebit = parseInt(tx.sender_id) === parseInt(currentUserWalletId);
  const type = isDebit ? 'debit' : 'credit';
  const partnerName = isDebit ? tx.receiver_name : tx.sender_name;
  const partnerLabel = isDebit ? `Sent to @${partnerName}` : `Received from @${partnerName}`;
  const amountFormatted = `${isDebit ? '-' : '+'}$${parseFloat(tx.amount).toFixed(2)}`;

  // Format high-precision SQL timestamp to friendly local format
  const dateFormatted = new Date(tx.created_at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="ledger-row ledger-row-clickable" onClick={onClick}>
      <div className="ledger-meta">
        <div className={`row-icon-box ${type}`}>
          {isDebit ? (
            // Upward arrow for outgoing transfer (debit)
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          ) : (
            // Downward arrow for incoming transfer (credit)
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="7" y1="7" x2="17" y2="17" />
              <polyline points="17 7 17 17 7 17" />
            </svg>
          )}
        </div>
        <div className="row-details">
          <span className="row-partner">{partnerLabel}</span>
          <span className="row-date">{dateFormatted}</span>
        </div>
      </div>
      <div className={`row-value ${type}`}>
        {amountFormatted}
      </div>
    </div>
  );
}
