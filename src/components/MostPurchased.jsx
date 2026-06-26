import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Pill, Star, ShieldCheck } from 'lucide-react';

const popularMeds = [
  {
    id: 'd0106500-0000-4000-a000-000000000001',
    name: 'Dolo 650 Tablet',
    brand: 'Micro Labs Ltd',
    packInfo: 'Strip of 15 Tablets',
    priceOriginal: 35.30,
    priceDiscounted: 30.00,
    image: '/images/dolo 650 tablet image.png',
    badge: 'Bestseller',
    recommended: true,
    rating: '4.9 (420 reviews)',
    description: 'Paracetamol 650mg anti-inflammatory and pain reliever.'
  },
  {
    id: 'c00cc000-0000-4000-a000-000000000002',
    name: 'Zincovit Multivitamins',
    brand: 'Abbott Healthcare',
    packInfo: 'Bottle of 30 Tablets',
    priceOriginal: 150.00,
    priceDiscounted: 120.00,
    image: '/images/Zincovit tablet image.png',
    badge: 'Bestseller',
    recommended: true,
    rating: '4.8 (380 reviews)',
    description: 'Essential daily vitamins & zinc to boost immunity.'
  },
  {
    id: 'fa1106e1-0000-4000-a000-000000000004',
    name: 'Relief-Max Pain Gel',
    brand: 'Relief-Max Therapeutics',
    packInfo: 'Tube of 30 gm',
    priceOriginal: 111.75,
    priceDiscounted: 95.00,
    image: '/images/Relief max image.png',
    badge: 'Doctor Choice',
    recommended: true,
    rating: '4.7 (190 reviews)',
    description: 'Fast acting Diclofenac pain relief for joint & muscle pain.'
  }
];

const MostPurchased = () => {
  const { addItem, showToast } = useCart();
  const navigate = useNavigate();

  const handleAdd = (med) => {
    addItem(med.id, 1, med.name);
    showToast(`${med.name} reserved successfully!`, 'View Cart', () => navigate('/cart'));
  };

  const handleCardClick = (medId) => {
    navigate(`/medicine/${medId}`);
  };

  return (
    <section className="most-purchased-section reveal-slide-up" id="most-purchased">
      <div className="section-title">
        Most Purchased Today
      </div>
      <p className="section-subtitle-desc">The most trusted medicines and wellness essentials collection today</p>
      
      <div className="most-purchased-grid reveal-cascade">
        {popularMeds.map((med) => (
          <div key={med.id} className="most-purchased-card">
            {/* Premium bestseller corner ribbon */}
            <div className="bestseller-ribbon-tag">
              <span>Best choice</span>
            </div>
            
            {/* Card tags */}
            <div className="card-badge-row">
              <span className="purchased-badge">{med.badge}</span>
              {med.recommended && (
                <span className="recommended-badge">
                  <ShieldCheck size={10} style={{ marginRight: '3px' }} fill="currentColor" />
                  Doc Recommended
                </span>
              )}
            </div>

            {/* Product Image */}
            <div className="purchased-img-container" onClick={() => handleCardClick(med.id)}>
              <img src={med.image} alt={med.name} className="purchased-img" />
            </div>

            {/* Product Details */}
            <div className="purchased-info-wrap">
              {/* Stars & rating display */}
              <div className="rating-row">
                <div className="star-rating-pack">
                  <Star size={12} fill="#fbbf24" stroke="none" />
                  <Star size={12} fill="#fbbf24" stroke="none" />
                  <Star size={12} fill="#fbbf24" stroke="none" />
                  <Star size={12} fill="#fbbf24" stroke="none" />
                  <Star size={12} fill="#fbbf24" stroke="none" />
                </div>
                <span className="rating-lbl">{med.rating}</span>
              </div>

              <h4 className="purchased-title" onClick={() => handleCardClick(med.id)}>
                {med.name}
              </h4>
              <p className="purchased-brand">{med.brand} · {med.packInfo}</p>
              <p className="purchased-desc-snippet">{med.description}</p>
              
              {/* Buyer Avatars Row */}
              <div className="purchased-buyer-avatars">
                <div className="avatar-stack">
                  <img src="/images/customer_1.png" alt="User 1" className="buyer-avatar" />
                  <img src="/images/customer_2.png" alt="User 2" className="buyer-avatar" />
                  <img src="/images/customer_3.png" alt="User 3" className="buyer-avatar" />
                </div>
                <span className="avatar-text-badge">Verified Purchases</span>
              </div>

              <div className="purchased-footer-row">
                <div className="price-stack">
                  <span className="new-price">₹{med.priceDiscounted.toFixed(2)}</span>
                  <span className="old-price">₹{med.priceOriginal.toFixed(2)}</span>
                </div>
                
                <button className="purchased-btn-reserve" onClick={() => handleAdd(med)}>
                  Reserve
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default MostPurchased;
