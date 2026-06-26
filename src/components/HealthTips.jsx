import React, { useState, useEffect } from 'react';
import { cmsService } from '../services/cmsService';
import CMSImage from './CMSImage';

const HealthTips = ({ config }) => {
  const [tips, setTips] = useState([]);

  useEffect(() => {
    const fetchTips = async () => {
      const rawData = await cmsService.getTips();
      const data = cmsService.processCMSItems(rawData, config);
      setTips(data);
    };
    fetchTips();
  }, []);

  const formatTitle = (title) => {
    if (!title) return '';
    const words = title.split(' ');
    if (words.length <= 1) return title;
    const lastWord = words.pop();
    return <>{words.join(' ')} <span>{lastWord}</span></>;
  };

  const getGridClasses = () => {
    const classes = ['health-tips-grid', 'reveal-cascade'];
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
    <section className="health-tips-section reveal-slide-up" id="health-tips">
      <div className="section-header-premium">
        <span className="section-badge-pill">{config?.section_name || 'HEALTH BLOG'}</span>
        <h2 className="section-main-title">
          {config?.section_title ? (
            formatTitle(config.section_title)
          ) : (
            <>Health Tips from <span>Our Pharmacists</span></>
          )}
        </h2>
        <p className="section-desc-lbl">
          {config?.section_subtitle || 'Simple habits that keep you and your family healthier every day.'}
        </p>
      </div>
      {tips.length > 0 ? (
        <div className={getGridClasses()}>
          {tips.map((tip) => (
            <div key={tip.id} className="health-tip-card-blog" style={{ background: tip.bg_color || tip.bg }}>
              {/* Card Image Cover with tag overlay */}
              <div className="tip-card-img-wrap">
                <CMSImage 
                  src={tip.image_url || tip.image} 
                  fallbackSrc="/images/cat_wellness.png"
                  alt={tip.alt_text || tip.title} 
                  className="tip-card-img" 
                />
                <span className="tip-card-tag-overlay" style={{ backgroundColor: tip.tag_color || tip.color }}>
                  {tip.tag}
                </span>
              </div>
              
              <div className="tip-card-body">
                <h4 className="tip-card-title">{tip.title}</h4>
                <p className="tip-card-desc">{tip.description || tip.desc}</p>
                
                <div className="tip-card-footer">
                  <span 
                    className="tip-read-more" 
                    style={{ color: tip.tag_color || tip.color, cursor: tip.button_link ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (tip.button_link && tip.button_link !== '/') {
                        window.location.href = tip.button_link;
                      }
                    }}
                  >
                    {tip.button_text || 'Read Guide'}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="tip-arrow-icon">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed var(--border-color, #cbd5e1)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', margin: '20px 0', width: '100%' }}>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>No health tips available yet.</p>
          <p style={{ fontSize: '13px', color: 'var(--text-light, #94a3b8)', marginTop: '4px' }}>Health tips and articles will appear here.</p>
        </div>
      )}
    </section>
  );
};

export default HealthTips;
