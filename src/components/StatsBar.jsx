import React, { useEffect, useRef, useState } from 'react';
import { Users, Star, ShieldCheck, Clock, Award } from 'lucide-react';

// Count-up Hook
function useCountUp(target, duration = 1800, isFloat = false, active = false, onComplete) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;

    const startTime = performance.now();
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing function: cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(isFloat ? +(target * eased).toFixed(1) : Math.floor(target * eased));
      
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setCount(target);
        if (onComplete) onComplete();
      }
    };
    requestAnimationFrame(tick);
  }, [target, duration, isFloat, active, onComplete]);

  return count;
}

// Single Stat Component
const StatItem = ({ value, suffix, label, isFloat, isText, index, active, Icon }) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const count = useCountUp(
    isText ? 0 : value,
    1800,
    isFloat,
    active,
    () => setIsCompleted(true)
  );

  useEffect(() => {
    if (isText && active) {
      const timer = setTimeout(() => {
        setIsCompleted(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isText, active]);

  // Format comma for 15,000
  const displayValue = isText
    ? value
    : count >= 1000
    ? count.toLocaleString()
    : isFloat
    ? count.toFixed(1)
    : count;

  return (
    <div 
      className={`stat-item ${isText ? 'is-text-item' : ''} ${active ? 'active' : ''}`}
      style={{
        transitionDelay: `${index * 0.1}s`
      }}
    >
      <div className="stat-icon-wrapper">
        <Icon className="stat-icon" size={24} />
      </div>
      <div className="stat-number">
        <div className={`stat-val-container ${isCompleted ? 'animate-glow' : ''}`}>
          <span className="stat-val">{displayValue}</span>
          {suffix && <span className="stat-suf" style={{ fontSize: '0.85em', marginLeft: '2px', fontWeight: 700 }}>{suffix}</span>}
        </div>
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
};

const StatsBar = () => {
  const [active, setActive] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stats = [
    { value: 100, suffix: '%', label: 'Satisfaction Rate', isFloat: false, isText: false, icon: Users },
    { value: 5, suffix: '★', label: 'Quality Rating', isFloat: false, isText: false, icon: Star },
    { value: 100, suffix: '%', label: 'Genuine Medicines', isFloat: false, isText: false, icon: ShieldCheck },
    { value: 15, suffix: 'Min', label: 'Review Time', isFloat: false, isText: false, icon: Clock },
    { value: 'Licensed', suffix: '', label: 'Pharmacists', isFloat: false, isText: true, icon: Award }
  ];

  return (
    <div className="stats-bar-wrapper" ref={containerRef}>
      <div className="stats-bar-card">
        {stats.map((stat, idx) => (
          <StatItem 
            key={idx} 
            value={stat.value} 
            suffix={stat.suffix} 
            label={stat.label} 
            isFloat={stat.isFloat} 
            isText={stat.isText}
            index={idx}
            active={active}
            Icon={stat.icon}
          />
        ))}
      </div>
    </div>
  );
};

export default StatsBar;
