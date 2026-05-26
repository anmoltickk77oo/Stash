import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function Navbar({ connected }) {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <a href="/" className="nav-brand">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="url(#stash-gradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 8px rgba(124,58,237,0.4))' }}
          >
            <defs>
              <linearGradient id="stash-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#db2777" />
              </linearGradient>
            </defs>
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Stash
        </a>

        {user && (
          <div className="nav-profile">
            {/* Live Socket Status Indicator */}
            <div className="status-badge" title={connected ? 'Real-Time Link Synchronized' : 'Reconnecting Link...'}>
              <span className={`pulse-dot ${connected ? 'online' : 'offline'}`}></span>
              <span>{connected ? 'CONNECTED' : 'STANDBY'}</span>
            </div>

            <span className="user-tag">@{user.username}</span>

            <button className="btn btn-danger" onClick={logout} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
