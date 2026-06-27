import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';

const AdminAuthContext = createContext();

const SESSION_KEY = 'svms_admin_session';

export const AdminAuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loginError, setLoginError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (adminUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [adminUser]);

  // Keep a ref so verifySession can read current adminUser without it being a dep
  const adminUserRef = React.useRef(adminUser);
  useEffect(() => { adminUserRef.current = adminUser; }, [adminUser]);

  useEffect(() => {
    let active = true;

    const verifySession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;

        if (session?.user) {
          // Check role in profiles table
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (!active) return;

          if (!profileError && profile?.role === 'admin') {
            setCheckingAuth(false);
            return;
          }
        }

        // If no valid session or not an admin, clear the adminUser session state
        if (adminUserRef.current) {
          console.warn('[AdminAuthContext] Invalid or missing Supabase session for admin user. Clearing session.');
          setAdminUser(null);
        }
      } catch (err) {
        console.error('[AdminAuthContext] Verification failed:', err);
      } finally {
        if (active) {
          setCheckingAuth(false);
        }
      }
    };

    verifySession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;
      if (event === 'SIGNED_OUT') {
        console.log('[AdminAuthContext] Supabase SIGNED_OUT, clearing adminUser state');
        setAdminUser(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []); // Run once on mount only

  const adminLogin = async (email, password, remember) => {
    setLoginError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setLoginError(error.message);
        return false;
      }

      // Check role in profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        await supabase.auth.signOut();
        setLoginError('Access denied: You do not have administrator privileges.');
        return false;
      }

      const session = {
        email: data.user.email,
        name: profile.full_name || 'Store Admin',
        role: 'Super Admin',
        avatar: (profile.full_name || 'Admin').charAt(0).toUpperCase(),
        loginTime: new Date().toISOString(),
      };

      setAdminUser(session);
      if (remember) {
        localStorage.setItem('svms_admin_remember', email);
      } else {
        localStorage.removeItem('svms_admin_remember');
      }
      return true;
    } catch (e) {
      setLoginError('An unexpected error occurred. Please try again.');
      console.error(e);
      return false;
    }
  };

  const adminLogout = async () => {
    await supabase.auth.signOut();
    setAdminUser(null);
  };

  return (
    <AdminAuthContext.Provider value={{
      adminUser,
      adminLogin,
      adminLogout,
      loginError,
      setLoginError,
      isAdminAuthenticated: !!adminUser,
      checkingAuth,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
};
