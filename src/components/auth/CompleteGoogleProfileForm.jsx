import React, { useState, useEffect } from 'react';
import { Phone, MapPin, CheckCircle2, Loader, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { supabase } from '../../lib/supabase';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export default function CompleteGoogleProfileForm() {
  const { supabaseUser, user, updateProfile, authModalData, closeAuthModal } = useAuth();
  const { showToast } = useCart();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  // Store selected country so we can reconstruct the full international number for validation
  const [selectedCountry, setSelectedCountry] = useState({ dialCode: '91', iso2: 'in', name: 'India' });

  const [busy, setBusy] = useState(false);
  const [errorMsg, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (supabaseUser) {
      const googleName =
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.user_metadata?.name ||
        user?.name || '';
      setFullName(googleName);
    }
  }, [supabaseUser, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPhoneError('');

    // Reconstruct full international number since disableDialCodeAndPrefix=true stores only local digits
    const localDigits = phone.replace(/\D/g, '');
    const fullNumber = `+${selectedCountry.dialCode}${localDigits}`;
    const phoneNumberObject = parsePhoneNumberFromString(fullNumber);
    if (!localDigits || !phoneNumberObject || !phoneNumberObject.isValid()) {
      setPhoneError('Please enter a valid mobile number.');
      setError('Please enter a valid mobile number.');
      return;
    }
    const cleanPhone = phoneNumberObject.number;

    setBusy(true);
    try {
      // Upsert profile with all collected fields
      const { error } = await supabase.from('profiles').upsert(
        {
          id:            supabaseUser.id,
          full_name:     fullName.trim() || undefined,
          phone:         cleanPhone,
          phone_number:  cleanPhone,
          address:       address.trim() || undefined,
          email:         supabaseUser.email,
          role:          'customer',
          customer_type: 'registered',
        },
        { onConflict: 'id' }
      );

      if (error) throw error;

      // Update context profile
      await updateProfile({
        full_name: fullName.trim(),
        phone: cleanPhone,
        address: address.trim(),
      });

      showToast('Profile completed! Welcome to SVMS. 🎉', 'OK');

      // Clear any lingering auth query params
      window.history.replaceState({}, '', window.location.pathname);

      closeAuthModal();

      const destination = authModalData?.from || '/profile';
      // Use a hard redirect to avoid React Router / ProtectedRoute race conditions
      window.location.replace(destination);
    } catch (err) {
      console.error('[CompleteGoogleProfileForm] upsert error:', err);
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const avatarLetter = (fullName || supabaseUser?.email || 'U').charAt(0).toUpperCase();
  const googleEmail = supabaseUser?.email || '';

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Avatar bubble */}
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)', display: 'flex', alignItems: 'center', justifycontent: 'center', margin: '0 auto 16px', fontSize: '24px', fontWeight: 800, color: 'white', display: 'flex', justifyContent: 'center', boxShadow: '0 4px 12px rgba(66,133,244,0.3)' }}>
        {avatarLetter}
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--teal-accent-light, #d1fae5)', color: 'var(--teal-accent, #10b981)', borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase' }}>
        <CheckCircle2 size={12} />
        Google Linked
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>One last step</h2>
      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
        Signed in as <strong>{googleEmail}</strong>. Add your phone number so our pharmacists can reach you about notifications and reservations.
      </p>

      {errorMsg && (
        <div style={{ background: 'var(--accent-red-light, #fee2e2)', color: 'var(--accent-red, #dc2626)', borderRadius: '8px', padding: '10px 12px', fontSize: '12.5px', fontWeight: 600, marginBottom: '16px', textAlign: 'left' }}>
          ⚠ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' }}>Full Name</label>
          <input type="text" className="search-input" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: '100%', outline: 'none' }} required disabled={busy} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' }}>Mobile Number <span style={{ color: 'var(--accent-red)' }}>*</span></label>
          <PhoneInput
            defaultCountry="in"
            value={phone}
            disableDialCodeAndPrefix={true}
            showDisabledDialCodeAndPrefix={true}
            placeholder="Enter your 10-digit mobile number"
            className={phoneError ? 'has-error' : ''}
            onChange={(value, meta) => {
              setPhone(value);
              if (meta?.country) setSelectedCountry(meta.country);

              // Live inline validation — reconstruct full international number
              const digits = value.replace(/\D/g, '');
              const dialCode = meta?.country?.dialCode || selectedCountry.dialCode || '91';

              if (digits.length > 0) {
                const fullNumber = `+${dialCode}${digits}`;
                const parsed = parsePhoneNumberFromString(fullNumber);
                if (!parsed || !parsed.isValid()) {
                  setPhoneError(`Please enter a valid mobile number for ${meta?.country?.name || 'the selected country'}.`);
                } else {
                  setPhoneError('');
                }
              } else {
                setPhoneError('');
              }
            }}
            inputProps={{
              id: 'google-profile-phone',
              'aria-label': 'Mobile Number',
              required: true,
              disabled: busy
            }}
          />
          {phoneError && (
            <span style={{ display: 'block', color: 'var(--accent-red, #dc2626)', fontSize: '11.5px', marginTop: '5px', fontWeight: 600, textAlign: 'left' }}>
              ⚠ {phoneError}
            </span>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' }}>Address <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(optional)</span></label>
          <div style={{ position: 'relative' }}>
            <input type="text" className="search-input" placeholder="Your delivery address" value={address} onChange={(e) => setAddress(e.target.value)} style={{ width: '100%', paddingRight: '40px', outline: 'none' }} disabled={busy} />
            <MapPin size={15} style={{ position: 'absolute', right: '12px', top: '15px', color: 'var(--text-light)' }} />
          </div>
        </div>

        <button type="submit" className="reservation-cta-btn" disabled={busy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
          {busy ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <>Complete Profile <ArrowRight size={16} /></>}
        </button>
      </form>
    </div>
  );
}
