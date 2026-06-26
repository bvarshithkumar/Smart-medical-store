import React from 'react';

const CategoryCard = ({ name, image, count, color, onClick, active }) => {
  return (
    <div
      className={`category-card ${active ? 'active' : ''}`}
      onClick={onClick}
      style={{
        '--card-bg-image': `url(${image})`,
        cursor: 'pointer',
        border: active ? `2px solid ${color}` : '1.5px solid var(--border-color, rgba(20, 184, 166, 0.12))',
        boxShadow: active ? `0 0 20px ${color}45, inset 0 0 10px ${color}20` : 'none',
        transform: active ? 'translateY(-6px)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div className="category-card-arrow" style={{ backgroundColor: color, transform: active ? 'scale(1.1) rotate(45deg)' : 'none', transition: 'transform 0.3s ease' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" width="12" height="12">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </div>

      <div className="category-card-body">
        <span className="category-product-count" style={{ color: active ? '#ffffff' : '#00A884', backgroundColor: active ? color : 'transparent', padding: active ? '2px 8px' : '0', borderRadius: active ? '12px' : '0', fontSize: active ? '10px' : '11px', fontWeight: active ? '700' : 'normal', display: 'inline-block', transition: 'all 0.3s ease' }}>{count}</span>
        <h4 className="category-name" style={{ color: active ? color : 'inherit', fontWeight: active ? '800' : '700' }}>{name}</h4>
      </div>
    </div>
  );
};

export default CategoryCard;

export const categoriesData = [
  {
    name: 'Medicines',
    color: '#00A884',
    image: '/images/cat_medicines.png',
    count: '1,200+ Products',
  },
  {
    name: 'Wellness',
    color: '#00a896',
    image: '/images/cat_wellness.png',
    count: '850+ Products',
  },
  {
    name: 'Personal Care',
    color: '#ea580c',
    image: '/images/cat_personal.png',
    count: '640+ Products',
  },
  {
    name: 'Health Devices',
    color: '#3b82f6',
    image: '/images/cat_devices.png',
    count: '250+ Products',
  },
  {
    name: 'Diabetes Care',
    color: '#ef4444',
    image: '/images/cat_diabetes.png',
    count: '420+ Products',
  },
  {
    name: 'Baby Care',
    color: '#8b5cf6',
    image: '/images/cat_baby.png',
    count: '380+ Products',
  }
];
