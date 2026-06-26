import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Phone, Eye, EyeOff, User, Loader, CheckCircle, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

/* ── Official Google "G" multicolor logo ── */
const GoogleLogo = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      fill="#4285F4"
    />
    <path
      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      fill="#34A853"
    />
    <path
      d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      fill="#FBBC05"
    />
    <path
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      fill="#EA4335"
    />
  </svg>
);

const Register = () => {
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [showCpw, setShowCpw]     = useState(false);

  const [errorMsg, setErrorMsg]         = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy]     = useState(false);
  const [success, setSuccess]           = useState(false);

  // Verification email resend states
  const [cooldown, setCooldown]         = useState(0);
  const [resendBusy, setResendBusy]     = useState(false);
  const [resendError, setResendError]   = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);

  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  /* ── Resend Verification Email using Supabase Auth ──── */
  const handleResendEmail = async () => {
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
      console.error('[Register] resend error:', err);
      setResendError(err.message || 'Failed to resend verification email.');
    } finally {
      setResendBusy(false);
    }
  };

  /* ── Google Sign-Up ──────────────────────────────────── */
  const handleGoogle = async () => {
    setErrorMsg('');
    setGoogleBusy(true);
    const result = await loginWithGoogle(location.state?.from || '/profile');
    if (result?.error) {
      setErrorMsg(result.error);
      setGoogleBusy(false);
    }
    // Normal: browser navigates to Google — component unmounts
  };

  /* ── Email / Password Registration ──────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (phone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPw) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await register({
      name: name.trim(),
      email: email.trim(),
      phone,
      password,
      redirectTo: `${window.location.origin}/auth/callback?type=signup-verification`
    });
    setIsSubmitting(false);

    if (result?.error) {
      const msg = result.error.toLowerCase();
      if (msg.includes('already registered') || msg.includes('user already exists') || msg.includes('already exists')) {
        setErrorMsg('An account with this email already exists. Please log in or use Forgot Password.');
      } else if (msg.includes('password')) {
        setErrorMsg('Password is too weak. Please use at least 6 characters with letters and numbers.');
      } else if (msg.includes('network')) {
        setErrorMsg('Network failure. Please check your internet connection and try again.');
      } else if (msg.includes('invalid email') || msg.includes('email is invalid') || msg.includes('invalid_email')) {
        setErrorMsg('Please enter a valid email address.');
      } else {
        setErrorMsg(result.error);
      }
      return;
    }

    if (result?.requiresConfirmation) {
      setSuccess(true);
      setCooldown(60); // Auto start cooldown for the first email sent
    } else {
      navigate(location.state?.from || '/profile', { replace: true });
    }
  };

  const inputStyle = { width: '100%', outline: 'none', paddingRight: '40px' };
  const labelStyle = {
    display:       'block',
    fontSize:      '12px',
    fontWeight:    700,
    color:         'var(--text-secondary)',
    marginBottom:  '6px',
    textTransform: 'uppercase',
  };
  const iconStyle = { position: 'absolute', right: '12px', top: '15px', color: 'var(--text-light)' };

  /* ── Email-confirmation success screen ─────────────── */
  if (success) {
    return (
      <div className="app-shell">
        <Navbar showSearch={false} />
        <main
          className="reservation-main"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 120px)', padding: '20px' }}
        >
          <div className="summary-card" style={{ width: '100%', maxWidth: '420px', padding: '40px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'var(--teal-accent-light, #d1fae5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <CheckCircle size={32} style={{ color: 'var(--teal-accent, #10b981)' }} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Verify Your Email
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
              We've sent a verification link to:<br />
              <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.<br />
              Click it to activate your account, then log in.
            </p>

            {resendError && (
              <div
                style={{
                  background: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '16px',
                  textAlign: 'left'
                }}
              >
                ⚠ {resendError}
              </div>
            )}

            {resendSuccess && (
              <div
                style={{
                  background: '#d1fae5',
                  color: '#10b981',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '16px'
                }}
              >
                ✓ Verification email resent successfully!
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="reservation-cta-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  marginTop: 0,
                  height: '48px',
                  fontWeight: 700
                }}
              >
                Open Gmail
              </a>

              <button
                type="button"
                className="download-btn"
                onClick={handleResendEmail}
                disabled={cooldown > 0 || resendBusy}
                style={{
                  width: '100%',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: (cooldown > 0 || resendBusy) ? 'not-allowed' : 'pointer'
                }}
              >
                {resendBusy ? (
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <RefreshCw size={16} />
                )}
                {cooldown > 0 ? `Resend Email (${cooldown}s)` : 'Resend Verification Email'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login', { state: { from: location.state?.from } })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-blue, #0284c7)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: '8px 0',
                  textDecoration: 'underline'
                }}
              >
                Back to Login
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ── Registration form ──────────────────────────────── */
  return (
    <div className="app-shell">
      <Navbar showSearch={false} />

      <main
        className="reservation-main"
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          minHeight:      'calc(100vh - 120px)',
          padding:        '20px',
        }}
      >
        <div
          className="summary-card"
          style={{ width: '100%', maxWidth: '420px', padding: '32px 24px', textAlign: 'center' }}
        >
          {/* Icon */}
          <div
            className="success-badge-container"
            style={{ backgroundColor: 'var(--primary-blue-light)', color: 'var(--primary-blue)', marginBottom: '20px' }}
          >
            <UserPlus size={28} />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Create an Account
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
            Sign up to track reservations, upload prescriptions, and manage your profile.
          </p>

          {/* Error banner */}
          {errorMsg && (
            <div
              style={{
                background:   'var(--accent-red-light, #fee2e2)',
                color:        'var(--accent-red, #dc2626)',
                borderRadius: '10px',
                padding:      '10px 14px',
                fontSize:     '13px',
                fontWeight:   600,
                marginBottom: '20px',
                textAlign:    'left',
              }}
            >
              ⚠ {errorMsg}
            </div>
          )}

          {/* ── Continue with Google ─────────────────────── */}
          <button
            id="google-register-btn"
            type="button"
            onClick={handleGoogle}
            disabled={googleBusy || isSubmitting}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '10px',
              width:          '100%',
              padding:        '12px 16px',
              background:     googleBusy ? '#f8f9fa' : '#ffffff',
              border:         '1px solid #dadce0',
              borderRadius:   '10px',
              cursor:         googleBusy ? 'wait' : 'pointer',
              fontSize:       '14px',
              fontWeight:     600,
              color:          '#3c4043',
              boxShadow:      '0 1px 3px rgba(0,0,0,0.08)',
              transition:     'box-shadow 0.2s, background 0.2s',
              marginBottom:   '20px',
              opacity:        isSubmitting ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!googleBusy) {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                e.currentTarget.style.background = '#f8f9fa';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
              e.currentTarget.style.background = googleBusy ? '#f8f9fa' : '#ffffff';
            }}
          >
            {googleBusy ? (
              <Loader size={18} style={{ animation: 'spin 1s linear infinite', color: '#4285F4' }} />
            ) : (
              <GoogleLogo />
            )}
            {googleBusy ? 'Redirecting to Google…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div
            style={{
              display:       'flex',
              alignItems:    'center',
              gap:           '12px',
              marginBottom:  '20px',
              color:         'var(--text-light, #94a3b8)',
              fontSize:      '12px',
              fontWeight:    600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color, #e2e8f0)' }} />
            or register with email
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color, #e2e8f0)' }} />
          </div>

          {/* Email / Password registration form */}
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' }}
          >
            {/* Full Name */}
            <div>
              <label style={labelStyle}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-name"
                  type="text"
                  className="search-input"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                  required
                />
                <User size={16} style={iconStyle} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-email"
                  type="email"
                  className="search-input"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  required
                />
                <Mail size={16} style={iconStyle} />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label style={labelStyle}>Mobile Number</label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position:  'absolute',
                    left:      '12px',
                    top:       '14px',
                    fontSize:  '14px',
                    fontWeight: 700,
                    color:     'var(--text-primary)',
                  }}
                >
                  +91
                </span>
                <input
                  id="reg-phone"
                  type="tel"
                  className="search-input"
                  placeholder="10-digit number"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  style={{ ...inputStyle, paddingLeft: '48px' }}
                  required
                />
                <Phone size={16} style={iconStyle} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  className="search-input"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: '12px', top: '15px', border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-light)' }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-confirm-password"
                  type={showCpw ? 'text' : 'password'}
                  className="search-input"
                  placeholder="Re-enter your password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  style={inputStyle}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCpw(!showCpw)}
                  style={{ position: 'absolute', right: '12px', top: '15px', border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-light)' }}
                >
                  {showCpw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="reservation-cta-btn"
              style={{ marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: isSubmitting ? 0.7 : 1 }}
              disabled={isSubmitting || googleBusy}
            >
              {isSubmitting
                ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating account…</>
                : 'Create Account'}
            </button>
          </form>

          {/* Back to login */}
          <div style={{ marginTop: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login', { state: { from: location.state?.from } })}
              style={{ background: 'none', border: 'none', color: 'var(--primary-blue, #0284c7)', fontWeight: 700, cursor: 'pointer', fontSize: '13px', padding: 0, textDecoration: 'underline' }}
            >
              Log in here
            </button>
          </div>

          <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-light)', lineHeight: '1.4' }}>
            By registering, you agree to Sri Venkateshwara Medical Store's terms and privacy policies.
          </div>
        </div>
      </main>
    </div>
  );
};

export default Register;
