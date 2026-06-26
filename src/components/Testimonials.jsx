import React, { useRef, useState, useEffect } from 'react';
import TrustStats from './TrustStats';

const StarIcon = () => (
  <svg className="tst-star" viewBox="0 0 24 24" fill="#facc15" width="16" height="16">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const CheckIcon = () => (
  <svg className="tst-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="10" height="10">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

import { cmsService } from '../services/cmsService';
import CMSImage from './CMSImage';

const INITIAL_TESTIMONIALS = [
  {
    id: 'T1',
    name: 'Rajesh Kumar',
    rating: 5,
    comment: 'Uploading prescriptions was so easy. The Gachibowli store pharmacist verified it in 10 minutes, and I picked it up on my way home without waiting in queue!',
    role: 'Verified Patient',
    location: 'Gachibowli',
    category: 'Prescription Order',
    image_url: '/images/customer_1.png'
  },
  {
    id: 'T2',
    name: 'Priya Sharma',
    rating: 5,
    comment: 'I regularly order wellness and diabetes care products for my parents. SVMS is always fully stocked and their prices are very fair. The staff is extremely knowledgeable!',
    role: 'Regular Customer',
    location: 'Kondapur',
    category: 'Wellness Reservation',
    image_url: '/images/customer_2.png'
  },
  {
    id: 'T3',
    name: 'Vikram Aditya',
    rating: 5,
    comment: 'The online reservation system is outstanding. I reserved a pulse oximeter and nebulizer; they were packed and ready when I walked in. Exceptional store experience.',
    role: 'Tech Professional',
    location: 'Hitec City',
    category: 'Health Devices',
    image_url: '/images/customer_3.png'
  }
];

const Testimonials = ({ config }) => {
  const [reviews, setReviews] = useState(INITIAL_TESTIMONIALS);

  const trackRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchReviews = async () => {
      const rawData = await cmsService.getTestimonials();
      const data = cmsService.processCMSItems(rawData, config);
      setReviews(data);
    };
    fetchReviews();
  }, []);

  const handleScroll = () => {
    if (trackRef.current) {
      const width = trackRef.current.offsetWidth;
      const scrollLeft = trackRef.current.scrollLeft;
      const index = Math.round(scrollLeft / width);
      setActiveIndex(index);
    }
  };

  useEffect(() => {
    const el = trackRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (el) el.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const slideTo = (index) => {
    if (trackRef.current) {
      const width = trackRef.current.offsetWidth;
      trackRef.current.scrollTo({
        left: width * index,
        behavior: 'smooth'
      });
      setActiveIndex(index);
    }
  };

  const next = () => {
    const nextIdx = (activeIndex + 1) % reviews.length;
    slideTo(nextIdx);
  };

  const prev = () => {
    const prevIdx = (activeIndex - 1 + reviews.length) % reviews.length;
    slideTo(prevIdx);
  };

  const isCarousel = !config?.layout_type || config.layout_type === 'carousel';

  const getTrackClasses = () => {
    const classes = ['tst-track'];
    if (config?.layout_type === 'grid') {
      classes.push('cms-layout-grid');
      if (config?.desktop_layout && config.desktop_layout.includes('column')) {
        classes.push(`cms-desktop-cols-${config.desktop_layout.split(' ')[0]}`);
      }
      if (config?.mobile_layout) {
        if (config.mobile_layout.includes('card')) {
          classes.push(`cms-mobile-cols-${config.mobile_layout.split(' ')[0]}`);
        } else if (config.mobile_layout === 'horizontal scroll') {
          classes.push('cms-mobile-scroll');
        }
      }
    }
    return classes.join(' ');
  };

  return (
    <section className="testimonials-section reveal-slide-up" id="testimonials">
      <div className="tst-bg-glow" />
      
      <div className="tst-wrapper">
        <div className="section-header-premium centered">
          <span className="section-badge-pill">TESTIMONIALS</span>
          <h2 className="section-main-title">What Our <span>Customers Say</span></h2>
          <p className="section-desc-lbl">Trusted by thousands of happy customers.</p>
        </div>

        {/* 1. Trust Statistics Bar (Placed Above Testimonials) */}
        <TrustStats />

        {/* 2. Carousel Slider View */}
        {reviews.length > 0 ? (
          <div className="tst-carousel-container">
            {/* Arrow Left */}
            {isCarousel && (
              <button className="tst-nav-btn tst-nav-left" onClick={prev} aria-label="Previous testimonial">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
            )}

            {/* Slider Track */}
            <div className={getTrackClasses()} ref={trackRef}>
              {reviews.map((rev) => (
                <div key={rev.id} className="tst-card-wrap">
                  <div className="tst-card-premium">
                    
                    {/* Elegant quotation icon decoration */}
                    <div className="tst-quote-icon-decor" aria-hidden="true">“</div>

                    <div className="tst-card-header">
                      <div className="tst-avatar-area">
                        <CMSImage 
                          src={rev.image_url || rev.photo} 
                          fallbackSrc="/images/customer_1.png"
                          alt={rev.name} 
                          className="tst-avatar-photo" 
                        />
                        <div className="tst-verified-badge">
                          <CheckIcon />
                        </div>
                      </div>
                      <div className="tst-user-details">
                        <h4 className="tst-user-name">{rev.name}</h4>
                        <div className="tst-user-role-wrap">
                          <span className="tst-user-role">{rev.role}</span>
                          <span className="tst-role-check-dot">✓</span>
                        </div>
                        <div className="tst-user-meta-info" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                          <span className="tst-user-location" style={{ fontSize: '11px', color: 'var(--text-light)', display: 'inline-flex', alignItems: 'center' }}>
                            📍 {rev.location}
                          </span>
                          <span className="tst-user-category" style={{ fontSize: '10px', color: 'var(--primary-color)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>
                            {rev.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="tst-stars-pack">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <StarIcon key={i} />
                      ))}
                    </div>
                    
                    <p className="tst-comment-text">"{rev.comment}"</p>

                  </div>
                </div>
              ))}
            </div>

            {/* Arrow Right */}
            {isCarousel && (
              <button className="tst-nav-btn tst-nav-right" onClick={next} aria-label="Next testimonial">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed var(--border-color, #cbd5e1)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', margin: '20px auto', width: '100%', maxWidth: '100%' }}>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>Customer reviews will appear here.</p>
          </div>
        )}

        {/* Carousel Slide Dots */}
        {isCarousel && (
          <div className="tst-dots-container">
            {reviews.map((_, idx) => (
              <button
                key={idx}
                className={`tst-dot-btn ${idx === activeIndex ? 'active' : ''}`}
                onClick={() => slideTo(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Testimonials;
