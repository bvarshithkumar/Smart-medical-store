import React, { useState } from 'react';
import { ShieldCheck, Award, Heart, Sparkles, BookOpen } from 'lucide-react';

const timelineEvents = [
  {
    year: '2010',
    title: 'Store Founded',
    desc: 'Began operations as a neighborhood medical store in Chikkadpally, Hyderabad, built on direct manufacturer partnerships and family-first care.'
  },
  {
    year: '2016',
    title: 'Government Compliance Recognition',
    desc: 'Granted full Form 20B/21B drug license credentials, expanding our service capacity to handle advanced chronic medications.'
  },
  {
    year: '2021',
    title: 'Gachibowli Expansion',
    desc: 'Opened our flagship location in the IT corridor to serve the Gachibowli healthcare sector with on-duty consulting pharmacists.'
  },
  {
    year: '2026',
    title: 'Digital Reservation Platform',
    desc: 'Launched our modern web app with prescription reviews, PWA support, and scheduled pickup lockers for checkout optimization.'
  }
];

const AboutUs = () => {
  const [selectedTimeline, setSelectedTimeline] = useState(3);

  return (
    <section className="about-us-section reveal-slide-up" id="about-us">
      <div className="section-header-premium centered">
        <span className="section-badge-pill">OUR JOURNEY</span>
        <h2 className="section-main-title">Trusted Since <span>2010</span></h2>
        <p className="section-desc-lbl">Delivering healthcare excellence and genuine medicines to our community.</p>
      </div>

      <div className="about-us-grid">
        {/* Left: Story and Mission */}
        <div className="about-story-pane">
          <div className="about-subtitle">
            <BookOpen size={16} className="subtitle-icon" />
            <span>Our Commitment to Your Health</span>
          </div>
          <h3 className="about-story-title">
            Providing Genuine Healthcare Sourcing For Over 16 Years
          </h3>
          <p className="about-story-desc">
            Sri Venkateshwara Medical Store has been a cornerstone of trust in Hyderabad. Our mission is to bridge the gap between quality medicine sourcing and fast customer pick-ups. Every medicine on our shelves is 100% genuine, procured directly from certified distributors.
          </p>

          <div className="about-values-grid">
            <div className="value-card">
              <div className="value-icon-box check-teal">
                <ShieldCheck size={18} />
              </div>
              <div className="value-info">
                <h4>100% Genuine Guarantee</h4>
                <p>No intermediaries. Sourced directly from manufacturers for zero duplicates.</p>
              </div>
            </div>

            <div className="value-card">
              <div className="value-icon-box check-blue">
                <Award size={18} />
              </div>
              <div className="value-info">
                <h4>Licensed Pharmacists</h4>
                <p>Available on-counter and on-consultation to verify and explain your dosage.</p>
              </div>
            </div>

            <div className="value-card">
              <div className="value-icon-box check-purple">
                <Heart size={18} />
              </div>
              <div className="value-info">
                <h4>Community First</h4>
                <p>Trusted by thousands of families across Chikkadpally & Gachibowli areas.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Milestone Timeline */}
        <div className="about-timeline-pane">
          <div className="timeline-interactive-header">
            <Sparkles size={14} className="timeline-spark" />
            <span>Click Milestones to Inspect Details</span>
          </div>

          <div className="timeline-stepper">
            <div className="timeline-progress-line-track">
              <div 
                className="timeline-progress-line-fill" 
                style={{ height: `${(selectedTimeline / (timelineEvents.length - 1)) * 100}%` }}
              />
            </div>

            {timelineEvents.map((event, idx) => {
              const isActive = idx === selectedTimeline;
              const isPassed = idx < selectedTimeline;
              return (
                <div 
                  key={event.year} 
                  className={`timeline-step-item ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}
                  onClick={() => setSelectedTimeline(idx)}
                >
                  <div className="timeline-step-indicator">
                    <span className="timeline-indicator-dot" />
                  </div>
                  <div className="timeline-step-preview">
                    <span className="timeline-step-year">{event.year}</span>
                    <span className="timeline-step-name">{event.title}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="timeline-details-card">
            <div className="timeline-card-header">
              <span className="timeline-card-badge">{timelineEvents[selectedTimeline].year} Milestone</span>
              <h4>{timelineEvents[selectedTimeline].title}</h4>
            </div>
            <p>{timelineEvents[selectedTimeline].desc}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
