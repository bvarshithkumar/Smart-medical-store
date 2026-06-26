import React from 'react';
import { FileText, ClipboardCheck, ShieldCheck, Bell, Calendar, Store } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      step: '01',
      title: 'Upload Prescription',
      desc: 'Upload your prescription securely. Our registered pharmacists will review it.',
      icon: FileText,
      color: '#0e5eba'
    },
    {
      step: '02',
      title: 'Licensed Pharmacist Review',
      desc: 'Registered staff verifies dosage, checks for interactions, and validates details.',
      icon: ClipboardCheck,
      color: '#0ea5a4'
    },
    {
      step: '03',
      title: 'Medicine Availability Check',
      desc: 'Real-time check to ensure all items are in stock at our Bagh Lingampally store.',
      icon: ShieldCheck,
      color: '#0ea5a4'
    },
    {
      step: '04',
      title: 'User Notification',
      desc: 'Receive an instant SMS/WhatsApp alert with a summary once prepared.',
      icon: Bell,
      color: '#fbbf24'
    },
    {
      step: '05',
      title: 'Schedule Pickup Slot',
      desc: 'Choose a convenient date and time to collect your prepared medicine bundle.',
      icon: Calendar,
      color: '#db2777'
    },
    {
      step: '06',
      title: 'Collect Medicines From Store',
      desc: 'Walk in, verify order ID, pay securely, and collect without waiting in queues.',
      icon: Store,
      color: '#22c55e'
    }
  ];

  return (
    <section className="hiw-section reveal-slide-up" id="how-it-works">
      <div className="hiw-bg-glow hiw-glow-left" />
      <div className="hiw-bg-glow hiw-glow-right" />
      
      <div className="hiw-wrapper">
        <div className="section-header-premium">
          <span className="section-badge-pill">WORKFLOW</span>
          <h2 className="section-main-title">Scheduled <span>Pickup Workflow</span></h2>
          <p className="section-desc-lbl">Follow our transparent, step-by-step pharmacy verification process designed for speed, safety, and convenience.</p>
        </div>

        <div className="workflow-timeline-container">
          {steps.map((stepItem, idx) => {
            const Icon = stepItem.icon;
            return (
              <div className="workflow-timeline-step" key={idx}>
                {/* Connector line (desktop only) */}
                {idx < steps.length - 1 && (
                  <div className="workflow-line" />
                )}
                
                {/* Timeline node */}
                <div className="workflow-node-wrapper">
                  <div className="workflow-node-circle" style={{ borderColor: stepItem.color }}>
                    <div className="workflow-node-badge" style={{ backgroundColor: stepItem.color }}>
                      {stepItem.step}
                    </div>
                    <Icon size={24} style={{ color: stepItem.color }} />
                  </div>
                </div>

                {/* Timeline content */}
                <div className="workflow-content-card">
                  <h3 className="workflow-step-title">{stepItem.title}</h3>
                  <p className="workflow-step-desc">{stepItem.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
