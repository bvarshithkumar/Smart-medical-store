import React, { useState } from 'react';

const StoreInfo = () => {
  const [isInteractive, setIsInteractive] = useState(false);

  const officialMapsUrl = 'https://www.google.com/maps/place/SRI+VENKATESWARA+MEDICAL+AND+GENERAL+STORE/@17.4017429,78.4965845,21z/data=!4m6!3m5!1s0x3bcb99c0f2c51047:0x9c8b2ded81a7a43f!8m2!3d17.4017404!4d78.4966437!16s%2Fg%2F1pp2x7qrp';

  const handleDirectionsClick = () => {
    const isAndroid = /android/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const destCoords = "17.4017404,78.4966437";
    const destName = encodeURIComponent("SRI VENKATESWARA MEDICAL AND GENERAL STORE");
    
    if (isIOS) {
      // iOS maps protocol launches native Apple Maps
      window.open(`maps://?daddr=${destCoords}&q=${destName}`, '_blank');
    } else if (isAndroid) {
      // Android maps intent opens directly in Google Maps app
      window.open(`geo:0,0?q=${destCoords}(${destName})`, '_blank');
    } else {
      // Web fallback directions
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${destCoords}&destination_place_id=ft:0x3bcb99c0f2c51047:0x9c8b2ded81a7a43f`, '_blank', 'noopener,noreferrer');
    }
  };

  const handleViewOnMapClick = () => {
    setIsInteractive(true);
    window.open(officialMapsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsAppClick = () => {
    window.open('https://wa.me/919949799719?text=Hi%20SVMS%20Pharmacist,%20I%20have%20a%20prescription/medicine%20inquiry.', '_blank');
  };

  const handleCallClick = () => {
    window.open('tel:09949799719');
  };

  return (
    <section className="store-info-section reveal-slide-up" id="store-info" style={{ position: 'relative', transition: 'all 0.5s ease' }}>
      <div className="section-header-premium">
        <span className="section-badge-pill">FIND US</span>
        <h2 className="section-main-title">Store Location &amp; <span>Contact</span></h2>
        <p className="section-desc-lbl">Visit our store for genuine medicines, expert advice, and a better healthcare experience.</p>
      </div>
      <div className="store-info-grid">
        
        {/* Left Side: 30% Width Details Card */}
        <div className="store-details-card">
          
          <div className="store-verified-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>OPEN & VERIFIED PHARMACY</span>
          </div>

          <h3 className="store-sub-title">Sri Venkateswara Medical and General Store</h3>
          <p className="store-trust-tags">Certified &bull; Licensed &bull; Trusted by Thousands</p>

          <div className="store-contact-rows">
            {/* Row 1: Address */}
            <div className="store-contact-row">
              <div className="store-row-icon address-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="store-row-content">
                <span className="store-row-label">STORE ADDRESS</span>
                <span className="store-row-val">41/E, Bagh Lingampally Rd, Chikkadpally, New Nallakunta, Hyderabad, Telangana 500020</span>
              </div>
            </div>

            {/* Row 2: Phone */}
            <div className="store-contact-row">
              <div className="store-row-icon phone-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <div className="store-row-content">
                <span className="store-row-label">PHONE NUMBER</span>
                <span className="store-row-val">099497 99719</span>
              </div>
            </div>

            {/* Row 3: Working Hours */}
            <div className="store-contact-row">
              <div className="store-row-icon hours-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="store-row-content">
                <span className="store-row-label">WORKING HOURS</span>
                <span className="store-row-val">9:00 AM - 10:00 PM (Open All Days)</span>
              </div>
            </div>

            {/* Row 4: WhatsApp */}
            <div className="store-contact-row">
              <div className="store-row-icon whatsapp-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
              <div className="store-row-content">
                <span className="store-row-label">WHATSAPP CONSULTATION</span>
                <span className="store-row-val">+91 99497 99719 (Direct prescription upload)</span>
              </div>
            </div>

            {/* Row 5: Email Support */}
            <div className="store-contact-row">
              <div className="store-row-icon email-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-color)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div className="store-row-content">
                <span className="store-row-label">EMAIL SUPPORT</span>
                <span className="store-row-val">support@svmspharmacy.com</span>
              </div>
            </div>

            {/* Row 6: Emergency Contact */}
            <div className="store-contact-row">
              <div className="store-row-icon emergency-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="store-row-content">
                <span className="store-row-label">EMERGENCY HOTLINE (24/7)</span>
                <span className="store-row-val" style={{ color: 'var(--accent-red)', fontWeight: 700 }}>+91 40 2345 6789 / +91 99497 99719</span>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="store-cta-group">
            <button className="store-btn-directions" onClick={handleDirectionsClick} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              Get Directions
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11" style={{ opacity: 0.85 }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
            <button className="store-btn-whatsapp" onClick={handleWhatsAppClick}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              WhatsApp
            </button>
            <button className="store-btn-call" onClick={handleCallClick}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Call Store
            </button>
          </div>
        </div>

        {/* Right Side: 70% Width Showcase Area */}
        <div className="store-showcase-container">
          <div className="store-image-wrap">
            <img src="/images/store/storefront.png" alt="Sri Venkateswara Storefront" className="storefront-main-img" />
            <div className="store-img-overlay" />
          </div>

          {/* Floating Map Card - centered overlay bottom-middle */}
          <div className="store-floating-map-card">
            <div className="store-map-preview-side" style={{ position: 'relative', overflow: 'hidden' }}>
              {isInteractive ? (
                <iframe
                  title="Sri Venkateswara Medical and General Store Location"
                  width="100%"
                  height="100%"
                  style={{ border: 0, display: 'block' }}
                  loading="lazy"
                  allowFullScreen
                  src="https://maps.google.com/maps?q=SRI%20VENKATESWARA%20MEDICAL%20AND%20GENERAL%20STORE%20Chikkadpally%20Hyderabad&t=&z=15&ie=UTF8&iwloc=&output=embed"
                ></iframe>
              ) : (
                <div 
                  style={{ position: 'relative', width: '100%', height: '100%', cursor: 'pointer' }}
                  onClick={() => setIsInteractive(true)}
                  title="Click to load interactive map"
                >
                  <img src="/images/store/gachibowli_map.png" alt="Map Preview" className="store-map-img" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div className="google-watermark">Google</div>
                  
                  {/* Load interactive map hover helper */}
                  <div 
                    className="map-load-overlay"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(15, 23, 42, 0.45)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      gap: '8px',
                      opacity: 1,
                      transition: 'background-color 0.3s ease'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'var(--primary-blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.35)'
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                        <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
                      </svg>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase' }}>Load Interactive Map</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="store-map-details-side">
              <h4 className="store-map-location-title" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                Sri Venkateswara Medical
              </h4>
              <p className="store-map-location-sub" style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                📍 Chikkadpally, Hyderabad
              </p>
              
              <div className="store-map-ratings-row">
                <span className="store-rating-num">4.7</span>
                <div className="store-rating-stars">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="store-star-icon" viewBox="0 0 24 24" fill="#fbbf24" width="12" height="12">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <span className="store-reviews-count" style={{ fontSize: '11px', color: 'var(--text-light)', marginLeft: '4px' }}>(17 Reviews)</span>
              </div>
              
              <div className="store-map-badges-row">
                <span className="store-map-badge">
                  <span className="map-badge-dot"></span>
                  Easy to reach
                </span>
                <span className="store-map-badge">
                  <span className="map-badge-dot"></span>
                  Counter Pickup
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px', width: '100%' }}>
                <button className="store-btn-view-map" onClick={handleViewOnMapClick} style={{ flex: 1, padding: '10px 8px', fontSize: '12.5px', height: 'auto', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
                    <path d="M1 6v14l6-4 6 4 6-4 6 4V6l-6-4-6 4-6-4L1 6z" />
                  </svg>
                  View on Map
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10" style={{ opacity: 0.85 }}>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </button>
                
                <button 
                  className="store-btn-directions-badge" 
                  onClick={handleDirectionsClick} 
                  style={{ 
                    flex: 1, 
                    padding: '10px 8px', 
                    fontSize: '12.5px', 
                    height: 'auto', 
                    background: 'linear-gradient(135deg, var(--primary-blue), var(--primary-blue-dark))', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '12px', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '4px', 
                    cursor: 'pointer', 
                    fontWeight: 700,
                    whiteSpace: 'nowrap'
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                  </svg>
                  Directions
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10" style={{ opacity: 0.9 }}>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Vertical Feature Cards - Right side floating */}
          <div className="store-vertical-features">
            {/* Feature 1 */}
            <div className="store-feature-card">
              <div className="store-feature-icon clock-accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="store-feature-text">
                <span className="store-feature-title">Open Today</span>
                <span className="store-feature-subtitle">9:00 AM - 10:00 PM</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="store-feature-card">
              <div className="store-feature-icon shield-accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 11 11 13 15 9" />
                </svg>
              </div>
              <div className="store-feature-text">
                <span className="store-feature-title">Licensed Pharmacy</span>
                <span className="store-feature-subtitle">100% Certified</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="store-feature-card">
              <div className="store-feature-icon pill-accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <line x1="4.5" y1="19.5" x2="19.5" y2="4.5" />
                  <rect x="5" y="5" width="14" height="14" rx="7" transform="rotate(45 12 12)" />
                </svg>
              </div>
              <div className="store-feature-text">
                <span className="store-feature-title">Genuine Medicines</span>
                <span className="store-feature-subtitle">Trusted Brands Only</span>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="store-feature-card">
              <div className="store-feature-icon delivery-accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div className="store-feature-text">
                <span className="store-feature-title">Fast Pickup</span>
                <span className="store-feature-subtitle">15 Min. Store Pickup</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default StoreInfo;
