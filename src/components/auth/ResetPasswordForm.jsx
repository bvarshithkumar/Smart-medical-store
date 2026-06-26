import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Loader, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { supabase } from '../../lib/supabase';

export default function ResetPasswordForm() {
  const { openLogin } = useAuth();
  const { showToast } = useCart();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfPw, setShowConfPw] = useState(false);

  const [step, setStep] = useState('ENTER_PASSWORD'); // ENTER_PASSWORD | SUCCESS
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
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
      showToast('Password reset successfully!', 'OK');
      setTimeout(() => {
        openLogin();
      }, 2500);
    } catch (err) {
      console.error('[ResetPasswordForm] Password update failed:', err);
      if (err.message.toLowerCase().includes('weak')) {
        setErrorMsg('Password is too weak. Please use a stronger password.');
      } else {
        setErrorMsg(err.message || 'Failed to reset password. Link might be expired.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (step === 'SUCCESS') {
    return (
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <div className="success-badge-container" style={{ backgroundColor: 'var(--teal-accent-light, #d1fae5)', color: 'var(--teal-accent, #10b981)', marginBottom: '16px', display: 'inline-flex', padding: '12px', borderRadius: '50%' }}>
          <CheckCircle2 size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Reset Complete!</h2>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          Your password has been successfully updated. You will be redirected to the sign in page momentarily.
        </p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div className="success-badge-container" style={{ backgroundColor: 'var(--primary-blue-light)', color: 'var(--primary-blue)', marginBottom: '16px', display: 'inline-flex', padding: '12px', borderRadius: '50%' }}>
        <Lock size={24} />
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Set New Password</h2>
      <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
        Please choose a strong, secure new password for your store account.
      </p>

      {errorMsg && (
        <div style={{ background: 'var(--accent-red-light, #fee2e2)', color: 'var(--accent-red, #dc2626)', borderRadius: '8px', padding: '10px 12px', fontSize: '12.5px', fontWeight: 600, marginBottom: '16px', textAlign: 'left' }}>
          ⚠ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' }}>New Password</label>
          <div style={{ position: 'relative' }}>
            <input type={showNewPw ? 'text' : 'password'} className="search-input" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: '100%', outline: 'none', paddingRight: '40px' }} required disabled={busy} />
            <button type="button" onClick={() => setShowNewPw(!showNewPw)} style={{ position: 'absolute', right: '12px', top: '15px', border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-light)' }}>
              {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' }}>Confirm New Password</label>
          <div style={{ position: 'relative' }}>
            <input type={showConfPw ? 'text' : 'password'} className="search-input" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: '100%', outline: 'none', paddingRight: '40px' }} required disabled={busy} />
            <button type="button" onClick={() => setShowConfPw(!showConfPw)} style={{ position: 'absolute', right: '12px', top: '15px', border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-light)' }}>
              {showConfPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button type="submit" className="reservation-cta-btn" disabled={busy || !newPassword || !confirmPassword} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
          {busy ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Updating password…</> : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}
