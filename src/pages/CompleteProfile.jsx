import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, MapPin, CheckCircle2, Loader, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';

/**
 * CompleteProfile
 * ===============
 * Shown to first-time Google Sign-In users who haven't provided a phone
 * number yet. Collects the minimum required info and upserts the profile
 * row so all downstream features (WhatsApp notifications, reservations,
 * pharmacist contact) continue to work.
 *
 * Protected: ProtectedRoute in App.jsx ensures only authenticated users
 * can reach this page.
 */
const CompleteProfile = () => {
  const { supabaseUser, user, updateProfile } = useAuth();
  const { showToast } = useCart();
  const navigate  = useNavigate();
  const location  = useLocation();

  // Where to go after completing the profile
  const destination = location.state?.from || '/profile';

  /* ── Form state ── */
  const [fullName, setFullName] = useState('');
  const [phone,    setPhone]    = useState('');
  const [address,  setAddress]  = useState('');

  /* ── UI state ── */
  const [busy,     setBusy]    = useState(false);
  const [errorMsg, setError]   = useState('');

  /* ── Pre-fill from Google user_metadata ── */
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

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

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

      // Also update via AuthContext so in-memory profile state refreshes
      await updateProfile({
        full_name: fullName.trim(),
        phone: cleanPhone,
        address: address.trim(),
      });

      showToast('Profile completed! Welcome to SVMS. 🎉', 'OK');
      navigate(destination, { replace: true });
    } catch (err) {
      console.error('[CompleteProfile] upsert error:', err);
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const avatarLetter = (fullName || supabaseUser?.email || 'U').charAt(0).toUpperCase();
  const googleEmail  = supabaseUser?.email || '';

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
          padding:        '24px 16px',
        }}
      >
        <div
          className="summary-card"
          style={{
            width:     '100%',
            maxWidth:  '440px',
            padding:   '36px 28px',
            textAlign: 'center',
          }}
        >
          {/* Google avatar bubble */}
          <div
            style={{
              width:           '72px',
              height:          '72px',
              borderRadius:    '50%',
              background:      'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              margin:          '0 auto 20px',
              fontSize:        '28px',
              fontWeight:      800,
              color:           'white',
              boxShadow:       '0 4px 16px rgba(66,133,244,0.35)',
            }}
          >
            {avatarLetter}
          </div>

          {/* Heading */}
          <div
            style={{
              display:        'inline-flex',
              alignItems:     'center',
              gap:            '6px',
              background:     'var(--teal-accent-light, #d1fae5)',
              color:          'var(--teal-accent, #10b981)',
              borderRadius:   '20px',
              padding:        '4px 12px',
              fontSize:       '12px',
              fontWeight:     700,
              marginBottom:   '16px',
              textTransform:  'uppercase',
              letterSpacing:  '0.5px',
            }}
          >
            <CheckCircle2 size={13} />
            Google Account Linked
          </div>

          <h2
            style={{
              fontSize:     '22px',
              fontWeight:   800,
              color:        'var(--text-primary)',
              marginBottom: '6px',
            }}
          >
            One last step
          </h2>
          <p
            style={{
              fontSize:     '13px',
              color:        'var(--text-secondary)',
              marginBottom: '6px',
              lineHeight:   '1.5',
            }}
          >
            Signed in as <strong>{googleEmail}</strong>
          </p>
          <p
            style={{
              fontSize:     '13px',
              color:        'var(--text-secondary)',
              marginBottom: '28px',
              lineHeight:   '1.5',
            }}
          >
            Add your phone number so our pharmacists can contact you about
            prescriptions, reservations, and WhatsApp updates.
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

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' }}
          >
            {/* Full Name */}
            <div>
              <label
                style={{
                  display:       'block',
                  fontSize:      '12px',
                  fontWeight:    700,
                  color:         'var(--text-secondary)',
                  marginBottom:  '6px',
                  textTransform: 'uppercase',
                }}
              >
                Full Name
              </label>
              <input
                id="cp-name"
                type="text"
                className="search-input"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ width: '100%', outline: 'none' }}
              />
            </div>

            {/* Phone Number — required */}
            <div>
              <label
                style={{
                  display:       'block',
                  fontSize:      '12px',
                  fontWeight:    700,
                  color:         'var(--text-secondary)',
                  marginBottom:  '6px',
                  textTransform: 'uppercase',
                }}
              >
                Mobile Number <span style={{ color: 'var(--accent-red, #dc2626)' }}>*</span>
              </label>
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
                  id="cp-phone"
                  type="tel"
                  className="search-input"
                  placeholder="10-digit number"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  style={{ paddingLeft: '48px', paddingRight: '40px', width: '100%', outline: 'none' }}
                  required
                />
                <Phone
                  size={16}
                  style={{ position: 'absolute', right: '12px', top: '15px', color: 'var(--text-light)' }}
                />
              </div>
            </div>

            {/* Address — optional */}
            <div>
              <label
                style={{
                  display:       'block',
                  fontSize:      '12px',
                  fontWeight:    700,
                  color:         'var(--text-secondary)',
                  marginBottom:  '6px',
                  textTransform: 'uppercase',
                }}
              >
                Address <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(optional)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="cp-address"
                  type="text"
                  className="search-input"
                  placeholder="Your delivery address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{ width: '100%', paddingRight: '40px', outline: 'none' }}
                />
                <MapPin
                  size={16}
                  style={{ position: 'absolute', right: '12px', top: '15px', color: 'var(--text-light)' }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="reservation-cta-btn"
              disabled={busy}
              style={{
                marginTop:      '4px',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            '8px',
                opacity:        busy ? 0.7 : 1,
              }}
            >
              {busy ? (
                <>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Saving…
                </>
              ) : (
                <>
                  Complete Profile
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-light)', lineHeight: '1.4' }}>
            Your phone number is used only for prescription notifications and pharmacy contact.
            We never share it with third parties.
          </p>
        </div>
      </main>
    </div>
  );
};

export default CompleteProfile;
