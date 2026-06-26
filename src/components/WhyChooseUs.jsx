import React from 'react';
import { ShieldAlert, Award, FileText, Clock, Calendar, MessageSquare } from 'lucide-react';

const pillars = [
  {
    id: 1,
    title: 'Genuine Medicines',
    desc: '100% genuine prescription drugs and OTC products sourced directly from authorized brand distributors.',
    image: '/images/trust_medicines.png',
    iconColor: '#0EA5A4',
    iconBg: 'rgba(14,165,164,0.12)',
    iconBorder: 'rgba(14,165,164,0.25)',
    icon: <ShieldAlert size={18} />,
  },
  {
    id: 2,
    title: 'Expert Pharmacists',
    desc: 'Licensed registered pharmacists available on-site and via consultation to verify your dosage and safety.',
    image: '/images/trust_pharmacy.png',
    iconColor: '#00A884',
    iconBg: 'rgba(0,168,132,0.12)',
    iconBorder: 'rgba(0,168,132,0.25)',
    icon: <Award size={18} />,
  },
  {
    id: 3,
    title: 'Easy Prescription Upload',
    desc: 'Upload prescription documents in a single click on our web app or WhatsApp for immediate pharmacist check.',
    image: '/images/trust_support.png',
    iconColor: '#7c3aed',
    iconBg: 'rgba(124,58,237,0.12)',
    iconBorder: 'rgba(124,58,237,0.25)',
    icon: <FileText size={18} />,
  },
  {
    id: 4,
    title: 'Fast Pickup',
    desc: 'Skip the queues and secure your ready medicines in a quick 15-minute scheduled store collection window.',
    image: '/images/trust_delivery.png',
    iconColor: '#ea580c',
    iconBg: 'rgba(234,88,12,0.12)',
    iconBorder: 'rgba(234,88,12,0.25)',
    icon: <Clock size={18} />,
  },
  {
    id: 5,
    title: 'Trusted Since 2010',
    desc: 'A family-first neighborhood pharmacy serving Chikkadpally & Gachibowli with healthcare integrity for 16 years.',
    image: '/images/trust_payments.png',
    iconColor: '#3b82f6',
    iconBg: 'rgba(59,130,246,0.12)',
    iconBorder: 'rgba(59,130,246,0.25)',
    icon: <Calendar size={18} />,
    badge: '16 Yrs'
  },
  {
    id: 6,
    title: 'Excellent Support',
    desc: 'Get prompt support, order updates, and advice from our pharmacist hotlines and direct WhatsApp channels.',
    image: '/images/trust_support.png',
    iconColor: '#06b6d4',
    iconBg: 'rgba(6,182,212,0.12)',
    iconBorder: 'rgba(6,182,212,0.25)',
    icon: <MessageSquare size={18} />,
  },
];

const WhyChooseUs = () => (
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
            <img src={p.image} alt={p.title} className="wcu2-img" />
            {/* Gradient fade over bottom of image */}
            <div className="wcu2-img-fade" />
            {/* Floating colored icon badge */}
            <div
              className="wcu2-icon-badge"
              style={{
                color: p.iconColor,
                background: p.iconBg,
                border: `1.5px solid ${p.iconBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {p.icon}
              {p.badge && <span className="wcu2-badge-text">{p.badge}</span>}
            </div>
          </div>

          {/* Text block — bottom ~42% */}
          <div className="wcu2-body">
            <h3 className="wcu2-title">{p.title}</h3>
            <p className="wcu2-desc">{p.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default WhyChooseUs;
