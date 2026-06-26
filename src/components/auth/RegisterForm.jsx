import React, { useState } from 'react';
import { User, Mail, Phone, Lock, Eye, EyeOff, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
  </svg>
);

export default function RegisterForm() {
  const { register, loginWithGoogle, openLogin, openVerifyEmail, authModalData } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const handleGoogle = async () => {
    setErrorMsg('');
    setGoogleBusy(true);
    const redirectPath = authModalData?.from || '/profile';
    const result = await loginWithGoogle(redirectPath);
    if (result?.error) {
      setErrorMsg(result.error);
      setGoogleBusy(false);
    }
  };

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
    const phoneNumberObject = parsePhoneNumberFromString(phone);
    if (!phoneNumberObject || !phoneNumberObject.isValid()) {
      setPhoneError('Please enter a valid mobile number.');
      setErrorMsg('Please enter a valid mobile number.');
      return;
    }
    const cleanPhone = phoneNumberObject.number.replace(/\D/g, '');
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
      phone: cleanPhone,
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
      openVerifyEmail(email.trim(), authModalData?.from);
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Create Account</h2>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: '1.4' }}>
        Register to confirm reservations and view prescriptions.
      </p>

      {/* Error banner */}
      {errorMsg && (
        <div style={{ background: 'var(--accent-red-light, #fee2e2)', color: 'var(--accent-red, #dc2626)', borderRadius: '8px', padding: '10px 12px', fontSize: '12.5px', fontWeight: 600, marginBottom: '16px', textAlign: 'left' }}>
          ⚠ {errorMsg}
        </div>
      )}

      {/* Continue with Google */}
      <button id="google-signup-btn" type="button" onClick={handleGoogle} disabled={googleBusy || isSubmitting} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', padding: '11px 16px', background: googleBusy ? '#f8f9fa' : '#ffffff', border: '1px solid #dadce0', borderRadius: '8px', cursor: googleBusy ? 'wait' : 'pointer', fontSize: '13.5px', fontWeight: 600, color: '#3c4043', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'background 0.2s', marginBottom: '16px', opacity: isSubmitting ? 0.6 : 1 }}>
        {googleBusy ? <Loader size={16} style={{ animation: 'spin 1s linear infinite', color: '#4285F4' }} /> : <GoogleLogo />}
        {googleBusy ? 'Signing up with Google…' : 'Sign Up with Google'}
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--text-light)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
        or
        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' }}>Full Name</label>
          <div style={{ position: 'relative' }}>
            <input type="text" className="search-input" placeholder="Enter full name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', outline: 'none' }} required disabled={isSubmitting || googleBusy} />
            <User size={15} style={{ position: 'absolute', right: '12px', top: '15px', color: 'var(--text-light)' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' }}>Email Address</label>
          <div style={{ position: 'relative' }}>
            <input type="email" className="search-input" placeholder="example@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', outline: 'none' }} required disabled={isSubmitting || googleBusy} />
            <Mail size={15} style={{ position: 'absolute', right: '12px', top: '15px', color: 'var(--text-light)' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' }}>Mobile Number</label>
          <PhoneInput
            defaultCountry="in"
            value={phone}
            disableDialCodeAndPrefix={true}
            showDisabledDialCodeAndPrefix={true}
            placeholder="Enter your 10-digit mobile number"
            className={phoneError ? 'has-error' : ''}
            onChange={(value, meta) => {
              setPhone(value);
              
              // Live inline validation
              const digits = value.replace(/\D/g, '');
              const dialCode = meta.country?.dialCode || '';
              
              if (digits.length > dialCode.length) {
                const parsed = parsePhoneNumberFromString(value);
                if (!parsed || !parsed.isValid()) {
                  setPhoneError(`Please enter a valid mobile number for ${meta.country?.name || 'the selected country'}.`);
                } else {
                  setPhoneError('');
                }
              } else {
                setPhoneError('');
              }
            }}
            inputProps={{
              id: 'register-phone',
              'aria-label': 'Mobile Number',
              required: true,
              disabled: isSubmitting || googleBusy
            }}
          />
          {phoneError && (
            <span style={{ display: 'block', color: 'var(--accent-red, #dc2626)', fontSize: '11.5px', marginTop: '5px', fontWeight: 600, textAlign: 'left' }}>
              ⚠ {phoneError}
            </span>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} className="search-input" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', outline: 'none', paddingRight: '40px' }} required disabled={isSubmitting || googleBusy} />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '12px', top: '15px', border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-light)' }}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' }}>Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <input type={showCpw ? 'text' : 'password'} className="search-input" placeholder="Confirm password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} style={{ width: '100%', outline: 'none', paddingRight: '40px' }} required disabled={isSubmitting || googleBusy} />
            <button type="button" onClick={() => setShowCpw(!showCpw)} style={{ position: 'absolute', right: '12px', top: '15px', border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-light)' }}>
              {showCpw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button type="submit" className="reservation-cta-btn" disabled={isSubmitting || googleBusy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: isSubmitting ? 0.7 : 1, marginTop: '4px' }}>
          {isSubmitting ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating account…</> : 'Create Account'}
        </button>
      </form>

      {/* Footer Login Link */}
      <div style={{ marginTop: '16px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
        Already have an account?{' '}
        <button type="button" onClick={() => openLogin(authModalData?.from)} style={{ background: 'none', border: 'none', color: 'var(--primary-blue, #0284c7)', fontWeight: 700, cursor: 'pointer', fontSize: '12.5px', padding: 0, textDecoration: 'underline' }}>
          Log in here
        </button>
      </div>
    </div>
  );
}
