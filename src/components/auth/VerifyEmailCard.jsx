import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function VerifyEmailCard() {
  const { authModalData, openLogin } = useAuth();
  const email = authModalData?.email || 'your email address';

  const [cooldown, setCooldown] = useState(60); // Auto-start cooldown
  const [resendBusy, setResendBusy] = useState(false);
  const [resendError, setResendError] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleResendEmail = async () => {
    if (cooldown > 0 || resendBusy) return;
    setResendBusy(true);
    setResendError('');
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup-verification`
        }
      });

      if (error) throw error;

      setResendSuccess(true);
      setCooldown(60);
    } catch (err) {
      console.error('[VerifyEmailCard] resend error:', err);
      setResendError(err.message || 'Failed to resend verification email.');
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '10px 0' }}>
      <div className="success-badge-container" style={{ backgroundColor: 'var(--primary-blue-light)', color: 'var(--primary-blue)', marginBottom: '16px', display: 'inline-flex', padding: '12px', borderRadius: '50%' }}>
        <Mail size={32} />
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>Verify Your Email</h2>
      
      <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
        We've sent a confirmation link to:<br />
        <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.<br />
        Please click the link in the email to activate your account.
      </p>

      {resendSuccess && (
        <div style={{ background: 'var(--teal-accent-light, #d1fae5)', color: 'var(--teal-accent, #10b981)', borderRadius: '8px', padding: '10px 12px', fontSize: '12.5px', fontWeight: 600, marginBottom: '16px', textAlign: 'left' }}>
          ✓ Verification email resent! Check your inbox.
        </div>
      )}

      {resendError && (
        <div style={{ background: 'var(--accent-red-light, #fee2e2)', color: 'var(--accent-red, #dc2626)', borderRadius: '8px', padding: '10px 12px', fontSize: '12.5px', fontWeight: 600, marginBottom: '16px', textAlign: 'left' }}>
          ⚠ {resendError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" className="reservation-cta-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', marginTop: 0, height: '48px', fontWeight: 700 }}>
          Open Gmail
        </a>

        <button type="button" className="download-btn" onClick={handleResendEmail} disabled={cooldown > 0 || resendBusy} style={{ width: '100%', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: (cooldown > 0 || resendBusy) ? 'not-allowed' : 'pointer' }}>
          {resendBusy ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
          {cooldown > 0 ? `Resend Email (${cooldown}s)` : 'Resend Verification Email'}
        </button>

        <button type="button" onClick={() => openLogin(authModalData?.from)} style={{ background: 'none', border: 'none', color: 'var(--primary-blue, #0284c7)', fontWeight: 700, cursor: 'pointer', fontSize: '13px', padding: '8px 0', textDecoration: 'underline' }}>
          Back to Login
        </button>
      </div>
    </div>
  );
}
