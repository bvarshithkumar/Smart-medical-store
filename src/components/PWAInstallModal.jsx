import React, { useEffect } from 'react';

/* ── SVG icons ─────────────────────────────────────────────── */
const ChromeIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#4285F4" />
    <circle cx="12" cy="12" r="4.5" fill="white" />
    <path d="M12 7.5h8.1A10 10 0 0112 2" fill="#EA4335" />
    <path d="M12 7.5h8.1A10 10 0 0112 22V12" fill="#FBBC04" opacity="0.01" />
    <path d="M4.22 17.25A10 10 0 012 12h10" fill="#34A853" opacity="0.01" />
  </svg>
);

const EdgeIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="edgeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0078D4" />
        <stop offset="100%" stopColor="#28AFEA" />
      </linearGradient>
    </defs>
    <ellipse cx="12" cy="13" rx="8" ry="7" fill="url(#edgeGrad1)" />
    <path d="M4 13c0-4.4 3.6-8 8-8 2.8 0 5.2 1.4 6.7 3.5H8C5.8 8.5 4 10.5 4 13z" fill="#50E6FF" />
    <path d="M20 13c0 3-1.7 5.6-4.3 7H8c-2.2 0-4-1.8-4-4" fill="none" stroke="white" strokeWidth="1.5" />
  </svg>
);

const AndroidIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path d="M6 18v3a1 1 0 002 0v-3M16 18v3a1 1 0 002 0v-3" stroke="#3DDC84" strokeWidth="2" strokeLinecap="round"/>
    <rect x="2" y="8" width="20" height="11" rx="3" fill="#3DDC84"/>
    <circle cx="8.5" cy="14" r="1" fill="white"/>
    <circle cx="15.5" cy="14" r="1" fill="white"/>
    <path d="M8 8L6 4M16 8l2-4" stroke="#3DDC84" strokeWidth="2" strokeLinecap="round"/>
    <path d="M7 4.5l10 0" stroke="#3DDC84" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
  </svg>
);

const IPhoneIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="1" width="14" height="22" rx="3" fill="#1C1C1E"/>
    <rect x="7" y="3" width="10" height="16" rx="1.5" fill="#E5E7EB"/>
    <rect x="9" y="21" width="6" height="1" rx="0.5" fill="#6B7280"/>
    <rect x="10" y="2" width="4" height="1" rx="0.5" fill="#374151"/>
    <path d="M12 8l-2 2h1.5v3h1V10H14L12 8z" fill="#007AFF"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

/* ── PWAInstallModal Component ──────────────────────────────── */
const PWAInstallModal = ({ onClose }) => {
  // Prevent body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const platforms = [
    {
      icon: <ChromeIcon />,
      name: 'Google Chrome',
      color: '#4285F4',
      bg: 'rgba(66,133,244,0.08)',
      border: 'rgba(66,133,244,0.2)',
      steps: [
        { emoji: '⋮', text: 'Click the three-dot menu (⋮) in the top-right corner' },
        { emoji: '📥', text: 'Select "Install Sri Venkateshwara Medical Store"' },
        { emoji: '✅', text: 'Click "Install" in the dialog box' },
      ],
    },
    {
      icon: <EdgeIcon />,
      name: 'Microsoft Edge',
      color: '#0078D4',
      bg: 'rgba(0,120,212,0.08)',
      border: 'rgba(0,120,212,0.2)',
      steps: [
        { emoji: '...', text: 'Click the three-dot menu (...) in the top-right corner' },
        { emoji: '📱', text: 'Go to Apps → "Install this site as an app"' },
        { emoji: '✅', text: 'Click "Install" to confirm' },
      ],
    },
    {
      icon: <AndroidIcon />,
      name: 'Android',
      color: '#3DDC84',
      bg: 'rgba(61,220,132,0.08)',
      border: 'rgba(61,220,132,0.2)',
      steps: [
        { emoji: '⋮', text: 'Tap the browser menu (⋮)' },
        { emoji: '📲', text: 'Select "Add to Home Screen" or "Install App"' },
        { emoji: '✅', text: 'Tap "Add" or "Install" to confirm' },
      ],
    },
    {
      icon: <IPhoneIcon />,
      name: 'iPhone / iPad',
      color: '#007AFF',
      bg: 'rgba(0,122,255,0.08)',
      border: 'rgba(0,122,255,0.2)',
      steps: [
        { emoji: '⎋', text: 'Tap the Share button (box with arrow) at the bottom' },
        { emoji: '📲', text: 'Scroll down and tap "Add to Home Screen"' },
        { emoji: '✅', text: 'Tap "Add" in the top-right corner' },
      ],
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 99998,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          animation: 'pwaFadeIn 0.2s ease',
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Install SVMS App"
        style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(145deg, #0f1623 0%, #131d2e 50%, #0f172a 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '580px',
            maxHeight: '90vh',
            overflowY: 'auto',
            pointerEvents: 'auto',
            animation: 'pwaSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '28px 28px 0',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '54px', height: '54px',
                background: 'linear-gradient(135deg, #1a56db, #1140a8)',
                borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(26,86,219,0.4)',
                flexShrink: 0,
              }}>
                <DownloadIcon />
              </div>
              <div>
                <div style={{
                  fontSize: '11px', fontWeight: 700, color: '#3b82f6',
                  letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px',
                }}>
                  INSTALL APP
                </div>
                <h2 style={{
                  fontSize: '20px', fontWeight: 800, color: '#f1f5f9',
                  margin: 0, letterSpacing: '-0.3px',
                }}>
                  Sri Venkateshwara<br />Medical Store
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#94a3b8',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = '#94a3b8';
              }}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Subtitle */}
          <p style={{
            margin: '16px 28px 24px',
            fontSize: '14px', color: '#64748b', lineHeight: 1.6,
          }}>
            Your browser doesn't support automatic installation. Follow the steps for your device below:
          </p>

          {/* Platform cards */}
          <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {platforms.map((platform, idx) => (
              <div
                key={idx}
                style={{
                  background: platform.bg,
                  border: `1px solid ${platform.border}`,
                  borderRadius: '16px',
                  padding: '16px 18px',
                  transition: 'transform 0.2s',
                }}
              >
                {/* Platform header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  marginBottom: '12px',
                }}>
                  {platform.icon}
                  <span style={{
                    fontSize: '15px', fontWeight: 700, color: '#e2e8f0',
                  }}>
                    {platform.name}
                  </span>
                </div>

                {/* Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px' }}>
                  {platform.steps.map((step, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{
                        width: '22px', height: '22px',
                        background: `rgba(${platform.color === '#4285F4' ? '66,133,244' : platform.color === '#0078D4' ? '0,120,212' : platform.color === '#3DDC84' ? '61,220,132' : '0,122,255'},0.15)`,
                        borderRadius: '6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 800,
                        color: platform.color,
                        flexShrink: 0, marginTop: '1px',
                      }}>
                        {sIdx + 1}
                      </div>
                      <span style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
                        {step.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer tip */}
          <div style={{
            margin: '0 20px 24px',
            padding: '14px 16px',
            background: 'rgba(26,86,219,0.08)',
            border: '1px solid rgba(26,86,219,0.2)',
            borderRadius: '12px',
            fontSize: '13px', color: '#64748b', lineHeight: 1.6,
          }}>
            💡 <strong style={{ color: '#93c5fd' }}>Pro tip:</strong> After installation, SVMS opens like a native app — no browser tabs, no address bar, just a fast, premium healthcare experience.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pwaFadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes pwaSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </>
  );
};

export default PWAInstallModal;
