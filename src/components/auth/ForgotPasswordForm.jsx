import React, { useState, useEffect } from 'react';
import { Mail, KeyRound, Loader, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordForm() {
  const { openLogin, authModalData } = useAuth();

  const [email, setEmail] = useState('');
  const [step, setStep] = useState('ENTER_EMAIL'); // ENTER_EMAIL | CHECK_EMAIL
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Resend cooldown timer states
  const [cooldown, setCooldown] = useState(0);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleRequestLink = async (e) => {
    e.preventDefault();
    if (!email) return;

    setErrorMsg('');
    setBusy(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`
      });

      if (error) throw error;

      setStep('CHECK_EMAIL');
      setCooldown(60);
    } catch (err) {
      console.error('[ForgotPasswordForm] Reset request failed:', err);
      setErrorMsg(err.message || 'Failed to send recovery email. Please check the address.');
    } finally {
      setBusy(false);
    }
  };

  const handleResendLink = async () => {
    if (cooldown > 0 || resendBusy) return;
    setResendBusy(true);
    setResendSuccess(false);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`
      });

      if (error) throw error;

      setResendSuccess(true);
      setCooldown(60);
    } catch (err) {
      console.error('[ForgotPasswordForm] Resend failed:', err);
      setErrorMsg(err.message || 'Failed to resend recovery email.');
    } finally {
      setResendBusy(false);
    }
  };

  if (step === 'CHECK_EMAIL') {
    return (
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <div className="success-badge-container" style={{ backgroundColor: 'var(--primary-blue-light, #dbeafe)', color: 'var(--primary-blue, #2563eb)', marginBottom: '16px', display: 'inline-flex', padding: '12px', borderRadius: '50%' }}>
          <Mail size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>Check Your Email</h2>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
          We've sent a recovery link to:<br />
          <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.<br />
          Click the link in the email to reset your password.
        </p>

        {resendSuccess && (
          <div style={{ background: 'var(--teal-accent-light, #d1fae5)', color: 'var(--teal-accent, #10b981)', borderRadius: '8px', padding: '10px 12px', fontSize: '12.5px', fontWeight: 600, marginBottom: '16px', textAlign: 'left' }}>
            ✓ Recovery email resent successfully.
          </div>
        )}

        {errorMsg && (
          <div style={{ background: 'var(--accent-red-light, #fee2e2)', color: 'var(--accent-red, #dc2626)', borderRadius: '8px', padding: '10px 12px', fontSize: '12.5px', fontWeight: 600, marginBottom: '16px', textAlign: 'left' }}>
            ⚠ {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" className="reservation-cta-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', marginTop: 0, height: '48px', fontWeight: 700 }}>
            Open Gmail
          </a>

          <button type="button" className="download-btn" onClick={handleResendLink} disabled={cooldown > 0 || resendBusy} style={{ width: '100%', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: (cooldown > 0 || resendBusy) ? 'not-allowed' : 'pointer' }}>
            {resendBusy ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
            {cooldown > 0 ? `Resend Link (${cooldown}s)` : 'Resend Reset Link'}
          </button>

          <button type="button" onClick={() => setStep('ENTER_EMAIL')} style={{ background: 'none', border: 'none', color: 'var(--primary-blue, #0284c7)', fontWeight: 700, cursor: 'pointer', fontSize: '13px', padding: '8px 0', textDecoration: 'underline' }}>
            Change email address
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Back button */}
      <button type="button" onClick={() => openLogin(authModalData?.from)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginBottom: '16px', padding: 0 }}>
        &larr; Back to Login
      </button>

      <div style={{ textAlign: 'center' }}>
        <div className="success-badge-container" style={{ backgroundColor: 'var(--primary-blue-light)', color: 'var(--primary-blue)', marginBottom: '16px', display: 'inline-flex', padding: '12px', borderRadius: '50%' }}>
          <KeyRound size={24} />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Reset Password</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
          Enter your email address below and we'll send you a link to reset your account password.
        </p>

        {errorMsg && (
          <div style={{ background: 'var(--accent-red-light, #fee2e2)', color: 'var(--accent-red, #dc2626)', borderRadius: '8px', padding: '10px 12px', fontSize: '12.5px', fontWeight: 600, marginBottom: '16px', textAlign: 'left' }}>
            ⚠ {errorMsg}
          </div>
        )}

        <form onSubmit={handleRequestLink} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <input type="email" className="search-input" placeholder="yourname@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', outline: 'none', paddingRight: '40px' }} required disabled={busy} />
              <Mail size={15} style={{ position: 'absolute', right: '12px', top: '15px', color: 'var(--text-light)' }} />
            </div>
          </div>

          <button type="submit" className="reservation-cta-btn" disabled={busy || !email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
            {busy ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending Email…</> : 'Request Reset Link'}
          </button>
        </form>
      </div>
    </div>
  );
}
