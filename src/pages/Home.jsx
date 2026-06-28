import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Carousel from '../components/Carousel';
import QuickActions from '../components/QuickActions';
import CategoryCard, { categoriesData } from '../components/CategoryCard';
import MedicineCard from '../components/MedicineCard';
import SearchBar from '../components/SearchBar';
import SchedulerModal from '../components/SchedulerModal';
import { medicineService, mapProduct } from '../services/medicineService';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';

// Import newly created homepage sections
import HealthConcerns from '../components/HealthConcerns';
import UploadRxBanner from '../components/UploadRxBanner';
import WhyChooseUs from '../components/WhyChooseUs';
import FeaturedBrands from '../components/FeaturedBrands';
import HowItWorks from '../components/HowItWorks';
import Testimonials from '../components/Testimonials';
import StoreInfo from '../components/StoreInfo';
import Faqs from '../components/Faqs';
import Footer from '../components/Footer';
import TodaysDeals from '../components/TodaysDeals';
import HealthTips from '../components/HealthTips';

// New premium sections
import StatsBar from '../components/StatsBar';
import PrescriptionTracker from '../components/PrescriptionTracker';
import WellnessEssentials from '../components/WellnessEssentials';
import LiveTrustBar from '../components/LiveTrustBar';
import AboutUs from '../components/AboutUs';

import { cmsService } from '../services/cmsService';
import ErrorBoundary from '../components/ErrorBoundary';

const DEFAULT_SECTIONS = [
  { section_key: 'hero_slides', section_name: 'Hero Carousel', is_visible: true, display_order: 0 },
  { section_key: 'statistics', section_name: 'Statistics Bar', is_visible: true, display_order: 10 },
  { section_key: 'quick_actions', section_name: 'Quick Actions', is_visible: true, display_order: 20 },
  { section_key: 'categories', section_name: 'Medicine Categories', is_visible: true, display_order: 30 },
  { section_key: 'popular_medicines', section_name: 'Popular Medicines', is_visible: true, display_order: 40 },
  { section_key: 'offers', section_name: 'Promotional Offers', is_visible: true, display_order: 50 },
  { section_key: 'wellness_essentials', section_name: 'Wellness Essentials', is_visible: true, display_order: 60 },
  { section_key: 'health_concerns', section_name: 'Shop by Health Concern', is_visible: true, display_order: 70 },
  { section_key: 'banners', section_name: 'Upload Rx Banner', is_visible: true, display_order: 80 },
  { section_key: 'prescription_tracker', section_name: 'Prescription Tracker', is_visible: true, display_order: 90 },
  { section_key: 'why_choose_us', section_name: 'Core Trust Pillars', is_visible: true, display_order: 100 },
  { section_key: 'brands', section_name: 'Featured Brands', is_visible: true, display_order: 110 },
  { section_key: 'how_it_works', section_name: 'Pickup Workflow', is_visible: true, display_order: 120 },
  { section_key: 'testimonials', section_name: 'Customer Testimonials', is_visible: true, display_order: 130 },
  { section_key: 'health_tips', section_name: 'Pharmacist Health Tips', is_visible: true, display_order: 140, background_color: '#0B1220' },
  { section_key: 'about_us', section_name: 'About Us Story', is_visible: true, display_order: 150 },
  { section_key: 'pharmacist_info', section_name: 'Store & Pharmacist Info', is_visible: true, display_order: 160 },
  { section_key: 'faqs', section_name: 'Frequently Asked Questions', is_visible: true, display_order: 170 }
];

