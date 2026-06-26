import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Shield, Activity, Sparkles, Smartphone, Award, ClipboardCheck } from 'lucide-react';
import { useReservation } from '../context/ReservationContext';
import { useCart } from '../context/CartContext';
import { cmsService } from '../services/cmsService';
import CMSImage from './CMSImage';

const INITIAL_SLIDES = [
  {
    id: 'HS1',
    tag: 'Prescription Upload 📄',
    title: 'Upload Prescription',
    title_highlight: 'Reviewed by Licensed Pharmacists',
    description: 'Upload your prescription securely. Our licensed pharmacists review it, prepare the required medicines, and notify you when they are ready for pickup.',
    image_url: '/images/hero_upload_scene.png',
    button_text: 'Upload Prescription',
    button_link: 'upload',
    bg_gradient: 'linear-gradient(135deg, #022C22 0%, #042F2E 60%, #0F766E 100%)',
    features: ['Licensed Pharmacist Review', '15 Minute Review', 'Secure Upload'],
    tag_style: { bg: 'rgba(20, 184, 166, 0.12)', border: 'rgba(20, 184, 166, 0.25)', color: '#14b8a6' }
  },
  {
    id: 'HS2',
    tag: 'Express Reservation ⚡',
    title: 'Reserve Medicines Online',
    title_highlight: 'Ready in 15 Minutes',
    description: 'Reserve medicines instantly and collect them from the store without waiting.',
    image_url: '/images/hero_pickup_scene.png',
    button_text: 'Reserve Medicines',
    button_link: 'shop',
    bg_gradient: 'linear-gradient(135deg, #091E3A 0%, #0A2E5C 60%, #1E40AF 100%)',
    features: ['Fast Reservation', 'Real-Time Availability', 'Quick Collection'],
    tag_style: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.25)', color: '#60a5fa' }
  },
  {
    id: 'HS3',
    tag: 'Genuine Guarantee 🛡️',
    title: '100% Genuine Medicines',
    title_highlight: 'Certified & Trusted Stock',
    description: 'Medicines sourced directly from verified pharmaceutical suppliers.',
    image_url: '/images/hero_genuine_scene.png',
    button_text: 'Explore Medicines',
    button_link: 'shop',
    bg_gradient: 'linear-gradient(135deg, #1E1B4B 0%, #311042 60%, #581C87 100%)',
    features: ['Verified Suppliers', 'Quality Assured', 'Trusted Brands'],
    tag_style: { bg: 'rgba(124, 92, 246, 0.12)', border: 'rgba(124, 92, 246, 0.25)', color: '#a78bfa' }
  },
  {
    id: 'HS4',
    tag: 'Expert Advice 💬',
    title: 'Talk To Pharmacist',
    title_highlight: 'Expert Guidance & Assistance',
    description: 'Get help from licensed pharmacists regarding medicines, dosage, and prescription clarification.',
    image_url: '/images/rx_hero_pharmacist.png',
    button_text: 'Ask Pharmacist',
    button_link: 'pharmacist',
    bg_gradient: 'linear-gradient(135deg, #0f1e38 0%, #032b45 60%, #0284c7 100%)',
    features: ['Licensed Pharmacists', 'Expert Advice', 'Quick Support'],
    tag_style: { bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.25)', color: '#f472b6' }
  },
  {
    id: 'HS5',
    tag: 'Scheduled Pickup 🕐',
    title: 'Schedule Pickup',
    title_highlight: 'Convenient Collection Experience',
    description: 'Choose a pickup time that suits you and collect medicines quickly.',
    image_url: '/images/hero_pickup_scene.png',
    button_text: 'Schedule Pickup',
    button_link: 'pickup',
    bg_gradient: 'linear-gradient(135deg, #2c1d11 0%, #3d2208 60%, #b45309 100%)',
    features: ['Flexible Timing', 'Fast Collection', 'Easy Scheduling'],
    tag_style: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24' }
  }
];

