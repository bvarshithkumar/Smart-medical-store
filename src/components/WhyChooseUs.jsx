import React, { useState, useEffect } from 'react';
import { cmsService } from '../services/cmsService';
import { ShieldAlert, Award, FileText, Clock, Calendar, MessageSquare, HelpCircle } from 'lucide-react';

const getIcon = (iconName, size = 18) => {
  switch (iconName) {
    case 'ShieldAlert': return <ShieldAlert size={size} />;
    case 'Award': return <Award size={size} />;
    case 'FileText': return <FileText size={size} />;
    case 'Clock': return <Clock size={size} />;
    case 'Calendar': return <Calendar size={size} />;
    case 'MessageSquare': return <MessageSquare size={size} />;
    default: return <HelpCircle size={size} />;
  }
};

const WhyChooseUs = () => {
  const [pillars, setPillars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPillars = async () => {
      try {
        const data = await cmsService.getWhyChooseUs();
        setPillars(data || []);
      } catch (err) {
        console.error('[WhyChooseUs] Error fetching dynamic pillars:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPillars();
  }, []);

  if (loading) {
    return (
      <section className="wcu2-section reveal-slide-up" id="why-choose-us" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3.5px solid rgba(20, 184, 166, 0.1)', borderTop: '3.5px solid var(--teal-accent, #00A884)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </section>
    );
  }

  if (pillars.length === 0) return null;

  return (
    <section className="wcu2-section reveal-slide-up" id="why-choose-us">
      <div className="section-header-premium">
        <span className="section-badge-pill">OUR COMMITMENT</span>
        <h2 className="section-main-title">Why Choose <span>Sri Venkateshwara Medical Store?</span></h2>
        <p className="section-desc-lbl">Why thousands of families trust us with their prescriptions and daily healthcare.</p>
      </div>

      <div className="wcu2-grid reveal-cascade">
        {pillars.map((p) => (
          <div key={p.id} className="wcu2-card">
            {/* Image block — top ~58% */}
            <div className="wcu2-img-wrap">
              <img src={p.image_url || p.image} alt={p.title} className="wcu2-img" />
              {/* Gradient fade over bottom of image */}
              <div className="wcu2-img-fade" />
              {/* Floating colored icon badge */}
              <div
                className="wcu2-icon-badge"
                style={{
                  color: p.icon_color || '#14b8a6',
                  background: p.icon_bg || 'rgba(20,184,166,0.12)',
                  border: `1.5px solid ${p.icon_border || 'rgba(20,184,166,0.25)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {getIcon(p.icon_name)}
                {p.badge_text && <span className="wcu2-badge-text">{p.badge_text}</span>}
              </div>
            </div>

            {/* Text block — bottom ~42% */}
            <div className="wcu2-body">
              <h3 className="wcu2-title">{p.title}</h3>
              <p className="wcu2-desc">{p.description || p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WhyChooseUs;
