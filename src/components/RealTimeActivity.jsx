import React, { useEffect, useState } from 'react';
import { X, CheckCircle, Flame } from 'lucide-react';

const mockActivities = [];

const RealTimeActivity = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed || mockActivities.length === 0) return;

    // Show first activity after 4 seconds
    const initialTimer = setTimeout(() => {
      setVisible(true);
    }, 4000);

    // Hide after 7 seconds
    let hideTimer;
    if (visible) {
      hideTimer = setTimeout(() => {
        setVisible(false);
      }, 7000);
    }

    // Interval to cycle every 25 seconds
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % mockActivities.length);
        setVisible(true);
      }, 500); // short delay to allow transition out
    }, 25000);

    return () => {
      clearTimeout(initialTimer);
      if (hideTimer) clearTimeout(hideTimer);
      clearInterval(interval);
    };
  }, [visible, dismissed]);

  if (dismissed || mockActivities.length === 0) return null;

  const activity = mockActivities[currentIndex];

  return (
    <div className={`activity-widget-float ${visible ? 'show' : ''}`}>
      <div className="activity-widget-body">
        <div className="activity-widget-indicator">
          {activity.type === 'verify' ? (
            <CheckCircle size={15} style={{ color: 'var(--accent-green)' }} />
          ) : (
            <Flame size={15} style={{ color: 'var(--primary-color)' }} />
          )}
        </div>
        <p className="activity-widget-text">{activity.text}</p>
        <button 
          className="activity-widget-close" 
          onClick={() => {
            setVisible(false);
            setDismissed(true);
          }}
          aria-label="Dismiss activity notification"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};

export default RealTimeActivity;
