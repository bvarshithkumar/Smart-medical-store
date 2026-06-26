import React, { useRef, useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { cmsService } from '../services/cmsService';

/* ─────────────────────────────────────────────────────────
   BRAND SVG LOGOS (Centred in circular frames)
   ───────────────────────────────────────────────────────── */

const LogoCipla = () => (
  <svg viewBox="0 0 100 35" fill="none" width="60" height="22">
    <text x="5" y="26" fontFamily="var(--font-family)" fontWeight="900" fontSize="24" fill="#00529b" letterSpacing="-0.5">Cipla</text>
    <circle cx="76" cy="18" r="3.5" fill="#00529b" />
    <circle cx="86" cy="18" r="3.5" fill="#00a896" />
  </svg>
);

const LogoAbbott = () => (
  <svg viewBox="0 0 100 35" fill="none" width="65" height="22">
    <path d="M10 17.5c0 5 4 9 9 9s9-4 9-9-4-9-9-9-9 4-9 9zm4.5 0c0-2.8 2.2-5 4.5-5s4.5 2.2 4.5 5-2.2 5-4.5 5-4.5-2.2-4.5-5z" fill="#009FDF" />
    <text x="32" y="24" fontFamily="var(--font-family)" fontWeight="800" fontSize="20" fill="#009FDF" letterSpacing="-0.5">Abbott</text>
  </svg>
);

const LogoSunPharma = () => (
  <svg viewBox="0 0 100 35" fill="none" width="70" height="24">
    <circle cx="16" cy="17" r="7" fill="#E65100" />
    <circle cx="16" cy="17" r="11" stroke="#E65100" strokeWidth="1.5" strokeDasharray="3 3" />
    <text x="32" y="19" fontFamily="var(--font-family)" fontWeight="800" fontSize="13" fill="#E65100">SUN</text>
    <text x="32" y="28" fontFamily="var(--font-family)" fontWeight="500" fontSize="8.5" fill="#374151" letterSpacing="0.5">PHARMA</text>
  </svg>
);

const LogoLupin = () => (
  <svg viewBox="0 0 100 35" fill="none" width="65" height="22">
    <path d="M12 26 L17 10 L22 26 Z" fill="#2E7D32" opacity="0.35" />
    <path d="M17 6 L17 28" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M9 16 L25 16" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" />
    <text x="30" y="23" fontFamily="var(--font-family)" fontWeight="900" fontSize="16" fill="#2E7D32" letterSpacing="1">LUPIN</text>
  </svg>
);

const LogoGlenmark = () => (
  <svg viewBox="0 0 100 35" fill="none" width="75" height="24">
    <circle cx="16" cy="17" r="7.5" fill="#e11d48" />
    <path d="M16 11 v12 M12 17 h8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    <text x="28" y="23" fontFamily="var(--font-family)" fontWeight="800" fontSize="14" fill="#e11d48">glenmark</text>
  </svg>
);

const LogoGsk = () => (
  <svg viewBox="0 0 100 35" fill="none" width="60" height="22">
    <rect x="8" y="4" width="46" height="27" rx="13.5" fill="#F05023" />
    <text x="17" y="22" fontFamily="var(--font-family)" fontWeight="900" fontSize="15" fill="white">gsk</text>
  </svg>
);

const LogoPfizer = () => (
  <svg viewBox="0 0 100 35" fill="none" width="68" height="22">
    <ellipse cx="45" cy="17.5" rx="36" ry="14.5" fill="#00A3E0" />
    <text x="21" y="22" fontFamily="var(--font-family)" fontWeight="900" fontSize="16" fill="white" fontStyle="italic">Pfizer</text>
  </svg>
);

const LOGO_MAP = {
  Cipla: <LogoCipla />,
  Abbott: <LogoAbbott />,
  'Sun Pharma': <LogoSunPharma />,
  Lupin: <LogoLupin />,
  Glenmark: <LogoGlenmark />,
  GSK: <LogoGsk />,
  Pfizer: <LogoPfizer />
};

const INITIAL_BRANDS = [
  { id: 'B1', name: 'Cipla', badge: 'Trusted Worldwide', color: '#00529b', box_name: 'Paracetamol', box_sub: '500 mg Tablets', pack_class: 'cipla-para', pills_colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'] },
  { id: 'B2', name: 'Abbott', badge: 'Quality Assured', color: '#009FDF', box_name: 'SURE-D Z', box_sub: 'Multivitamins', pack_class: 'abbott-sure', pills_colors: ['#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24'] },
  { id: 'B3', name: 'Sun Pharma', badge: 'Trusted Quality', color: '#E65100', box_name: 'Levosalbutamol', box_sub: 'Sun Pharma', pack_class: 'sun-levo', pills_colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'] },
  { id: 'B4', name: 'Lupin', badge: 'Research Driven', color: '#2E7D32', box_name: 'Budecort', box_sub: 'Lupin', pack_class: 'lupin-bude', pills_colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'] },
  { id: 'B5', name: 'Glenmark', badge: 'Doctor Recommended', color: '#e11d48', box_name: 'Telma 40', box_sub: 'Glenmark', pack_class: 'glenmark-telma', pills_colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'] },
  { id: 'B6', name: 'GSK', badge: 'Innovation in Care', color: '#F05023', box_name: 'Citrazin', box_sub: 'Vitamin C', pack_class: 'gsk-citra', pills_colors: ['#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24', '#fbbf24'] },
  { id: 'B7', name: 'Pfizer', badge: 'Global Trusted Brand', color: '#00A3E0', box_name: 'Zithromax', box_sub: '250 mg Tablets', pack_class: 'pfizer-zithro', pills_colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'] }
];

const BrandLogo = ({ brand }) => {
  if (LOGO_MAP[brand.name]) {
    return LOGO_MAP[brand.name];
  }
  if (brand.logo_svg) {
    return <div dangerouslySetInnerHTML={{ __html: brand.logo_svg }} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} />;
  }
  if (brand.image_url) {
    return <img src={brand.image_url} alt={brand.name} style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} />;
  }
  return <span style={{ fontWeight: 800, fontSize: 14 }}>{brand.name}</span>;
};

const FeaturedBrands = ({ config }) => {
  const { showToast } = useCart();
  const trackRef = useRef(null);
  const [brands, setBrands] = useState(INITIAL_BRANDS);

  useEffect(() => {
    const fetchBrands = async () => {
      const rawData = await cmsService.getBrands();
      const data = cmsService.processCMSItems(rawData, config);
      setBrands(data);
    };
    fetchBrands();
  }, []);

  const handleBrandClick = (brandName) => {
    showToast(`Showing medicines manufactured by ${brandName}`, 'Close');
  };

  const scroll = (direction) => {
    if (trackRef.current) {
      const card = trackRef.current.querySelector('.fbr-card');
      const cardWidth = card ? card.offsetWidth + 24 : 260;
      const scrollAmount = direction === 'left' ? -cardWidth * 2 : cardWidth * 2;
      trackRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const isCarousel = !config?.layout_type || config.layout_type === 'carousel';

  const getTrackClasses = () => {
    const classes = ['fbr-track'];
    if (config?.layout_type === 'grid') {
      classes.push('cms-layout-grid');
      if (config?.desktop_layout && config.desktop_layout.includes('column')) {
        classes.push(`cms-desktop-cols-${config.desktop_layout.split(' ')[0]}`);
      }
      if (config?.mobile_layout) {
        if (config.mobile_layout.includes('card')) {
          classes.push(`cms-mobile-cols-${config.mobile_layout.split(' ')[0]}`);
        } else if (config.mobile_layout === 'horizontal scroll') {
          classes.push('cms-mobile-scroll');
        }
      }
    }
    return classes.join(' ');
  };

  return (
    <section className="fbr-section reveal-slide-up" id="brands">
      <div className="fbr-bg-glow fbr-ga" />
      <div className="fbr-bg-glow fbr-gb" />

      <div className="fbr-wrapper">
        <div className="section-header-premium">
          <span className="section-badge-pill">BRANDS</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="section-main-title">Featured <span>Brands</span></h2>
              <p className="section-desc-lbl">Quality healthcare items from leading global pharmaceutical manufacturers.</p>
            </div>
            {isCarousel && (
              <div className="fbr-controls" style={{ marginBottom: '4px' }}>
                <button 
                  className="fbr-arrow-btn fbr-arrow-left" 
                  onClick={() => scroll('left')}
                  aria-label="Scroll left"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>
                <button 
                  className="fbr-arrow-btn fbr-arrow-right" 
                  onClick={() => scroll('right')}
                  aria-label="Scroll right"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="fbr-carousel-container">
          <div className={getTrackClasses()} ref={trackRef}>
            {brands.map((brand, idx) => {
              const boxName = brand.box_name || brand.boxName || 'Medicine';
              const boxSub = brand.box_sub || brand.boxSub || 'Tablets';
              const packClass = brand.pack_class || brand.packClass || 'cipla-para';
              const pills = brand.pills_colors || brand.pills || ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'];
              return (
                <div 
                  key={brand.id || idx} 
                  className="fbr-card"
                  onClick={() => handleBrandClick(brand.name)}
                >
                  {/* Brand Logo Container */}
                  <div className="fbr-logo-wrap">
                    <div className="fbr-logo-circle">
                      <BrandLogo brand={brand} />
                    </div>
                  </div>

                  {/* High-fidelity CSS 3D Medicine Packaging Illustration */}
                  <div className="fbr-packaging-area">
                    <div className={`fbr-med-box ${packClass}`}>
                      <div className="fbr-box-inner">
                        <div className="fbr-box-face fbr-box-front">
                          <div className="fbr-box-logo-mini">{brand.name}</div>
                          <div className="fbr-box-medname">{boxName}</div>
                          <div className="fbr-box-medsub">{boxSub}</div>
                          <div className="fbr-box-color-bar" />
                        </div>
                        <div className="fbr-box-face fbr-box-side" />
                        <div className="fbr-box-face fbr-box-top" />
                      </div>
                    </div>

                    {/* Blister pack lying in front */}
                    <div className="fbr-blister-strip">
                      <div className="fbr-blister-grid">
                        {pills.map((pillColor, pIdx) => (
                          <div key={pIdx} className="fbr-pill-pocket">
                            <div className="fbr-pill-dome" style={{ backgroundColor: pillColor }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Brand Name */}
                  <h3 className="fbr-card-name">{brand.name}</h3>

                  {/* Trust Badge at bottom */}
                  <div className="fbr-card-badge" style={{ '--badge-theme': brand.color }}>
                    <svg className="fbr-badge-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {brand.badge}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedBrands;
