import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // supabaseUser: the authenticated Supabase user (null when signed out)
  // profile:      row from public.profiles for the current user
  // loading:      true until the initial getSession() call resolves
  // authReady:    true once the session check is complete (use this to gate UI)
  const [supabaseUser, setSupabaseUser] = useState(null);
  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [authReady,    setAuthReady]    = useState(false);

  // Auth Modal States
  const [authModal, setAuthModal] = useState(null);
  const [authModalData, setAuthModalData] = useState(null);

  const openLogin = useCallback((fromPath = null) => {
    setAuthModal('login');
    setAuthModalData({ from: fromPath });
  }, []);
  const openRegister = useCallback((fromPath = null) => {
    setAuthModal('register');
    setAuthModalData({ from: fromPath });
  }, []);
  const openForgotPassword = useCallback((fromPath = null) => {
    setAuthModal('forgot-password');
    setAuthModalData({ from: fromPath });
  }, []);
  const openVerifyEmail = useCallback((email, fromPath = null) => {
    setAuthModal('verify-email');
    setAuthModalData({ email, from: fromPath });
  }, []);
  const openResetPassword = useCallback(() => {
    setAuthModal('reset-password');
    setAuthModalData(null);
  }, []);
  const openCompleteProfile = useCallback((fromPath = null) => {
    setAuthModal('complete-profile');
    setAuthModalData({ from: fromPath });
  }, []);
  const closeAuthModal = useCallback(() => {
    setAuthModal(null);
    setAuthModalData(null);
  }, []);

  /* ── Helper: fetch profile row from public.profiles ─── */
  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) setProfile(data);
  };

  /* ── Boot: restore persisted session from localStorage ─ */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthContext] Session on boot:', session);
      const u = session?.user ?? null;
      console.log('[AuthContext] User on boot:', u);
      setSupabaseUser(u);
      if (u) fetchProfile(u.id);
      setLoading(false);
      setAuthReady(true);
    });

    /* Listen to sign-in / sign-out / token refresh events */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('[AuthContext] onAuthStateChange — event:', _event, 'session:', session);
        const u = session?.user ?? null;
        setSupabaseUser(u);
        if (u) {
          await fetchProfile(u.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
        setAuthReady(true);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const register = async ({ name, email, phone, password, redirectTo }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo || `${window.location.origin}/auth/callback`,
        data: {
          full_name: name,   // DB trigger reads this → inserts into profiles
          phone,
        },
      },
    });
    if (error) return { error: error.message };
    
    // Check if the user already exists (GoTrue returns user with empty identities array to prevent user enumeration)
    if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
      return { error: 'Email already registered' };
    }
    
    return { data, requiresConfirmation: !data.session };
  };

  /* ── Sign in with email + password ───────────────────── */
  const loginWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };
    console.log('[AuthContext] loginWithEmail success — user:', data.user);
    return { data };
  };

  /* ── Sign in with Google OAuth ────────────────────────
   *  Redirects to Google. On success, Google redirects back to
   *  /auth/callback which handles profile completion routing.
   *  Stores the "from" path in sessionStorage so the callback
   *  can redirect back to wherever the user was heading.
   */
  const loginWithGoogle = async (fromPath = '/profile') => {
    // Store destination so /auth/callback can redirect there after login
    sessionStorage.setItem('auth_redirect_from', fromPath);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) {
      console.error('[AuthContext] Google OAuth error:', error);
      return { error: error.message };
    }
    // No return — browser navigates away to Google
  };

  /* ── Sign out ─────────────────────────────────────────── */
  const logout = async () => {
    await supabase.auth.signOut();
    setSupabaseUser(null);
    setProfile(null);
    sessionStorage.removeItem('auth_redirect_from');
  };

  /* ── Update profile row in public.profiles ───────────── */
  const updateProfile = async (updates) => {
    if (!supabaseUser) return { error: 'Not authenticated' };

    const dbUpdates = {};
    if ('full_name' in updates) dbUpdates.full_name = updates.full_name;
    if ('phone'     in updates) dbUpdates.phone     = updates.phone;
    if ('address'   in updates) dbUpdates.address   = updates.address;

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: supabaseUser.id, ...dbUpdates });

    if (!error) {
      setProfile((prev) => ({ ...prev, ...dbUpdates }));
    }
    return { error: error?.message };
  };

  /* ── Derived display shape (compatible with existing UI) ── */
  const userDisplay = supabaseUser
    ? {
        id:       supabaseUser.id,
        email:    supabaseUser.email,
        name:     profile?.full_name
                    || supabaseUser.user_metadata?.full_name
                    || supabaseUser.user_metadata?.name
                    || '',
        phone:    profile?.phone || supabaseUser.user_metadata?.phone || '',
        address:  profile?.address || '',
        avatar:   (
          profile?.full_name
            || supabaseUser.user_metadata?.full_name
            || supabaseUser.user_metadata?.name
            || supabaseUser.email
            || 'U'
        ).charAt(0).toUpperCase(),
        provider: supabaseUser.app_metadata?.provider || 'email',
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user:            userDisplay,        // Derived display object (name, phone, etc.)
        supabaseUser,                        // Raw Supabase User object — null when signed out
        profile,
        loading,
        authReady,                           // True once initial getSession() is done
        isAuthenticated: !!supabaseUser,     // True only when a real Supabase session exists
        register,
        loginWithEmail,
        loginWithGoogle,
        logout,
        updateProfile,
        authModal,
        authModalData,
        openLogin,
        openRegister,
        openForgotPassword,
        openVerifyEmail,
        openResetPassword,
        openCompleteProfile,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
