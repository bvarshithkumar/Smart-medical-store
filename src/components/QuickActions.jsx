import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useOfflineContext } from '../context/OfflineContext';
import { ONLINE_REQUIRED_FEATURES } from '../hooks/useOffline';
import { cmsService } from '../services/cmsService';
import CMSImage from './CMSImage';

const INITIAL_ACTIONS = [
  {
    id: 'QA1',
    title: 'Schedule Pickup',
    description: 'Ready at Gachibowli store',
    badge: 'Fast Pickup',
    image_url: '/images/action_pickup.png',
    button_link: '/pickup',
  },
  {
    id: 'QA2',
    title: 'Upload Prescription',
    description: 'Pharmacist verified in mins',
    badge: 'Instant Review',
    image_url: '/images/action_upload.png',
    button_link: 'upload',
  },
  {
    id: 'QA3',
    title: 'Repeat Order',
    description: 'Reorder chronic medicines',
    badge: 'Easy Reorder',
    image_url: '/images/action_repeat.png',
    button_link: 'repeat',
  },
  {
    id: 'QA4',
    title: 'Talk to Pharmacist',
    description: 'Free healthcare assistance',
    badge: 'Consult Free',
    image_url: '/images/action_pharmacist.png',
    button_link: 'pharmacist',
  },
];

