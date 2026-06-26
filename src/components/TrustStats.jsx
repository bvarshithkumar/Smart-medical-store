import React, { useEffect, useRef, useState } from 'react';

const statsData = [
  {
    id: 'customers',
    value: 15000,
    suffix: '+',
    label: 'Customers Served',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'orders',
    value: 50000,
    suffix: '+',
    label: 'Orders Completed',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    id: 'rating',
    value: 4.9,
    suffix: '',
    label: 'Average Rating',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    id: 'satisfaction',
    value: 99,
    suffix: '%',
    label: 'Satisfaction',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 11 11 13 15 9" />
      </svg>
    ),
  },
];

function useCountUp(target, duration = 1400, isFloat = false) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();
          const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(isFloat ? +(target * eased).toFixed(1) : Math.floor(target * eased));
            if (progress < 1) requestAnimationFrame(tick);
            else setCount(target);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, isFloat]);

  return { count, ref };
}

function StatCard({ stat }) {
  const isFloat = stat.id === 'rating';
  const { count, ref } = useCountUp(stat.value, 1500, isFloat);

  const displayValue = stat.id === 'orders'
    ? count >= 1000 ? `${(count / 1000).toFixed(0)},000` : count
    : stat.id === 'customers'
    ? count >= 1000 ? `${(count / 1000).toFixed(0)},000` : count
    : isFloat
    ? count.toFixed(1)
    : count;

  return (
    <div ref={ref} className="tst-stat-card">
      <div className="tst-stat-icon-wrapper">
        {stat.icon}
      </div>
      <div className="tst-stat-info">
        <div className="tst-stat-number">
          <span className="tst-stat-val">{displayValue}</span>
          <span className="tst-stat-suf">{stat.suffix}</span>
        </div>
        <div className="tst-stat-label">{stat.label}</div>
      </div>
    </div>
  );
}

const TrustStats = () => {
  return (
    <div className="tst-stats-bar">
      {statsData.map((stat) => (
        <StatCard key={stat.id} stat={stat} />
      ))}
    </div>
  );
};

export default TrustStats;
