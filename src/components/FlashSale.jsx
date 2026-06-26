import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Sparkles, Timer } from 'lucide-react';

const flashItems = [
  {
    id: 'd0106500-0000-4000-a000-000000000001',
    name: 'Dolo 650 Tablet',
    brand: 'Micro Labs',
    category: 'Fever & Pain',
    originalPrice: 35.30,
    priceDiscounted: 21.00,
    discountPercent: '40% OFF',
    packInfo: 'Strip of 15 Tablets',
    image: '/images/dolo 650 tablet image.png',
    badge: 'Limited Stock',
    glowColor: 'rgba(239, 68, 68, 0.15)'
  },
  {
    id: 'c00cc000-0000-4000-a000-000000000002',
    name: 'Zincovit Multivitamins',
    brand: 'Abbott',
    category: 'Immunity Booster',
    originalPrice: 150.00,
    priceDiscounted: 99.00,
    discountPercent: '34% OFF',
    packInfo: 'Bottle of 30 Tablets',
    image: '/images/Zincovit tablet image.png',
    badge: 'Flash Sale Hero',
    glowColor: 'rgba(16, 185, 129, 0.15)'
  },
  {
    id: 'c0066550-0000-4000-a000-000000000003',
    name: 'Kof-Kure Cough Syrup',
    brand: 'Kof-Kure Pharma',
    category: 'Cough Care',
    originalPrice: 94.50,
    priceDiscounted: 65.00,
    discountPercent: '31% OFF',
    packInfo: 'Bottle of 100 ml',
    image: '/images/kuf-kure syrup image.png',
    badge: 'Limited Stock',
    glowColor: 'rgba(245, 158, 11, 0.15)'
  },
  {
    id: 'fa1106e1-0000-4000-a000-000000000004',
    name: 'Relief-Max Pain Gel',
    brand: 'Relief-Max',
    category: 'Pain Relief',
    originalPrice: 111.75,
    priceDiscounted: 75.00,
    discountPercent: '33% OFF',
    packInfo: 'Tube of 30 gm',
    image: '/images/Relief max image.png',
    badge: 'Highly Rated',
    glowColor: 'rgba(59, 130, 246, 0.15)'
  }
];

const FlashSale = () => {
  const { addItem, showToast } = useCart();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(7200); // 2 hours countdown

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 7200));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return { h, m, s };
  };

  const { h, m, s } = formatTime(timeLeft);

  const handleReserve = (item) => {
    addItem(item.id, 1, item.name);
    showToast(`${item.name} added to cart at flash discount!`, 'View Cart', () => navigate('/cart'));
  };

  return (
    <section className="flash-sale-section reveal-slide-up" id="flash-sale">
      <div className="flash-header">
        <div className="flash-title-group">
          <div className="flash-pill">
            <Sparkles size={12} className="flash-pill-icon" />
            <span>Limited Flash Event</span>
          </div>
          <h2 className="flash-main-title">Super Flash Sale</h2>
          <p className="flash-sub">Premium medicines at direct-to-consumer prices</p>
        </div>
        <div className="flash-timer-card">
          <div className="timer-icon-wrap">
            <Timer size={18} className="timer-icon" />
          </div>
          <span className="timer-label">Closing in</span>
          <div className="timer-digits">
            <span className="digit-segment">{h}</span>
            <span className="timer-colon">:</span>
            <span className="digit-segment">{m}</span>
            <span className="timer-colon">:</span>
            <span className="digit-segment">{s}</span>
          </div>
        </div>
      </div>

      <div className="flash-grid reveal-cascade">
        {flashItems.map((item) => (
          <div key={item.id} className="flash-card">
            {/* Discount Badge */}
            <span className="flash-discount-badge">{item.discountPercent}</span>
            
            {/* Image Wrapper */}
            <div className="flash-img-wrapper" style={{ background: '#ffffff', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div 
                className="flash-glow-radial" 
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${item.glowColor} 0%, rgba(255,255,255,0) 70%)`,
                  zIndex: 1,
                  pointerEvents: 'none'
                }}
              />
              <img
                className="flash-img-real"
                src={item.image}
                alt={item.name}
                style={{ zIndex: 2, transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
              />
            </div>

            {/* Info panel */}
            <div className="flash-card-info">
              <span className="flash-category-label">{item.category}</span>
              <h4 className="flash-item-name">{item.name}</h4>
              <p className="flash-item-brand">{item.brand} · {item.packInfo}</p>
              
              <div className="flash-pricing-row">
                <div className="price-stack">
                  <span className="flash-new-price">₹{item.priceDiscounted.toFixed(2)}</span>
                  <span className="flash-old-price">₹{item.originalPrice.toFixed(2)}</span>
                </div>
                <span className="flash-stock-pill">{item.badge}</span>
              </div>

              <div className="flash-actions">
                <button className="flash-btn-reserve" onClick={() => handleReserve(item)}>
                  Reserve Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FlashSale;