const SectionWrapper = ({ config, children }) => {
  const elementRef = React.useRef(null);
  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';

  React.useEffect(() => {
    if (isPreview || !config.id) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          cmsService.incrementViews(config.section_key);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }
    return () => observer.disconnect();
  }, [config.section_key, config.id, isPreview]);

  const handleSectionClick = () => {
    if (isPreview || !config.id) return;
    cmsService.incrementClicks(config.section_key);
  };

  const isCurrentlyVisible = config.is_visible && 
    (!config.start_date || new Date(config.start_date) <= new Date()) && 
    (!config.end_date || new Date(config.end_date) >= new Date());

  const wrapperClass = [
    'dynamic-section-wrapper',
    config.custom_css_class || '',
    isPreview ? 'preview-mode-section' : '',
    isPreview && !isCurrentlyVisible ? 'preview-section-highlight' : ''
  ].filter(Boolean).join(' ');

  const sectionStyle = {
    backgroundColor: config.background_color || 'transparent',
    backgroundImage: config.background_image_url ? `url(${config.background_image_url})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    paddingTop: config.padding_top !== undefined ? `${config.padding_top}px` : '40px',
    paddingBottom: config.padding_bottom !== undefined ? `${config.padding_bottom}px` : '40px'
  };

  return (
    <div 
      ref={elementRef} 
      style={sectionStyle} 
      className={wrapperClass}
      onClick={handleSectionClick}
      id={config.section_key === 'popular_medicines' ? 'popular-medicines' : config.section_key}
    >
      {children}
    </div>
  );
};

const Home = () => {
  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState(categoriesData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sections, setSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(true);

  const { showToast } = useCart();
  const location = useLocation();

  useEffect(() => {
    const loadSections = async () => {
      try {
        const data = await cmsService.getHomepageSections();
        if (data && data.length > 0) {
          setSections(data);
        } else {
          setSections(DEFAULT_SECTIONS);
        }
      } catch (err) {
        console.error('Failed to load homepage sections:', err);
        setSections(DEFAULT_SECTIONS);
      } finally {
        setLoadingSections(false);
      }
    };

    loadSections();

    const channel = supabase
      .channel('homepage-sections-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homepage_sections' }, () => {
        loadSections();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await cmsService.getCategories();
        if (data && Array.isArray(data)) {
          setCategories(data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase.from('products').select('*').eq('is_active', true);
      if (dbError) throw dbError;
      
      let list = data || [];
      let products = [];
      if (list.length === 0) {
        // Fallback to service seeding if no products exist
        const seeded = await medicineService.getMedicines();
        products = seeded.filter(p => p.is_active !== false);
      } else {
        products = list.map(mapProduct).filter(p => p.is_active !== false);
      }
      
      console.log('Products loaded:', products.length);
      console.log(products);
      setMedicines(products);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter medicines by category and search query
  const filteredMedicines = medicines.filter(med => {
    // 1. Category Filter
    if (selectedCategory !== 'All') {
      const medCat = (med.category || '').toLowerCase();
      const selCat = selectedCategory.toLowerCase();
      
      if (selCat === 'medicines') {
        const nonMedCats = ['wellness', 'personal care', 'health devices', 'diabetes care', 'baby care'];
        if (nonMedCats.includes(medCat)) {
          return false;
        }
      } else {
        if (!medCat.includes(selCat) && !selCat.includes(medCat)) {
          return false;
        }
      }
    }
    
    // 2. Search Query Filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const nameMatch = (med.name || '').toLowerCase().includes(q);
      const brandMatch = (med.brand || '').toLowerCase().includes(q);
      const descMatch = (med.description || '').toLowerCase().includes(q);
      const catMatch = (med.category || '').toLowerCase().includes(q);
      if (!nameMatch && !brandMatch && !descMatch && !catMatch) {
        return false;
      }
    }
    
    return true;
  });

  React.useEffect(() => {
    // Enhanced Intersection Observer — lower threshold for earlier trigger
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -30px 0px',
      threshold: 0.01
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const animatedElements = document.querySelectorAll(
      '.reveal-fade, .reveal-slide-up, .reveal-cascade'
    );
    animatedElements.forEach(el => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [sections, medicines, categories, loading, loadingSections]);

  // ── Subtle parallax on hero bg decorations (RAF, GPU-only) ──────────────
  React.useEffect(() => {
    let rafId = null;
    let lastScrollY = window.scrollY;

    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        if (Math.abs(scrollY - lastScrollY) < 1) { rafId = null; return; }
        lastScrollY = scrollY;

        // Parallax the hero bg-float-decorations (slow layer)
        const decorations = document.querySelector('.bg-float-decorations');
        if (decorations) {
          const y = scrollY * 0.18;
          decorations.style.transform = `translateY(${y}px)`;
        }

        // Parallax bg particles (medium)
        document.querySelectorAll('.bg-particle').forEach((el, i) => {
          const rate = 0.08 + (i % 3) * 0.04;
          el.style.transform = `translateY(${-(scrollY * rate)}px)`;
        });

        rafId = null;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  React.useEffect(() => {
    if (location.state && location.state.scrollTo) {
      const targetId = location.state.scrollTo;
      const highlight = location.state.highlight;
      setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          if (highlight) {
            element.classList.add('highlight-section');
            setTimeout(() => {
              element.classList.remove('highlight-section');
            }, 2200);
          }
        }
      }, 100);
      // Clear scroll state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleCategoryClick = (catName) => {
    setSelectedCategory(prev => prev === catName ? 'All' : catName);
    showToast(`Showing results for category "${catName}"`, 'Close');
    
    // Scroll to the medicines section
    setTimeout(() => {
      const element = document.getElementById('popular-medicines');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  if (loadingSections) {
    return (
      <div className="app-shell" id="app-shell">
        <Navbar showSearch={false} />
        <main className="home-main-layout" style={{ minHeight: '80vh', padding: '0 0 40px 0' }}>
          <div className="skeleton-hero-container" style={{ padding: '0 4%', marginTop: '16px' }}>
            <div className="skeleton-hero-card shimmer-dark" style={{ height: '480px', borderRadius: '24px' }} />
          </div>
          <div style={{ padding: '0 4%' }}>
            <div className="skeleton-stats-bar shimmer-dark" style={{ height: '80px', borderRadius: '16px', marginTop: '24px' }} />
          </div>
          <div className="skeleton-categories-row" style={{ display: 'flex', gap: '16px', padding: '24px 6%', overflow: 'hidden', justifyContent: 'center' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-category-card shimmer-dark" style={{ width: '160px', height: '180px', borderRadius: '16px', flexShrink: 0 }} />
            ))}
          </div>
          <div className="skeleton-products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', padding: '24px 6%' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-product-card shimmer-dark" style={{ height: '360px', borderRadius: '16px' }} />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="app-shell" id="app-shell">
      {/* Navbar with embedded search bar and pickup selector */}
      <Navbar showSearch={true} searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Modern e-commerce layout structure */}
      <main className="home-main-layout">
        {/* Background floating medical decorations — corners & edges only */}
        <div className="bg-float-decorations" aria-hidden="true">

          {/* TOP-LEFT: DNA Helix + Medical Cross */}
          <svg className="bg-float-icon pill" style={{ top: '3%', left: '1%', width: 60, height: 60, opacity: 0.07 }} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 5 Q30 15 50 5 Q30 25 10 25 Q30 35 50 25 Q30 45 10 45 Q30 55 50 45" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <circle cx="10" cy="5" r="3" fill="#14b8a6" />
            <circle cx="50" cy="5" r="3" fill="#06b6d4" />
            <circle cx="10" cy="25" r="3" fill="#14b8a6" />
            <circle cx="50" cy="25" r="3" fill="#06b6d4" />
            <circle cx="10" cy="45" r="3" fill="#14b8a6" />
            <circle cx="50" cy="45" r="3" fill="#06b6d4" />
            <line x1="10" y1="5" x2="50" y2="5" stroke="#0d9488" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
            <line x1="10" y1="25" x2="50" y2="25" stroke="#0d9488" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
            <line x1="10" y1="45" x2="50" y2="45" stroke="#0d9488" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
          </svg>

          {/* TOP-LEFT: Medical Cross */}
          <svg className="bg-float-icon cross" style={{ top: '9%', left: '4%', width: 40, height: 40, opacity: 0.07 }} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="15" y="4" width="10" height="32" rx="3" fill="#14b8a6" />
            <rect x="4" y="15" width="32" height="10" rx="3" fill="#14b8a6" />
          </svg>

          {/* TOP-RIGHT: Molecule */}
          <svg className="bg-float-icon heart" style={{ top: '2%', right: '2%', width: 70, height: 70, opacity: 0.06 }} viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="35" cy="35" r="7" fill="#06b6d4" />
            <circle cx="15" cy="20" r="5" fill="#0891b2" />
            <circle cx="55" cy="20" r="5" fill="#14b8a6" />
            <circle cx="15" cy="50" r="5" fill="#0891b2" />
            <circle cx="55" cy="50" r="5" fill="#14b8a6" />
            <line x1="35" y1="35" x2="15" y2="20" stroke="#06b6d4" strokeWidth="2" />
            <line x1="35" y1="35" x2="55" y2="20" stroke="#06b6d4" strokeWidth="2" />
            <line x1="35" y1="35" x2="15" y2="50" stroke="#06b6d4" strokeWidth="2" />
            <line x1="35" y1="35" x2="55" y2="50" stroke="#06b6d4" strokeWidth="2" />
            <line x1="15" y1="20" x2="55" y2="20" stroke="#0d9488" strokeWidth="1.5" strokeDasharray="4 3" />
            <line x1="15" y1="50" x2="55" y2="50" stroke="#0d9488" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>

          {/* TOP-RIGHT: Medical Cross (small) */}
          <svg className="bg-float-icon syringe" style={{ top: '12%', right: '5%', width: 30, height: 30, opacity: 0.07 }} viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="11" y="3" width="8" height="24" rx="2" fill="#14b8a6" />
            <rect x="3" y="11" width="24" height="8" rx="2" fill="#14b8a6" />
          </svg>

          {/* MID-LEFT: ECG / Heartbeat line */}
          <svg className="bg-float-icon shield" style={{ top: '42%', left: '0%', width: 80, height: 40, opacity: 0.07 }} viewBox="0 0 80 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polyline points="0,20 12,20 18,5 22,35 26,5 30,20 42,20 48,12 54,28 58,20 80,20" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>

          {/* BOTTOM-LEFT: Healthcare Shield */}
          <svg style={{ position: 'absolute', bottom: '6%', left: '1%', width: 55, height: 60, opacity: 0.07, animation: 'bgFloatBL 21s ease-in-out infinite', animationDelay: '7s', pointerEvents: 'none' }} viewBox="0 0 55 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M27.5 2L4 12v18c0 14 10.5 27 23.5 28C40.5 57 51 44 51 30V12L27.5 2z" fill="#14b8a6" opacity="0.15" stroke="#14b8a6" strokeWidth="2" />
            <rect x="22" y="18" width="11" height="24" rx="2" fill="#14b8a6" />
            <rect x="16" y="24" width="23" height="11" rx="2" fill="#14b8a6" />
          </svg>

          {/* BOTTOM-RIGHT: DNA Helix (mirrored) */}
          <svg style={{ position: 'absolute', bottom: '4%', right: '1%', width: 60, height: 55, opacity: 0.07, animation: 'bgFloatBR 24s ease-in-out infinite', animationDelay: '3s', pointerEvents: 'none' }} viewBox="0 0 60 55" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 2 Q30 12 50 2 Q30 22 10 22 Q30 32 50 22 Q30 42 10 42 Q30 52 50 42" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <circle cx="10" cy="2" r="3" fill="#06b6d4" />
            <circle cx="50" cy="2" r="3" fill="#14b8a6" />
            <circle cx="10" cy="22" r="3" fill="#06b6d4" />
            <circle cx="50" cy="22" r="3" fill="#14b8a6" />
            <circle cx="10" cy="42" r="3" fill="#06b6d4" />
            <circle cx="50" cy="42" r="3" fill="#14b8a6" />
          </svg>

          {/* BOTTOM-RIGHT: Pill capsule */}
          <svg style={{ position: 'absolute', bottom: '14%', right: '3%', width: 40, height: 20, opacity: 0.07, animation: 'bgFloatTR 18s ease-in-out infinite', animationDelay: '9s', pointerEvents: 'none' }} viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="38" height="18" rx="9" fill="#14b8a6" opacity="0.25" stroke="#14b8a6" strokeWidth="2" />
            <rect x="1" y="1" width="19" height="18" rx="9" fill="#14b8a6" opacity="0.45" />
            <line x1="20" y1="1" x2="20" y2="19" stroke="#fff" strokeWidth="1.5" opacity="0.5" />
          </svg>

          {/* Mid-right: Medical Cross (extra) */}
          <svg style={{ position: 'absolute', top: '28%', right: '1%', width: 28, height: 28, opacity: 0.06, animation: 'bgFloatML 18s ease-in-out infinite', animationDelay: '11s', pointerEvents: 'none' }} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="2" width="8" height="24" rx="2" fill="#0891b2" />
            <rect x="2" y="10" width="24" height="8" rx="2" fill="#0891b2" />
          </svg>

          {/* Floating dot particles */}
          {[...Array(8)].map((_, i) => (
            <span key={i} className="bg-particle" style={{
              left: `${[5, 15, 25, 35, 55, 65, 75, 85][i]}%`,
              animationDelay: `${i * 3.5}s`,
              animationDuration: `${20 + i * 4}s`,
              width: i % 3 === 0 ? '5px' : '3px',
              height: i % 3 === 0 ? '5px' : '3px',
              background: i % 2 === 0 ? 'rgba(20,184,166,0.2)' : 'rgba(6,182,212,0.2)',
            }} />
          ))}
        </div>

        {/* Dynamic CMS Sections */}
        {sections
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          .map(sec => {
            const config = isPreview && sec.draft_config ? { ...sec, ...sec.draft_config } : sec;
            
            const isCurrentlyVisible = config.is_visible && 
              (!config.start_date || new Date(config.start_date) <= new Date()) && 
              (!config.end_date || new Date(config.end_date) >= new Date());
              
            if (!isCurrentlyVisible && !isPreview) return null;

            const formatTitle = (title) => {
              if (!title) return '';
              const words = title.split(' ');
              if (words.length <= 1) return title;
              const lastWord = words.pop();
              return <>{words.join(' ')} <span>{lastWord}</span></>;
            };

            const renderHeader = () => {
              if (!config.section_title) return null;
              return (
                <div className="section-header-premium">
                  <span className="section-badge-pill">{config.section_name.toUpperCase()}</span>
                  <h2 className="section-main-title">{formatTitle(config.section_title)}</h2>
                  {config.section_subtitle && <p className="section-desc-lbl">{config.section_subtitle}</p>}
                </div>
              );
            };

            const renderSectionContent = () => {
              switch (config.section_key) {
                case 'hero_slides':
                  return <Carousel config={config} />;
                case 'statistics':
                  return <StatsBar config={config} />;
                case 'quick_actions':
                  return <QuickActions config={config} />;
                case 'categories':
                  return (
                    <div className="categories-section reveal-slide-up">
                      {renderHeader()}
                      <div className="categories-container reveal-cascade">
                        {categories.map((cat, idx) => (
                          <CategoryCard
                            key={cat.id || idx}
                            name={cat.name}
                            color={cat.color}
                            image={cat.image_url || cat.image}
                            count={cat.product_count || cat.count}
                            active={selectedCategory === cat.name}
                            onClick={() => handleCategoryClick(cat.name)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                case 'popular_medicines':
                  return (
                    <div className="popular-section reveal-slide-up">
                      {renderHeader()}
                      {searchQuery && (
                        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                          <span style={{ fontSize: '12px', color: 'var(--teal-accent, #00A884)', background: 'rgba(20, 184, 166, 0.08)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(20, 184, 166, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                            Search: "{searchQuery}"
                            <button 
                              onClick={() => setSearchQuery('')} 
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #64748b)', cursor: 'pointer', fontWeight: 800, fontSize: '14px', padding: '0 2px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              aria-label="Clear search"
                            >
                              ×
                            </button>
                          </span>
                        </div>
                      )}
                      {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: '16px', width: '100%' }}>
                          <div className="spinner" style={{ width: '40px', height: '40px', border: '3.5px solid rgba(20, 184, 166, 0.1)', borderTop: '3.5px solid var(--teal-accent, #00A884)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                          <p style={{ fontSize: '14px', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>Loading premium medicines...</p>
                        </div>
                      ) : error ? (
                        <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed #ef4444', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.02)', margin: '20px 0', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                          <p style={{ fontSize: '15px', color: '#ef4444', fontWeight: 600 }}>{error}</p>
                          <button 
                            onClick={fetchProducts} 
                            style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }}
                          >
                            Try Again
                          </button>
                        </div>
                      ) : medicines.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed var(--border-color, #cbd5e1)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', margin: '20px 0', width: '100%' }}>
                          <p style={{ fontSize: '15px', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>No medicines found</p>
                        </div>
                      ) : filteredMedicines.length > 0 ? (
                        <div className="product-grid reveal-cascade is-visible">
                          {filteredMedicines.slice(0, config.max_items || 8).map((med) => {
                            if (!med || !med.id) return null;
                            return <MedicineCard key={med.id} medicine={med} />;
                          })}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed var(--border-color, #cbd5e1)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', margin: '20px 0', width: '100%' }}>
                          <p style={{ fontSize: '15px', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>No medicines match your criteria.</p>
                        </div>
                      )}
                    </div>
                  );
                case 'offers':
                  return <TodaysDeals config={config} />;
                case 'wellness_essentials':
                  return <WellnessEssentials config={config} />;
                case 'health_concerns':
                  return <HealthConcerns config={config} />;
                case 'banners':
                  return <UploadRxBanner config={config} />;
                case 'prescription_tracker':
                  return <PrescriptionTracker config={config} />;
                case 'why_choose_us':
                  return <WhyChooseUs config={config} />;
                case 'brands':
                  return <FeaturedBrands config={config} />;
                case 'how_it_works':
                  return <HowItWorks config={config} />;
                case 'testimonials':
                  return <Testimonials config={config} />;
                case 'health_tips':
                  return <HealthTips config={config} />;
                case 'about_us':
                  return <AboutUs config={config} />;
                case 'pharmacist_info':
                  return <StoreInfo config={config} />;
                case 'faqs':
                  return <Faqs config={config} />;
                default:
                  if (config.section_key.startsWith('health_tips')) return <HealthTips config={config} />;
                  if (config.section_key.startsWith('offers')) return <TodaysDeals config={config} />;
                  if (config.section_key.startsWith('testimonials')) return <Testimonials config={config} />;
                  return null;
              }
            };

            return (
              <ErrorBoundary key={config.id || config.section_key} sectionKey={config.section_key} sectionName={config.section_name}>
                <SectionWrapper config={config}>
                  {renderSectionContent()}
                </SectionWrapper>
              </ErrorBoundary>
            );
          })}
      </main>

      {/* 10. Professional Footer */}
      <Footer />
    </div>
  );
};

export default Home;
