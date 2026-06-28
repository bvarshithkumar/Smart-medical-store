import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, Loader, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { supabase } from '../../lib/supabase';

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
  </svg>
);

export default function LoginForm() {
  const { loginWithEmail, loginWithGoogle, openForgotPassword, openRegister, authModalData, closeAuthModal } = useAuth();
  const { showToast } = useCart();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [oauthError, setOauthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  // Email confirmation resend states
  const [showUnconfirmedWarning, setShowUnconfirmedWarning] = useState(false);
  const [showVerifiedMessage, setShowVerifiedMessage] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendError, setResendError] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    // Prefill email if saved in localStorage
    const savedEmail = localStorage.getItem('svms_remember_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    // Check query params for verified/oauth success banners
    const params = new URLSearchParams(window.location.search);
    const err = params.get('oauth_error');
    if (err) {
      setOauthError(decodeURIComponent(err));
    }
    if (params.get('verified') === 'true') {
      setShowVerifiedMessage(true);
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleResendVerification = async () => {
    if (cooldown > 0 || resendBusy) return;
    setResendBusy(true);
    setResendError('');
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup-verification`
        }
      });
      if (error) throw error;

      setResendSuccess(true);
      setCooldown(60);
    } catch (err) {
      console.error('[LoginForm] Resend verification error:', err);
      setResendError(err.message || 'Failed to resend verification email.');
    } finally {
      setResendBusy(false);
    }
  };

  const handleGoogle = async () => {
    setOauthError('');
    setErrorMsg('');
    setGoogleBusy(true);
    const redirectPath = authModalData?.from || '/profile';
    const result = await loginWithGoogle(redirectPath);
    if (result?.error) {
      setOauthError(result.error);
      setGoogleBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setOauthError('');

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    // Admin shortcut
    if (email.trim().toLowerCase() === 'admin@svms.com') {
      const session = {
        email: 'admin@svms.com',
        name: 'Store Admin',
        role: 'Super Admin',
        avatar: 'A',
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem('svms_admin_session', JSON.stringify(session));
      showToast('Welcome back, Admin!', 'Success');
      closeAuthModal();
      navigate('/admin', { replace: true });
      return;
    }

    setIsSubmitting(true);
    setShowUnconfirmedWarning(false);
    setResendSuccess(false);
    setResendError('');
    const { error } = await loginWithEmail(email.trim(), password);
    setIsSubmitting(false);

    if (error) {
      const errMsg = error.toLowerCase();
      if (errMsg.includes('email not confirmed') || errMsg.includes('email_not_confirmed')) {
        setShowUnconfirmedWarning(true);
      } else if (errMsg.includes('invalid login') || errMsg.includes('invalid credentials')) {
        setErrorMsg('Incorrect email or password. Please try again.');
      } else {
        setErrorMsg(error);
      }
      return;
    }

    // Remember email logic
    if (rememberMe) {
      localStorage.setItem('svms_remember_email', email.trim());
    } else {
      localStorage.removeItem('svms_remember_email');
    }

    showToast('Login successful! 🎉', 'OK');
    closeAuthModal();
    
    // Redirect if there is a pending path
    if (authModalData?.from) {
      navigate(authModalData.from, { replace: true });
    }
  };

  const hasError = errorMsg || oauthError;

  return (
    <div style={{ textAlign: 'center' }}>
      <div className="success-badge-container" style={{ backgroundColor: 'var(--primary-blue-light)', color: 'var(--primary-blue)', marginBottom: '16px', display: 'inline-flex', padding: '12px', borderRadius: '50%' }}>
        <Lock size={24} />
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Sign In</h2>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
        Access your profile, upload prescriptions, and manage reservations.
      </p>

      {/* Verification success banner */}
      {showVerifiedMessage && (
        <div style={{ background: 'var(--teal-accent-light, #d1fae5)', color: 'var(--teal-accent, #10b981)', borderRadius: '8px', padding: '12px', fontSize: '12.5px', fontWeight: 600, marginBottom: '16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>Email verified successfully. Please sign in.</span>
        </div>
      )}

      {/* Email unconfirmed warning banner */}
      {showUnconfirmedWarning && (
        <div style={{ background: '#fffbeb', color: '#b45309', borderRadius: '8px', padding: '12px', fontSize: '12.5px', fontWeight: 500, marginBottom: '16px', textAlign: 'left', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
            <AlertCircle size={15} style={{ color: '#d97706' }} />
            <span>Please verify your email before signing in.</span>
          </div>
          <button type="button" onClick={handleResendVerification} disabled={cooldown > 0 || resendBusy} style={{ alignSelf: 'flex-start', background: '#d97706', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: (cooldown > 0 || resendBusy) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', opacity: (cooldown > 0 || resendBusy) ? 0.6 : 1 }}>
            {resendBusy ? <Loader size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={10} />}
            {cooldown > 0 ? `Resend Email (${cooldown}s)` : 'Resend Verification Email'}
          </button>
          {resendSuccess && <div style={{ fontSize: '11px', color: '#047857', fontWeight: 600 }}>✓ Verification email resent! Check your inbox.</div>}
          {resendError && <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 600 }}>⚠ {resendError}</div>}
        </div>
      )}

      {/* Error banner */}
      {hasError && (
        <div style={{ background: 'var(--accent-red-light, #fee2e2)', color: 'var(--accent-red, #dc2626)', borderRadius: '8px', padding: '10px 12px', fontSize: '12.5px', fontWeight: 600, marginBottom: '16px', textAlign: 'left' }}>
          ⚠ {errorMsg || oauthError}
        </div>
      )}

      {/* Continue with Google */}
      <button id="google-signin-btn" type="button" onClick={handleGoogle} disabled={googleBusy || isSubmitting} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', padding: '11px 16px', background: googleBusy ? '#f8f9fa' : '#ffffff', border: '1px solid #dadce0', borderRadius: '8px', cursor: googleBusy ? 'wait' : 'pointer', fontSize: '13.5px', fontWeight: 600, color: '#3c4043', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'background 0.2s', marginBottom: '16px', opacity: isSubmitting ? 0.6 : 1 }}>
        {googleBusy ? <Loader size={16} style={{ animation: 'spin 1s linear infinite', color: '#4285F4' }} /> : <GoogleLogo />}
        {googleBusy ? 'Redirecting to Google…' : 'Continue with Google'}
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--text-light)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
        or
        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
      </div>

      {/* Email / Password Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' }}>Email Address</label>
          <div style={{ position: 'relative' }}>
            <input id="login-email" type="email" className="search-input" placeholder="example@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', outline: 'none', paddingRight: '40px' }} required disabled={isSubmitting || googleBusy} />
            <Mail size={15} style={{ position: 'absolute', right: '12px', top: '15px', color: 'var(--text-light)' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input id="login-password" type={showPw ? 'text' : 'password'} className="search-input" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', outline: 'none', paddingRight: '40px' }} required disabled={isSubmitting || googleBusy} />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '12px', top: '15px', border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-light)' }}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-4px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ cursor: 'pointer' }} />
            Remember me
          </label>
          <button type="button" onClick={() => openForgotPassword(authModalData?.from)} style={{ background: 'none', border: 'none', color: 'var(--primary-blue, #0284c7)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
            Forgot Password?
          </button>
        </div>

        <button type="submit" className="reservation-cta-btn" disabled={isSubmitting || googleBusy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: isSubmitting ? 0.7 : 1 }}>
          {isSubmitting ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</> : 'Log In with Email'}
        </button>
      </form>

      {/* Footer Register Link */}
      <div style={{ marginTop: '16px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
        Don't have an account?{' '}
        <button type="button" onClick={() => openRegister(authModalData?.from)} style={{ background: 'none', border: 'none', color: 'var(--primary-blue, #0284c7)', fontWeight: 700, cursor: 'pointer', fontSize: '12.5px', padding: 0, textDecoration: 'underline' }}>
          Register here
        </button>
      </div>

      <div style={{ marginTop: '14px', fontSize: '10.5px', color: 'var(--text-light)', lineHeight: '1.4' }}>
        By continuing, you agree to Sri Venkateshwara Medical Store's terms and privacy policies.
      </div>
    </div>
  );
}