const Carousel = ({ config }) => {
  const [slides, setSlides] = useState(INITIAL_SLIDES);
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = slides.length || 1;
  const timeoutRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const { setIsSchedulerOpen } = useReservation();
  const { showToast } = useCart();
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchSlides = async () => {
      const rawData = await cmsService.getHeroSlides();
      const data = cmsService.processCMSItems(rawData, config);
      setSlides(data);
    };
    fetchSlides();
  }, []);

  const resetTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  useEffect(() => {
    if (slides.length <= 1) return;
    resetTimeout();
    timeoutRef.current = setTimeout(
      () => setCurrentSlide((prev) => (prev + 1) % totalSlides),
      6500
    );
    return () => resetTimeout();
  }, [currentSlide, slides, totalSlides]);

  const goTo = (idx) => setCurrentSlide(idx);
  const goPrev = () => setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  const goNext = () => setCurrentSlide((prev) => (prev + 1) % totalSlides);

  const handleTouchStart = (e) => { touchStartX.current = e.changedTouches[0].screenX; };
  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].screenX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) diff > 0 ? goNext() : goPrev();
  };

  const handleCta = (action) => {
    if (action === 'schedule') {
      setIsSchedulerOpen(true);
    } else if (action === 'upload') {
      if (fileInputRef.current) fileInputRef.current.click();
    } else if (action === 'pharmacist') {
      const fab = document.querySelector('.pharm-fab-btn');
      if (fab) {
        fab.click();
      } else {
        showToast('Consult our pharmacist using the button on the bottom right!', 'OK');
      }
    } else {
      const el = document.getElementById('popular-medicines');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="carousel-section">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) showToast(`Prescription "${file.name.substring(0, 15)}..." uploaded successfully for review!`, 'OK');
        }}
      />

      <div className="carousel-container">
        {/* Track */}
        <div
          className="carousel-track"
          id="carousel-track"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ 
            width: `${totalSlides * 100}%`,
            transform: `translateX(-${currentSlide * (100 / totalSlides)}%)`,
            transition: 'transform 0.65s cubic-bezier(0.25, 1, 0.5, 1)'
          }}
        >
          {slides.map((slide) => {
            const bg = slide.bg_gradient || slide.bg;
            const image = slide.image_url || slide.image;
            const tagBg = slide.tag_style?.bg || slide.tagBg;
            const tagBorder = slide.tag_style?.border || slide.tagBorder;
            const tagColor = slide.tag_style?.color || slide.tagColor;
            const titleHighlight = slide.title_highlight || slide.titleHighlight;
            const highlightColor = slide.tag_style?.color || slide.highlightColor || '#2dd4bf';
            const btnAction = slide.button_link || slide.btnAction;
            const btnLabel = slide.button_text || slide.btnLabel;
            const btnColor = slide.tag_style?.color || slide.btnColor || '#0e5eba';
            
            // Determine type
            const type = slide.type || (btnAction === 'upload' ? 'prescription' : btnAction === 'shop' ? 'pickup' : btnAction === 'pickup' ? 'schedule' : btnAction === 'pharmacist' ? 'pharmacist' : 'genuine');
            
            // Determine subBadge
            const subBadge = slide.subBadge || (btnAction === 'upload' ? '🔒 Encrypted & Safe' : btnAction === 'shop' ? '⚡ Zero Queue Time' : btnAction === 'pharmacist' ? '💬 Free Consultations' : btnAction === 'pickup' ? '🕐 Skip The Counter' : '🔒 Encrypted & Safe');
            
            // Determine bottomBadges
            const bottomBadges = slide.bottomBadges || (type === 'genuine' ? [
              { label: 'Genuine Stock', icon: 'shield' },
              { label: 'Trusted Brands', icon: 'users' },
              { label: 'Expert Guidance', icon: 'headset' },
              { label: 'Tamper Proof', icon: 'lock' }
            ] : null);

            return (
              <div className="carousel-slide" key={slide.id} style={{ width: `${100 / totalSlides}%` }}>
                <div className="promo-card" style={{ background: bg }}>
                  {/* Large realistic background banner overlay */}
                  <div className="promo-bg-image-overlay" style={{ backgroundImage: `url(${image})` }}></div>
                  
                  {/* Subtle Floating medical elements */}
                  <div className="floating-element cross">+</div>
                  <div className="floating-element pill">💊</div>
                  <div className="floating-element heart">❤️</div>
                  <div className="floating-element stethoscope">🩺</div>
                  <div className="floating-element dna-particle">🧬</div>

                  {/* ── LEFT: Text Content ── */}
                  <div className="promo-left">
                    <span 
                      className="promo-tag" 
                      style={{ 
                        backgroundColor: tagBg, 
                        borderColor: tagBorder, 
                        color: tagColor,
                        border: '1px solid'
                      }}
                    >
                      {slide.tag}
                    </span>

                    <div className="promo-content">
                      <h2 className="promo-title">
                        {slide.title}{' '}
                        <span className="promo-title-highlight" style={{ color: highlightColor }}>
                          {titleHighlight}
                        </span>
                      </h2>
                      <p className="promo-subtitle">{slide.description}</p>
                    </div>

                    {/* Feature lists */}
                    {slide.features && (
                      <div className="promo-features-row">
                        {slide.features.map((feat, i) => (
                          <div className="promo-feature-badge" key={i}>
                            <span className="feature-check-icon">✓</span>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="promo-footer">
                      <button
                        className="promo-btn"
                        onClick={() => handleCta(btnAction)}
                        style={{ '--btn-hover-color': btnColor }}
                      >
                        {btnLabel}
                      </button>
                      <span className="promo-badge">{subBadge}</span>
                    </div>
                  </div>

                  {/* ── RIGHT: Premium Layered Visuals ── */}
                  <div className="promo-right">
                    <div className="carousel-illustration-container">
                      {/* Primary realistic scene illustration */}
                      <CMSImage 
                        src={image} 
                        fallbackSrc="/images/hero_upload_scene.png"
                        alt={slide.title} 
                        className="carousel-main-illustration" 
                      />
                      
                      {/* Slide 1 - Prescription Upload */}
                      {type === 'prescription' && (
                        <div className="visual-wrapper prescription-visual">
                          <div className="visual-shield-icon">
                            <Shield className="shield-icon" size={110} strokeWidth={1} />
                          </div>
                          <div className="visual-doc-sheet">
                            <div className="doc-check">✓</div>
                            <div className="doc-line line-1"></div>
                            <div className="doc-line line-2"></div>
                          </div>
                          <div className="visual-ai-nodes">
                            <Activity className="ai-pulse-icon" size={28} />
                          </div>
                          <div className="visual-glow-glow font-blue"></div>
                        </div>
                      )}

                      {/* Slide 2 - Reserve Pickup scene */}
                      {type === 'pickup' && (
                        <div className="visual-wrapper pickup-visual">
                          <div className="visual-phone-frame">
                            <Smartphone className="phone-icon" size={100} strokeWidth={1} />
                            <div className="phone-screen-content">
                              <ClipboardCheck className="screen-tick" size={24} />
                              <div className="screen-bar-1"></div>
                              <div className="screen-bar-2"></div>
                            </div>
                          </div>
                          <div className="visual-delivery-box">
                            <div className="box-label">SVMS Reserve</div>
                          </div>
                          <div className="visual-floating-capsule c1"></div>
                          <div className="visual-floating-capsule c2"></div>
                          <div className="visual-glow-glow"></div>
                        </div>
                      )}

                      {/* Slide 3 - Genuine Medicines */}
                      {type === 'genuine' && (
                        <div className="visual-wrapper genuine-visual">
                          <div className="visual-gold-seal">
                            <Award className="seal-icon" size={100} strokeWidth={1} />
                            <div className="seal-banner">100%</div>
                          </div>
                          <div className="visual-trust-badge">
                            <Sparkles size={18} className="spark-badge" />
                            <span>Genuine</span>
                          </div>
                          <div className="visual-floating-cross cr1">✚</div>
                          <div className="visual-floating-cross cr2">✚</div>
                          <div className="visual-glow-glow font-purple"></div>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* ── BOTTOM TRUST BAR (Genuine Slide only) ── */}
                  {bottomBadges && (
                    <div className="promo-bottom-trust-bar">
                      {bottomBadges.map((badge, idx) => (
                        <div className="promo-trust-item" key={idx}>
                          {badge.icon === 'shield' && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                          )}
                          {badge.icon === 'users' && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                          )}
                          {badge.icon === 'headset' && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
                          )}
                          {badge.icon === 'lock' && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          )}
                          <span>{badge.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>

        {/* Prev / Next arrows */}
        <button className="carousel-arrow left" onClick={goPrev} aria-label="Previous slide">
          <ChevronLeft size={14} />
        </button>
        <button className="carousel-arrow right" onClick={goNext} aria-label="Next slide">
          <ChevronRight size={14} />
        </button>

        {/* Indicators */}
        <div className="carousel-indicators" id="carousel-indicators">
          {slides.map((_, idx) => (
            <span
              key={idx}
              className={`indicator ${idx === currentSlide ? 'active' : ''}`}
              onClick={() => goTo(idx)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Carousel;
