import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { AdminProvider } from './context/AdminContext';
import './admin.css';

// Pages
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Reservations from './pages/Reservations';
import Prescriptions from './pages/Prescriptions';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import Promotions from './pages/Promotions';
import CMS from './pages/CMS';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ActivityLogs from './pages/ActivityLogs';
import AutomatedChanges from './pages/AutomatedChanges';

const AdminRoute = ({ children }) => {
  const { isAdminAuthenticated, checkingAuth } = useAdminAuth();

  if (checkingAuth) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0b0f19',
        color: '#94a3b8',
        gap: '12px',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.1)',
          borderTopColor: '#3b82f6',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ fontSize: '13px', fontWeight: 500 }}>Verifying secure session…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return isAdminAuthenticated ? children : <Navigate to="/admin/login" replace />;
};

const AdminRoutes = () => {
  const { isAdminAuthenticated } = useAdminAuth();
  return (
    <Routes>
      <Route path="login" element={
        isAdminAuthenticated ? <Navigate to="/admin" replace /> : <AdminLogin />
      } />
      <Route path="" element={<AdminRoute><Dashboard /></AdminRoute>} />
      <Route path="products" element={<AdminRoute><Products /></AdminRoute>} />
      <Route path="orders" element={<AdminRoute><Orders /></AdminRoute>} />
      <Route path="reservations" element={<AdminRoute><Reservations /></AdminRoute>} />
      <Route path="prescriptions" element={<AdminRoute><Prescriptions /></AdminRoute>} />
      <Route path="customers" element={<AdminRoute><Customers /></AdminRoute>} />
      <Route path="inventory" element={<AdminRoute><Inventory /></AdminRoute>} />
      <Route path="promotions" element={<AdminRoute><Promotions /></AdminRoute>} />
      <Route path="automated-changes" element={<AdminRoute><AutomatedChanges /></AdminRoute>} />
      <Route path="cms" element={<AdminRoute><CMS /></AdminRoute>} />
      <Route path="reports" element={<AdminRoute><Reports /></AdminRoute>} />
      <Route path="settings" element={<AdminRoute><Settings /></AdminRoute>} />
      <Route path="activity" element={<AdminRoute><ActivityLogs /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

const AdminApp = () => (
  <AdminAuthProvider>
    <AdminProvider>
      <AdminRoutes />
    </AdminProvider>
  </AdminAuthProvider>
);

export default AdminApp;
