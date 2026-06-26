import React from 'react';
import { useCart } from '../context/CartContext';

const concerns = [
  {
    id: 1,
    name: 'Diabetes Care',
    desc: 'Sugar monitors & care',
    image: '/images/concern_diabetes.png',
    iconColor: '#EF4444',
    iconBg: 'rgba(239,68,68,0.12)',
    // SVG icon: droplet (blood glucose)
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    ),
  },
  {
    id: 2,
    name: 'Cardiac Health',
    desc: 'Blood pressure & heart',
    image: '/images/concern_cardiac.png',
    iconColor: '#EC4899',
    iconBg: 'rgba(236,72,153,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    id: 3,
    name: 'Pain Relief',
    desc: 'Joints, muscles & bones',
    image: '/images/concern_pain.png',
    iconColor: '#F97316',
    iconBg: 'rgba(249,115,22,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    id: 4,
    name: 'Stomach Care',
    desc: 'Digestion & acidity',
    image: '/images/concern_stomach.png',
    iconColor: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
        <path d="M12 2C7.03 2 3 6.03 3 11c0 3.1 1.46 5.86 3.74 7.63C7.52 20.37 9.12 21 12 21c4.97 0 9-4.03 9-9s-4.03-10-9-10z"/>
        <path d="M9 14s.5-2 3-2 3 2 3 2"/>
      </svg>
    ),
  },
  {
    id: 5,
    name: 'Vitamins & Immunity',
    desc: 'Daily nutrition & energy',
    image: '/images/concern_vitamins.png',
    iconColor: '#10B981',
    iconBg: 'rgba(16,185,129,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    id: 6,
    name: 'Skin & Hair',
    desc: 'Acne, dry skin & hairfall',
    image: '/images/concern_skin.png',
    iconColor: '#06B6D4',
    iconBg: 'rgba(6,182,212,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
        <circle cx="12" cy="8" r="5"/>
        <path d="M12 13v9"/>
        <path d="M9 19h6"/>
      </svg>
    ),
  },
];

const HealthConcerns = () => {
  const { showToast } = useCart();

  const handleClick = (name) => {
    showToast(`Browsing: ${name}`, 'Close');
  };

  return (
    <section className="hc-section reveal-slide-up" id="concerns">
      <div className="section-header-premium">
        <span className="section-badge-pill">HEALTH CONCERNS</span>
        <h2 className="section-main-title">Shop by <span>Health Concern</span></h2>
        <p className="section-desc-lbl">Find chronic medicines and daily health products tailored to your needs.</p>
      </div>

      <div className="hc-cards-row reveal-cascade">
        {concerns.map((concern) => (
          <div
            key={concern.id}
            className="hc-card"
            onClick={() => handleClick(concern.name)}
            role="button"
            tabIndex={0}
          >
            {/* Top 65%: image */}
            <div className="hc-card-img-wrap">
              <img
                src={concern.image}
                alt={concern.name}
                className="hc-card-img"
              />
              {/* Floating icon badge at the bottom edge of image */}
              <div
                className="hc-icon-badge"
                style={{ color: concern.iconColor, background: concern.iconBg, border: `1.5px solid ${concern.iconColor}30` }}
              >
                {concern.icon}
              </div>
            </div>

            {/* Bottom 35%: text content */}
            <div className="hc-card-body">
              <h4 className="hc-card-name">{concern.name}</h4>
              <p className="hc-card-desc">{concern.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HealthConcerns;
