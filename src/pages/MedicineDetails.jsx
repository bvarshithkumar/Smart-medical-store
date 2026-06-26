import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Share2, Plus, Minus, Check, FileText, Award, ShieldCheck, Lock, CreditCard } from 'lucide-react';
import Navbar from '../components/Navbar';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import { medicineService, mapProduct } from '../services/medicineService';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { fetchWithTimeout } from '../hooks/useFetchWithTimeout';
import { SkeletonCard, ErrorState } from '../components/LoadingStates';


const MedicineDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cart, addItem, removeItem, showToast } = useCart();
  
  const [medicine, setMedicine] = useState(null);
  const [similarMedicines, setSimilarMedicines] = useState([]);
  const [fbtMedicines, setFbtMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  // Local state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [quantity, setQuantity] = useState(1);
  const [selectedFbtIds, setSelectedFbtIds] = useState(new Set());

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchWithTimeout(async (signal) => {
        // 1. Get current medicine details
        const { data: medData, error: medError } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .abortSignal(signal)
          .single();

        if (medError) throw medError;
        const med = mapProduct(medData);

        // 2. Fetch similar medicines
        const { data: simData } = await supabase
          .from('products')
          .select('*')
          .eq('category', med.category)
          .neq('id', id)
          .limit(3)
          .abortSignal(signal);

        let sims = (simData || []).map(mapProduct);
        if (sims.length === 0) {
          const { data: fallbackData } = await supabase
            .from('products')
            .select('*')
            .neq('id', id)
            .limit(3)
            .abortSignal(signal);
          sims = (fallbackData || []).map(mapProduct);
        }

        // 3. Fetch bought together medicines
        const { data: fbtData } = await supabase
          .from('products')
          .select('*')
          .neq('id', id)
          .limit(2)
          .abortSignal(signal);
        const fbts = (fbtData || []).map(mapProduct);

        return { med, sims, fbts };
      });

      if (data.med) {
        setMedicine(data.med);
        setSelectedFbtIds(new Set([data.med.id]));
        setSimilarMedicines(data.sims);
        setFbtMedicines(data.fbts);
        setCurrentSlide(0);
        setQuantity(1);
      } else {
        setError('Medicine details not found.');
      }
    } catch (err) {
      console.error('Failed to load medicine details:', err);
      setError(err.message || 'Failed to load medicine details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  if (loading) {
    return (
      <div className="app-shell">
        <Navbar showSearch={false} />
        <main className="reservation-main" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
          <SkeletonCard lines={6} style={{ minHeight: '300px' }} />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-shell">
        <Navbar showSearch={false} />
        <main className="reservation-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <ErrorState message={error} onRetry={loadData} />
        </main>
      </div>
    );
  }

  if (!medicine) return null;


  const isAdded = cart.some(item => item.id === medicine.id);

  // Gallery slider control
  const setSlide = (idx) => {
    setCurrentSlide(idx);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].screenX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setCurrentSlide(prev => Math.min(2, prev + 1));
      } else {
        setCurrentSlide(prev => Math.max(0, prev - 1));
      }
    }
  };

  // Quantity control
  const handleMinus = () => {
    if (quantity > 1) setQuantity(prev => prev - 1);
  };

  const handlePlus = () => {
    if (quantity < 10) {
      setQuantity(prev => prev + 1);
    } else {
      showToast('Maximum reservation limit is 10 units per medicine.', 'OK');
    }
  };

  // FBT logic
  const toggleFbt = (fbtId) => {
    setSelectedFbtIds(prev => {
      const next = new Set(prev);
      if (next.has(fbtId)) {
        next.delete(fbtId);
      } else {
        next.add(fbtId);
      }
      return next;
    });
  };

  const getFbtTotalPrice = () => {
    let sum = 0;
    selectedFbtIds.forEach(itemId => {
      if (itemId === medicine.id) {
        sum += medicine.selling_price;
      } else {
        const found = fbtMedicines.find(item => item.id === itemId);
        if (found) sum += found.selling_price;
      }
    });
    return sum;
  };

  const handleAddFbtAll = () => {
    selectedFbtIds.forEach(itemId => {
      let name = '';
      if (itemId === medicine.id) {
        name = medicine.name;
      } else {
        const found = fbtMedicines.find(item => item.id === itemId);
        if (found) name = found.name;
      }
      addItem(itemId, 1, name);
    });
    showToast(`Added ${selectedFbtIds.size} items to reservation!`, 'View Cart', () => {
      navigate('/cart');
    });
  };

  // Button actions
  const handleAddToReservation = () => {
    if (isAdded) {
      removeItem(medicine.id);
      showToast(`Removed ${medicine.name} from reservation`, 'Undo', () => {
        addItem(medicine.id, quantity, medicine.name);
      });
    } else {
      addItem(medicine.id, quantity, medicine.name);
      showToast(`Added ${medicine.name} (Qty: ${quantity}) to reservation!`, 'View Cart', () => {
        navigate('/cart');
      });
    }
  };

  const handleReserveNow = () => {
    addItem(medicine.id, quantity, medicine.name);
    navigate('/cart');
  };

  return (
    <div className="app-shell">
      {/* Navbar header */}
      <Navbar showSearch={false} />

      <main className="detail-main" style={{ padding: '16px', maxWidth: '100%', margin: '0 auto' }}>
        
        {/* 1. Image Gallery */}
        <section className="gallery-section">
          <div className="gallery-container" style={{ overflow: 'hidden', position: 'relative', borderRadius: '16px' }}>
            <div 
              className="gallery-track"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              style={{
                display: 'flex',
                width: '300%',
                transform: `translateX(-${currentSlide * 33.333}%)`,
                transition: 'transform 0.4s ease'
              }}
            >
              <div className="gallery-slide" style={{ width: '33.333%' }}>
                <div className="gallery-img-wrap" style={{ background: '#ffffff', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px', borderRadius: '16px' }}>
                  <div className="detail-img-glow" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '180px', height: '180px', borderRadius: '50%', background: `radial-gradient(circle, ${medicine.glowColor || 'rgba(20, 184, 166, 0.15)'} 0%, rgba(255,255,255,0) 70%)`, pointerEvents: 'none', zIndex: 1 }} />
                  <img src={medicine.image} alt={medicine.name} className="detail-img-real" style={{ maxHeight: '170px', width: 'auto', maxWidth: '85%', objectFit: 'contain', zIndex: 2, filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.08))' }} />
                </div>
              </div>
              <div className="gallery-slide" style={{ width: '33.333%' }}>
                <div className="gallery-img-wrap" style={{ background: '#ffffff', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px', borderRadius: '16px' }}>
                  <div className="detail-img-glow" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '180px', height: '180px', borderRadius: '50%', background: `radial-gradient(circle, ${medicine.glowColor || 'rgba(20, 184, 166, 0.15)'} 0%, rgba(255,255,255,0) 70%)`, pointerEvents: 'none', zIndex: 1 }} />
                  <img src={medicine.image} alt={`${medicine.name} - View 2`} className="detail-img-real" style={{ maxHeight: '170px', width: 'auto', maxWidth: '85%', objectFit: 'contain', zIndex: 2, transform: 'rotate(5deg) scale(0.95)', filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.08))' }} />
                </div>
              </div>
              <div className="gallery-slide" style={{ width: '33.333%' }}>
                <div className="gallery-img-wrap" style={{ background: '#ffffff', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px', borderRadius: '16px' }}>
                  <div className="detail-img-glow" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '180px', height: '180px', borderRadius: '50%', background: `radial-gradient(circle, ${medicine.glowColor || 'rgba(20, 184, 166, 0.15)'} 0%, rgba(255,255,255,0) 70%)`, pointerEvents: 'none', zIndex: 1 }} />
                  <img src={medicine.image} alt={`${medicine.name} - View 3`} className="detail-img-real" style={{ maxHeight: '170px', width: 'auto', maxWidth: '85%', objectFit: 'contain', zIndex: 2, transform: 'skewY(-2deg) scale(0.9)', filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.08))' }} />
                </div>
              </div>
            </div>
          </div>
          
          <div className="gallery-thumbnails">
            <div className={`gallery-thumb ${currentSlide === 0 ? 'active' : ''}`} onClick={() => setSlide(0)} style={{ background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(20, 184, 166, 0.12)', borderRadius: '12px', padding: '6px', overflow: 'hidden', cursor: 'pointer' }}>
              <img src={medicine.image} alt="Thumbnail 1" style={{ maxHeight: '42px', width: 'auto', maxWidth: '100%', objectFit: 'contain' }} />
            </div>
            <div className={`gallery-thumb ${currentSlide === 1 ? 'active' : ''}`} onClick={() => setSlide(1)} style={{ background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(20, 184, 166, 0.12)', borderRadius: '12px', padding: '6px', overflow: 'hidden', cursor: 'pointer' }}>
              <img src={medicine.image} alt="Thumbnail 2" style={{ maxHeight: '42px', width: 'auto', maxWidth: '100%', objectFit: 'contain', transform: 'rotate(5deg) scale(0.95)' }} />
            </div>
            <div className={`gallery-thumb ${currentSlide === 2 ? 'active' : ''}`} onClick={() => setSlide(2)} style={{ background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(20, 184, 166, 0.12)', borderRadius: '12px', padding: '6px', overflow: 'hidden', cursor: 'pointer' }}>
              <img src={medicine.image} alt="Thumbnail 3" style={{ maxHeight: '42px', width: 'auto', maxWidth: '100%', objectFit: 'contain', transform: 'skewY(-2deg) scale(0.9)' }} />
            </div>
          </div>

          <div className="gallery-dots">
            <span className={`gdot ${currentSlide === 0 ? 'active' : ''}`} onClick={() => setSlide(0)}></span>
            <span className={`gdot ${currentSlide === 1 ? 'active' : ''}`} onClick={() => setSlide(1)}></span>
            <span className={`gdot ${currentSlide === 2 ? 'active' : ''}`} onClick={() => setSlide(2)}></span>
          </div>
        </section>

        {/* 2. Info Block */}
        <section className="medicine-info-section">
          <div className="medicine-badges" id="medicine-badges">
            {medicine.requiresPrescription ? (
              <span className="badge badge-rx">
                <FileText size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '3px' }} />
                Rx Required
              </span>
            ) : (
              <span className="badge badge-otc">OTC</span>
            )}
            {medicine.isOTC && <span className="badge badge-otc-label">General Health</span>}
          </div>

          <div className="medicine-meta-brand">{medicine.brand}</div>
          <h1 className="medicine-name">{medicine.name}</h1>
          <p className="medicine-pack-info">{medicine.packInfo}</p>

          <div className="medicine-pricing-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="medicine-pricing" style={{ display: 'flex', flexDirection: 'column' }}>
              {medicine.mrp > medicine.selling_price && medicine.mrp > 0 && (
                <span className="med-price-original" style={{ textDecoration: 'line-through', color: 'var(--text-light)', fontSize: '13px' }}>
                  MRP ₹{medicine.mrp.toFixed(2)}
                </span>
              )}
              <span className="med-price-discounted" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                ₹{medicine.selling_price.toFixed(2)}
              </span>
            </div>
            {medicine.discountPercentage > 0 && (
              <span 
                className="med-discount-pill" 
                style={{ 
                  backgroundColor: '#10b981', 
                  color: 'white', 
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontSize: '12px', 
                  fontWeight: '700',
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.45)',
                  display: 'inline-block'
                }}
              >
                {medicine.discountPercentage}% OFF
              </span>
            )}
          </div>

          <div className="medicine-stock-row">
            {medicine.stockStatus === 'instock' && <div className="med-stock status-instock"><span className="status-dot"></span> In Stock</div>}
            {medicine.stockStatus === 'low' && <div className="med-stock status-low"><span className="status-dot"></span> {medicine.stockLabel}</div>}
            {medicine.stockStatus === 'outofstock' && <div className="med-stock status-outofstock"><span className="status-dot"></span> Out of Stock</div>}
          </div>

          <div className="highlights-strip">
            <div className="highlight-item">
              <StoreIcon />
              <span>Pickup Ready</span>
            </div>
            <div className="highlight-item">
              <GenuineIcon />
              <span>100% Genuine</span>
            </div>
            <div className="highlight-item">
              <FastIcon />
              <span>Fast Pickup</span>
            </div>
          </div>

          {/* Upgraded Detail Page Trust Badges */}
          <div className="detail-trust-badges-strip">
            <div className="detail-trust-badge-item">
              <Award size={13} className="badge-icon-teal" />
              <span>Licensed Pharmacy</span>
            </div>
            <div className="detail-trust-badge-item">
              <ShieldCheck size={13} className="badge-icon-blue" />
              <span>GST Registered</span>
            </div>
            <div className="detail-trust-badge-item">
              <Lock size={13} className="badge-icon-purple" />
              <span>Privacy Protected</span>
            </div>
            <div className="detail-trust-badge-item">
              <CreditCard size={13} className="badge-icon-teal" />
              <span>Secure Payments</span>
            </div>
          </div>
        </section>

        {/* 3. Info Tabs */}
        <section className="tabs-section">
          <div className="tabs-nav" role="tablist">
            <button className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')}>Description</button>
            <button className={`tab-btn ${activeTab === 'dosage' ? 'active' : ''}`} onClick={() => setActiveTab('dosage')}>Dosage</button>
            <button className={`tab-btn ${activeTab === 'side-effects' ? 'active' : ''}`} onClick={() => setActiveTab('side-effects')}>Side Effects</button>
            <button className={`tab-btn ${activeTab === 'storage' ? 'active' : ''}`} onClick={() => setActiveTab('storage')}>Storage</button>
          </div>
          <div className="tabs-content" style={{ padding: '16px 0' }}>
            {activeTab === 'description' && (
              <div className="tab-panel active">
                <p>{medicine.description}</p>
              </div>
            )}
            {activeTab === 'dosage' && (
              <div className="tab-panel active">
                <ul className="tab-list">
                  {medicine.dosage.map((item, idx) => <li key={idx}>{item}</li>)}
                </ul>
              </div>
            )}
            {activeTab === 'side-effects' && (
              <div className="tab-panel active">
                <ul className="tab-list">
                  {medicine.sideEffects.map((item, idx) => <li key={idx}>{item}</li>)}
                </ul>
              </div>
            )}
            {activeTab === 'storage' && (
              <div className="tab-panel active">
                <ul className="tab-list">
                  {medicine.storage.map((item, idx) => <li key={idx}>{item}</li>)}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* 4. Similar Medicines */}
        {similarMedicines.length > 0 && (
          <section className="similar-section" style={{ padding: '24px 0' }}>
            <div className="section-title" style={{ padding: 0 }}>Similar Medicines</div>
            <div className="similar-scroll" style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '12px 0' }}>
              {similarMedicines.map((simMed) => (
                <div key={simMed.id} className="sim-card" style={{ flexShrink: 0, cursor: 'pointer' }} onClick={() => navigate(`/medicine/${simMed.id}`)}>
                  <div className="sim-img-wrap" style={{ background: '#ffffff', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', borderRadius: '10px' }}>
                    <div className="sim-img-glow" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '60px', height: '60px', borderRadius: '50%', background: `radial-gradient(circle, ${simMed.glowColor || 'rgba(20, 184, 166, 0.12)'} 0%, rgba(255,255,255,0) 70%)`, pointerEvents: 'none' }} />
                    <img src={simMed.image} alt={simMed.name} style={{ maxHeight: '70px', width: 'auto', maxWidth: '85%', objectFit: 'contain', zIndex: 2, filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.06))' }} />
                  </div>
                  <div className="sim-details">
                    <h5 className="sim-name">{simMed.name}</h5>
                    <p className="sim-brand">{simMed.brand}</p>
                    <div className="sim-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="sim-price">₹{simMed.priceDiscounted.toFixed(2)}</span>
                      <button 
                        className="sim-add-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          addItem(simMed.id, 1, simMed.name);
                          showToast(`Added ${simMed.name} to reservation!`, 'View Cart', () => navigate('/cart'));
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5. Frequently Bought Together */}
        {fbtMedicines.length > 0 && (
          <section className="fbt-section" style={{ padding: '24px 0' }}>
            <div className="section-title" style={{ padding: 0 }}>Frequently Bought Together</div>
            <div className="fbt-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 0' }}>
              {/* Primary Item (always checked) */}
              <div className="fbt-row-item">
                <div className="fbt-check-box checked disabled">
                  <Check size={12} />
                </div>
                <div className="fbt-item-image" style={{ background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(20, 184, 166, 0.12)', borderRadius: '8px', padding: '4px', overflow: 'hidden' }}>
                  <img src={medicine.image} alt={medicine.name} style={{ maxHeight: '48px', width: 'auto', maxWidth: '100%', objectFit: 'contain' }} />
                </div>
                <div className="fbt-item-info">
                  <h6>{medicine.name}</h6>
                  <p>₹{medicine.priceDiscounted.toFixed(2)}</p>
                </div>
              </div>

              {/* Bought Together list */}
              {fbtMedicines.map((fbtMed) => {
                const checked = selectedFbtIds.has(fbtMed.id);
                return (
                  <div key={fbtMed.id} className="fbt-row-item">
                    <div 
                      className={`fbt-check-box ${checked ? 'checked' : ''}`}
                      onClick={() => toggleFbt(fbtMed.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {checked && <Check size={12} />}
                    </div>
                    <div className="fbt-item-image" style={{ background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(20, 184, 166, 0.12)', borderRadius: '8px', padding: '4px', overflow: 'hidden' }}>
                      <img src={fbtMed.image} alt={fbtMed.name} style={{ maxHeight: '48px', width: 'auto', maxWidth: '100%', objectFit: 'contain' }} />
                    </div>
                    <div className="fbt-item-info">
                      <h6>{fbtMed.name}</h6>
                      <p>₹{fbtMed.priceDiscounted.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <button className="fbt-add-all-btn" onClick={handleAddFbtAll} style={{ cursor: 'pointer' }}>
              <ShoppingCart size={18} />
              Add Selected to Cart &nbsp;·&nbsp; ₹{getFbtTotalPrice().toFixed(2)}
            </button>
          </section>
        )}

        {/* Bottom padding */}
        <div style={{ height: '90px' }}></div>

      </main>

      {/* 6. Sticky Bottom Action Bar */}
      <div className="sticky-bottom-bar">
        <div className="qty-selector">
          <button className="qty-btn" onClick={handleMinus} aria-label="Decrease quantity">
            <Minus size={16} />
          </button>
          <span className="qty-display">{quantity}</span>
          <button className="qty-btn" onClick={handlePlus} aria-label="Increase quantity">
            <Plus size={16} />
          </button>
        </div>

        <div className="sticky-bar-actions">
          <button 
            className={`detail-secondary-btn ${isAdded ? 'added' : ''}`}
            onClick={handleAddToReservation}
          >
            <Check size={16} style={{ display: isAdded ? 'inline-block' : 'none', marginRight: '6px' }} />
            {isAdded ? 'Added to Reservation' : 'Add to Reservation'}
          </button>
          <button className="detail-primary-btn" onClick={handleReserveNow}>
            Reserve Medicine
          </button>
        </div>
      </div>

      <FloatingWhatsApp />
    </div>
  );
};

// SVG helper nodes
const StoreIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const GenuineIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const FastIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export default MedicineDetails;
