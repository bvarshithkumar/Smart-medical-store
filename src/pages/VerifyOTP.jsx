import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Timer, RefreshCw, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import Navbar from '../components/Navbar';
import { otpService } from '../services/verification/otpService';
import { verificationService } from '../services/verification/verificationService';
import { VERIFICATION_TYPES } from '../services/verification/verificationTypes';
import { formatCooldown } from '../services/verification/verificationUtils';
import { useCart } from '../context/CartContext';

const VerifyOTP = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const type = searchParams.get('type') || '';

  const navigate = useNavigate();
  const { showToast } = useCart();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // Timer states
  const [cooldown, setCooldown] = useState(60); // 60s resend cooldown
  const [expiry, setExpiry] = useState(600); // 10 minutes total expiry (600s)

  const inputRefs = useRef([]);

  // Auto-redirect if email or type is missing
  useEffect(() => {
    if (!email || !type) {
      navigate('/login', { replace: true });
    }
  }, [email, type, navigate]);

  // Timers countdown
  useEffect(() => {
    if (success) return;

    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      setExpiry((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [success]);

  // Focus first box on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (val, index) => {
    if (isNaN(val)) return;

    const newOtp = [...otp];
    newOtp[index] = val.substring(val.length - 1);
    setOtp(newOtp);

    // Clear error on type
    setErrorMsg('');

    // Move to next box if filled
    if (val && index < 5) {
      inputRefs.current[index + 1].focus();
    }

    // Auto submit if all 6 boxes are filled
    const fullOtp = newOtp.join('');
    if (fullOtp.length === 6) {
      handleVerify(fullOtp);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1].focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const chars = pastedData.split('');
      setOtp(chars);
      inputRefs.current[5].focus();
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (otpCode) => {
    setIsVerifying(true);
    setErrorMsg('');

    try {
      if (type === VERIFICATION_TYPES.EMAIL_REGISTRATION) {
        await verificationService.completeRegistration(email, otpCode);
        setSuccess(true);
        showToast('Account verified successfully! Welcome to SVMS. 🎉', 'OK');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      } else if (type === VERIFICATION_TYPES.PASSWORD_RESET) {
        // Just verify OTP. Parent ForgotPassword wizard continues
        await verificationService.verifyPasswordReset(email, otpCode);
        setSuccess(true);
        setTimeout(() => {
          // Redirect to reset page or pass along state.
          // In our ForgotPassword, we do it in one single UI page, so VerifyOTP can redirect back with verified state
          navigate(`/forgot-password?email=${encodeURIComponent(email)}&verified=true`, { replace: true });
        }, 1500);
      } else if (type === VERIFICATION_TYPES.EMAIL_CHANGE) {
        // Handle in-profile email change
        const userId = sessionStorage.getItem('email_change_user_id');
        if (!userId) throw new Error('Session mismatch. Please try again.');
        
        await verificationService.completeEmailChange(userId, email, otpCode);
        setSuccess(true);
        showToast('Email address changed successfully! Please log in again.', 'OK');
        sessionStorage.removeItem('email_change_user_id');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      } else {
        // Default generic verification helper
        await otpService.verifyOTP(email, type, otpCode);
        setSuccess(true);
        showToast('Verified successfully!', 'OK');
        setTimeout(() => {
          navigate('/profile', { replace: true });
        }, 1500);
      }
    } catch (err) {
      console.error('[VerifyOTP] verification failed:', err);
      setErrorMsg(err.message || 'Verification failed. Please check the code.');
      // Highlight boxes and clear inputs
      setOtp(['', '', '', '', '', '']);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;

    setIsResending(true);
    setErrorMsg('');
    try {
      const payload = {};
      if (type === VERIFICATION_TYPES.EMAIL_REGISTRATION) {
        payload.full_name = sessionStorage.getItem('pending_reg_name') || '';
        payload.phone = sessionStorage.getItem('pending_reg_phone') || '';
      }

      const res = await otpService.sendOTP(email, type, payload);
      setCooldown(60); // Reset cooldown
      setExpiry(600); // Reset expiry timer
      
      let msg = 'A new verification code has been sent!';
      if (res?.dev_mode && res?.otp) {
        msg = `[Dev Mode] Verification code: ${res.otp}`;
      }
      showToast(msg, 'OK');
    } catch (err) {
      console.error('[VerifyOTP] Resend failed:', err);
      setErrorMsg(err.message || 'Failed to resend code. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  // Human readable title helper
  const getFlowTitle = () => {
    switch (type) {
      case VERIFICATION_TYPES.EMAIL_REGISTRATION:
        return 'Verify Your Registration';
      case VERIFICATION_TYPES.PASSWORD_RESET:
        return 'Verify Reset Password Request';
      case VERIFICATION_TYPES.EMAIL_CHANGE:
        return 'Verify Email Change';
      default:
        return 'Security Verification';
    }
  };

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
          style={{
            width: '100%',
            maxWidth: '440px',
            padding: '40px 24px',
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
          }}
        >
          {success ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: '20px' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: '#d1fae5',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '24px',
                  animation: 'pulse 1.5s infinite',
                }}
              >
                <CheckCircle2 size={38} />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Verification Success!
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Your request has been successfully authenticated. Redirecting you...
              </p>
            </div>
          ) : (
            <>
              {/* Back Link */}
              <button
                type="button"
                onClick={() => navigate(-1)}
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
                  marginBottom: '28px',
                  padding: 0,
                }}
              >
                <ArrowLeft size={16} />
                Back
              </button>

              {/* Badge Icon */}
              <div
                className="success-badge-container"
                style={{
                  backgroundColor: 'var(--primary-blue-light)',
                  color: 'var(--primary-blue)',
                  marginBottom: '20px',
                }}
              >
                <ShieldCheck size={28} />
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                {getFlowTitle()}
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: '1.5' }}>
                We've sent a 6-digit verification code to<br />
                <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
              </p>

              {/* Error state */}
              {errorMsg && (
                <div
                  style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '24px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Expiry Timer */}
              {expiry <= 0 ? (
                <div style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginBottom: '20px' }}>
                  Verification code has expired. Please click resend to get a new code.
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    marginBottom: '20px',
                  }}
                >
                  <Timer size={14} />
                  <span>Code expires in:</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary-blue)' }}>
                    {formatCooldown(expiry)}
                  </span>
                </div>
              )}

              {/* 6 OTP Input Boxes */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginBottom: '32px',
                }}
                onPaste={handlePaste}
              >
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    id={`otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(e.target.value, idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    disabled={isVerifying || expiry <= 0}
                    style={{
                      width: '46px',
                      height: '52px',
                      borderRadius: '10px',
                      border: errorMsg ? '2px solid #dc2626' : '1px solid var(--border-color)',
                      textAlign: 'center',
                      fontSize: '20px',
                      fontWeight: 800,
                      backgroundColor: 'var(--bg-light, #f8fafc)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary-blue)';
                      e.target.style.boxShadow = '0 0 0 3px var(--primary-blue-light)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = errorMsg ? '#dc2626' : 'var(--border-color)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                ))}
              </div>

              {/* Resend Cooldown Section */}
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                {cooldown > 0 ? (
                  <span>
                    Resend code in:{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{cooldown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending || isVerifying}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-blue, #0284c7)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: '14px',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {isResending ? (
                      <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    Resend Verification Code
                  </button>
                )}
              </div>

              {/* Security info disclaimer */}
              <div
                style={{
                  marginTop: '32px',
                  fontSize: '11px',
                  color: 'var(--text-light)',
                  lineHeight: '1.5',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '20px',
                }}
              >
                For security reasons, do not share this code with anyone. Our customer support will never ask for your verification code.
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default VerifyOTP;
