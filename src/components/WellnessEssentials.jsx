import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Sparkles, ArrowRight, Heart, Stethoscope, TrendingUp, Zap, Award, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { mapProduct } from '../services/medicineService';

const getBadgeIcon = (key) => {
  switch (key) {
    case 'doc-recommended':
      return <Stethoscope size={10} className="badge-icon" />;
    case 'most-purchased':
      return <TrendingUp size={10} className="badge-icon" />;
    case 'fast-moving':
      return <Zap size={10} className="badge-icon" />;
    case 'staff-pick':
      return <Award size={10} className="badge-icon" />;
    case 'customer-favorite':
      return <Heart size={10} className="badge-icon" fill="currentColor" />;
    case 'premium-choice':
      return <Crown size={10} className="badge-icon" fill="currentColor" />;
    default:
      return null;
  }
};

const getBadgeLabel = (key) => {
  switch (key) {
    case 'doc-recommended':
      return 'Doctor Recommended';
    case 'most-purchased':
      return 'Most Purchased';
    case 'fast-moving':
      return 'Fast Moving';
    case 'staff-pick':
      return 'Staff Pick';
    case 'customer-favorite':
      return 'Customer Favorite';
    case 'premium-choice':
      return 'Premium Choice';
    default:
      return '';
  }
};

const WellnessEssentials = ({ config: sectionsConfig }) => {
  const { addItem, showToast } = useCart();
  const navigate = useNavigate();
  const [wellnessProducts, setWellnessProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sectionConfig, setSectionConfig] = useState(null);

  const loadData = async () => {
    try {
      const cfg = await cmsService.getFeaturedProductsConfig();
      setSectionConfig(cfg);

      const items = await cmsService.getFeaturedProductsItems();
      const activeItems = items.filter(item => item.is_active);
      
      if (activeItems.length === 0) {
        // Fallback to query
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .in('category', ['Wellness', 'Vitamins', 'Personal Care'])
          .eq('is_active', true)
          .limit(cfg?.max_products || sectionsConfig?.max_items || 4);
        if (!error && data) {
          setWellnessProducts(data.map(mapProduct));
        }
      } else {
        setWellnessProducts(activeItems.slice(0, cfg?.max_products || sectionsConfig?.max_items || 4));
      }
    } catch (err) {
      console.error('[WellnessEssentials] Error loading CMS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to config updates
    const configChannel = supabase
      .channel('featured-products-config-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homepage_featured_products' }, () => {
        loadData();
      })
      .subscribe();

    // Subscribe to items updates
    const itemsChannel = supabase
      .channel('featured-products-items-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homepage_featured_products_items' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(configChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [sectionsConfig?.max_items]);

  const handleAdd = (med) => {
    addItem(med.product_id || med.id, 1, med.name);
    showToast(`${med.name} reserved successfully!`, 'View Cart', () => navigate('/cart'));
  };

  if (sectionConfig && !sectionConfig.is_visible) {
    return null;
  }

  const title = sectionConfig?.section_title || 'Daily Health & Care';
  const subtitle = sectionConfig?.section_subtitle || 'Curated wellness formulations and diagnostic care for your family.';
  const badgeText = sectionConfig?.badge_text || 'Wellness Essentials';
  const ctaText = sectionConfig?.cta_text || 'View All Wellness';
  const ctaLink = sectionConfig?.cta_link || '/';

  const formatTitle = (text) => {
    if (!text) return '';
    const words = text.split(' ');
    if (words.length <= 1) return text;
    const lastWord = words.pop();
    return <>{words.join(' ')} <span>{lastWord}</span></>;
  };

  return (
    <section className="wellness-essentials-section reveal-slide-up" id="wellness-essentials">
      <div className="section-header-premium-row">
        <div className="section-header-premium">
          <span className="section-badge-pill">
            <Sparkles size={11} className="badge-icon" />
            <span>{badgeText}</span>
          </span>
          <h2 className="section-main-title">{formatTitle(title)}</h2>
          <p className="section-desc-lbl">{subtitle}</p>
        </div>
        <button className="view-all-btn" onClick={() => navigate(ctaLink)}>
          {ctaText} <ArrowRight size={14} style={{ marginLeft: '4px' }} />
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: '16px', width: '100%' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '3.5px solid rgba(20, 184, 166, 0.1)', borderTop: '3.5px solid var(--teal-accent, #00A884)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '14px', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>Loading wellness items...</p>
        </div>
      ) : wellnessProducts.length > 0 ? (
        <div className="wellness-grid reveal-cascade is-visible">
          {wellnessProducts.map((med) => (
            <div key={med.id} className="wellness-card">
              
              {/* Top row with category & favorite heart */}
              <div className="wellness-card-top">
                <span className="card-category-tag">{med.category}</span>
                <button className="favorite-btn" aria-label="Add to favorites">
                  <Heart size={14} className="heart-icon" />
                </button>
              </div>

              {/* Product Image */}
              <div className="wellness-img-wrapper" onClick={() => navigate(`/medicine/${med.product_id || med.id}`)} style={{ position: 'relative' }}>
                <div className="product-badges-container">
                  {med.badge && (
                    <span className="premium-badge discount">{med.badge}</span>
                  )}
                  {med.badges && med.badges.slice(0, med.badge ? 1 : 2).map(bKey => (
                    <span key={bKey} className={`premium-badge healthcare ${bKey}`}>
                      {getBadgeIcon(bKey)}
                      <span>{getBadgeLabel(bKey)}</span>
                    </span>
                  ))}
                </div>
                <img src={med.image} alt={med.name} className="wellness-img" />
              </div>

              {/* Info panel */}
              <div className="wellness-info-panel">
                <h4 className="wellness-title" onClick={() => navigate(`/medicine/${med.product_id || med.id}`)}>
                  {med.name}
                </h4>
                <p className="wellness-desc-short">{med.description || med.desc}</p>
                
                <div className="wellness-footer-row">
                  <div className="price-stack">
                    <span className="new-price">₹{med.priceDiscounted.toFixed(2)}</span>
                    <span className="old-price">₹{med.priceOriginal.toFixed(2)}</span>
                  </div>
                  
                  <button className="wellness-btn-add" onClick={() => handleAdd(med)}>
                    Reserve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed var(--border-color, #cbd5e1)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', margin: '20px 0', width: '100%' }}>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>No wellness products available.</p>
          <p style={{ fontSize: '13px', color: 'var(--text-light, #94a3b8)', marginTop: '4px' }}>Products will appear here once added by the administrator.</p>
        </div>
      )}
    </section>
  );
};

export default WellnessEssentials;
