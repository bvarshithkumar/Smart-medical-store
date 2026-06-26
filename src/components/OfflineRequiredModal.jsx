/**
 * OfflineRequiredModal – Premium Healthcare-Themed "Internet Connection Required" modal
 * Enterprise-grade offline experience matching leading SaaS designs.
 */
import React, { useEffect, useState, useRef } from 'react';
import { useOfflineContext } from '../context/OfflineContext';

/* ── Premium Healthcare-Themed WiFi Disconnected SVG ──────────────── */
const PremiumOfflineIllustration = () => (
  <svg 
    width="96" 
    height="96" 
    viewBox="0 0 96 96" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    style={{ display: 'block', margin: '0 auto 20px' }}
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="illustrationGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#00A896" stop-opacity="0.32" />
        <stop offset="100%" stop-color="#00A896" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="medCrossGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0E5EBA" />
        <stop offset="100%" stop-color="#00A896" />
      </linearGradient>
    </defs>

    {/* Glowing background pulse */}
    <circle cx="48" cy="48" r="40" fill="url(#illustrationGlow)" className="svg-glow-pulse" />

    {/* Outer Wi-Fi waves (Disconnected / Faded / Dashed) */}
    <path d="M24 32C37.25 18.75 58.75 18.75 72 32" stroke="#475569" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
    <path d="M32 40C40.84 31.16 55.16 31.16 64 40" stroke="#475569" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
    
    {/* Pulsing Healthcare Cross in the Center */}
    <g className="svg-cross-pulse">
      {/* Backplate for the cross */}
      <rect x="34" y="34" width="28" height="28" rx="14" fill="url(#medCrossGrad)" opacity="0.15" />
      {/* Cross vertical bar */}
      <rect x="45" y="38" width="6" height="20" rx="3" fill="url(#medCrossGrad)" />
      {/* Cross horizontal bar */}
      <rect x="38" y="45" width="20" height="6" rx="3" fill="url(#medCrossGrad)" />
    </g>

    {/* Wi-Fi Dot (Status Amber/Red Pulse) */}
    <circle cx="48" cy="68" r="4.5" fill="#EF4444" className="svg-dot-pulse" />

    {/* Diagonal Strike-through line indicating Disconnect */}
    <line x1="22" y1="22" x2="74" y2="74" stroke="#EF4444" strokeWidth="4.5" strokeLinecap="round" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.45))' }} />
  </svg>
);

