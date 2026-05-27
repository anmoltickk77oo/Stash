import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import Navbar from '../components/layout/Navbar';
import LedgerRow from '../components/shared/LedgerRow';
import TransferModal from '../components/shared/TransferModal';
import AuditReceiptDrawer from '../components/shared/AuditReceiptDrawer';
import FaucetModal from '../components/shared/FaucetModal';
export default function Dashboard() {
  const { user, token } = useContext(AuthContext);
  
  // Real-time link hooks with active latency diagnostic engine
  const { socket, connected, latency } = useSocket(token);

  // 3D Tilt Card Ref & Event Handlers
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Set custom properties for mouse spotlight and sheen reflection
    card.style.setProperty('--mx', `${x}px`);
    card.style.setProperty('--my', `${y}px`);

    const cardX = rect.left + rect.width / 2;
    const cardY = rect.top + rect.height / 2;
    const dx = e.clientX - cardX;
    const dy = e.clientY - cardY;

    // Tilt calculations up to 8 degrees
    const maxTilt = 8;
    const px = dx / (rect.width / 2);
    const py = dy / (rect.height / 2);

    const rx = -py * maxTilt;
    const ry = px * maxTilt;

    card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;

    // Specular light shimmer sweeping card face
    const shimmerX = (x / rect.width) * 100;
    const shimmerY = (y / rect.height) * 100;
    card.style.setProperty('--foil-x', `${shimmerX}%`);
    card.style.setProperty('--foil-y', `${shimmerY}%`);
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;

    card.style.transform = '';
    card.style.setProperty('--mx', '50%');
    card.style.setProperty('--my', '50%');
    card.style.setProperty('--foil-x', '50%');
    card.style.setProperty('--foil-y', '50%');
  };

  const handleSpotlightMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  // Interface States
  const [balance, setBalance] = useState('0.00');
  const [history, setHistory] = useState([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFaucetModalOpen, setIsFaucetModalOpen] = useState(false);
  
  // Sliding Receipt Drawer States
  const [selectedTx, setSelectedTx] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, DEBIT, CREDIT

  // Copy Clipboard feedback
  const [copiedId, setCopiedId] = useState(false);

  // Cryptographic Ledger Verification states
  const [ledgerStatus, setLedgerStatus] = useState('AUDITING'); // AUDITING, VERIFIED, COMPROMISED
  const [verifiedBlocksCount, setVerifiedBlocksCount] = useState(0);

  // Sandbox Developer Faucet loading states
  const [faucetLoading, setFaucetLoading] = useState(false);

  const handleCopyWalletId = (e, walletId) => {
    e.stopPropagation();
    navigator.clipboard.writeText(walletId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

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

  // 2b. Audit overall database cryptographic chain integrity
  const auditLedgerIntegrity = async () => {
    try {
      const res = await api.get('/wallet/verify-ledger');
      if (res.data.success) {
        setLedgerStatus('VERIFIED');
        setVerifiedBlocksCount(res.data.verifiedCount);
      } else {
        setLedgerStatus('COMPROMISED');
      }
    } catch (err) {
      console.error('Ledger verification failure:', err);
      setLedgerStatus('COMPROMISED');
    }
  };

  // Initial mount data load
  useEffect(() => {
    fetchBalance();
    fetchHistory();
    auditLedgerIntegrity();
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
      auditLedgerIntegrity();
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
    auditLedgerIntegrity();
  };

  // Open the sliding receipt drawer
  const handleOpenReceipt = (tx) => {
    setSelectedTx(tx);
    setIsDrawerOpen(true);
  };

  // 4. Data visualization / SVG computations
  const totalIncome = history
    .filter((tx) => parseInt(tx.sender_id) !== parseInt(user?.wallet_id))
    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

  const totalExpense = history
    .filter((tx) => parseInt(tx.sender_id) === parseInt(user?.wallet_id))
    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

  const totalVolume = totalIncome + totalExpense;
  const incomeRatio = totalVolume > 0 ? (totalIncome / totalVolume) * 100 : 50;

  // Group outgoing debits by category for budgeting visual breakdown
  const categoryDebits = {
    Transfer: 0,
    Groceries: 0,
    Rent: 0,
    Salary: 0,
    Freelance: 0,
    Utilities: 0
  };

  history
    .filter((tx) => parseInt(tx.sender_id) === parseInt(user?.wallet_id))
    .forEach((tx) => {
      const cat = tx.category || 'Transfer';
      if (categoryDebits.hasOwnProperty(cat)) {
        categoryDebits[cat] += parseFloat(tx.amount);
      } else {
        categoryDebits[cat] = parseFloat(tx.amount);
      }
    });

  const totalDebits = Object.values(categoryDebits).reduce((a, b) => a + b, 0);

  // Sandbox developer faucet refill success trigger
  const handleFaucetSuccess = () => {
    addToast(
      '📥 Faucet Funds Minted',
      'Successfully credited $500.00 to your ledger wallet.',
      'credit'
    );
    fetchBalance();
    fetchHistory();
    auditLedgerIntegrity();
  };

  // Radial Ring Metrics
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (incomeRatio / 100) * circumference;

  // Sparkline coordinates calculator
  const getSparklinePoints = () => {
    if (history.length === 0) return '';
    
    // Limits balance history trends representation to last 7 transactions
    const limitedTxs = [...history].reverse().slice(-7);
    let runningBalance = parseFloat(balance);
    const balanceTrend = [runningBalance];

    for (let i = history.length - 1; i >= 0; i--) {
      const tx = history[i];
      const isDebit = parseInt(tx.sender_id) === parseInt(user?.wallet_id);
      runningBalance = isDebit 
        ? runningBalance + parseFloat(tx.amount)
        : runningBalance - parseFloat(tx.amount);
      balanceTrend.unshift(runningBalance);
    }

    const finalTrend = balanceTrend.slice(-7);
    if (finalTrend.length < 2) return '';

    const min = Math.min(...finalTrend);
    const max = Math.max(...finalTrend);
    const range = max - min === 0 ? 1 : max - min;

    const width = 360;
    const height = 40;

    return finalTrend
      .map((val, idx) => {
        const x = (idx / (finalTrend.length - 1)) * width;
        const y = height - ((val - min) / range) * height * 0.8 - height * 0.1;
        return `${x},${y}`;
      })
      .join(' ');
  };

  // 5. Search & Filter operations
  const filteredHistory = history.filter((tx) => {
    const isDebit = parseInt(tx.sender_id) === parseInt(user?.wallet_id);
    const partnerName = isDebit ? tx.receiver_name : tx.sender_name;

    // Filter 1: Text Search match
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      query === '' ||
      partnerName.toLowerCase().includes(query) ||
      tx.amount.toString().includes(query) ||
      tx.id.toString().includes(query);

    // Filter 2: Tab category match
    const matchesType =
      filterType === 'ALL' ||
      (filterType === 'DEBIT' && isDebit) ||
      (filterType === 'CREDIT' && !isDebit);

    return matchesSearch && matchesType;
  });

  // Latency metrics color evaluator
  const getLatencyClass = () => {
    if (!latency) return 'latency-excellent';
    if (latency < 50) return 'latency-excellent';
    if (latency < 150) return 'latency-good';
    return 'latency-degraded';
  };

  const getLatencyLabel = () => {
    if (!connected) return 'Disconnected';
    if (!latency) return 'Syncing...';
    if (latency < 50) return 'Excellent';
    if (latency < 150) return 'Stable';
    return 'Degraded';
  };

  return (
    <div className="light-app-layout">
      {/* Navbar Banner with socket status propagation */}
      <Navbar connected={connected} />

      {/* Main Dashboard Command Grid */}
      <main className="dashboard">
        
        {/* Left Side: interactive Widgets panel */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Elegant dynamic 3D holographic balance card */}
          <div className="balance-card-wrapper">
            <div 
              ref={cardRef}
              className="balance-widget-3d"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <div className="card-holographic-foil"></div>
              <div className="card-header-decor">
                <div className="card-chip"></div>
                <span className="card-brand">STASH PREMIER</span>
              </div>

              <div className="card-body-decor">
                <h2 className="balance-label">Total Balance</h2>
                <div className="balance-amount">
                  {loadingBalance ? (
                    <span style={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.7)' }}>Syncing Ledger...</span>
                  ) : (
                    `$${parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  )}
                </div>
              </div>

              <div className="card-footer-decor">
                <div className="card-user-info">
                  <span className="card-user-name">@{user?.username}</span>
                  <span className="card-ref-id">WALLET REF #{user?.wallet_id}</span>
                </div>
                <button 
                  className="card-copy-btn" 
                  onClick={(e) => handleCopyWalletId(e, user?.wallet_id)}
                  title="Copy Wallet ID Reference"
                >
                  {copiedId ? (
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
          </div>

          {/* Quick Neon Action Trigger Row */}
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button
              className="btn btn-neon"
              onClick={() => setIsModalOpen(true)}
              disabled={loadingBalance}
              style={{ flex: 1, padding: '14px' }}
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
            <button
              className="btn"
              onClick={() => setIsFaucetModalOpen(true)}
              disabled={loadingBalance}
              style={{ flex: 1, padding: '14px', borderColor: 'rgba(16, 185, 129, 0.3)', color: 'var(--color-success)', background: 'rgba(16, 185, 129, 0.04)' }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(16, 185, 129, 0.08)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(16, 185, 129, 0.04)'}
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
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              Claim Faucet
            </button>
          </div>

          {/* Real-time Socket Diagnostics panel */}
          <div 
            className="diagnostics-panel interactive-spotlight"
            onMouseMove={handleSpotlightMouseMove}
          >
            <div className="diagnostics-header">
              <h3 className="diagnostics-title">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent-purple)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" />
                  <line x1="6" y1="18" x2="6.01" y2="18" />
                </svg>
                Network Diagnostics
              </h3>
              <span className="badge-live" style={{ background: 'rgba(124, 58, 237, 0.1)', borderColor: 'rgba(124, 58, 237, 0.2)', color: 'var(--accent-purple)' }}>
                Active Node
              </span>
            </div>

            <div className="diagnostics-grid">
              <div className="diagnostic-item">
                <span className="diagnostic-label">Websocket Link:</span>
                <span className="diagnostic-value" style={{ color: connected ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {connected ? 'CONNECTED' : 'STANDBY'}
                </span>
              </div>
              <div className="diagnostic-item">
                <span className="diagnostic-label">Node RTT Latency:</span>
                <span className="diagnostic-value">
                  <span className={`latency-indicator ${getLatencyClass()}`}></span>
                  <span className="ping-speed">{connected && latency ? `${latency}ms` : '--'}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({getLatencyLabel()})</span>
                </span>
              </div>
              <div className="diagnostic-item">
                <span className="diagnostic-label">ACID Engine Status:</span>
                <span className="diagnostic-value" style={{ color: 'var(--color-success)', fontSize: '0.78rem' }}>
                  🛡️ Row locks (FOR UPDATE) locked
                </span>
              </div>
              <div className="diagnostic-item">
                <span className="diagnostic-label">Ledger Chain Seal:</span>
                <span className="diagnostic-value">
                  {ledgerStatus === 'AUDITING' && (
                    <span style={{ color: 'var(--text-muted)' }}>Auditing...</span>
                  )}
                  {ledgerStatus === 'VERIFIED' && (
                    <span style={{ color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span className="latency-indicator latency-excellent"></span>
                      VERIFIED ({verifiedBlocksCount} Seals)
                    </span>
                  )}
                  {ledgerStatus === 'COMPROMISED' && (
                    <span style={{ color: 'var(--color-danger)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span className="latency-indicator latency-degraded"></span>
                      CHAIN CORRUPTED
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* SVG Visual Financial Analytics */}
          <div 
            className="analytics-panel interactive-spotlight"
            onMouseMove={handleSpotlightMouseMove}
          >
            <h3 className="analytics-title">Ledger Visual Flow</h3>
            <div className="analytics-content">
              {/* Radial Progress Ring representing credits flow */}
              <div className="chart-visual-box">
                <svg width="90" height="90" viewBox="0 0 90 90">
                  <circle className="progress-bg-circle" cx="45" cy="45" r={radius} />
                  <circle
                    className="progress-active-circle"
                    cx="45"
                    cy="45"
                    r={radius}
                    stroke="url(#analytics-grad)"
                    strokeDasharray={circumference}
                    strokeDashoffset={loadingHistory ? circumference : strokeDashoffset}
                    style={{ filter: 'drop-shadow(0 0 5px rgba(219,39,119,0.3))' }}
                  />
                  <defs>
                    <linearGradient id="analytics-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#db2777" />
                    </linearGradient>
                  </defs>
                </svg>
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800 }}>{loadingHistory ? '0' : Math.round(incomeRatio)}%</span>
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inflow</span>
                </div>
              </div>

              {/* Data legends bars */}
              <div className="analytics-legend">
                <div className="legend-item">
                  <div className="legend-header">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="legend-dot" style={{ backgroundColor: 'var(--accent-purple)' }}></span>
                      Total Inflow (Credits)
                    </span>
                    <span>${totalIncome.toFixed(2)}</span>
                  </div>
                  <div className="legend-bar-container">
                    <div className="legend-bar" style={{ width: `${incomeRatio}%`, backgroundColor: 'var(--accent-purple)' }}></div>
                  </div>
                </div>

                <div className="legend-item">
                  <div className="legend-header">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="legend-dot" style={{ backgroundColor: 'var(--accent-pink)' }}></span>
                      Total Outflow (Debits)
                    </span>
                    <span>${totalExpense.toFixed(2)}</span>
                  </div>
                  <div className="legend-bar-container">
                    <div className="legend-bar" style={{ width: `${100 - incomeRatio}%`, backgroundColor: 'var(--accent-pink)' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Categorical Budgeting Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginTop: '16px' }}>
              <h4 style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Category Expenditures
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(categoryDebits).map(([cat, val]) => {
                  const percent = totalDebits > 0 ? (val / totalDebits) * 100 : 0;
                  const barColor = 
                    cat === 'Rent' ? '#3b82f6' : 
                    cat === 'Groceries' ? '#10b981' : 
                    cat === 'Salary' ? '#a855f7' : 
                    cat === 'Freelance' ? '#14b8a6' : 
                    cat === 'Utilities' ? '#f59e0b' : '#ec4899';
                  
                  return (
                    <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: barColor }}></span>
                          {cat}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          ${val.toFixed(2)} <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.15)' }}>({Math.round(percent)}%)</span>
                        </span>
                      </div>
                      <div className="legend-bar-container" style={{ height: '5px' }}>
                        <div className="legend-bar" style={{ width: `${percent}%`, backgroundColor: barColor, boxShadow: `0 0 8px ${barColor}` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simulated Neon Sparkline Graph showing balance trend */}
            {!loadingHistory && history.length > 0 && (
              <div className="sparkline-trend-card">
                <div className="sparkline-header">
                  <span>Balance Trend</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>Last 7 Tx</span>
                </div>
                <svg width="100%" height="40" viewBox="0 0 360 40" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="spark-glow" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#db2777" />
                    </linearGradient>
                  </defs>
                  <polyline
                    fill="none"
                    stroke="url(#spark-glow)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={getSparklinePoints()}
                    style={{ filter: 'drop-shadow(0 0 4px rgba(124,58,237,0.4))' }}
                  />
                </svg>
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Ledger Feed with advanced Filters and Search */}
        <section 
          className="glass-panel live-feed-panel interactive-spotlight"
          onMouseMove={handleSpotlightMouseMove}
        >
          <div className="feed-header" style={{ marginBottom: '12px' }}>
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

          {/* Interactive Search and Filter tab controls */}
          <div className="search-filter-row">
            <div className="search-box-wrapper">
              <span className="search-icon-inside">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search by peer, ID, or value..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input-fancy"
              />
            </div>

            <div className="filter-tabs">
              <button
                className={`filter-tab-btn ${filterType === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilterType('ALL')}
              >
                All
              </button>
              <button
                className={`filter-tab-btn ${filterType === 'DEBIT' ? 'active' : ''}`}
                onClick={() => setFilterType('DEBIT')}
              >
                Debits
              </button>
              <button
                className={`filter-tab-btn ${filterType === 'CREDIT' ? 'active' : ''}`}
                onClick={() => setFilterType('CREDIT')}
              >
                Credits
              </button>
            </div>
          </div>

          <div className="ledger-list">
            {loadingHistory ? (
              <div className="ledger-empty">
                <span className="spinner-small"></span>
                <p>Retrieving transaction audit lines...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
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
                <p>No matching ledger records found.</p>
              </div>
            ) : (
              filteredHistory.map((tx) => (
                <LedgerRow
                  key={tx.id}
                  tx={tx}
                  currentUserWalletId={user?.wallet_id}
                  onClick={() => handleOpenReceipt(tx)}
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

      {/* Faucet Modal overlay */}
      <FaucetModal
        isOpen={isFaucetModalOpen}
        onClose={() => setIsFaucetModalOpen(false)}
        onSuccess={handleFaucetSuccess}
      />

      {/* Slide-in Cryptographic Audit Receipt Drawer */}
      <AuditReceiptDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        tx={selectedTx}
        currentUserWalletId={user?.wallet_id}
      />
    </div>
  );
}
