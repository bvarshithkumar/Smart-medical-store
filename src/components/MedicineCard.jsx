import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Stethoscope, TrendingUp, Zap, Award, Heart, Crown, Sparkles, DollarSign, FileText } from 'lucide-react';

const getBadgeIcon = (key) => {
  switch (key) {
    case 'doc-recommended': return <Stethoscope size={10} className="badge-icon" />;
    case 'most-purchased':  return <TrendingUp size={10} className="badge-icon" />;
    case 'most-popular':    return <Sparkles size={10} className="badge-icon" fill="currentColor" />;
    case 'best-value':      return <DollarSign size={10} className="badge-icon" />;
    case 'fast-moving':     return <Zap size={10} className="badge-icon" />;
    case 'staff-pick':      return <Award size={10} className="badge-icon" />;
    case 'customer-favorite': return <Heart size={10} className="badge-icon" fill="currentColor" />;
    case 'premium-choice':  return <Crown size={10} className="badge-icon" fill="currentColor" />;
    default: return null;
  }
};

const getBadgeLabel = (key) => {
  switch (key) {
    case 'doc-recommended':   return 'Doctor Recommended';
    case 'most-purchased':    return 'Most Popular';
    case 'most-popular':      return 'Most Popular';
    case 'best-value':        return 'Best Value';
    case 'fast-moving':       return 'Fast Moving';
    case 'staff-pick':        return 'Staff Pick';
    case 'customer-favorite': return 'Customer Favourite';
    case 'premium-choice':    return 'Premium Choice';
    default: return '';
  }
};

const MedicineCard = ({ medicine }) => {
  if (!medicine) return null;

  // Extract variables with fallbacks first
  const name             = medicine.name             || 'Medicine';
  const brand            = medicine.brand            || 'Micro Labs';
  const packInfo         = medicine.packInfo         || 'Strip of 15 Tablets';
  const selling_price    = medicine.selling_price    ?? 0;
  const mrp              = medicine.mrp              ?? 0;
  const stock_quantity   = medicine.stock_quantity   ?? 0;
  const prescription_required = medicine.prescription_required ?? false;
  const glowColor        = medicine.glowColor        || 'rgba(20, 184, 166, 0.15)';

  const isOutOfStock = stock_quantity <= 0;
  const stockLabel   = isOutOfStock ? 'Out of Stock' : 'In Stock';

  const { cart, addItem, showToast } = useCart();
  const navigate = useNavigate();

  // Local state for temporary button feedback
  const [adding, setAdding] = useState(false);   // prevents double-click
  const [justAdded, setJustAdded] = useState(false); // "✓ Added" for 1.5s
  const [glowPulse, setGlowPulse] = useState(false); // card glow pulse

  const isInCart = cart.some(item => item.id === medicine.id);

  const handleCardClick = () => {
    navigate(`/medicine/${medicine.id}`);
  };

  const handleAddClick = useCallback(async (e) => {
    e.stopPropagation();

    if (isOutOfStock) {
      showToast('This medicine is currently out of stock.', 'OK');
      return;
    }

    // Double-click guard
    if (adding) return;
    setAdding(true);

    // Add to cart with product name for premium toast
    await addItem(medicine.id, 1, name);

    // Trigger glow pulse on card
    setGlowPulse(true);
    setTimeout(() => setGlowPulse(false), 700);

    // Show temporary "Added" state on button for 2 seconds
    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
      setAdding(false);
    }, 2000);
  }, [adding, medicine.id, name, isOutOfStock]);

  let discountPercentage = 0;
  if (mrp > 0 && selling_price > 0 && mrp > selling_price) {
    discountPercentage = Math.round(((mrp - selling_price) / mrp) * 100);
  }

  return (
    <div
      className={`product-card ${isOutOfStock ? 'out-of-stock' : ''} ${glowPulse ? 'card-glow-pulse' : ''}`}
      onClick={handleCardClick}
    >
      {/* Premium Badge Container */}
      <div className="product-badges-container">
        {discountPercentage > 0 && (
          <span className="premium-badge discount" style={{ backgroundColor: '#10b981', color: 'white', fontWeight: '700' }}>
            {discountPercentage}% OFF
          </span>
        )}
        {prescription_required && (
          <span className="premium-badge rx" style={{ backgroundColor: '#ef4444', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <FileText size={10} />
            Rx Required
          </span>
        )}
        {medicine.badges && medicine.badges.slice(0, 1).map(bKey => (
          <span key={bKey} className={`premium-badge healthcare ${bKey}`}>
            {getBadgeIcon(bKey)}
            <span>{getBadgeLabel(bKey)}</span>
          </span>
        ))}
      </div>

      {/* Image area */}
      <div className="product-img-wrapper" style={{ background: 'var(--bg-white)', position: 'relative', overflow: 'hidden' }}>
        <div
          className="product-category-glow"
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100px', height: '100px', borderRadius: '50%',
            background: `radial-gradient(circle, ${glowColor} 0%, rgba(255,255,255,0) 70%)`,
            zIndex: 1, pointerEvents: 'none'
          }}
        />
        <img
          className="product-img-real"
          src={medicine.image_url || '/placeholder-medicine.png'}
          alt={name}
          style={{
            zIndex: 2,
            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), filter 0.4s ease',
            opacity: isOutOfStock ? 0.6 : 1
          }}
        />
      </div>

      {/* Card body */}
      <div className="product-body">
        <div className="product-meta">{brand}</div>
        <h4 className="product-name">{name}</h4>
        <p className="product-info">{packInfo}</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
          <div className={`product-status ${isOutOfStock ? 'status-outofstock' : 'status-instock'}`}>
            <span className="status-dot" />
            {stockLabel}
          </div>
          {prescription_required && (
            <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: '700', textTransform: 'uppercase' }}>Rx Required</span>
          )}
        </div>
      </div>

      {/* Footer: pricing + add button */}
      <div className="product-footer">
        <div className="product-pricing">
          <div className="price-row-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            {mrp > selling_price && mrp > 0 && (
              <span className="price-original" style={{ textDecoration: 'line-through', opacity: 0.7, fontSize: '11px' }}>
                ₹{(medicine.mrp || 0).toLocaleString()}
              </span>
            )}
            {discountPercentage > 0 && (
              <span
                className="premium-badge discount"
                style={{
                  backgroundColor: '#10b981', color: 'white',
                  padding: '1px 5px', borderRadius: '12px',
                  fontSize: '9px', fontWeight: '700',
                  boxShadow: '0 0 6px rgba(16, 185, 129, 0.35)',
                  display: 'inline-block'
                }}
              >
                {discountPercentage}% OFF
              </span>
            )}
          </div>
          <span className="price-discounted" style={{ fontSize: '18px', fontWeight: '800' }}>
            ₹{(medicine.selling_price || 0).toLocaleString()}
          </span>
        </div>

        <button
          className={`add-btn ${justAdded ? 'just-added' : ''}`}
          onClick={handleAddClick}
          disabled={isOutOfStock || adding}
          aria-label={justAdded ? 'Added to cart' : 'Add to cart'}
        >
          {isOutOfStock
            ? 'Sold Out'
            : justAdded
              ? 'Added'
              : '+ Add'}
        </button>
      </div>
    </div>
  );
};

export default MedicineCard;
