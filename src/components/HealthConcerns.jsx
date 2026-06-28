import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { cmsService } from '../services/cmsService';
import { Droplet, Heart, Zap, Activity, Shield, Sparkles, HelpCircle } from 'lucide-react';

const getIcon = (iconName, size = 18) => {
  switch (iconName) {
    case 'Droplet': return <Droplet size={size} />;
    case 'Heart': return <Heart size={size} />;
    case 'Zap': return <Zap size={size} />;
    case 'Activity': return <Activity size={size} />;
    case 'Shield': return <Shield size={size} />;
    case 'Sparkles': return <Sparkles size={size} />;
    default: return <HelpCircle size={size} />;
  }
};

const HealthConcerns = () => {
  const { showToast } = useCart();
  const [concerns, setConcerns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConcerns = async () => {
      try {
        const data = await cmsService.getHealthConcerns();
        setConcerns(data || []);
      } catch (err) {
        console.error('[HealthConcerns] Error fetching dynamic concerns:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConcerns();
  }, []);

  const handleClick = (name) => {
    showToast(`Browsing: ${name}`, 'Close');
  };

  if (loading) {
    return (
      <section className="hc-section reveal-slide-up" id="concerns" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3.5px solid rgba(20, 184, 166, 0.1)', borderTop: '3.5px solid var(--teal-accent, #00A884)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </section>
    );
  }

  if (concerns.length === 0) return null;

  return (
    <section className="hc-section reveal-slide-up" id="concerns">
      <div className="section-header-premium">
        <span className="section-badge-pill">HEALTH CONCERNS</span>
        <h2 className="section-main-title">Shop by <span>Health Concern</span></h2>
        <p className="section-desc-lbl">Find chronic medicines and daily health products tailored to your needs.</p>
      </div>

      <div className="hc-cards-row reveal-cascade">
        {concerns.map((concern) => (
          <div
            key={concern.id}
            className="hc-card"
            onClick={() => handleClick(concern.name)}
            role="button"
            tabIndex={0}
          >
            {/* Top 65%: image */}
            <div className="hc-card-img-wrap">
              <img
                src={concern.image_url || concern.image}
                alt={concern.name}
                className="hc-card-img"
              />
              {/* Floating icon badge at the bottom edge of image */}
              <div
                className="hc-icon-badge"
                style={{ 
                  color: concern.icon_color || '#14b8a6', 
                  background: concern.icon_bg || 'rgba(20,184,166,0.12)', 
                  border: `1.5px solid ${concern.icon_color || '#14b8a6'}30` 
                }}
              >
                {getIcon(concern.icon_name)}
              </div>
            </div>

            {/* Bottom 35%: text content */}
            <div className="hc-card-body">
              <h4 className="hc-card-name">{concern.name}</h4>
              <p className="hc-card-desc">{concern.description || concern.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HealthConcerns;
