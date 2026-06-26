import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * AuthCallback
 * ============
 * Landing page for Supabase OAuth redirects (Google, etc.).
 *
 * Flow:
 *  1. Supabase SDK (detectSessionInUrl: true) auto-parses the session
 *     from the URL and fires onAuthStateChange → supabaseUser is set.
 *  2. We wait for authReady + supabaseUser.
 *  3. Upsert minimal profile for first-time Google users.
 *  4. Check if profile.phone is set:
 *       - Missing → /complete-profile (collect phone number)
 *       - Present  → redirect to original destination or /profile
 *  5. On any error → redirect to /login?error=<message>
 */
const AuthCallback = () => {
  const { supabaseUser, authReady } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [status, setStatus] = useState('Completing sign-in…');

  useEffect(() => {
    // Check URL for OAuth error params (e.g. user cancelled)
    const params   = new URLSearchParams(location.hash.replace('#', '?') || location.search);
    const errCode  = params.get('error');
    const errDesc  = params.get('error_description');

    if (errCode) {
      console.error('[AuthCallback] OAuth error:', errCode, errDesc);
      const msg = errDesc?.replace(/\+/g, ' ') || 'Authentication failed.';
      navigate(`/login?oauth_error=${encodeURIComponent(msg)}`, { replace: true });
      return;
    }

    const hashParams = new URLSearchParams(location.hash.replace('#', '?'));
    const flowType = hashParams.get('type') || params.get('type');

    if (flowType === 'signup' || flowType === 'signup-verification') {
      setStatus('Email verified! Finalizing verification...');
      supabase.auth.signOut().then(() => {
        navigate('/?verified=true', { replace: true });
      });
      return;
    }

    if (flowType === 'recovery') {
      setStatus('Loading password reset session...');
      navigate('/?reset=true', { replace: true });
      return;
    }

    if (!authReady) return; // Still loading session

    if (!supabaseUser) {
      // Auth ready but no user — user may have cancelled or session expired
      navigate('/login?oauth_error=Sign-in+was+cancelled+or+timed+out.', { replace: true });
      return;
    }

    const handleProfile = async () => {
      try {
        setStatus('Setting up your account…');

        // ── 1. Upsert profile for Google users (safe for email users too) ──
        const googleName =
          supabaseUser.user_metadata?.full_name ||
          supabaseUser.user_metadata?.name ||
          '';

        await supabase.from('profiles').upsert(
          {
            id:            supabaseUser.id,
            full_name:     googleName || undefined,
            email:         supabaseUser.email,
            role:          'customer',
            customer_type: 'registered',
          },
          { onConflict: 'id', ignoreDuplicates: false }
        );

        // ── 2. Fetch the profile to check phone ───────────────────────────
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('phone, full_name')
          .eq('id', supabaseUser.id)
          .maybeSingle();

        if (profileErr) throw profileErr;

        // ── 3. Decide where to send the user ─────────────────────────────
        const from = sessionStorage.getItem('auth_redirect_from') || '/profile';
        sessionStorage.removeItem('auth_redirect_from');

        const hasPhone = profile?.phone && profile.phone.replace(/\D/g, '').length >= 10;

        if (!hasPhone) {
          setStatus('Almost there — just need your phone number…');
          navigate(`/?auth=complete-profile&from=${encodeURIComponent(from)}`, { replace: true });
        } else {
          setStatus('Welcome back!');
          navigate(from, { replace: true });
        }
      } catch (err) {
        console.error('[AuthCallback] Profile setup error:', err);
        navigate('/?auth=login&oauth_error=' + encodeURIComponent('Profile setup failed. Please try again.'), {
          replace: true,
        });
      }
    };

    handleProfile();
  }, [authReady, supabaseUser, location, navigate]);

  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        minHeight:      '100vh',
        gap:            '20px',
        background:     'var(--bg-primary, #f8fafc)',
      }}
    >
      {/* Animated spinner */}
      <div
        style={{
          width:        '64px',
          height:       '64px',
          borderRadius: '50%',
          background:   'var(--primary-blue-light, #dbeafe)',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
        }}
      >
        <Loader2
          size={32}
          style={{
            color:     'var(--primary-blue, #2563eb)',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            fontSize:   '16px',
            fontWeight: 600,
            color:      'var(--text-primary, #1e293b)',
            margin:     '0 0 6px',
          }}
        >
          {status}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', margin: 0 }}>
          Please wait while we set up your account.
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
