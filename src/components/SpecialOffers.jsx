import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

const offers = [];

const SpecialOffers = () => {
  const { showToast } = useCart();
  const [copied, setCopied] = useState(null);

  const handleCopyCode = (e, code, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(id);
    showToast(`Code "${code}" copied!`, 'Close');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <section className="special-offers-section reveal-slide-up" id="offers">
      <div className="so-section-head">
        <h2 className="so-section-title">Special Offers &amp; Promotions</h2>
        <div className="so-title-underline" />
      </div>

      {offers.length > 0 ? (
        <div className="so-cards-row reveal-cascade">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="so-promo-card"
              style={{
                background: offer.bg,
                boxShadow: `0 12px 40px ${offer.shadowColor}`,
              }}
            >
              {/* Glassmorphism badge — top right */}
              <div
                className="so-category-badge"
                style={{ background: offer.badgeBg }}
              >
                {offer.badge}
              </div>

              {/* LEFT: text content */}
              <div className="so-card-left">
                <h3 className="so-card-title">
                  {offer.title.split('\n').map((line, i) => (
                    <span key={i}>{line}{i < offer.title.split('\n').length - 1 && <br />}</span>
                  ))}
                </h3>
                <p className="so-card-desc">{offer.desc}</p>
                <div className="so-card-actions">
                  <span className="so-code-pill">Code: {offer.code}</span>
                  <button
                    className={`so-copy-btn ${copied === offer.id ? 'copied' : ''}`}
                    onClick={(e) => handleCopyCode(e, offer.code, offer.id)}
                  >
                    {copied === offer.id ? '✓ Copied!' : 'Copy Code'}
                  </button>
                </div>
              </div>

              {/* RIGHT: product image */}
              <div className="so-card-right">
                <img
                  src={offer.image}
                  alt={offer.imageAlt}
                  className="so-card-img"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed var(--border-color, #cbd5e1)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', margin: '20px auto', width: '100%', maxWidth: '100%' }}>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>No special offers available at the moment.</p>
          <p style={{ fontSize: '13px', color: 'var(--text-light, #94a3b8)', marginTop: '4px' }}>Check back later for active promotions and coupons.</p>
        </div>
      )}
    </section>
  );
};

export default SpecialOffers;
