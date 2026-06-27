import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  ShoppingCart,
  ArrowLeft,
  Menu,
  X,
  ChevronDown,
  Home as HomeIcon,
  Pill,
  LayoutGrid,
  Tag,
  FileText,
  Calendar,
  Clock,
  Search,
  Sun,
  Moon,
  Bell
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useReservation } from '../context/ReservationContext';
import { useNotifications } from '../context/NotificationContext';
import { useOfflineContext } from '../context/OfflineContext';
import { ONLINE_REQUIRED_FEATURES } from '../hooks/useOffline';
import SearchBar from './SearchBar';

/* ── Premium SVMS Logo SVG – faithful to reference image ─── */
const SVMSLogo = ({ size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
    aria-label="SVMS Medical Store Logo"
  >
    <defs>
      {/* Full cross shape as a clip for the two halves */}
      <clipPath id="crossShape">
        {/* Vertical bar */}
        <rect x="72" y="10" width="56" height="180" rx="14" />
        {/* Horizontal bar */}
        <rect x="10" y="72" width="180" height="56" rx="14" />
      </clipPath>
    </defs>

    {/* === Cross body — Blue left half & White right half === */}
    <g clipPath="url(#crossShape)">
      {/* Blue fill — left side */}
      <rect x="10" y="10" width="100" height="180" fill="#2563EB" />
      {/* White fill — right side */}
      <rect x="100" y="10" width="100" height="180" fill="#FFFFFF" />
    </g>

    {/* === White S-curve swirl === */}
    <path
      d="M105 18
         C105 18, 148 50, 120 90
         C92 130, 130 158, 115 182"
      stroke="white"
      strokeWidth="11"
      strokeLinecap="round"
      fill="none"
      opacity="0.95"
    />

    {/* === White leaf at bottom of swirl === */}
    <ellipse
      cx="110"
      cy="172"
      rx="14"
      ry="9"
      fill="white"
      opacity="0.95"
      transform="rotate(-35 110 172)"
    />
    {/* leaf vein */}
    <path
      d="M104 177 Q111 170 118 167"
      stroke="#2563EB"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
      opacity="0.8"
    />
  </svg>
);


const Navbar = ({ showSearch = true, searchQuery, onSearchChange }) => {
  const { getCartCount, showToast, cartBump } = useCart();
  const { isAuthenticated, user, openLogin, openRegister } = useAuth();
  const { pickupDate, pickupTime, setIsSchedulerOpen } = useReservation();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { requireOnline } = useOfflineContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const overflowRef = useRef(null);
  const notifRef = useRef(null);

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('svms-theme');
    return saved || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('svms-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isSubPage = location.pathname !== '/' && location.pathname !== '/home';

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target)) {
        setIsOverflowOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleProfileClick = () => {
    if (!requireOnline(ONLINE_REQUIRED_FEATURES.LOGIN)) return;
    if (isAuthenticated) {
      navigate('/profile');
    } else {
      const fromPath = (location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password')
        ? '/'
        : location.pathname + location.search;
      openLogin(fromPath);
    }
  };

  const handleCartClick = () => {
    const count = getCartCount();
    if (count === 0) {
      showToast('Your reservation cart is empty. Add medicines first!', 'OK');
    } else {
      navigate('/cart');
    }
  };

  const handleStoreLocatorClick = (e) => {
    e.preventDefault();
    setIsDrawerOpen(false);
    setIsOverflowOpen(false);
    window.open('https://www.google.com/maps/place/SRI+VENKATESWARA+MEDICAL+AND+GENERAL+STORE/@17.4017429,78.4965845,21z/data=!4m6!3m5!1s0x3bcb99c0f2c51047:0x9c8b2ded81a7a43f!8m2!3d17.4017404!4d78.4966437!16s%2Fg%2F1pp2x7qrp', '_blank', 'noopener,noreferrer');
  };

  const navItems = [
    { label: 'Home', target: 'hero-carousel', isAnchor: true },
    { label: 'Medicines', target: 'popular-medicines', isAnchor: true },
    { label: 'Categories', target: 'categories', isAnchor: true },
    { label: 'Offers', target: 'offers', isAnchor: true },
    { label: 'Upload Prescription', target: 'upload-rx', isAnchor: true },
    { label: 'Schedule Pickup', path: '/pickup' },
    { label: 'Track Order', path: '/tracking' },
    ...(isAuthenticated ? [{ label: 'My Prescriptions', path: '/my-prescriptions' }] : []),
    isAuthenticated
      ? { label: 'Profile', path: '/profile' }
      : { label: 'Login', path: '/login' }
  ];

  const handleNavClick = (item) => {
    setIsDrawerOpen(false);
    setIsOverflowOpen(false);

    if (item.isAnchor) {
      if (location.pathname !== '/' && location.pathname !== '/home') {
        navigate('/', { state: { scrollTo: item.target } });
      } else {
        const element = document.getElementById(item.target);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        } else if (item.target === 'hero-carousel') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } else {
      if (item.path === '/pickup') {
        if (!requireOnline(ONLINE_REQUIRED_FEATURES.SCHEDULE_PICKUP)) return;
      }
      if (item.path === '/tracking') {
        if (!requireOnline(ONLINE_REQUIRED_FEATURES.TRACK_ORDER)) return;
      }
      if (item.path === '/profile') {
        if (!requireOnline(ONLINE_REQUIRED_FEATURES.LOGIN)) return;
      }
      if (item.path === '/login') {
        const fromPath = (location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password')
          ? '/'
          : location.pathname + location.search;
        openLogin(fromPath);
      } else {
        navigate(item.path);
      }
    }
  };

  /* ── Brand logo + name block ─────────────────────────────── */
  const BrandBlock = ({ compact = false }) => (
    <Link
      to="/"
      className="svms-brand"
      onClick={() => handleNavClick({ label: 'Home', target: 'hero-carousel', isAnchor: true })}
      aria-label="Sri Venkateshwara Medical & General Stores – Home"
    >
      <div className={`svms-logo-badge${compact ? ' compact' : ''}`}>
        <SVMSLogo size={compact ? 24 : 28} />
      </div>
      <div className="svms-brand-text">
        <span className="svms-brand-name">Sri Venkateshwara</span>
        <span className="svms-brand-sub">Medical &amp; General Stores</span>
      </div>
    </Link>
  );

  // ── Workflow-aware back navigation (NEVER uses browser history) ──────
  // Determines back destination from application state, not browser history.
  const getWorkflowBackPath = () => {
    const path = location.pathname;
    const params = new URLSearchParams(location.search);

    // Step 3: Confirmation → Home (never back into booking flow)
    if (path === '/confirmation') return '/';

    // Step 2: Pickup → Quote Review (my-prescriptions)
    if (path === '/pickup') {
      const prescId = params.get('prescription_id');
      return prescId ? `/my-prescriptions?highlight=${prescId}` : '/my-prescriptions';
    }

    // Step 1: My Prescriptions / Quote Review → Home
    if (path === '/my-prescriptions') return '/';

    // Other sub-pages
    if (path === '/reservations') return '/profile';

    // Default: Home
    return '/';
  };

  return (
    <>
      {/* Premium Announcement Bar */}
      <div className="announcement-bar">
        <div className="announcement-left">
          <span className="ann-item">🚚 Free Delivery Above ₹499</span>
          <span className="ann-separator">|</span>
          <span className="ann-item">🛡️ 100% Genuine Medicines</span>
          <span className="ann-separator">|</span>
          <span className="ann-item">📞 Support: +91 98765 43210</span>
        </div>
        <div className="announcement-right">
          <a href="#locator" className="ann-link" onClick={handleStoreLocatorClick} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            📍 Store Locator
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10" style={{ opacity: 0.85 }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
          <a href="#download" className="ann-link" id="ann-download-app" onClick={(e) => { e.preventDefault(); if (typeof window.__svmsTriggerInstall === 'function') { window.__svmsTriggerInstall(); } else { showToast('Opening app installation...', 'OK'); } }}>📱 Download App</a>
        </div>
      </div>

      <header className={`navbar${isScrolled ? ' scrolled' : ''}`} id="main-navbar">
        {/* ── Top row ──────────────────────────────────────── */}
        <div className="nav-top-row">

          {/* Hamburger (Mobile) */}
          {!isSubPage && (
            <button
              className="hamburger-btn"
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
          )}

          {/* Sub-page header OR brand block */}
          {isSubPage ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="icon-btn" onClick={() => navigate(getWorkflowBackPath())} aria-label="Go back">
                <ArrowLeft size={20} />
              </button>
              {location.pathname === '/cart' && <h1 className="page-title" style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Reservation Cart</h1>}
              {location.pathname === '/pickup' && <h1 className="page-title" style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Schedule Pickup</h1>}
              {location.pathname.startsWith('/medicine/') && <span className="detail-header-title" style={{ fontSize: '16px', fontWeight: 700 }}>Medicine Details</span>}
              {location.pathname === '/confirmation' && <span className="detail-header-title" style={{ fontSize: '16px', fontWeight: 700 }}>Reservation Confirmed</span>}
              {location.pathname === '/tracking' && <span className="detail-header-title" style={{ fontSize: '16px', fontWeight: 700 }}>Track Pickup</span>}
              {location.pathname === '/profile' && <span className="detail-header-title" style={{ fontSize: '16px', fontWeight: 700 }}>My Profile</span>}
              {location.pathname === '/login' && <span className="detail-header-title" style={{ fontSize: '16px', fontWeight: 700 }}>Login</span>}
            </div>
          ) : (
            <BrandBlock />
          )}

          {/* Search Bar (Desktop & Tablet) */}
          {showSearch && !isSubPage && (
            <div className="nav-search-bar">
              <SearchBar query={searchQuery} onChange={onSearchChange} />
            </div>
          )}

          {/* Desktop inline nav links */}
          {!isSubPage && (
            <nav className="desktop-inline-nav" aria-label="Main navigation">
              {navItems.map((item, idx) => {
                const isItemActive =
                  (item.path && location.pathname === item.path) ||
                  (item.label === 'Home' && location.pathname === '/' && (!location.state || !location.state.scrollTo)) ||
                  (item.isAnchor && location.pathname === '/' && location.state?.scrollTo === item.target);
                return (
                  <button
                    key={idx}
                    className={`nav-link-btn ${isItemActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item)}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Action icons */}
          <div className="nav-actions">
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              id="theme-toggle-btn"
            >
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            {isAuthenticated && (
              <div ref={notifRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  className="theme-toggle-btn"
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  aria-label="Notifications"
                  id="nav-notif-btn"
                  style={{ position: 'relative' }}
                >
                  <Bell size={19} />
                  {unreadCount > 0 && (
                    <span className="cart-badge" style={{ top: '-2px', right: '-2px' }}>{unreadCount}</span>
                  )}
                </button>
                {isNotifOpen && (
                  <div className="notif-dropdown">
                    <div className="notif-dropdown-header">
                      <h4>Notifications</h4>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead}>Mark all read</button>
                      )}
                    </div>
                    <div className="notif-dropdown-list">
                      {notifications.length === 0 ? (
                        <div className="notif-empty">No notifications yet</div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            className={`notif-dropdown-item ${!n.read ? 'unread' : ''}`}
                            onClick={() => {
                              markAsRead(n.id);
                              setIsNotifOpen(false);
                              if (
                                n.title.toLowerCase().includes('prescription') ||
                                n.title.toLowerCase().includes('quote')
                              ) {
                                navigate('/my-prescriptions');
                              } else {
                                navigate('/reservations');
                              }
                            }}
                            style={{ position: 'relative' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h5 style={{ margin: 0, fontWeight: !n.read ? 800 : 600 }}>{n.title}</h5>
                              {!n.read && (
                                <span style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: 'var(--cyan, #06b6d4)',
                                  boxShadow: '0 0 8px #06b6d4',
                                  display: 'inline-block'
                                }} />
                              )}
                            </div>
                            <p style={{ margin: '4px 0 0 0' }}>{n.message}</p>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                              {new Date(n.created_at).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button className={`nav-cart-btn ${cartBump ? 'cart-bump' : ''}`} onClick={handleCartClick} aria-label="Reservation cart" id="nav-cart-btn">
              <ShoppingCart size={19} />
              {getCartCount() > 0 && (
                <span className={`cart-badge ${cartBump ? 'cart-badge--bump' : ''}`} id="cart-badge">{getCartCount()}</span>
              )}
            </button>
            <button className="nav-profile-btn profile-icon-desktop" onClick={handleProfileClick} aria-label={isAuthenticated ? 'My profile' : 'Login'} id="nav-profile-btn">
              {isAuthenticated ? (
                <div className="nav-profile-avatar">
                  <span className="avatar-initials">{user?.avatar || user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  <span className="avatar-status-dot"></span>
                </div>
              ) : (
                <User size={20} />
              )}
            </button>
          </div>
        </div>

        {/* Tablet simplified nav bar */}
        {!isSubPage && (
          <nav className="tablet-nav-bar" aria-label="Tablet navigation">
            {navItems.slice(0, 4).map((item, idx) => (
              <button
                key={idx}
                className="nav-link-btn"
                onClick={() => handleNavClick(item)}
              >
                {item.label}
              </button>
            ))}
            <div className="overflow-menu-container" ref={overflowRef}>
              <button
                className="nav-link-btn overflow-trigger"
                onClick={() => setIsOverflowOpen(!isOverflowOpen)}
              >
                More <ChevronDown size={14} style={{ marginLeft: '2px', display: 'inline' }} />
              </button>
              {isOverflowOpen && (
                <div className="overflow-dropdown">
                  {navItems.slice(4).map((item, idx) => (
                    <button
                      key={idx}
                      className="dropdown-item-btn"
                      onClick={() => handleNavClick(item)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>
        )}

        {/* Mobile search bar */}
        {showSearch && !isSubPage && (
          <div className="mobile-search-bar-row">
            <SearchBar query={searchQuery} onChange={onSearchChange} />
          </div>
        )}
      </header>

      {/* Drawer backdrop */}
      {isDrawerOpen && !isSubPage && (
        <div className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)} />
      )}

      {/* Mobile drawer */}
      {!isSubPage && (
        <div className={`drawer-aside ${isDrawerOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="drawer-header">
            <BrandBlock compact />
            <button className="close-btn" onClick={() => setIsDrawerOpen(false)} aria-label="Close menu">
              <X size={22} />
            </button>
          </div>

          {/* Drawer tagline strip */}
          <div className="drawer-tagline">Your Health, Our Priority</div>

          <div className="drawer-content">
            <div className="drawer-nav-list">
              {navItems.map((item, idx) => (
                <button
                  key={idx}
                  className="drawer-nav-item"
                  onClick={() => handleNavClick(item)}
                >
                  <span className="drawer-nav-icon">
                    {item.label === 'Home' && <HomeIcon size={18} />}
                    {item.label === 'Medicines' && <Pill size={18} />}
                    {item.label === 'Categories' && <LayoutGrid size={18} />}
                    {item.label === 'Offers' && <Tag size={18} />}
                    {item.label === 'Upload Prescription' && <FileText size={18} />}
                    {item.label === 'Schedule Pickup' && <Calendar size={18} />}
                    {item.label === 'Track Order' && <Clock size={18} />}
                    {item.label === 'My Reservations' && <Clock size={18} />}
                    {item.label === 'My Prescriptions' && <FileText size={18} />}
                    {item.label === 'Profile' && <User size={18} />}
                    {item.label === 'Login' && <User size={18} />}
                  </span>
                  <span className="drawer-nav-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Drawer footer */}
          <div className="drawer-footer">
            <div className="drawer-footer-logo">
              <div className="svms-logo-badge compact">
                <SVMSLogo size={20} />
              </div>
              <span>Sri Venkateshwara Medical &amp; General Stores</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
