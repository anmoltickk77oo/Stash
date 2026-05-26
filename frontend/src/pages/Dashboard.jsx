import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import Navbar from '../components/layout/Navbar';
import LedgerRow from '../components/shared/LedgerRow';
import TransferModal from '../components/shared/TransferModal';

export default function Dashboard() {
  const { user, token } = useContext(AuthContext);
  
  // Real-time link hooks
  const { socket, connected } = useSocket(token);

  // Interface States
  const [balance, setBalance] = useState('0.00');
  const [history, setHistory] = useState([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Real-time alert toasts
  const [toasts, setToasts] = useState([]);

  // Toast dispatcher helper
  const addToast = (title, message, type) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    
    // Auto-wipe alert after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // 1. Fetch exact database balance
  const fetchBalance = async () => {
    try {
      const res = await api.get('/wallet/balance');
      setBalance(res.data.balance);
    } catch (err) {
      console.error('Failed to load wallet balance:', err);
    } finally {
      setLoadingBalance(false);
    }
  };

  // 2. Fetch full transaction history
  const fetchHistory = async () => {
    try {
      const res = await api.get('/wallet/history');
      setHistory(res.data.history);
    } catch (err) {
      console.error('Failed to load transaction history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Initial mount data load
  useEffect(() => {
    fetchBalance();
    fetchHistory();
  }, []);

  // 3. Real-Time Socket Event Listener Setup
  useEffect(() => {
    if (!socket) return;

    socket.on('ledger_update', (data) => {
      console.log('⚡ Real-time ledger update received:', data);
      
      const isCredit = data.type === 'CREDIT';
      
      // Dispatch glowing UI toast alert
      addToast(
        isCredit ? '📥 Funds Credited' : '📤 Funds Debited',
        data.message,
        isCredit ? 'credit' : 'debit'
      );

      // Re-fetch balance and history immediately to sync with PostgreSQL truth
      fetchBalance();
      fetchHistory();
    });

    return () => {
      socket.off('ledger_update');
    };
  }, [socket]);

  // Handler for manual local successful transfer trigger
  const handleTransferSuccess = (transaction) => {
    addToast(
      '📤 P2P Transfer Settled',
      `You successfully sent $${parseFloat(transaction.amount).toFixed(2)} to Wallet ID ${transaction.receiver_wallet_id}.`,
      'debit'
    );
    fetchBalance();
    fetchHistory();
  };

  return (
    <div className="app-layout">
      {/* Navbar Banner with socket status propagation */}
      <Navbar connected={connected} />

      {/* Main Dashboard Command Grid */}
      <main className="dashboard">
        
        {/* Left Side: Balance Card */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel balance-widget">
            <h2 className="balance-label">Total Balance</h2>
            <div className="balance-amount">
              {loadingBalance ? (
                <span className="text-muted">Loading...</span>
              ) : (
                `$${parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
            
            <div className="balance-actions">
              <button
                className="btn btn-neon"
                onClick={() => setIsModalOpen(true)}
                disabled={loadingBalance}
              >
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
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Send Money
              </button>
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Ledger Credentials</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Wallet Reference ID:</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-pink)' }}>#{user?.wallet_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Account Holder:</span>
                <span style={{ fontWeight: 600 }}>@{user?.username}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Registered Email:</span>
                <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{user?.email}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Ledger Feed */}
        <section className="glass-panel live-feed-panel">
          <div className="feed-header">
            <h2>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent-pink)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Transaction Activity
            </h2>
            <span className="badge-live">Live Feed</span>
          </div>

          <div className="ledger-list">
            {loadingHistory ? (
              <div className="ledger-empty">
                <span className="spinner-small"></span>
                <p>Retrieving transaction audit lines...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="ledger-empty">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <p>No settled transaction logs found.</p>
              </div>
            ) : (
              history.map((tx) => (
                <LedgerRow
                  key={tx.id}
                  tx={tx}
                  currentUserWalletId={user?.wallet_id}
                />
              ))
            )}
          </div>
        </section>
      </main>

      {/* Floating Real-Time Toast Alerts */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <div className="toast-icon">
              {t.type === 'credit' ? (
                // Glowing credit icon
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-success)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              ) : (
                // Glowing debit icon
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-danger)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                  <polyline points="17 18 23 18 23 12" />
                </svg>
              )}
            </div>
            <div className="toast-body">
              <div className="toast-title">{t.title}</div>
              <div className="toast-msg">{t.message}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Transfer Modal overlay */}
      <TransferModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleTransferSuccess}
        currentBalance={balance}
        currentUserWalletId={user?.wallet_id}
      />
    </div>
  );
}
