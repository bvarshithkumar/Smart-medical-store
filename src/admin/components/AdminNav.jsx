import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useAdmin } from '../context/AdminContext';
import {
  LayoutDashboard, Package, ShoppingCart, FileText, Users,
  Warehouse, Tag, Layout, BarChart3, Settings, ClipboardList,
  ChevronLeft, ChevronRight, LogOut, Bell, Search, Moon, Sun,
  Stethoscope, Calendar, MessageSquare, Menu, X
} from 'lucide-react';

const NAV_ITEMS = [
  { section: 'Main', items: [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { section: 'Commerce', items: [
    { path: '/admin/products', label: 'Products', icon: Package },
    { path: '/admin/orders', label: 'Orders', icon: ShoppingCart },
    { path: '/admin/reservations', label: 'Reservations', icon: Calendar, badgeKey: 'pendingOrders' },
    { path: '/admin/prescriptions', label: 'Prescriptions', icon: FileText, badgeKey: 'pendingRx' },
    { path: '/admin/support', label: 'Customer Support', icon: MessageSquare, badgeKey: 'unreadChats' },
    { path: '/admin/customers', label: 'Customers', icon: Users },
  ]},
  { section: 'Operations', items: [
    { path: '/admin/inventory', label: 'Inventory', icon: Warehouse },
    { path: '/admin/promotions', label: 'Promotions', icon: Tag },
    { path: '/admin/automated-changes', label: 'Automated Changes', icon: ClipboardList },
  ]},
  { section: 'Management', items: [
    { path: '/admin/cms', label: 'CMS', icon: Layout },
    { path: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
    { path: '/admin/activity', label: 'Activity Logs', icon: ClipboardList },
  ]},
];

export const Sidebar = ({ collapsed, mobileOpen, onCloseMobile }) => {
  const location = useLocation();
  const { adminLogout, adminUser } = useAdminAuth();
  const { metrics } = useAdmin();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  }, [location.pathname]);

  const isActive = (path) => path === '/admin'
    ? location.pathname === '/admin'
    : location.pathname.startsWith(path);

  const badgeValues = { 
    pendingOrders: metrics.pendingOrders, 
    pendingRx: metrics.pendingRx, 
    unreadChats: metrics.unreadSupportChats || 0 
  };

  return (
    <aside className={`admin-sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      <Link to="/admin" className="sidebar-logo">
        <div className="sidebar-logo-icon">💊</div>
        <div className="sidebar-logo-text">
          <h2>SVMS Admin</h2>
          <span>Management Portal</span>
        </div>
      </Link>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(section => (
          <div key={section.section}>
            <div className="sidebar-section-label">{section.section}</div>
            {section.items.map(item => {
              const Icon = item.icon;
              const badge = item.badgeKey ? badgeValues[item.badgeKey] : 0;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-nav-item${isActive(item.path) ? ' active' : ''}`}
                >
                  <span className="sidebar-nav-icon"><Icon size={18} /></span>
                  <span className="sidebar-nav-label">{item.label}</span>
                  {badge > 0 && <span className="sidebar-badge">{badge}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-nav-item" onClick={() => { adminLogout(); navigate('/admin/login'); }}>
          <span className="sidebar-nav-icon"><LogOut size={18} /></span>
          <span className="sidebar-nav-label">Logout</span>
        </div>
        <div className="sidebar-user">
          <div className="sidebar-avatar">{adminUser?.avatar || 'A'}</div>
          <div className="sidebar-user-info">
            <p>{adminUser?.name || 'Admin'}</p>
            <span>{adminUser?.role || 'Super Admin'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export const AdminHeader = ({ collapsed, mobileOpen, onToggle, onNotifToggle }) => {
  const { unreadCount, theme, toggleTheme } = useAdmin();
  const [search, setSearch] = useState('');

  return (
    <header className={`admin-header${collapsed ? ' sidebar-collapsed' : ''}`}>
      <button className="header-toggle-btn" onClick={onToggle} title="Toggle sidebar">
        <span className="desktop-toggle-icon">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </span>
        <span className="mobile-toggle-icon">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </span>
      </button>

      <div className="header-search">
        <Search size={14} className="header-search-icon" />
        <input
          type="text"
          placeholder="Search anything…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="header-actions">
        <button className="header-action-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="header-action-btn" onClick={onNotifToggle} title="Notifications">
          <Bell size={16} />
          {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
        </button>
        <div className="header-profile">
          <div className="sidebar-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>A</div>
          <div className="header-profile-info">
            <p>Admin</p>
            <span>Super Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export const NotificationPanel = ({ open, onClose }) => {
  const { notifications, markAllRead, markRead } = useAdmin();
  return (
    <>
      {open && <div className="modal-overlay" style={{ background: 'transparent', zIndex: 140 }} onClick={onClose} />}
      <div className={`notif-panel${open ? ' open' : ''}`}>
        <div className="notif-panel-header">
          <h3>Notifications</h3>
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
        </div>
        <div className="notif-list">
          {notifications.map(n => (
            <div key={n.id} className={`notif-item${!n.read ? ' unread' : ''}`} onClick={() => markRead(n.id)}>
              <div className="notif-icon">{n.icon}</div>
              <div className="notif-content">
                <p>{n.title}</p>
                <span>{n.message}</span>
                <div className="notif-time">{n.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
