import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Login() {
  const { login, register } = useContext(AuthContext);
  const [isLoginTab, setIsLoginTab] = useState(true);

  // Form Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Alerts & loading states
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    setLoading(false);

    if (isLoginTab) {
      if (!email || !password) {
        setAlert({ type: 'error', message: 'Please provide both email and password.' });
        return;
      }
      setLoading(true);
      const res = await login(email, password);
      if (!res.success) {
        setAlert({ type: 'error', message: res.error });
        setLoading(false);
      }
    } else {
      if (!username || !email || !password) {
        setAlert({ type: 'error', message: 'All registration parameters are strictly mandatory.' });
        return;
      }
      setLoading(true);
      const res = await register(username, email, password);
      if (!res.success) {
        setAlert({ type: 'error', message: res.error });
        setLoading(false);
      }
    }
  };

  const handleTabChange = (isLogin) => {
    setIsLoginTab(isLogin);
    setAlert(null);
    setUsername('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <div className="logo-container">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="url(#auth-logo-grad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 0 10px rgba(219,39,119,0.3))' }}
            >
              <defs>
                <linearGradient id="auth-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#db2777" />
                </linearGradient>
              </defs>
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Stash
          </div>
          <p className="auth-subtitle">Real-Time, ACID-Compliant Financial Ledger</p>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="auth-tabs">
          <button
            type="button"
            onClick={() => handleTabChange(true)}
            className={`auth-tab ${isLoginTab ? 'active' : ''}`}
            disabled={loading}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleTabChange(false)}
            className={`auth-tab ${!isLoginTab ? 'active' : ''}`}
            disabled={loading}
          >
            Register
          </button>
        </div>

        {alert && (
          <div className={`auth-alert auth-alert-${alert.type}`}>
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
              {alert.type === 'error' ? (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </>
              ) : (
                <>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </>
              )}
            </svg>
            {alert.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLoginTab && (
            <div className="input-group">
              <label className="input-label">Username</label>
              <input
                type="text"
                placeholder="e.g. vinit_eng"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className="form-input"
                disabled={loading}
                required
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              disabled={loading}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="btn btn-neon" style={{ width: '100%', marginTop: '12px' }} disabled={loading}>
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner-small"></span> Authenticating...
              </span>
            ) : isLoginTab ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
