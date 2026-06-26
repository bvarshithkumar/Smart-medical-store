import React, { useState, useEffect, useRef } from 'react';

// Premium SVMS medical cross logo centerpiece
const SVMSLogo = ({ size = 44 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <defs>
      {/* Full cross shape as a clip for the two halves */}
      <clipPath id="crossShapeBrandLoader">
        {/* Vertical bar */}
        <rect x="72" y="10" width="56" height="180" rx="14" />
        {/* Horizontal bar */}
        <rect x="10" y="72" width="180" height="56" rx="14" />
      </clipPath>
    </defs>

    {/* === Cross body — Blue left half & White right half === */}
    <g clipPath="url(#crossShapeBrandLoader)">
      {/* Blue fill — left side */}
      <rect x="10" y="10" width="100" height="180" fill="#2563EB" />
      {/* White fill — right side */}
      <rect x="100" y="10" width="100" height="180" fill="#FFFFFF" />
    </g>

    {/* === White S-curve swirl === */}
    <path
      d="M105 18
         C105 18, 148 50, 120 90
         C92 130, 130 158, 115 182"
      stroke="white"
      strokeWidth="11"
      strokeLinecap="round"
      fill="none"
      opacity="0.95"
    />

    {/* === White leaf at bottom of swirl === */}
    <ellipse
      cx="110"
      cy="172"
      rx="14"
      ry="9"
      fill="white"
      opacity="0.95"
      transform="rotate(-35 110 172)"
    />
    
    {/* Leaf vein */}
    <path
      d="M104 177 Q111 170 118 167"
      stroke="#2563EB"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
      opacity="0.8"
    />
  </svg>
);

const PageLoader = ({ onComplete }) => {
  const [fade, setFade] = useState(false);
  const onCompleteRef = useRef(onComplete);

  // Sync the latest callback to the ref
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Start fade out at 2.3 seconds (0.6s logo + 0.5s text + 0.8s EKG + 0.4s tagline)
    const fadeTimer = setTimeout(() => {
      setFade(true);
    }, 2300);

    // Complete loader (unmount) at 2.8 seconds (2.3s + 0.5s fade-out)
    const completeTimer = setTimeout(() => {
      if (onCompleteRef.current) onCompleteRef.current();
    }, 2800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, []); // Empty dependency array ensures timers are only scheduled once on mount

  return (
    <div 
      className={`page-loader-overlay ${fade ? 'fade-out' : ''}`} 
      role="alert" 
      aria-busy="true" 
      aria-label="Sri Venkateshwara Medical & General Stores"
    >
      {/* Background Subtle Patterns */}
      <div className="loader-bg-pattern-container">
        {/* Faint DNA double-helix on right edge */}
        <svg className="loader-bg-dna" viewBox="0 0 100 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 50 C40 100, 60 100, 90 150 C60 200, 40 200, 10 250 C40 300, 60 300, 90 350" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"/>
          <path d="M90 50 C60 100, 40 100, 10 150 C40 200, 60 200, 90 250 C60 300, 40 300, 10 350" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"/>
          <line x1="28" y1="85" x2="72" y2="85" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
          <line x1="45" y1="100" x2="55" y2="100" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
          <line x1="28" y1="115" x2="72" y2="115" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
          <line x1="28" y1="185" x2="72" y2="185" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
          <line x1="45" y1="200" x2="55" y2="200" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
          <line x1="28" y1="215" x2="72" y2="215" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
          <line x1="28" y1="285" x2="72" y2="285" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
          <line x1="45" y1="300" x2="55" y2="300" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
          <line x1="28" y1="315" x2="72" y2="315" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
        </svg>

        {/* Faint Scattered Medical Crosses */}
        <div className="loader-bg-cross cross-top-left">✚</div>
        <div className="loader-bg-cross cross-bottom-right">✚</div>
      </div>

      {/* Floating Background Particles (subtle opacity controlled in CSS) */}
      <div className="loader-particles">
        <span className="loader-particle p1"></span>
        <span className="loader-particle p2"></span>
        <span className="loader-particle p3"></span>
        <span className="loader-particle p4"></span>
        <span className="loader-particle p5"></span>
        <span className="loader-particle p6"></span>
      </div>

      <div className="page-loader-content">
        {/* Logo Centerpiece */}
        <div className="loader-logo-container">
          <div className="loader-logo-badge">
            <SVMSLogo size={60} />
          </div>
        </div>

        {/* Brand Reveal Information */}
        <div className="loader-branding">
          <h2 className="loader-brand-title">Sri Venkateshwara</h2>
          <h3 className="loader-brand-subtitle">Medical &amp; General Stores</h3>

          {/* Animating heartbeat line under brand names */}
          <div className="loader-heartbeat-container">
            <svg className="loader-heartbeat-svg" viewBox="0 0 200 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                className="loader-heartbeat-path"
                d="M0 20 L60 20 L68 15 L72 20 L78 2 L84 38 L90 20 L98 12 L102 20 L200 20"
                stroke="url(#heartbeatGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="heartbeatGrad" x1="0" y1="0" x2="200" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0EA5A4" />
                  <stop offset="100%" stopColor="#14B8A6" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <p className="loader-tagline">Your Health, Our Priority</p>
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
