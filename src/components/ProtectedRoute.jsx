import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react';

/**
 * Wraps any route that requires authentication.
 * - While the Supabase session is being resolved → shows a spinner.
 * - If unauthenticated → redirects to /login, remembering the target path.
 * - If authenticated → renders children normally.
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '16px',
          color: 'var(--text-secondary)',
        }}
      >
        {/* Animated lock icon */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--primary-blue-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        >
          <Lock size={24} style={{ color: 'var(--primary-blue)' }} />
        </div>
        <p style={{ fontSize: '14px', fontWeight: 600 }}>Checking your session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const fromPath = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/?auth=login&from=${fromPath}`} replace />;
  }

  return children;
};

export default ProtectedRoute;