const QuickActions = ({ config }) => {
  const [actions, setActions] = useState(INITIAL_ACTIONS);
  const { addItem, showToast, getCartCount } = useCart();
  const { requireOnline } = useOfflineContext();
  const navigate = useNavigate();
  const [isPharmacistModalOpen, setIsPharmacistModalOpen] = useState(false);

  const [imageFallbacks, setImageFallbacks] = useState({});

  useEffect(() => {
    const fetchActions = async () => {
      const rawData = await cmsService.getQuickActions();
      const data = cmsService.processCMSItems(rawData, config);
      setActions(data);

      // Preload images to check for loading errors and set fallbacks
      data.forEach(action => {
        const imgUrl = action.image_url || action.image;
        if (imgUrl) {
          const img = new Image();
          img.src = imgUrl;
          img.onerror = () => {
            let fallback = '/images/action_pickup.png';
            if (action.id === 'QA2' || (action.title && action.title.toLowerCase().includes('upload'))) {
              fallback = '/images/action_upload.png';
            } else if (action.id === 'QA3' || (action.title && action.title.toLowerCase().includes('repeat'))) {
              fallback = '/images/action_repeat.png';
            } else if (action.id === 'QA4' || (action.title && action.title.toLowerCase().includes('pharmacist'))) {
              fallback = '/images/action_pharmacist.png';
            }
            setImageFallbacks(prev => ({
              ...prev,
              [action.id]: fallback
            }));
          };
        }
      });
    };
    fetchActions();
  }, []);

  const handlePickupClick = () => {
    if (!requireOnline(ONLINE_REQUIRED_FEATURES.SCHEDULE_PICKUP)) return;
    navigate('/pickup');
  };

  const handleUploadClick = () => {
    const element = document.getElementById('upload-rx');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/', { state: { scrollTo: 'upload-rx' } });
    }
  };

  const handleRepeatClick = () => {
    if (!requireOnline(ONLINE_REQUIRED_FEATURES.REPEAT_ORDER)) return;
    showToast('Repeat last order of Zincovit Tablets?', 'Reorder', () => {
      addItem('c00cc000-0000-4000-a000-000000000002', 1, 'Zincovit Multivitamins');
      showToast('Zincovit Multivitamins added to reservation!', 'View Cart', () => navigate('/cart'));
    });
  };

  const handlePharmacistClick = () => {
    const event = new CustomEvent('open-pharmacist-chat');
    window.dispatchEvent(event);
  };

  const handleWhatsAppCta = () => {
    if (!requireOnline(ONLINE_REQUIRED_FEATURES.WHATSAPP_PHARMACIST)) return;
    setIsPharmacistModalOpen(false);
    const msg = encodeURIComponent('Hello Sri Venkateshwara Medical Store, I have a medicine-related query.');
    window.open(`https://wa.me/919989148660?text=${msg}`, '_blank');
  };

  const handleUploadCta = () => {
    setIsPharmacistModalOpen(false);
    handleUploadClick();
  };

  const executeAction = (action) => {
    const link = (action.button_link || '').toLowerCase();
    const title = (action.title || '').toLowerCase();
    const id = (action.id || '').toLowerCase();
    
    if (link.includes('pickup') || title.includes('pickup') || id.includes('pickup') || id.includes('QA1')) {
      handlePickupClick();
    } else if (link.includes('upload') || title.includes('upload') || id.includes('upload') || id.includes('QA2')) {
      handleUploadClick();
    } else if (link.includes('repeat') || title.includes('repeat') || id.includes('repeat') || id.includes('QA3')) {
      handleRepeatClick();
    } else if (link.includes('pharmacist') || title.includes('pharmacist') || id.includes('pharmacist') || id.includes('QA4')) {
      handlePharmacistClick();
    } else if (action.button_link) {
      navigate(action.button_link);
    }
  };

  const getGridClasses = () => {
    const classes = ['quick-grid', 'reveal-cascade'];
    if (config?.layout_type === 'grid') {
      classes.push('cms-layout-grid');
    }
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
    return classes.join(' ');
  };

  return (
    <section className="quick-actions-section">

      <div className={getGridClasses()}>
        {actions.map((action) => {
          const img = imageFallbacks[action.id] || action.image_url || action.image;
          const descText = action.description || action.desc;
          return (
            <div
              key={action.id}
              className="action-card"
              id={action.id}
              onClick={() => executeAction(action)}
              style={{
                '--card-bg-image': `url(${img})`,
                cursor: 'pointer',
              }}
            >
              {action.badge && (
                <span className="action-badge-floating">{action.badge}</span>
              )}
              
              <div className="action-card-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" width="12" height="12">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>

              <div className="action-glass-panel">
                <h4 className="action-title">{action.title}</h4>
                <p className="action-desc">{descText}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Talk to Pharmacist Modal Overlay */}
      {isPharmacistModalOpen && (
        <div className="pharmacist-modal-overlay" onClick={() => setIsPharmacistModalOpen(false)}>
          <div className="pharmacist-contact-modal" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button className="modal-close-btn" onClick={() => setIsPharmacistModalOpen(false)} aria-label="Close modal">
              &times;
            </button>
            
            <div className="pharmacist-modal-header">
              <div className="pharmacist-avatar-ring">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <polyline points="22 9 18 13 15 10" />
                </svg>
              </div>
              <h3 className="modal-title">Consult a Pharmacist</h3>
              <p className="modal-subtitle">Get professional medicine guidance and verification from our registered staff.</p>
            </div>

            <div className="pharmacist-options-container">
              {/* Option 1: Call Pharmacist */}
              <div className="pharmacist-option-card">
                <div className="option-icon-box call-bg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div className="option-info">
                  <h4 className="option-title">Call Pharmacist</h4>
                  <p className="option-desc">Speak directly with our registered pharmacist.</p>
                </div>
                <a href="tel:+919989148660" className="option-action-btn call-btn-accent">
                  Call Now
                </a>
              </div>

              {/* Option 2: WhatsApp Pharmacist */}
              <div className="pharmacist-option-card">
                <div className="option-icon-box whatsapp-bg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </div>
                <div className="option-info">
                  <h4 className="option-title">WhatsApp Pharmacist</h4>
                  <p className="option-desc">Get quick medicine guidance through WhatsApp.</p>
                </div>
                <button onClick={handleWhatsAppCta} className="option-action-btn whatsapp-btn-accent">
                  Chat on WhatsApp
                </button>
              </div>

              {/* Option 3: Upload Prescription */}
              <div className="pharmacist-option-card">
                <div className="option-icon-box rx-bg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div className="option-info">
                  <h4 className="option-title">Upload Prescription</h4>
                  <p className="option-desc">Upload your prescription and our pharmacist will review it.</p>
                </div>
                <button onClick={handleUploadCta} className="option-action-btn rx-btn-accent">
                  Upload Prescription
                </button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="pharmacist-trust-badges">
              <div className="trust-badge-item">
                <span className="check-mark">✓</span>
                <span>Registered Pharmacist Available</span>
              </div>
              <div className="trust-badge-item">
                <span className="check-mark">✓</span>
                <span>Prescription Verification Support</span>
              </div>
              <div className="trust-badge-item">
                <span className="check-mark">✓</span>
                <span>Medicine Guidance Assistance</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default QuickActions;
