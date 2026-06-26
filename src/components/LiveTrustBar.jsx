import React, { useEffect, useState, useRef } from 'react';
import { Award, ShieldCheck, UserCheck, CreditCard, Clock } from 'lucide-react';

function useCountUp(target, duration = 1500, active = false) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;

    const startTime = performance.now();
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setCount(Math.floor(target * eased));
      
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setCount(target);
      }
    };
    requestAnimationFrame(tick);
  }, [target, duration, active]);

  return count;
}

const TrustItem = ({ icon: Icon, targetNum, suffix, title, subtitle, animate = true, delay = 0 }) => {
  const [active, setActive] = useState(false);
  const ref = useRef(null);
  const val = useCountUp(targetNum || 0, 1500, active);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTimeout(() => setActive(true), delay);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div className="live-trust-item" ref={ref}>
      <div className="live-trust-icon-box">
        <Icon size={20} className="live-trust-icon" />
      </div>
      <div className="live-trust-content">
        <div className="live-trust-heading">
          {animate && targetNum ? (
            <span className="live-trust-num">{val}{suffix}</span>
          ) : (
            <span className="live-trust-text">{title}</span>
          )}
        </div>
        <div className="live-trust-sub">{subtitle}</div>
      </div>
    </div>
  );
};

const LiveTrustBar = () => {
  return (
    <div className="live-trust-bar-wrapper">
      <div className="live-trust-container">
        <TrustItem 
          icon={Award}
          title="Govt. Licensed"
          subtitle="Drug License No: HYD-23456-A"
          animate={false}
        />
        <TrustItem 
          icon={ShieldCheck}
          targetNum={100}
          suffix="%"
          subtitle="Genuine Sourced"
          delay={100}
        />
        <TrustItem 
          icon={UserCheck}
          targetNum={5}
          suffix="+"
          subtitle="Pharmacists On Duty"
          delay={200}
        />
        <TrustItem 
          icon={CreditCard}
          targetNum={100}
          suffix="%"
          subtitle="Secure UPI & Cards"
          delay={300}
        />
        <TrustItem 
          icon={Clock}
          targetNum={15}
          suffix=" Min"
          subtitle="Ready for Pickup"
          delay={400}
        />
      </div>
    </div>
  );
};

export default LiveTrustBar;
