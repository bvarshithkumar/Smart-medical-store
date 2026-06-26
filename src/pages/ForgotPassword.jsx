import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, KeyRound, Eye, EyeOff, Loader, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { showToast } = useCart();
  const [searchParams] = useSearchParams();

  // step: 'ENTER_EMAIL' | 'CHECK_EMAIL' | 'ENTER_PASSWORD' | 'SUCCESS'
  const [step, setStep] = useState('ENTER_EMAIL');
  const [email, setEmail] = useState('');

  // Passwords
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfPw, setShowConfPw] = useState(false);

  // States
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cooldown for resending password reset link
  const [cooldown, setCooldown] = useState(0);
  const [resendBusy, setResendBusy] = useState(false);

  // Check URL on mount for reset session landing
  useEffect(() => {
    if (searchParams.get('reset') === 'true') {
      setStep('ENTER_PASSWORD');
    }
  }, [searchParams]);

  // Countdown timer for cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Step 1: Request reset link email
  const handleRequestLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setBusy(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`
      });

      if (error) throw error;

      setStep('CHECK_EMAIL');
      setCooldown(60);
      showToast('Password reset link sent to your email.', 'OK');
    } catch (err) {
      console.error('[ForgotPassword] Reset link request failed:', err);
      if (err.message.toLowerCase().includes('network')) {
        setErrorMsg('Network failure. Please check your internet connection.');
      } else {
        setErrorMsg(err.message || 'Failed to send reset link email.');
      }
    } finally {
      setBusy(false);
    }
  };

  // Resend reset link
  const handleResendLink = async () => {
    if (cooldown > 0 || resendBusy) return;
    setResendBusy(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`
      });

      if (error) throw error;

      setCooldown(60);
      showToast('Password reset link resent successfully.', 'OK');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to resend link.');
    } finally {
      setResendBusy(false);
    }
  };

  // Step 3: Reset password form submission
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setStep('SUCCESS');
      showToast('Password reset successfully! Redirecting to login...', 'OK');
      setTimeout(() => {
        navigate('/login', { replace: true, state: { from: location.state?.from } });
      }, 2500);
    } catch (err) {
      console.error('[ForgotPassword] Password update failed:', err);
      if (err.message.toLowerCase().includes('weak')) {
        setErrorMsg('Password is too weak. Please use a stronger password.');
      } else {
        setErrorMsg(err.message || 'Failed to reset password. Link might be expired.');
      }
    } finally {
      setBusy(false);
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

  return (
    <div className="app-shell">
      <Navbar showSearch={false} />

      <main
        className="reservation-main"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 120px)',
          padding: '20px',
        }}
      >
        <div
          className="summary-card"
          style={{ width: '100%', maxWidth: '420px', padding: '32px 20px', textAlign: 'center' }}
        >
          {/* Back button */}
          {step !== 'SUCCESS' && step !== 'CHECK_EMAIL' && step !== 'ENTER_PASSWORD' && (
            <button
              type="button"
              onClick={() => navigate('/login', { state: { from: location.state?.from } })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '20px',
                padding: 0,
              }}
            >
              <ArrowLeft size={16} />
              Back to Login
            </button>
          )}

          {step === 'SUCCESS' && (
            <div style={{ padding: '20px 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#d1fae5',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Reset Complete!
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Your password has been successfully updated. You will be redirected to the sign in page momentarily.
              </p>
            </div>
          )}

          {step === 'CHECK_EMAIL' && (
            <div style={{ padding: '10px 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--primary-blue-light, #dbeafe)',
                  color: 'var(--primary-blue, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <Mail size={32} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
                Check Your Email
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
                We've sent a recovery link to:<br />
                <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.<br />
                Click the link in the email to reset your password.
              </p>

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
                  onClick={handleResendLink}
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
                  {cooldown > 0 ? `Resend Link (${cooldown}s)` : 'Resend Reset Link'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('ENTER_EMAIL')}
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
                  Change email address
                </button>
              </div>
            </div>
          )}

          {step === 'ENTER_EMAIL' && (
            <>
              {/* Badge Icon */}
              <div
                className="success-badge-container"
                style={{
                  backgroundColor: 'var(--primary-blue-light)',
                  color: 'var(--primary-blue)',
                  marginBottom: '20px',
                }}
              >
                <KeyRound size={28} />
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Reset Password
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.4' }}>
                Enter your email address below and we'll send you a link to reset your account password.
              </p>

              {/* Error banner */}
              {errorMsg && (
                <div
                  style={{
                    background:   '#fee2e2',
                    color:        '#dc2626',
                    borderRadius: '10px',
                    padding:      '10px 14px',
                    fontSize:     '13px',
                    fontWeight:   600,
                    marginBottom: '16px',
                    textAlign:    'left',
                  }}
                >
                  ⚠ {errorMsg}
                </div>
              )}

              <form onSubmit={handleRequestLink} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      className="search-input"
                      placeholder="yourname@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={inputStyle}
                      required
                      disabled={busy}
                    />
                    <Mail size={16} style={iconStyle} />
                  </div>
                </div>

                <button
                  type="submit"
                  className="reservation-cta-btn"
                  disabled={busy || !email}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}
                >
                  {busy ? (
                    <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending Email…</>
                  ) : (
                    'Request Reset Link'
                  )}
                </button>
              </form>
            </>
          )}

          {step === 'ENTER_PASSWORD' && (
            <>
              {/* Badge Icon */}
              <div
                className="success-badge-container"
                style={{
                  backgroundColor: 'var(--primary-blue-light)',
                  color: 'var(--primary-blue)',
                  marginBottom: '20px',
                }}
              >
                <Lock size={28} />
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Set New Password
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.4' }}>
                Please choose a strong, secure new password for your store account.
              </p>

              {/* Error banner */}
              {errorMsg && (
                <div
                  style={{
                    background:   '#fee2e2',
                    color:        '#dc2626',
                    borderRadius: '10px',
                    padding:      '10px 14px',
                    fontSize:     '13px',
                    fontWeight:   600,
                    marginBottom: '16px',
                    textAlign:    'left',
                  }}
                >
                  ⚠ {errorMsg}
                </div>
              )}

              <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                <div>
                  <label style={labelStyle}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      className="search-input"
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={inputStyle}
                      required
                      disabled={busy}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      style={{ position: 'absolute', right: '12px', top: '15px', border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-light)' }}
                    >
                      {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfPw ? 'text' : 'password'}
                      className="search-input"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={inputStyle}
                      required
                      disabled={busy}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfPw(!showConfPw)}
                      style={{ position: 'absolute', right: '12px', top: '15px', border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-light)' }}
                    >
                      {showConfPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="reservation-cta-btn"
                  disabled={busy || !newPassword || !confirmPassword}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}
                >
                  {busy ? (
                    <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Updating password…</>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
