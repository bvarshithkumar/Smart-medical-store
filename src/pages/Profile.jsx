import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Save, Mail, MapPin, Phone, History, Loader, AlertCircle, CheckCircle2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { fetchWithTimeout } from '../hooks/useFetchWithTimeout';
import { SkeletonList, ErrorState, EmptyState } from '../components/LoadingStates';

import { verificationService } from '../services/verification/verificationService';
import { otpService } from '../services/verification/otpService';
import { VERIFICATION_TYPES } from '../services/verification/verificationTypes';

const Profile = () => {
  const { user, logout, updateProfile, isAuthenticated } = useAuth();
  const { showToast } = useCart();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  // Email verification modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmailPending, setNewEmailPending] = useState('');
  const [emailOtp, setEmailOtp] = useState(['', '', '', '', '', '']);
  const [emailOtpBusy, setEmailOtpBusy] = useState(false);
  const [emailOtpError, setEmailOtpError] = useState('');
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const emailInputRefs = React.useRef([]);

  useEffect(() => {
    if (!showEmailModal) return;
    const interval = setInterval(() => {
      setEmailCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [showEmailModal]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setAddress(user.address || '');
    }
  }, [user]);

  const fetchOrderHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const data = await fetchWithTimeout(async (signal) => {
        const { data, error } = await supabase
          .from('pickup_reservations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .abortSignal(signal);

        if (error) throw error;
        return data || [];
      });
      setHistoryItems(data);
    } catch (e) {
      console.error('Error fetching reservation history:', e);
      setHistoryError(e.message || 'Failed to load reservation history.');
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrderHistory();
  }, [fetchOrderHistory]);

  if (!user) return null;

  const handleSave = async (e) => {
    e.preventDefault();

    const targetEmail = email.trim().toLowerCase();
    const currentEmail = user.email.toLowerCase();

    if (targetEmail !== currentEmail) {
      // Trigger Email verification modal flow
      setNewEmailPending(targetEmail);
      setEmailOtp(['', '', '', '', '', '']);
      setEmailOtpError('');
      setEmailSuccess(false);
      setEmailOtpBusy(true);
      setShowEmailModal(true);

      try {
        await verificationService.startEmailChange(targetEmail);
        setEmailCooldown(60);
        showToast('Verification code sent to your new email address.', 'OK');
        setTimeout(() => {
          if (emailInputRefs.current[0]) emailInputRefs.current[0].focus();
        }, 100);
      } catch (err) {
        console.error('[Profile] startEmailChange failed:', err);
        showToast(err.message || 'Failed to request verification code.', 'OK');
        setShowEmailModal(false);
      } finally {
        setEmailOtpBusy(false);
      }
      return;
    }

    const { error } = await updateProfile({ full_name: name, address });
    if (error) {
      showToast('Failed to save profile. Please try again.', 'OK');
    } else {
      showToast('Profile updated successfully!', 'OK');
    }
  };

  const handleEmailOtpChange = (val, index) => {
    if (isNaN(val)) return;
    const newOtp = [...emailOtp];
    newOtp[index] = val.substring(val.length - 1);
    setEmailOtp(newOtp);
    setEmailOtpError('');

    if (val && index < 5) {
      emailInputRefs.current[index + 1].focus();
    }

    const fullOtp = newOtp.join('');
    if (fullOtp.length === 6) {
      handleEmailVerifyOTP(fullOtp);
    }
  };

  const handleEmailOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!emailOtp[index] && index > 0) {
        const newOtp = [...emailOtp];
        newOtp[index - 1] = '';
        setEmailOtp(newOtp);
        emailInputRefs.current[index - 1].focus();
      }
    }
  };

  const handleEmailOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const chars = pasted.split('');
      setEmailOtp(chars);
      emailInputRefs.current[5].focus();
      handleEmailVerifyOTP(pasted);
    }
  };

  const handleEmailVerifyOTP = async (otpCode) => {
    setEmailOtpBusy(true);
    setEmailOtpError('');
    try {
      // Store userId in sessionStorage just in case downstream requires it
      sessionStorage.setItem('email_change_user_id', user.id);
      await verificationService.completeEmailChange(user.id, newEmailPending, otpCode);
      setEmailSuccess(true);
      showToast('Email address updated successfully! Logging out to apply...', 'OK');
      
      // Auto save other profile updates since email verified
      await updateProfile({ full_name: name, address });

      setTimeout(async () => {
        setShowEmailModal(false);
        sessionStorage.removeItem('email_change_user_id');
        await logout();
        navigate('/login', { replace: true });
      }, 2500);
    } catch (err) {
      console.error('[Profile] completeEmailChange failed:', err);
      setEmailOtpError(err.message || 'Invalid verification code.');
      setEmailOtp(['', '', '', '', '', '']);
      if (emailInputRefs.current[0]) emailInputRefs.current[0].focus();
    } finally {
      setEmailOtpBusy(false);
    }
  };

  const handleEmailResendOTP = async () => {
    if (emailCooldown > 0 || emailOtpBusy) return;
    setEmailOtpBusy(true);
    setEmailOtpError('');
    try {
      await otpService.sendOTP(newEmailPending, VERIFICATION_TYPES.EMAIL_CHANGE);
      setEmailCooldown(60);
      showToast('A new verification code has been sent.', 'OK');
    } catch (err) {
      setEmailOtpError(err.message || 'Failed to resend code.');
    } finally {
      setEmailOtpBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast('Logged out successfully.', 'OK');
    navigate('/');
  };

  return (
    <div className="app-shell">
      <Navbar showSearch={false} />

      <main className="reservation-main">
        {/* Page Title */}
        <div className="page-title-row">
          <User style={{ color: 'var(--primary-blue)', width: '22px', height: '22px' }} />
          <h2 className="page-title">Personal Profile</h2>
        </div>

        <div className="scheduler-column-layout">
          {/* Left Column: Account details Form */}
          <div className="summary-card" style={{ padding: '24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div 
                style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, var(--primary-blue) 0%, var(--teal-accent) 100%)', 
                  color: 'white', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 800
                }}
              >
                {name ? name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{name || 'Store Customer'}</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Registered member since 2026</p>
              </div>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="search-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', outline: 'none' }}
                    required
                  />
                  <User size={16} style={{ position: 'absolute', right: '12px', top: '15px', color: 'var(--text-light)' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="search-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', outline: 'none' }}
                  />
                  <Mail size={16} style={{ position: 'absolute', right: '12px', top: '15px', color: 'var(--text-light)' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Mobile Number (Verified)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    className="search-input"
                    value={user.phone}
                    disabled
                    style={{ width: '100%', cursor: 'not-allowed', backgroundColor: 'var(--bg-light)', color: 'var(--text-secondary)' }}
                  />
                  <Phone size={16} style={{ position: 'absolute', right: '12px', top: '15px', color: 'var(--text-light)' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Pickup Home Address
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="search-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ width: '100%', outline: 'none' }}
                  />
                  <MapPin size={16} style={{ position: 'absolute', right: '12px', top: '15px', color: 'var(--text-light)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="download-btn"
                  onClick={handleLogout}
                  style={{ flex: 1, height: '48px', color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                >
                  <LogOut size={16} style={{ marginRight: '6px' }} />
                  Log Out
                </button>
                <button type="submit" className="reservation-cta-btn" style={{ flex: 2, marginTop: 0, height: '48px' }}>
                  <Save size={16} style={{ marginRight: '6px' }} />
                  Save Profile
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Order History list */}
          <div className="scheduler-section">
            <h3 className="section-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
              <History size={16} />
              Reservation History
            </h3>

            {historyLoading ? (
              <SkeletonList rows={3} />
            ) : historyError ? (
              <ErrorState message={historyError} onRetry={fetchOrderHistory} />
            ) : historyItems.length === 0 ? (
              <EmptyState
                icon={History}
                title="No Reservations Found"
                message="You haven't reserved any medicines or scheduled a pickup slot yet."
                ctaLabel="Browse Medicines"
                onCta={() => navigate('/')}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {historyItems.map((item, idx) => {
                  const date = item.pickup_date || '';
                  const time = item.pickup_time || '';
                  const itemsStr = Array.isArray(item.medicines)
                    ? item.medicines.map(it => `${it.name} (${it.qty})`).join(', ')
                    : '';
                  const totalPrice = item.total_amount || 0;
                  const status = item.status || 'Pending';

                  return (
                    <div 
                      key={idx} 
                      className="summary-card" 
                      onClick={() => navigate(`/confirmation?id=${item.reservation_id}`)}
                      style={{ padding: '16px', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary-blue)' }}>{item.reservation_id || item.id}</span>
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', backgroundColor: 'var(--teal-accent-light)', color: 'var(--teal-accent)', fontWeight: 700 }}>
                          {status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Pickup slot: {date} at {time}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {itemsStr}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', marginTop: '10px', paddingTop: '10px', fontSize: '13px', fontWeight: 700 }}>
                        <span>Price Total</span>
                        <span>₹{totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Email Verification Modal */}
      {showEmailModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="summary-card"
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '30px 24px',
              textAlign: 'center',
              margin: '20px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
          >
            {emailSuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#d1fae5',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <CheckCircle2 size={30} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Email Updated!
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Your email has been updated to {newEmailPending}. Logging you out...
                </p>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Verify Email Change
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
                  We've sent a 6-digit code to<br />
                  <strong style={{ color: 'var(--text-primary)' }}>{newEmailPending}</strong>
                </p>

                {/* Error Banner */}
                {emailOtpError && (
                  <div
                    style={{
                      background: '#fee2e2',
                      color: '#dc2626',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      marginBottom: '16px',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px',
                    }}
                  >
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{emailOtpError}</span>
                  </div>
                )}

                {/* OTP Code inputs */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '6px',
                    marginBottom: '20px',
                  }}
                  onPaste={handleEmailOtpPaste}
                >
                  {emailOtp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (emailInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleEmailOtpChange(e.target.value, idx)}
                      onKeyDown={(e) => handleEmailOtpKeyDown(e, idx)}
                      disabled={emailOtpBusy}
                      style={{
                        width: '40px',
                        height: '46px',
                        borderRadius: '8px',
                        border: emailOtpError ? '2px solid #dc2626' : '1px solid var(--border-color)',
                        textAlign: 'center',
                        fontSize: '18px',
                        fontWeight: 800,
                        backgroundColor: 'var(--bg-light, #f8fafc)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                  ))}
                </div>

                {/* Timer and Resend option */}
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  {emailCooldown > 0 ? (
                    <span>Resend code in: <strong>{emailCooldown}s</strong></span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEmailResendOTP}
                      disabled={emailOtpBusy}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-blue, #0284c7)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontSize: '13px',
                        padding: 0,
                      }}
                    >
                      Resend Verification Code
                    </button>
                  )}
                </div>

                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmail(user.email); // Restore original email
                  }}
                  disabled={emailOtpBusy}
                  className="download-btn"
                  style={{ width: '100%', height: '44px', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
