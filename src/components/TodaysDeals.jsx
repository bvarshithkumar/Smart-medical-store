import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { cmsService } from '../services/cmsService';
import CMSImage from './CMSImage';

const TodaysDeals = ({ config }) => {
  const [offers, setOffers] = useState([]);
  const navigate = useNavigate();
  const { showToast } = useCart();

  useEffect(() => {
    const fetchOffers = async () => {
      const rawData = await cmsService.getOffers();
      const data = cmsService.processCMSItems(rawData, config);
      setOffers(data);
    };
    fetchOffers();
  }, [config]);

  const formatTitle = (title) => {
    if (!title) return '';
    return title.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i < title.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const formatHeaderTitle = (title) => {
    if (!title) return '';
    const words = title.split(' ');
    if (words.length <= 1) return title;
    const lastWord = words.pop();
    return <>{words.join(' ')} <span>{lastWord}</span></>;
  };

  const getGridClasses = () => {
    const classes = ['deals-grid', 'reveal-cascade', 'is-visible'];
    if (config?.layout_type === 'grid') {
      classes.push('cms-layout-grid');
    }
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
    return classes.join(' ');
  };

  const handleCopyCode = (code, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    showToast(`Promo code "${code}" copied to clipboard!`, 'Close');
  };

  return (
    <section className="todays-deals-section reveal-slide-up" id="todays-deals">
      <div className="section-header-premium">
        <span className="section-badge-pill">{config?.section_name || 'OFFERS'}</span>
        <h2 className="section-main-title">
          {config?.section_title ? (
            formatHeaderTitle(config.section_title)
          ) : (
            <>Today's <span>Offers</span></>
          )}
        </h2>
        <p className="section-desc-lbl">
          {config?.section_subtitle || 'Exclusive discounts on wellness essentials and prescription reservations.'}
        </p>
      </div>

      {offers.length > 0 ? (
        <div className={getGridClasses()}>
          {offers.map((offer) => {
            return (
              <div 
                key={offer.id} 
                className="deal-card promo-offer-card" 
                style={{ 
                  background: offer.bg_color || 'linear-gradient(135deg, #0f1e38 0%, #032b45 60%)',
                  boxShadow: offer.shadow_color ? `0 10px 30px -10px ${offer.shadow_color}` : 'none',
                  cursor: 'pointer',
                  minHeight: '260px'
                }}
                onClick={() => {
                  if (offer.button_link && offer.button_link !== '/') {
                    navigate(offer.button_link);
                  }
                }}
              >
                {/* Badge */}
                <div className="product-badges-container" style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10 }}>
                  {offer.badge && (
                    <span className="premium-badge healthcare" style={{ background: offer.badge_bg || 'rgba(2, 132, 199, 0.2)', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '4px 8px', borderRadius: '4px' }}>
                      <span>{offer.badge}</span>
                    </span>
                  )}
                </div>

                {/* Offer Image */}
                <div className="product-img-wrapper" style={{ background: 'transparent', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '20px' }}>
                  <CMSImage 
                    src={offer.image_url || offer.image} 
                    fallbackSrc="/images/action_upload.png"
                    alt={offer.alt_text || offer.title} 
                    className="product-img-real"
                    style={{ maxHeight: '100px', objectFit: 'contain' }}
                  />
                </div>

                {/* Offer Content */}
                <div className="deal-card-content" style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h4 className="deal-name" style={{ color: '#fff', fontSize: '16px', fontWeight: '800', lineHeight: '1.3', margin: '0 0 6px 0' }}>
                    {formatTitle(offer.title)}
                  </h4>
                  <p className="deal-unit" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', margin: '0 0 12px 0', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '54px' }}>
                    {offer.description}
                  </p>
                  
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {offer.code && (
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <code style={{ background: 'rgba(255,255,255,0.1)', color: '#14B8A6', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', border: '1px dashed rgba(20, 184, 166, 0.4)', textAlign: 'center', width: '100%' }}>
                          Code: {offer.code}
                        </code>
                      </div>
                    )}

                    {offer.code && (
                      <button 
                        className="deal-buy-now-btn" 
                        onClick={(e) => handleCopyCode(offer.code, e)}
                        style={{ backgroundColor: '#14B8A6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', width: '100%', fontSize: '12px' }}
                      >
                        {offer.button_text || 'Copy Code'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed var(--border-color, #cbd5e1)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', margin: '20px 0', width: '100%' }}>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>No promotional offers available today.</p>
        </div>
      )}
    </section>
  );
};

export default TodaysDeals;
