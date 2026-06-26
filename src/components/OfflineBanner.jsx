/**
 * OfflineBanner – slim persistent strip shown when offline
 * Does NOT block the page — just informs the user
 */
import React, { useState, useEffect } from 'react';
import { useOfflineContext } from '../context/OfflineContext';

const WifiOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
    <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
    <circle cx="12" cy="20" r="1" fill="currentColor"/>
  </svg>
);

const OfflineBanner = () => {
  const { isOnline } = useOfflineContext();
  const [visible, setVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShouldRender(true);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const t = setTimeout(() => setShouldRender(false), 400);
      return () => clearTimeout(t);
    }
  }, [isOnline]);

  if (!shouldRender) return null;

  return (
    <div
      id="offline-banner"
      role="status"
      aria-live="polite"
      aria-label="Offline mode active"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99995,
        transform: `translateY(${visible ? '0' : '-100%'})`,
        opacity: visible ? 1 : 0,
        transition: 'transform 0.35s cubic-bezier(0.34,1.2,0.64,1), opacity 0.3s ease',
        background: 'linear-gradient(90deg, #1e293b 0%, #0f1e38 50%, #1e293b 100%)',
        borderBottom: '1px solid rgba(251,191,36,0.25)',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
      }}
    >
      {/* Blinking dot */}
      <span style={{
        width: '7px', height: '7px',
        borderRadius: '50%',
        background: '#f59e0b',
        flexShrink: 0,
        animation: 'offlinePulse 1.6s ease-in-out infinite',
      }} />

      {/* WiFi off icon */}
      <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center' }}>
        <WifiOffIcon />
      </span>

      {/* Message */}
      <span style={{
        fontSize: '12.5px',
        fontWeight: 600,
        color: '#fde68a',
        letterSpacing: '0.2px',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}>
        Offline Mode
      </span>
      <span style={{
        fontSize: '12px',
        color: '#94a3b8',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}>
        – Some features are unavailable
      </span>

      {/* Cached badge */}
      <span style={{
        marginLeft: '4px',
        padding: '2px 8px',
        background: 'rgba(251,191,36,0.12)',
        border: '1px solid rgba(251,191,36,0.2)',
        borderRadius: '100px',
        fontSize: '10.5px',
        fontWeight: 700,
        color: '#fbbf24',
        letterSpacing: '0.3px',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}>
        CACHED
      </span>

      <style>{`
        @keyframes offlinePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
};

export default OfflineBanner;
