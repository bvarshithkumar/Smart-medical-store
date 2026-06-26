import React, { useEffect, useState } from 'react';

const PWASuccessToast = ({ onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entry animation
    requestAnimationFrame(() => setVisible(true));

    // Auto close after 5 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 400);
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 400);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '0' : '120px'})`,
        opacity: visible ? 1 : 0,
        transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease',
        zIndex: 99997,
        pointerEvents: 'auto',
        width: 'min(440px, calc(100vw - 32px))',
      }}
    >
      <div style={{
        background: 'linear-gradient(135deg, #0d2347 0%, #0f172a 100%)',
        border: '1px solid rgba(34,197,94,0.3)',
        borderRadius: '18px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,197,94,0.1)',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Success icon */}
        <div style={{
          width: '48px', height: '48px', flexShrink: 0,
          background: 'linear-gradient(135deg, #16a34a, #22c55e)',
          borderRadius: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
          animation: 'successPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s both',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '11px', fontWeight: 700,
            color: '#4ade80',
            letterSpacing: '0.8px', textTransform: 'uppercase',
            marginBottom: '3px',
          }}>
            ✅ Installation Successful
          </div>
          <div style={{
            fontSize: '14px', fontWeight: 600,
            color: '#f1f5f9',
            lineHeight: 1.4,
          }}>
            Sri Venkateshwara Medical Store installed successfully.
          </div>
          <div style={{
            fontSize: '12px', color: '#64748b', marginTop: '3px',
          }}>
            Launch it from your home screen or desktop
          </div>
        </div>

        {/* Close */}
        <button
          onClick={handleClose}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            width: '30px', height: '30px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#475569', flexShrink: 0,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          aria-label="Close notification"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: '12px', right: '12px', height: '3px',
        background: 'rgba(255,255,255,0.05)', borderRadius: '0 0 6px 6px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: '100%',
          background: 'linear-gradient(90deg, #22c55e, #4ade80)',
          borderRadius: '6px',
          animation: 'progressDrain 5s linear forwards',
        }} />
      </div>

      <style>{`
        @keyframes successPop {
          from { transform: scale(0.5) rotate(-10deg); opacity: 0; }
          to   { transform: scale(1)   rotate(0deg);   opacity: 1; }
        }
        @keyframes progressDrain {
          from { transform: scaleX(1);   transform-origin: left; }
          to   { transform: scaleX(0);   transform-origin: left; }
        }
      `}</style>
    </div>
  );
};

export default PWASuccessToast;
