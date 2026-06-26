/**
 * ConnectionRestoredToast – "Connection restored" premium toast
 * Auto-dismisses after 4 seconds
 */
import React, { useState, useEffect } from 'react';
import { useOfflineContext } from '../context/OfflineContext';

const ConnectionRestoredToast = () => {
  const { showRestoreToast, closeRestoreToast } = useOfflineContext();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (showRestoreToast) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [showRestoreToast]);

  if (!showRestoreToast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '0' : '100px'})`,
        opacity: visible ? 1 : 0,
        transition: 'transform 0.45s cubic-bezier(0.34,1.4,0.64,1), opacity 0.3s ease',
        zIndex: 99994,
        width: 'min(380px, calc(100vw - 32px))',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      <div style={{
        background: 'linear-gradient(135deg, #052e16 0%, #0f172a 100%)',
        border: '1px solid rgba(34,197,94,0.3)',
        borderRadius: '16px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,197,94,0.08)',
      }}>
        {/* Icon */}
        <div style={{
          width: '38px', height: '38px', flexShrink: 0,
          background: 'linear-gradient(135deg, #16a34a, #22c55e)',
          borderRadius: '11px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(34,197,94,0.35)',
          animation: 'iconBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.55a11 11 0 0 1 14 0"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <circle cx="12" cy="20" r="1" fill="white"/>
          </svg>
        </div>

        {/* Text */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80', marginBottom: '2px' }}>
            ✓ Internet Connection Restored
          </div>
          <div style={{ fontSize: '12.5px', color: '#86efac' }}>
            You are back online.
          </div>
        </div>

        {/* Close */}
        <button
          onClick={closeRestoreToast}
          style={{
            background: 'none', border: 'none',
            color: '#475569', cursor: 'pointer',
            padding: '4px', borderRadius: '6px',
            display: 'flex', alignItems: 'center',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#94a3b8'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor"
            strokeWidth="2.5" fill="none" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Progress drain bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: '8px', right: '8px',
        height: '3px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '0 0 6px 6px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #22c55e, #4ade80)',
          borderRadius: '6px',
          transformOrigin: 'left',
          animation: 'drainBar 4s linear forwards',
        }} />
      </div>

      <style>{`
        @keyframes iconBounce {
          from { transform: scale(0.5) rotate(-15deg); opacity: 0; }
          to   { transform: scale(1)   rotate(0deg);   opacity: 1; }
        }
        @keyframes drainBar {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
};

export default ConnectionRestoredToast;
