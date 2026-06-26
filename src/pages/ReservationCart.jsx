import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trash2, ShoppingBag, MapPin, FileText, ArrowRight, Minus, Plus, ShieldCheck, Lock, UserCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useCart } from '../context/CartContext';
import { medicineService } from '../services/medicineService';

const ReservationCart = () => {
  const { cart, updateQty, removeItem, addItem, getCartCount, getCartTotal, showToast } = useCart();
  const navigate = useNavigate();
  const [medicinesDb, setMedicinesDb] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    medicineService.getMedicines().then(list => {
      const db = list.reduce((acc, med) => {
        acc[med.id] = med;
        return acc;
      }, {});
      setMedicinesDb(db);
      setLoading(false);
    });
  }, []);

  const count = getCartCount();
  const total = getCartTotal(medicinesDb);

  // Check if any item requires prescription
  const requiresPrescription = cart.some(item => {
    const med = medicinesDb[item.id];
    return med && med.requiresPrescription;
  });

  const handleContinue = () => {
    if (count === 0) {
      showToast('Your reservation cart is empty!', 'Browse', () => {
        navigate('/');
      });
    } else {
      navigate('/pickup');
    }
  };

  const handleMinus = (id, currentQty) => {
    const med = medicinesDb[id];
    if (currentQty > 1) {
      updateQty(id, currentQty - 1);
    } else {
      removeItem(id);
      showToast(`Removed ${med?.name || 'item'} from reservation`, 'Undo', () => {
        addItem(id, 1);
      });
    }
  };

  const handlePlus = (id, currentQty) => {
    if (currentQty < 10) {
      updateQty(id, currentQty + 1);
    } else {
      showToast('Maximum reservation limit is 10 units per medicine.', 'OK');
    }
  };

  const handleRemove = (id) => {
    const med = medicinesDb[id];
    const qty = cart.find(item => item.id === id)?.qty || 1;
    removeItem(id);
    showToast(`Removed ${med?.name || 'item'} from reservation`, 'Undo', () => {
      addItem(id, qty);
    });
  };

  if (loading) {
    return (
      <div className="app-shell">
        <Navbar showSearch={false} />
        <main className="reservation-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Loading Cart...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Navbar without search bar */}
      <Navbar showSearch={false} />

      <main className="reservation-main">
        {/* Step Tracker */}
        <div className="steps-progress-bar">
          <div className="steps-progress-line" style={{ width: '25%' }}></div>
          <div className="step-indicator active">1</div>
          <div className="step-indicator">2</div>
          <div className="step-indicator">3</div>
        </div>

        {/* Page Title */}
        <div className="page-title-row">
          <ShoppingBag style={{ color: 'var(--primary-blue)', width: '22px', height: '22px' }} />
          <h2 className="page-title">Reserved Medicines</h2>
        </div>

        {/* Empty state or layout grid */}
        {cart.length === 0 ? (
          <div className="cart-empty-state-premium">
            <div className="cart-empty-icon-box">
              <ShoppingBag style={{ width: '32px', height: '32px' }} />
            </div>
            <h3>Your reservation cart is empty</h3>
            <p>Browse our popular categories and add medicines to reserve them for store pickup.</p>
            <Link to="/" className="shop-btn">Browse Medicines</Link>
          </div>
        ) : (
          <div className="cart-layout" id="cart-layout">
            
            {/* Left Column: Items */}
            <div className="cart-items-column">
              {cart.map(item => {
                const med = medicinesDb[item.id];
                if (!med) return null;
                const subtotal = med.priceDiscounted * item.qty;

                return (
                  <div key={item.id} className="cart-item-card">
                    <div className="cart-item-img" dangerouslySetInnerHTML={{ __html: med.svg }} />
                    <div className="cart-item-details">
                      <h4 className="cart-item-name">{med.name}</h4>
                      <p className="cart-item-brand">{med.brand} · {med.packInfo}</p>
                      
                      <div className="cart-item-bottom">
                        <span className="cart-item-price">₹{subtotal.toFixed(2)}</span>
                        
                        <div className="qty-selector" style={{ height: '34px', borderRadius: '8px' }}>
                          <button 
                            className="qty-btn" 
                            style={{ width: '30px', height: '32px' }}
                            onClick={() => handleMinus(item.id, item.qty)}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="qty-display" style={{ fontSize: '13px', minWidth: '20px' }}>{item.qty}</span>
                          <button 
                            className="qty-btn" 
                            style={{ width: '30px', height: '32px' }}
                            onClick={() => handlePlus(item.id, item.qty)}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      className="cart-item-remove-btn" 
                      onClick={() => handleRemove(item.id)}
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Summary Card */}
            <div className="summary-column">
              <div className="summary-card">
                <h3 className="summary-title">Reservation Summary</h3>
                
                <div className="summary-row">
                  <span style={{ color: 'var(--text-secondary)' }}>Total Items</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{count}</span>
                </div>
                
                <div className="summary-row">
                  <span style={{ color: 'var(--text-secondary)' }}>Preparation Time</span>
                  <span style={{ fontWeight: 700, color: requiresPrescription ? 'var(--primary-blue)' : 'var(--accent-green)' }}>
                    {requiresPrescription ? '30 mins' : '15 mins'}
                  </span>
                </div>

                <div className="summary-row total">
                  <span>Estimated Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>

                {/* Pickup Location */}
                <div className="info-strip">
                  <MapPin size={18} className="info-strip-icon" />
                  <div>
                    <div className="info-strip-text info-strip-title">Pickup Location</div>
                    <div className="info-strip-text">Sri Venkateshwara Medical Store</div>
                    <div className="info-strip-text" style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '1px' }}>
                      Kachiguda, Hyderabad
                    </div>
                  </div>
                </div>

                {/* Prescription Check warnings */}
                {requiresPrescription && (
                  <div className="info-strip teal">
                    <FileText size={18} className="info-strip-icon" />
                    <div>
                      <div className="info-strip-text info-strip-title">Prescription Required</div>
                      <div className="info-strip-text">Please bring a valid prescription when you collect these medicines at the store.</div>
                    </div>
                  </div>
                )}

                <button className="reservation-cta-btn" onClick={handleContinue}>
                  Select Pickup Time
                  <ArrowRight size={18} />
                </button>

                {/* Checkout Trust Seals */}
                <div className="cart-checkout-seals">
                  <div className="checkout-seal-item">
                    <ShieldCheck size={14} className="seal-icon green" />
                    <span>100% Secure Checkout</span>
                  </div>
                  <div className="checkout-seal-item">
                    <UserCheck size={14} className="seal-icon teal" />
                    <span>Verified Pharmacy</span>
                  </div>
                  <div className="checkout-seal-item">
                    <Lock size={14} className="seal-icon blue" />
                    <span>Data Privacy Protected</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default ReservationCart;
