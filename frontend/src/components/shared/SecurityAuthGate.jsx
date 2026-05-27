import React, { useState, useEffect } from 'react';

export default function SecurityAuthGate({
  isOpen,
  onClose,
  onVerifySuccess,
  amount,
  recipientName
}) {
  const [authMode, setAuthMode] = useState('pin'); // 'pin' | 'biometric'
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState('idle'); // 'idle' | 'scanning' | 'success'

  const CORRECT_PIN = '6969';

  // Keyboard support for physical input comfort
  useEffect(() => {
    if (!isOpen || authMode !== 'pin' || pinSuccess || pinError) return;

    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, authMode, pinSuccess, pinError]);

  if (!isOpen) return null;

  const handleKeyPress = (num) => {
    if (pin.length >= 4 || pinSuccess || pinError) return;
    
    const newPin = pin + num;
    setPin(newPin);

    // Auto check PIN validity on the 4th digit
    if (newPin.length === 4) {
      if (newPin === CORRECT_PIN) {
        setPinSuccess(true);
        setTimeout(() => {
          onVerifySuccess();
        }, 600);
      } else {
        setPinError(true);
        // Reset PIN after shake animation executes
        setTimeout(() => {
          setPin('');
          setPinError(false);
        }, 1000);
      }
    }
  };

  const handleBackspace = () => {
    if (pinSuccess || pinError) return;
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    if (pinSuccess || pinError) return;
    setPin('');
  };

  // Simulated Biometric verification sequence
  const startBiometricVerification = () => {
    setBiometricStatus('scanning');
    
    setTimeout(() => {
      setBiometricStatus('success');
      
      setTimeout(() => {
        onVerifySuccess();
      }, 1000);
    }, 1800);
  };

  // Auto trigger biometrics if user enters biometric mode
  useEffect(() => {
    if (authMode === 'biometric' && biometricStatus === 'idle') {
      startBiometricVerification();
    }
  }, [authMode]);

  const toggleAuthMode = () => {
    if (pinSuccess || biometricStatus === 'scanning' || biometricStatus === 'success') return;
    setPin('');
    setPinError(false);
    setPinSuccess(false);
    setBiometricStatus('idle');
    setAuthMode(authMode === 'pin' ? 'biometric' : 'pin');
  };

  return (
    <div className="security-gate-overlay">
      <div className="security-gate-content">
        
        {/* Dynamic header summary confirming intent */}
        <div className="confirm-details-box">
          <div className="confirm-details-title">Step-Up Verification</div>
          <div className="confirm-details-amount">
            ${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="confirm-details-peer">
            Securing transfer to <span>@{recipientName}</span>
          </div>
        </div>

        {authMode === 'pin' ? (
          /* PIN MODE DISPLAY */
          <>
            <div style={{ textAlign: 'center', margin: '5px 0' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Enter Transaction PIN
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Hint: Demo PIN is 6969
              </div>
            </div>

            {/* Glowing active code circles */}
            <div className={`auth-dots-container ${pinError ? 'shake-anim' : ''}`}>
              {[...Array(4)].map((_, i) => {
                let dotClass = 'auth-dot';
                if (pinSuccess) dotClass += ' success';
                else if (pinError) dotClass += ' error';
                else if (i < pin.length) dotClass += ' active';
                
                return <div key={i} className={dotClass}></div>;
              })}
            </div>

            {/* Premium touch visual numerical grid */}
            <div className="pin-pad-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  className="pin-btn"
                  onClick={() => handleKeyPress(num.toString())}
                  disabled={pinSuccess || pinError}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                className="pin-btn btn-action"
                onClick={handleClear}
                disabled={pinSuccess || pinError || pin.length === 0}
              >
                Clear
              </button>
              <button
                type="button"
                className="pin-btn"
                onClick={() => handleKeyPress('0')}
                disabled={pinSuccess || pinError}
              >
                0
              </button>
              <button
                type="button"
                className="pin-btn btn-action"
                onClick={handleBackspace}
                disabled={pinSuccess || pinError || pin.length === 0}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                  <line x1="18" y1="9" x2="12" y2="15" />
                  <line x1="12" y1="9" x2="18" y2="15" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          /* BIOMETRIC MODE DISPLAY */
          <div className="biometric-section">
            <div className={`biometric-scanner-ring ${biometricStatus}`}>
              
              {/* Spinning visual dashed radar beam */}
              {biometricStatus === 'scanning' && <div className="biometric-radar-beam"></div>}
              
              <div className="biometric-icon-inner">
                {biometricStatus === 'success' ? (
                  /* Success Drawing Checkmark */
                  <svg className="checkmark-svg" viewBox="0 0 52 52">
                    <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                    <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                  </svg>
                ) : (
                  /* Futuristic Neon Face ID Icon */
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                    <path d="M12 9v4" />
                  </svg>
                )}
              </div>
            </div>

            <div className="biometric-status-text">
              {biometricStatus === 'scanning' && <span className="status-scanning">Scanning biometrics...</span>}
              {biometricStatus === 'success' && <span className="status-success">Biometrics Approved</span>}
              {biometricStatus === 'idle' && <span className="status-idle">Face ID Scanner Ready</span>}
            </div>
            
            {biometricStatus === 'idle' && (
              <button 
                type="button" 
                className="btn btn-neon" 
                onClick={startBiometricVerification}
                style={{ padding: '8px 20px', fontSize: '0.85rem' }}
              >
                Scan Face
              </button>
            )}
          </div>
        )}

        {/* Security Method toggle controller */}
        <button
          type="button"
          className="security-toggle-btn"
          onClick={toggleAuthMode}
          disabled={pinSuccess || biometricStatus === 'scanning' || biometricStatus === 'success'}
        >
          {authMode === 'pin' ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 2H3v16h5v4l4-4h9z" />
              </svg>
              Use Biometric Face ID
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Use Security PIN Pad
            </>
          )}
        </button>

        {/* Dismiss step-up and return safely to transfer details page */}
        <button
          type="button"
          className="btn"
          onClick={onClose}
          disabled={pinSuccess || biometricStatus === 'scanning' || biometricStatus === 'success'}
          style={{
            marginTop: '15px',
            width: '100%',
            background: 'transparent',
            borderColor: 'rgba(255,255,255,0.06)',
            color: 'var(--text-secondary)',
            fontSize: '0.88rem',
            padding: '10px'
          }}
          onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
        >
          Go Back
        </button>

      </div>
    </div>
  );
}
