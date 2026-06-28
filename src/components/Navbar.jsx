import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  ShoppingCart,
  ArrowLeft,
  Menu,
  X,
  Home as HomeIcon,
  Pill,
  LayoutGrid,
  Tag,
  FileText,
  Calendar,
  Clock,
  Sun,
  Moon,
  Bell,
  MapPin,
  Smartphone,
  Phone,
  LogIn,
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
      <clipPath id="crossShape">
        <rect x="72" y="10" width="56" height="180" rx="14" />
        <rect x="10" y="72" width="180" height="56" rx="14" />
      </clipPath>
    </defs>
    <g clipPath="url(#crossShape)">
      <rect x="10" y="10" width="100" height="180" fill="#2563EB" />
      <rect x="100" y="10" width="100" height="180" fill="#FFFFFF" />
    </g>
    <path
      d="M105 18 C105 18, 148 50, 120 90 C92 130, 130 158, 115 182"
      stroke="white"
      strokeWidth="11"
      strokeLinecap="round"
      fill="none"
      opacity="0.95"
    />
    <ellipse
      cx="110"
      cy="172"
      rx="14"
      ry="9"
      fill="white"
      opacity="0.95"
      transform="rotate(-35 110 172)"
    />
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
  const { isAuthenticated, user, openLogin } = useAuth();
  const { setIsSchedulerOpen } = useReservation();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { requireOnline } = useOfflineContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const notifRef = useRef(null);
  const drawerRef = useRef(null);

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('svms-theme');
    return saved || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('svms-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const isSubPage = location.pathname !== '/' && location.pathname !== '/home';

  /* ── Close drawer on route change ── */
  useEffect(() => {
    setIsDrawerOpen(false);
    setIsNotifOpen(false);
  }, [location.pathname]);

  /* ── Outside click handler ── */
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
      if (
        drawerRef.current &&
        !drawerRef.current.contains(e.target) &&
        !e.target.closest('.nb-hamburger')
      ) {
        setIsDrawerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  /* ── Scroll handler ── */
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Lock body scroll when drawer open ── */
  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isDrawerOpen]);

  const handleProfileClick = () => {
    if (!requireOnline(ONLINE_REQUIRED_FEATURES.LOGIN)) return;
    if (isAuthenticated) {
      navigate('/profile');
    } else {
      const fromPath =
        location.pathname === '/login' ||
        location.pathname === '/register' ||
        location.pathname === '/forgot-password'
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

  const handleStoreLocatorClick = useCallback((e) => {
    e.preventDefault();
    setIsDrawerOpen(false);
    window.open(
      'https://www.google.com/maps/place/SRI+VENKATESWARA+MEDICAL+AND+GENERAL+STORE/@17.4017429,78.4965845,21z/data=!4m6!3m5!1s0x3bcb99c0f2c51047:0x9c8b2ded81a7a43f!8m2!3d17.4017404!4d78.4966437!16s%2Fg%2F1pp2x7qrp',
      '_blank',
      'noopener,noreferrer'
    );
  }, []);

  const handleDownloadApp = useCallback((e) => {
    e.preventDefault();
    setIsDrawerOpen(false);
    if (typeof window.__svmsTriggerInstall === 'function') {
      window.__svmsTriggerInstall();
    } else {
      showToast('Opening app installation...', 'OK');
    }
  }, [showToast]);

  /* ── Nav items (homepage sections + sub-pages) ── */
  const mainNavItems = [
    { label: 'Home', target: 'hero-carousel', isAnchor: true, icon: <HomeIcon size={18} /> },
    { label: 'Medicines', target: 'popular-medicines', isAnchor: true, icon: <Pill size={18} /> },
    { label: 'Categories', target: 'categories', isAnchor: true, icon: <LayoutGrid size={18} /> },
    { label: 'Offers', target: 'offers', isAnchor: true, icon: <Tag size={18} /> },
    { label: 'Upload Prescription', target: 'upload-rx', isAnchor: true, icon: <FileText size={18} /> },
    { label: 'Schedule Pickup', path: '/pickup', icon: <Calendar size={18} /> },
    { label: 'Track Order', path: '/tracking', icon: <Clock size={18} /> },
    ...(isAuthenticated
      ? [{ label: 'My Prescriptions', path: '/my-prescriptions', icon: <FileText size={18} /> }]
      : []),
  ];

  const handleNavClick = useCallback((item) => {
    setIsDrawerOpen(false);
    setIsNotifOpen(false);

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
        const fromPath =
          location.pathname === '/login' ||
          location.pathname === '/register' ||
          location.pathname === '/forgot-password'
            ? '/'
            : location.pathname + location.search;
        openLogin(fromPath);
      } else {
        navigate(item.path);
      }
    }
  }, [location, navigate, requireOnline, openLogin]);

  /* ── Brand logo + name block ── */
  const BrandBlock = ({ compact = false }) => (
    <Link
      to="/"
      className="nb-brand"
      onClick={() => handleNavClick({ label: 'Home', target: 'hero-carousel', isAnchor: true })}
      aria-label="Sri Venkateshwara Medical & General Stores – Home"
    >
      <div className={`nb-logo-badge${compact ? ' nb-logo-compact' : ''}`}>
        <SVMSLogo size={compact ? 24 : 28} />
      </div>
      <div className="nb-brand-text">
        <span className="nb-brand-name">Sri Venkateshwara</span>
        <span className="nb-brand-sub">Medical &amp; General Stores</span>
      </div>
    </Link>
  );

  /* ── Workflow-aware back navigation ── */
  const getWorkflowBackPath = () => {
    const path = location.pathname;
    const params = new URLSearchParams(location.search);
    if (path === '/confirmation') return '/';
    if (path === '/pickup') {
      const prescId = params.get('prescription_id');
      return prescId ? `/my-prescriptions?highlight=${prescId}` : '/my-prescriptions';
    }
    if (path === '/my-prescriptions') return '/';
    if (path === '/reservations') return '/profile';
    return '/';
  };

  /* ── Check if nav item is active ── */
  const isItemActive = (item) =>
    (item.path && location.pathname === item.path) ||
    (item.label === 'Home' && location.pathname === '/' && !location.state?.scrollTo) ||
    (item.isAnchor && location.pathname === '/' && location.state?.scrollTo === item.target);

  /* ── Action icons shared block ── */
  const ActionIcons = ({ showTheme = true }) => (
    <div className="nb-actions">
      {showTheme && (
        <button
          className="nb-icon-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          id="theme-toggle-btn"
        >
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>
      )}

      {isAuthenticated && (
        <div ref={notifRef} className="nb-notif-wrapper">
          <button
            className="nb-icon-btn"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            aria-label="Notifications"
            id="nav-notif-btn"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="nb-badge nb-badge--notif">{unreadCount}</span>
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
                  notifications.map((n) => (
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
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h5 style={{ margin: 0, fontWeight: !n.read ? 800 : 600 }}>{n.title}</h5>
                        {!n.read && (
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: 'var(--cyan, #06b6d4)',
                            boxShadow: '0 0 8px #06b6d4',
                            display: 'inline-block', flexShrink: 0
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

      <button
        className={`nb-icon-btn nb-cart-btn ${cartBump ? 'cart-bump' : ''}`}
        onClick={handleCartClick}
        aria-label="Reservation cart"
        id="nav-cart-btn"
      >
        <ShoppingCart size={19} />
        {getCartCount() > 0 && (
          <span className={`nb-badge ${cartBump ? 'cart-badge--bump' : ''}`} id="cart-badge">
            {getCartCount()}
          </span>
        )}
      </button>

      <button
        className="nb-icon-btn nb-profile-btn"
        onClick={handleProfileClick}
        aria-label={isAuthenticated ? 'My profile' : 'Login'}
        id="nav-profile-btn"
      >
        {isAuthenticated ? (
          <div className="nav-profile-avatar">
            <span className="avatar-initials">
              {user?.avatar || user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
            <span className="avatar-status-dot" />
          </div>
        ) : (
          <User size={20} />
        )}
      </button>
    </div>
  );

  return (
    <>
      {/* ═══════════════════════════════════════════
          TOP ANNOUNCEMENT BAR
          ═══════════════════════════════════════════ */}
      <div className="nb-ann-bar" role="complementary" aria-label="Store information">
        {/* LEFT — always visible on tablet+, hidden entirely on mobile */}
        <div className="nb-ann-left">
          <span className="nb-ann-item nb-ann-hide-mobile">🛡️ 100% Genuine Medicines</span>
          <span className="nb-ann-sep nb-ann-hide-mobile">|</span>
          <a href="tel:+919989148660" className="nb-ann-item nb-ann-phone">
            📞 Support: +91 99891 48660
          </a>
        </div>

        {/* RIGHT — Store Locator & Download App (hidden on mobile, shown in drawer instead) */}
        <div className="nb-ann-right">
          <a
            href="#locator"
            className="nb-ann-link nb-ann-hide-mobile"
            onClick={handleStoreLocatorClick}
          >
            📍 Store Locator
          </a>
          <a
            href="#download"
            className="nb-ann-link nb-ann-hide-mobile"
            id="ann-download-app"
            onClick={handleDownloadApp}
          >
            📱 Download App
          </a>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          MAIN NAVBAR
          ═══════════════════════════════════════════ */}
      <header
        className={`nb-header${isScrolled ? ' nb-scrolled' : ''}`}
        id="main-navbar"
      >
        <div className="nb-inner">

          {/* ── SUB-PAGE: back button + page title ── */}
          {isSubPage ? (
            <div className="nb-subpage-row">
              <button
                className="nb-icon-btn nb-back-btn"
                onClick={() => navigate(getWorkflowBackPath())}
                aria-label="Go back"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="nb-subpage-title">
                {location.pathname === '/cart' && <h1>Reservation Cart</h1>}
                {location.pathname === '/pickup' && <h1>Schedule Pickup</h1>}
                {location.pathname.startsWith('/medicine/') && <h1>Medicine Details</h1>}
                {location.pathname === '/confirmation' && <h1>Reservation Confirmed</h1>}
                {location.pathname === '/tracking' && <h1>Track Pickup</h1>}
                {location.pathname === '/profile' && <h1>My Profile</h1>}
                {location.pathname === '/login' && <h1>Login</h1>}
                {location.pathname === '/my-prescriptions' && <h1>My Prescriptions</h1>}
                {location.pathname === '/reservations' && <h1>My Reservations</h1>}
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <ActionIcons showTheme={false} />
              </div>
            </div>
          ) : (
            <>
              {/* ══════════════════════════════════════
                  DESKTOP / LAPTOP ROW  (≥992px)
                  Logo | Search | Nav Links | Icons
                  ══════════════════════════════════════ */}
              <div className="nb-desktop-row">
                {/* Logo */}
                <BrandBlock />

                {/* Search — flexible, grows between logo and nav */}
                {showSearch && (
                  <div className="nb-search-wrap nb-search-desktop">
                    <SearchBar query={searchQuery} onChange={onSearchChange} />
                  </div>
                )}

                {/* Nav links */}
                <nav className="nb-desktop-nav" aria-label="Main navigation">
                  {mainNavItems.map((item, idx) => (
                    <button
                      key={idx}
                      className={`nb-nav-btn${isItemActive(item) ? ' active' : ''}`}
                      onClick={() => handleNavClick(item)}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>

                {/* Action icons */}
                <ActionIcons />
              </div>

              {/* ══════════════════════════════════════
                  TABLET ROW  (768–991px)
                  Logo | Search | Hamburger | Icons
                  ══════════════════════════════════════ */}
              <div className="nb-tablet-row">
                {/* Logo */}
                <BrandBlock />

                {/* Search — fills available space */}
                {showSearch && (
                  <div className="nb-search-wrap nb-search-tablet">
                    <SearchBar query={searchQuery} onChange={onSearchChange} />
                  </div>
                )}

                {/* Icons + hamburger */}
                <div className="nb-tablet-actions">
                  <ActionIcons />
                  <button
                    className="nb-hamburger nb-icon-btn"
                    onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                    aria-label={isDrawerOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={isDrawerOpen}
                  >
                    {isDrawerOpen ? <X size={22} /> : <Menu size={22} />}
                  </button>
                </div>
              </div>

              {/* ══════════════════════════════════════
                  MOBILE TOP ROW  (<768px)
                  Logo | [Notif | Cart | Profile | Hamburger]
                  ══════════════════════════════════════ */}
              <div className="nb-mobile-row">
                <BrandBlock compact />
                <div className="nb-mobile-actions">
                  <ActionIcons />
                  <button
                    className="nb-hamburger nb-icon-btn"
                    onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                    aria-label={isDrawerOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={isDrawerOpen}
                  >
                    {isDrawerOpen ? <X size={22} /> : <Menu size={22} />}
                  </button>
                </div>
              </div>

              {/* ══════════════════════════════════════
                  MOBILE SEARCH ROW  (<768px)
                  Full-width search bar below top row
                  ══════════════════════════════════════ */}
              {showSearch && (
                <div className="nb-mobile-search-row">
                  <SearchBar query={searchQuery} onChange={onSearchChange} />
                </div>
              )}
            </>
          )}
        </div>
      </header>

      {/* ═══════════════════════════════════════════
          DRAWER BACKDROP
          ═══════════════════════════════════════════ */}
      <div
        className={`nb-drawer-backdrop${isDrawerOpen ? ' nb-drawer-backdrop--open' : ''}`}
        onClick={() => setIsDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* ═══════════════════════════════════════════
          NAVIGATION DRAWER (left slide-in)
          ═══════════════════════════════════════════ */}
      <aside
        ref={drawerRef}
        className={`nb-drawer${isDrawerOpen ? ' nb-drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Drawer header */}
        <div className="nb-drawer-head">
          <BrandBlock compact />
          <button
            className="nb-icon-btn"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Drawer tagline */}
        <div className="nb-drawer-tagline">Your Health, Our Priority</div>

        {/* Drawer nav items */}
        <nav className="nb-drawer-nav" aria-label="Drawer navigation">
          {mainNavItems.map((item, idx) => (
            <button
              key={idx}
              className={`nb-drawer-item${isItemActive(item) ? ' nb-drawer-item--active' : ''}`}
              onClick={() => handleNavClick(item)}
            >
              <span className="nb-drawer-item-icon">{item.icon}</span>
              <span className="nb-drawer-item-label">{item.label}</span>
            </button>
          ))}

          {/* Auth item */}
          <button
            className="nb-drawer-item"
            onClick={() => {
              setIsDrawerOpen(false);
              if (isAuthenticated) {
                navigate('/profile');
              } else {
                openLogin(location.pathname + location.search);
              }
            }}
          >
            <span className="nb-drawer-item-icon">
              <User size={18} />
            </span>
            <span className="nb-drawer-item-label">
              {isAuthenticated ? 'My Profile' : 'Login / Register'}
            </span>
          </button>
        </nav>

        {/* Drawer divider */}
        <div className="nb-drawer-divider" />

        {/* Drawer utility links (mobile-only extras from announcement bar) */}
        <div className="nb-drawer-utils">
          <button className="nb-drawer-util-item" onClick={handleStoreLocatorClick}>
            <MapPin size={16} />
            <span>Store Locator</span>
          </button>
          <button className="nb-drawer-util-item" onClick={handleDownloadApp}>
            <Smartphone size={16} />
            <span>Download App</span>
          </button>
          <a href="tel:+919989148660" className="nb-drawer-util-item">
            <Phone size={16} />
            <span>+91 99891 48660</span>
          </a>
        </div>

        {/* Drawer footer */}
        <div className="nb-drawer-foot">
          <SVMSLogo size={20} />
          <span>Sri Venkateshwara Medical &amp; General Stores</span>
        </div>
      </aside>
    </>
  );
};

export default Navbar;
