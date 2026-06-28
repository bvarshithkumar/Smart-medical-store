import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Share2, Plus, Minus, Check, FileText, Award, ShieldCheck, Lock, CreditCard, ArrowLeft, Sparkles, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';
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

  const galleryImages = medicine.images || [];
  const imageCount = galleryImages.length;

  const handleTouchEnd = (e) => {
    if (imageCount <= 1) return;
    touchEndX.current = e.changedTouches[0].screenX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setCurrentSlide(prev => Math.min(imageCount - 1, prev + 1));
      } else {
        setCurrentSlide(prev => Math.max(0, prev - 1));
      }
    }
  };

  const handlePrevSlide = () => {
    if (imageCount <= 1) return;
    setCurrentSlide(prev => (prev === 0 ? imageCount - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    if (imageCount <= 1) return;
    setCurrentSlide(prev => (prev === imageCount - 1 ? 0 : prev + 1));
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

      <main className="detail-main-container">
        
        {/* Breadcrumbs */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <button className="detail-breadcrumb-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back to Medicines
          </button>
        </div>

        <div className="product-detail-grid" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          
          {/* Left Column: Image Section */}
          <div className="product-image-column">
            {imageCount === 0 ? (
              <div className="gallery-container-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <div className="detail-img-radial-glow" style={{ background: `radial-gradient(circle, rgba(20, 184, 166, 0.1) 0%, rgba(255,255,255,0) 70%)` }} />
                <svg viewBox="0 0 24 24" width="64" height="64" stroke="var(--text-light)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                  <path d="M6 3h12v4H6zM4 7h16v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                  <line x1="9" y1="12" x2="15" y2="12" />
                  <line x1="12" y1="9" x2="12" y2="15" />
                </svg>
                <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: '600' }}>No Image Available</span>
              </div>
            ) : imageCount === 1 ? (
              <div className="gallery-container-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="gallery-img-container">
                  <div className="detail-img-radial-glow" style={{ background: `radial-gradient(circle, ${medicine.glowColor || 'rgba(20, 184, 166, 0.15)'} 0%, rgba(255,255,255,0) 70%)` }} />
                  <img 
                    src={galleryImages[0]} 
                    alt={medicine.name} 
                    className="detail-img-element" 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/images/cat_medicines.png';
                    }}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="gallery-container-box" style={{ position: 'relative' }}>
                  <div 
                    className="gallery-track-slider"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    style={{
                      width: `${imageCount * 100}%`,
                      transform: `translateX(-${currentSlide * (100 / imageCount)}%)`,
                      display: 'flex',
                      transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)'
                    }}
                  >
                    {galleryImages.map((imgUrl, idx) => (
                      <div key={idx} className="gallery-slide-item" style={{ width: `${100 / imageCount}%` }}>
                        <div className="gallery-img-container">
                          <div className="detail-img-radial-glow" style={{ background: `radial-gradient(circle, ${medicine.glowColor || 'rgba(20, 184, 166, 0.15)'} 0%, rgba(255,255,255,0) 70%)` }} />
                          <img 
                            src={imgUrl} 
                            alt={`${medicine.name} - View ${idx + 1}`} 
                            className="detail-img-element" 
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/images/cat_medicines.png';
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Next/Prev Navigation Buttons if 3 or more images */}
                  {imageCount >= 3 && (
                    <>
                      <button 
                        onClick={handlePrevSlide} 
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-main)',
                          color: 'var(--text-main)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 5,
                          transition: 'var(--transition-fast)',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--teal-accent-light)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button 
                        onClick={handleNextSlide} 
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-main)',
                          color: 'var(--text-main)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 5,
                          transition: 'var(--transition-fast)',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--teal-accent-light)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
                        aria-label="Next image"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}
                </div>

                <div className="gallery-thumbs-row">
                  {galleryImages.map((imgUrl, idx) => (
                    <button 
                      key={idx} 
                      className={`gallery-thumb-item ${currentSlide === idx ? 'active' : ''}`} 
                      onClick={() => setSlide(idx)}
                      aria-label={`View image ${idx + 1}`}
                      style={{ background: 'none', cursor: 'pointer' }}
                    >
                      <img 
                        src={imgUrl} 
                        alt={`Thumbnail ${idx + 1}`} 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/images/cat_medicines.png';
                        }}
                      />
                    </button>
                  ))}
                </div>

                {/* Carousel dots indicator if 3 or more images */}
                {imageCount >= 3 && (
                  <div className="gallery-dots-indicator">
                    {galleryImages.map((_, idx) => (
                      <span 
                        key={idx} 
                        className={`gdot-bullet ${currentSlide === idx ? 'active' : ''}`} 
                        onClick={() => setSlide(idx)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column: Info Section */}
          <div className="product-info-column">
            <div className="medicine-badges-row">
              {medicine.requiresPrescription ? (
                <span className="med-tag-badge badge-rx">
                  <FileText size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '3px' }} />
                  Rx Required
                </span>
              ) : (
                <span className="med-tag-badge badge-otc">OTC</span>
              )}
              {medicine.isOTC && <span className="med-tag-badge badge-general">General Health</span>}
            </div>

            <h2 className="medicine-brand-title">{medicine.brand}</h2>
            <h1 className="medicine-main-name">{medicine.name}</h1>
            <p className="medicine-pack-subtitle">{medicine.packInfo}</p>

            <div className="medicine-price-display-box">
              <div className="medicine-price-stack">
                {medicine.mrp > medicine.selling_price && medicine.mrp > 0 && (
                  <span className="med-mrp-price">
                    MRP ₹{medicine.mrp.toFixed(2)}
                  </span>
                )}
                <span className="med-selling-price">
                  ₹{medicine.selling_price.toFixed(2)}
                </span>
              </div>
              {medicine.discountPercentage > 0 && (
                <span className="med-discount-badge">
                  {medicine.discountPercentage}% OFF
                </span>
              )}
            </div>

            <div className={`medicine-stock-status-pill ${medicine.stockStatus}`}>
              <span className="status-dot"></span> 
              {medicine.stockStatus === 'instock' ? 'In Stock' : medicine.stockLabel || 'Low Stock'}
            </div>

            {/* Qty and Premium Actions Inline right below the price and stock */}
            <div className="detail-actions-panel">
              <div className="detail-qty-selector">
                <button className="detail-qty-btn" onClick={handleMinus} aria-label="Decrease quantity">
                  <Minus size={15} />
                </button>
                <span className="detail-qty-display">{quantity}</span>
                <button className="detail-qty-btn" onClick={handlePlus} aria-label="Increase quantity">
                  <Plus size={15} />
                </button>
              </div>

              <div className="detail-buttons-group">
                <button 
                  className={`detail-btn-cart-outline ${isAdded ? 'added' : ''}`}
                  onClick={handleAddToReservation}
                >
                  {isAdded ? <Check size={16} /> : <ShoppingCart size={16} />}
                  {isAdded ? 'Added to Cart' : 'Add to Cart'}
                </button>
                <button className="detail-btn-reserve-gradient" onClick={handleReserveNow}>
                  Reserve Now
                </button>
              </div>
            </div>

            {/* Highlights Strip */}
            <div className="highlights-strip-box">
              <div className="highlight-box-item">
                <StoreIcon />
                <span>Pickup Ready</span>
              </div>
              <div className="highlight-box-item">
                <GenuineIcon />
                <span>100% Genuine</span>
              </div>
              <div className="highlight-box-item">
                <FastIcon />
                <span>Fast Pickup</span>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="trust-badges-grid">
              <div className="trust-badge-item-card">
                <Award size={14} className="badge-teal-color" />
                <span>Licensed Pharmacy</span>
              </div>
              <div className="trust-badge-item-card">
                <ShieldCheck size={14} className="badge-blue-color" />
                <span>GST Registered</span>
              </div>
              <div className="trust-badge-item-card">
                <Lock size={14} className="badge-purple-color" />
                <span>Privacy Protected</span>
              </div>
              <div className="trust-badge-item-card">
                <CreditCard size={14} className="badge-teal-color" />
                <span>Secure Payments</span>
              </div>
            </div>

            {/* Info Tabs inside Info Column for clean compact space usage */}
            <div className="tabs-section-container">
              <div className="tabs-navigator-row" role="tablist">
                <button className={`tab-nav-button ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')}>Description</button>
                <button className={`tab-nav-button ${activeTab === 'dosage' ? 'active' : ''}`} onClick={() => setActiveTab('dosage')}>Dosage</button>
                <button className={`tab-nav-button ${activeTab === 'side-effects' ? 'active' : ''}`} onClick={() => setActiveTab('side-effects')}>Side Effects</button>
                <button className={`tab-nav-button ${activeTab === 'storage' ? 'active' : ''}`} onClick={() => setActiveTab('storage')}>Storage</button>
              </div>
              <div className="tab-panel-content">
                {activeTab === 'description' && (
                  <div className="tab-panel active">
                    <p>{medicine.description}</p>
                  </div>
                )}
                {activeTab === 'dosage' && (
                  <div className="tab-panel active">
                    <ul className="tab-bullets-list">
                      {medicine.dosage.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {activeTab === 'side-effects' && (
                  <div className="tab-panel active">
                    <ul className="tab-bullets-list">
                      {medicine.sideEffects.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {activeTab === 'storage' && (
                  <div className="tab-panel active">
                    <ul className="tab-bullets-list">
                      {medicine.storage.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Frequently Bought Together (FBT) Cards Grid */}
        {fbtMedicines.length > 0 && (
          <section className="fbt-section-wrapper">
            <div className="fbt-header-row">
              <h3 className="fbt-section-title">Frequently Bought Together</h3>
            </div>
            
            <div className="fbt-cards-scroll-container">
              {/* Primary Item (always selected) */}
              <div className="fbt-product-card">
                <div className="fbt-card-top-row">
                  <span className="sim-card-category-tag">{medicine.category}</span>
                  <div className="fbt-card-checkbox checked disabled">
                    <Check size={12} />
                  </div>
                </div>
                <div className="fbt-card-image-box">
                  <img src={medicine.image_url || medicine.image} alt={medicine.name} />
                </div>
                <div className="fbt-card-brand-label">{medicine.brand}</div>
                <h4 className="fbt-card-name-title">{medicine.name}</h4>
                <div className="fbt-card-footer">
                  <span className="fbt-card-price-value">₹{medicine.priceDiscounted.toFixed(2)}</span>
                  <button className="fbt-card-add-btn" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>Primary</button>
                </div>
              </div>

              {/* Bought Together list */}
              {fbtMedicines.map((fbtMed) => {
                const checked = selectedFbtIds.has(fbtMed.id);
                return (
                  <div key={fbtMed.id} className="fbt-product-card">
                    <div className="fbt-card-top-row">
                      <span className="sim-card-category-tag">{fbtMed.category}</span>
                      <div 
                        className={`fbt-card-checkbox ${checked ? 'checked' : ''}`}
                        onClick={() => toggleFbt(fbtMed.id)}
                      >
                        {checked && <Check size={12} />}
                      </div>
                    </div>
                    <div className="fbt-card-image-box">
                      <img 
                        src={fbtMed.image_url || fbtMed.image} 
                        alt={fbtMed.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/images/cat_medicines.png';
                        }} 
                      />
                    </div>
                    <div className="fbt-card-brand-label">{fbtMed.brand}</div>
                    <h4 className="fbt-card-name-title">{fbtMed.name}</h4>
                    <div className="fbt-card-footer">
                      <span className="fbt-card-price-value">₹{fbtMed.priceDiscounted.toFixed(2)}</span>
                      <button 
                        className="fbt-card-add-btn"
                        onClick={() => {
                          addItem(fbtMed.id, 1, fbtMed.name);
                          showToast(`Added ${fbtMed.name} to cart!`, 'View Cart', () => navigate('/cart'));
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bundle Checkout Area */}
            <div className="fbt-summary-checkout-card">
              <div className="fbt-summary-text-area">
                <span className="fbt-summary-selected-count">Selected {selectedFbtIds.size} of {fbtMedicines.length + 1} items</span>
                <span className="fbt-summary-total-price">Bundle Price: <span>₹{getFbtTotalPrice().toFixed(2)}</span></span>
              </div>
              <button className="fbt-checkout-btn" onClick={handleAddFbtAll}>
                <ShoppingCart size={16} /> Add Bundle to Cart
              </button>
            </div>
          </section>
        )}

        {/* 5. Similar Medicines Section */}
        <section className="similar-section-wrapper">
          <div className="similar-header-row">
            <h3 className="similar-section-title">Similar Medicines</h3>
          </div>

          {similarMedicines.length > 0 ? (
            <div className="similar-cards-grid">
              {similarMedicines.map((simMed) => (
                <div key={simMed.id} className="similar-medicine-ecommerce-card">
                  <div className="sim-card-top-badges">
                    <span className="sim-card-category-tag">{simMed.category}</span>
                    {simMed.prescriptionRequired && (
                      <span className="sim-card-rx-badge">Rx</span>
                    )}
                  </div>

                  <div className="sim-card-image-wrapper" onClick={() => navigate(`/medicine/${simMed.id}`)}>
                    <img 
                      src={simMed.image_url || simMed.image} 
                      alt={simMed.name} 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/cat_medicines.png';
                      }}
                    />
                  </div>

                  <div className="sim-card-brand-name">{simMed.brand}</div>
                  <h4 className="sim-card-medicine-name" onClick={() => navigate(`/medicine/${simMed.id}`)}>
                    {simMed.name}
                  </h4>
                  <div className="sim-card-pack-label">{simMed.packInfo || 'Strip of 15 Tablets'}</div>

                  <div className="sim-card-price-stack">
                    <div className="sim-card-price-row">
                      <span className="sim-card-actual-price">₹{simMed.priceDiscounted.toFixed(2)}</span>
                      {simMed.priceOriginal > simMed.priceDiscounted && (
                        <span className="sim-card-mrp-price">₹{simMed.priceOriginal.toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  <div className="sim-card-actions-row">
                    <button 
                      className="sim-btn-add-cart-outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem(simMed.id, 1, simMed.name);
                        showToast(`Added ${simMed.name} to cart!`, 'View Cart', () => navigate('/cart'));
                      }}
                    >
                      + Cart
                    </button>
                    <button 
                      className="sim-btn-reserve-solid"
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem(simMed.id, 1, simMed.name);
                        navigate('/cart');
                      }}
                    >
                      Reserve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="similar-empty-state-box">
              <Sparkles size={24} style={{ color: 'var(--primary-color)', marginBottom: '8px' }} />
              <h4>No similar medicines found</h4>
              <p>We couldn't find matching alternatives in this category.</p>
            </div>
          )}
        </section>

      </main>
    </div>
  );
};

// SVG helper nodes
const StoreIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const GenuineIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const FastIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export default MedicineDetails;