const OfflineRequiredModal = () => {
  const { offlineModal, closeOfflineModal, retryConnection } = useOfflineContext();
  const { show, feature } = offlineModal;

  const [visible, setVisible] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);
  const [showSettingsInfo, setShowSettingsInfo] = useState(false);

  const retryBtnRef = useRef(null);

  // Dynamic feature-specific messages
  const getFeatureSpecificMessage = (featureName) => {
    if (!featureName) return "Some features require an active internet connection. You can continue browsing cached content while offline.";
    
    const name = featureName.trim().toLowerCase();
    
    if (name.includes('track')) {
      return "Track Order requires an active internet connection.";
    }
    if (name.includes('upload') || name.includes('prescription')) {
      return "Prescription Upload requires an active internet connection.";
    }
    if (name.includes('schedule') || name.includes('pickup')) {
      return "Scheduled Pickup requires an active internet connection.";
    }
    if (name.includes('payment')) {
      return "Payments require an active internet connection.";
    }
    if (name.includes('login') || name.includes('profile')) {
      return "Login requires an active internet connection.";
    }
    if (name.includes('whatsapp') || name.includes('pharmacist')) {
      return "WhatsApp Pharmacist consultation requires an active internet connection.";
    }
    
    return `${featureName} requires an active internet connection.`;
  };

  // Platform instructions helper
  const getOSSettings = () => {
    const ua = navigator.userAgent;
    if (/windows/i.test(ua)) {
      return { platform: 'Windows', steps: 'Settings ➔ Network & Internet' };
    }
    if (/android/i.test(ua)) {
      return { platform: 'Android', steps: 'Settings ➔ Wi-Fi or Mobile Data' };
    }
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      return { platform: 'iPhone/iPad', steps: 'Settings ➔ Wi-Fi' };
    }
    if (/macintosh|mac os x/i.test(ua)) {
      return { platform: 'macOS', steps: 'System Settings ➔ Wi-Fi' };
    }
    return { platform: 'Device', steps: 'Settings ➔ Network & Wi-Fi' };
  };

  const osSettings = getOSSettings();

  useEffect(() => {
    if (show) {
      setRetryFailed(false);
      setShowSettingsInfo(false);
      requestAnimationFrame(() => setVisible(true));
      document.body.style.overflow = 'hidden';
      
      // Accessibility: Auto-focus the primary Retry button on opening
      setTimeout(() => {
        retryBtnRef.current?.focus();
      }, 80);
    } else {
      setVisible(false);
      document.body.style.overflow = '';
    }
  }, [show]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && show) {
        closeOfflineModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, closeOfflineModal]);

  const handleRetry = () => {
    setRetrying(true);
    setRetryFailed(false);
    setTimeout(() => {
      const ok = retryConnection();
      setRetrying(false);
      if (!ok) {
        setRetryFailed(true);
      }
    }, 1200);
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`offline-modal-backdrop ${visible ? 'visible' : ''}`}
        onClick={closeOfflineModal}
      />

      {/* Modal / Bottom Sheet Wrapper */}
      <div
        className="offline-modal-wrapper"
        role="dialog"
        aria-modal="true"
        aria-labelledby="offline-modal-title"
        aria-describedby="offline-modal-desc"
      >
        <div className={`offline-modal-dialog ${visible ? 'visible' : ''}`}>
          {/* Top aesthetic gradient accent bar */}
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, var(--primary-blue), var(--teal-accent), var(--primary-blue))',
            backgroundSize: '200% 100%',
            animation: 'shimmerBar 2.5s linear infinite',
          }} />

          {/* Modal Content container */}
          <div className="offline-modal-content">
            
            {/* Premium Disconnection Illustration */}
            <PremiumOfflineIllustration />

            {/* Title */}
            <h2 id="offline-modal-title" className="offline-modal-title-text">
              You're Currently Offline
            </h2>

            {/* Feature Alert Chip / Dynamic text */}
            <div className="offline-feature-message" id="offline-modal-desc">
              {getFeatureSpecificMessage(feature)}
            </div>

            {/* Glassmorphic "Available Offline" Card */}
            <div className="offline-available-card">
              <div className="offline-available-title">
                ✓ Available Offline
              </div>
              <div className="offline-available-grid">
                {[
                  'Home Page',
                  'Store Information',
                  'Contact Details',
                  'Medicine Categories',
                  'FAQs',
                  'Previously Visited Pages'
                ].map((item) => (
                  <div key={item} className="offline-grid-item">
                    <span className="offline-check-icon">✓</span>
                    <span className="offline-item-label">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Instructions Display */}
            {showSettingsInfo && (
              <div className="offline-settings-alert">
                <span className="settings-alert-icon">⚙️</span>
                <div className="settings-alert-body">
                  <strong>{osSettings.platform} Settings:</strong>
                  <div>Open your system settings and verify connection status at: <br /><code>{osSettings.steps}</code></div>
                </div>
              </div>
            )}

            {/* Still offline warning */}
            {retryFailed && (
              <div className="offline-failed-alert">
                <span className="failed-alert-icon">⚠️</span>
                <span>Still offline. Please check your local device network settings.</span>
              </div>
            )}

            {/* Action Buttons group */}
            <div className="offline-btn-group">
              {/* Button 1: Retry Connection (Primary) */}
              <button
                ref={retryBtnRef}
                onClick={handleRetry}
                disabled={retrying}
                className={`offline-btn-primary ${retrying ? 'loading' : ''}`}
                aria-label="Recheck network connection"
              >
                {retrying ? (
                  <>
                    <span className="offline-spinner" />
                    Checking...
                  </>
                ) : (
                  <>🔄 Retry Connection</>
                )}
              </button>

              {/* Button 2: Continue Offline (Secondary) */}
              <button
                onClick={closeOfflineModal}
                className="offline-btn-secondary"
                aria-label="Continue browsing cached content offline"
              >
                Continue Offline
              </button>

              {/* Button 3: Network Settings (Info trigger) */}
              <button
                onClick={() => setShowSettingsInfo(!showSettingsInfo)}
                className={`offline-btn-settings ${showSettingsInfo ? 'active' : ''}`}
                aria-label="Show platform specific network settings instructions"
              >
                🛠️ Network Settings
              </button>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        /* ── Backdrop Overlay ── */
        .offline-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 99996;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          opacity: 0;
          transition: opacity 0.35s ease;
          pointer-events: none;
        }
        .offline-modal-backdrop.visible {
          opacity: 1;
          pointer-events: auto;
        }

        /* ── Modal Dialog Wrapper ── */
        .offline-modal-wrapper {
          position: fixed;
          inset: 0;
          z-index: 99997;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          pointer-events: none;
        }

        /* ── Main Modal Container ── */
        .offline-modal-dialog {
          pointer-events: auto;
          width: 100%;
          max-width: 440px;
          background: rgba(13, 27, 46, 0.88);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 
            0 24px 64px -12px rgba(0, 0, 0, 0.75),
            0 0 0 1px rgba(255, 255, 255, 0.05);
          transform: translateY(30px) scale(0.96);
          opacity: 0;
          transition: transform 0.4s cubic-bezier(0.34, 1.5, 0.64, 1), opacity 0.3s ease;
        }
        .offline-modal-dialog.visible {
          transform: translateY(0) scale(1);
          opacity: 1;
        }

        .offline-modal-content {
          padding: 32px 28px 24px;
          text-align: center;
        }

        /* ── Responsive Mobile Sheet Layout ── */
        @media (max-width: 640px) {
          .offline-modal-wrapper {
            align-items: flex-end;
            padding: 0;
          }
          .offline-modal-dialog {
            max-width: 100%;
            border-radius: 28px 28px 0 0;
            transform: translateY(100%);
            box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.6);
            border-left: none;
            border-right: none;
            border-bottom: none;
            transition: transform 0.38s cubic-bezier(0.25, 1, 0.5, 1);
          }
          .offline-modal-dialog.visible {
            transform: translateY(0);
          }
          .offline-modal-content {
            padding: 28px 20px 32px;
          }
        }

        /* ── UI Text Styles ── */
        .offline-modal-title-text {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: #f8fafc;
          margin: 0 0 8px;
          letter-spacing: -0.3px;
        }

        .offline-feature-message {
          font-family: 'Inter', sans-serif;
          font-size: 13.5px;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 24px;
          padding: 0 8px;
        }

        /* ── Available Offline Glass Card ── */
        .offline-available-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 16px;
          padding: 14px 16px;
          margin-bottom: 20px;
          text-align: left;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.03);
        }

        .offline-available-title {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 800;
          color: var(--teal-accent, #00A896);
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .offline-available-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 12px;
        }

        @media (max-width: 400px) {
          .offline-available-grid {
            grid-template-columns: 1fr;
            gap: 6px;
          }
        }

        .offline-grid-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .offline-check-icon {
          color: #22c55e;
          font-weight: 800;
          font-size: 13px;
        }

        .offline-item-label {
          font-family: 'Inter', sans-serif;
          font-size: 12.5px;
          color: #cbd5e1;
        }

        /* ── Network Settings & Warn Alert Boxes ── */
        .offline-settings-alert {
          background: rgba(14, 94, 186, 0.08);
          border: 1px solid rgba(14, 94, 186, 0.2);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 16px;
          text-align: left;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          animation: slideDownFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .settings-alert-icon {
          font-size: 15px;
          line-height: 1;
        }

        .settings-alert-body {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          color: #93c5fd;
          line-height: 1.5;
        }

        .settings-alert-body code {
          background: rgba(255,255,255,0.07);
          padding: 1px 4px;
          border-radius: 4px;
          font-family: monospace;
          color: #e0f2fe;
          display: inline-block;
          margin-top: 3px;
        }

        .offline-failed-alert {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 16px;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          color: #fca5a5;
          animation: slideDownFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .failed-alert-icon {
          font-size: 14px;
        }

        /* ── Button Group Styling ── */
        .offline-btn-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }

        .offline-btn-primary {
          background: linear-gradient(135deg, var(--primary-blue, #0e5eba), #1d4ed8);
          color: #ffffff;
          border: none;
          padding: 14px;
          border-radius: 14px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.22s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(14, 94, 186, 0.35);
        }

        .offline-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(14, 94, 186, 0.45);
          filter: brightness(1.1);
        }

        .offline-btn-primary:active {
          transform: translateY(0);
        }

        .offline-btn-primary.loading {
          background: rgba(14, 94, 186, 0.6);
          cursor: not-allowed;
          box-shadow: none;
        }

        .offline-btn-secondary {
          background: rgba(255, 255, 255, 0.04);
          color: #cbd5e1;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 12px;
          border-radius: 12px;
          font-family: 'Inter', sans-serif;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .offline-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #f8fafc;
          border-color: rgba(255, 255, 255, 0.15);
        }

        .offline-btn-settings {
          background: transparent;
          color: #64748b;
          border: none;
          padding: 6px;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s;
          margin-top: 4px;
          outline: none;
          display: inline-flex;
          align-self: center;
          justify-content: center;
        }

        .offline-btn-settings:hover {
          color: #94a3b8;
        }
        .offline-btn-settings.active {
          color: #93c5fd;
        }

        /* ── SVG Animations ── */
        @keyframes svgGlow {
          0%, 100% { transform: scale(0.95); opacity: 0.5; }
          50%       { transform: scale(1.15); opacity: 0.95; }
        }
        @keyframes svgCross {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(14,94,186,0.3)); }
          50%       { transform: scale(1.04); filter: drop-shadow(0 0 10px rgba(0,168,150,0.6)); }
        }
        @keyframes svgDot {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50%       { transform: scale(1.2); opacity: 1; fill: #ef4444; }
        }
        
        .svg-glow-pulse {
          transform-origin: center;
          animation: svgGlow 3s ease-in-out infinite;
        }
        .svg-cross-pulse {
          transform-origin: center;
          animation: svgCross 2.5s ease-in-out infinite;
        }
        .svg-dot-pulse {
          transform-origin: center;
          animation: svgDot 1.5s ease-in-out infinite;
        }

        @keyframes shimmerBar {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @keyframes slideDownFade {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .offline-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default OfflineRequiredModal;
