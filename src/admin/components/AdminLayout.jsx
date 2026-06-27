import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { Sidebar, AdminHeader, NotificationPanel } from './AdminNav';
import { X, MessageSquare } from 'lucide-react';

const AdminLayout = ({ children }) => {
  const { theme, adminToasts, removeAdminToast } = useAdmin();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  const handleToggle = () => {
    if (window.innerWidth <= 768) {
      setMobileOpen(m => !m);
    } else {
      setCollapsed(c => !c);
    }
  };

  const handleToastClick = (t) => {
    if (t.onClickValue) {
      if (t.onClickValue === 'general') {
        navigate('/admin/prescriptions?tab=general_chat');
      } else {
        navigate(`/admin/prescriptions?rx=${t.onClickValue}`);
      }
    }
    removeAdminToast(t.id);
  };

  return (
    <div className="admin-root" data-admin-theme={theme}>
      <div className="admin-layout">
        <Sidebar 
          collapsed={collapsed} 
          mobileOpen={mobileOpen} 
          onCloseMobile={() => setMobileOpen(false)} 
        />
        <div className={`admin-main${collapsed ? ' sidebar-collapsed' : ''}`}>
          <AdminHeader
            collapsed={collapsed}
            mobileOpen={mobileOpen}
            onToggle={handleToggle}
            onNotifToggle={() => setNotifOpen(o => !o)}
          />
          <main className="admin-content">
            {children}
          </main>
        </div>
        <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        
        {/* Mobile sidebar overlay/backdrop */}
        {mobileOpen && (
          <div 
            className="admin-sidebar-backdrop" 
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(5, 11, 24, 0.6)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 199,
              transition: 'opacity 0.2s ease'
            }}
          />
        )}
      </div>

      {/* Global Admin Toast Notification Container */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
        display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end'
      }}>
        {adminToasts.map(t => (
          <div key={t.id} 
            onClick={() => handleToastClick(t)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(6,182,212,0.15)', // cyan theme for chat
              border: '1px solid rgba(6,182,212,0.4)',
              borderRadius: 10, padding: '12px 16px',
              fontSize: 13, fontWeight: 500,
              color: '#67e8f9',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
              maxWidth: 360,
              cursor: t.onClickValue ? 'pointer' : 'default',
            }}
          >
            <MessageSquare size={16} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{t.message}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); removeAdminToast(t.id); }} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2, opacity: 0.6, flexShrink: 0 }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminLayout;