import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { cmsService } from '../services/cmsService';
import {
  Upload, FileText, CheckCircle2, Copy, RefreshCw,
  ArrowRight, AlertCircle, Loader2, LogIn, Lock
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────────────────── */
const genRefId = () => {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `RX-${date}-${rand}`;
};

const IconShield = () => (
  <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
    <path d="M8 1L1 4v5c0 4.5 3 7 7 8 4-1 7-3.5 7-8V4L8 1z" fill="white" opacity="0.35" />
    <path d="M5 8l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ────────────────────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────────────────────── */
const UploadRxBanner = () => {
  const { showToast } = useCart();
  const { user, authReady, isAuthenticated, openLogin } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  /* ── Form state ── */
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone]               = useState('');
  const [notes, setNotes]               = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  /* ── UI state ── */
  const [busy, setBusy]                     = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [errorMsg, setErrorMsg]             = useState('');
  const [successData, setSuccessData]       = useState(null);
  const [countdown, setCountdown]           = useState(5);
  const [bannerBg, setBannerBg]             = useState('/images/rx_section_bg.png');
  const countdownRef                        = useRef(null); // holds the interval so it can be cancelled early

  /* ── Fetch banner background from Supabase CMS ── */
  useEffect(() => {
    const fetchBanner = async () => {
      const banner = await cmsService.getBanner('upload-rx-bg');
      if (banner && banner.image_url) {
        setBannerBg(banner.image_url);
      }
    };
    fetchBanner();
  }, []);

  /* ── Auto-fill from logged-in user ── */
  useEffect(() => {
    if (user) {
      setCustomerName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  /* ── Auth diagnostic logging ── */
  useEffect(() => {
    if (!authReady) return;
    console.log('[UploadRx] Auth state — isAuthenticated:', isAuthenticated);
  }, [isAuthenticated, authReady]);

  /* ── Auto-redirect after success ── */
  useEffect(() => {
    if (!successData) return;
    setCountdown(5);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          navigate('/my-prescriptions');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [successData, navigate]);

  /* ── Handlers ── */
  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSelectedFile(f);
    setErrorMsg('');
    console.log(`[UploadRx] File selected — name: "${f.name}", size: ${f.size} bytes, type: ${f.type}`);
    showToast(`File selected: "${f.name}"`, 'OK');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    /* ── STEP 0: Verify authentication with Supabase directly ── */
    console.log('[UploadRx] STEP 0 — Verifying Supabase session before upload…');
    const { data: { user: liveUser }, error: userError } = await supabase.auth.getUser();

    console.log('[UploadRx] Session:', (await supabase.auth.getSession()).data.session);
    console.log('[UploadRx] User:', liveUser);

    if (userError || !liveUser) {
      const msg = 'Please login before uploading a prescription. Your session may have expired.';
      console.warn('[UploadRx] STEP 0 FAILED — Not authenticated:', userError?.message ?? 'null user');
      setErrorMsg(msg);
      showToast(msg, 'Login');
      return;
    }

    console.log(`[UploadRx] STEP 0 SUCCESS — Authenticated as uid: ${liveUser.id}`);

    /* ── Validation ── */
    if (!customerName.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const isValidIndianMobile = /^[6-9]\d{9}$/.test(cleanPhone);
    if (!phone.trim() || !isValidIndianMobile) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number (must start with 6, 7, 8, or 9).');
      return;
    }
    if (!selectedFile) {
      setErrorMsg('Please select a prescription file (image or PDF).');
      return;
    }

    setBusy(true);
    setUploadProgress('Uploading prescription file…');

    try {
      /* ── STEP 1: Upload file to Supabase Storage ── */
      const ext      = selectedFile.name.split('.').pop().toLowerCase();
      const uid      = `${liveUser.id}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const fileName = `rx_${uid}.${ext}`;

      console.log(`[UploadRx] STEP 1 — Uploading file "${fileName}" to bucket "prescriptions"…`);

      const { data: storageData, error: storageError } = await supabase.storage
        .from('prescriptions')
        .upload(fileName, selectedFile, { cacheControl: '3600', upsert: false });

      if (storageError) {
        console.error('[UploadRx] STEP 1 FAILED — Storage error:', storageError);
        throw new Error(`File upload failed: ${storageError.message}`);
      }

      console.log('[UploadRx] STEP 1 SUCCESS — File uploaded:', storageData);

      /* ── STEP 2: Get public URL ── */
      const { data: urlData } = supabase.storage
        .from('prescriptions')
        .getPublicUrl(fileName);

      const publicUrl = urlData?.publicUrl;
      console.log(`[UploadRx] STEP 2 — Public URL: ${publicUrl}`);

      if (!publicUrl) throw new Error('Could not retrieve public URL for the uploaded file.');

      /* ── STEP 3: Insert DB record ── */
      setUploadProgress('Saving prescription record…');

      const refId = genRefId();
      console.log(`[UploadRx] STEP 3 — Inserting into public.prescriptions, ref: ${refId}`);

      const fullPayload = {
        user_id:        liveUser.id,
        image_url:      publicUrl,
        status:         'pending',
        created_at:     new Date().toISOString(),
        reference_id:   refId,
        customer_name:  customerName.trim(),
        phone:          phone.replace(/\D/g, '').substring(0, 20),
        notes:          notes.trim() || null,
        customer_notes: notes.trim() || null,
      };

      console.log('[UploadRx] STEP 3 — Payload:', fullPayload);

      let insertedId = null;
      let { data: insertedData, error: dbError } = await supabase
        .from('prescriptions')
        .insert(fullPayload)
        .select('id');

      if (insertedData && insertedData.length > 0) {
        insertedId = insertedData[0].id;
      }

      // Fallback: if extra columns don't exist yet, try with a truly minimal payload
      if (dbError && (dbError.code === 'PGRST204' || dbError.message?.includes('Could not find'))) {
        console.warn('[UploadRx] STEP 3 — Extra columns missing. Trying truly minimal payload. Run supabase_schema.sql!');
        const { data: minData, error: minErr } = await supabase
          .from('prescriptions')
          .insert({
            user_id:       liveUser.id,
            image_url:     publicUrl,
            status:        'pending',
            created_at:    new Date().toISOString(),
          })
          .select('id');
        dbError = minErr;
        if (minData && minData.length > 0) {
          insertedId = minData[0].id;
        }
      }

      if (dbError) {
        console.error('[UploadRx] STEP 3 FAILED — DB error:', dbError);
        throw new Error(`Database error [${dbError.code}]: ${dbError.message}`);
      }

      // Upsert profile with phone_number and full_name (keeps both columns in sync)
      try {
        const cleanPhone = phone.replace(/\D/g, '').substring(0, 15);
        await supabase.from('profiles').upsert(
          {
            id:            liveUser.id,
            phone:         cleanPhone,
            phone_number:  cleanPhone,
            customer_type: 'registered',
            // Only update full_name if one was entered — never overwrite with empty
            ...(customerName.trim() ? { full_name: customerName.trim() } : {}),
          },
          { onConflict: 'id' }
        );
      } catch (profileErr) {
        console.warn('[UploadRx] Profile upsert failed (non-fatal):', profileErr);
      }

      // Create customer notification
      try {
        await supabase.from('notifications').insert({
          user_id:         liveUser.id,
          title:           'Prescription Received',
          message:         'Your prescription has been received and is awaiting pharmacist review.',
          type:            'prescription_uploaded',
          prescription_id: insertedId,
          is_read:         false,
          read:            false
        });
      } catch (notiErr) {
        console.warn('[UploadRx] Customer notification insert failed:', notiErr);
      }

      // Create admin notification
      try {
        await supabase.from('notifications').insert({
          user_id:         null,
          title:           'New Prescription Uploaded',
          message:         `A new prescription has been uploaded by ${customerName.trim()}. Ref: ${refId}`,
          type:            'prescription_uploaded',
          prescription_id: insertedId,
          is_read:         false,
          read:            false
        });
      } catch (notiErr) {
        console.warn('[UploadRx] Admin notification insert failed:', notiErr);
      }

      console.log(`[UploadRx] STEP 3 SUCCESS — Record inserted. Reference ID: ${refId}`);

      /* ── STEP 4: Post-success ── */
      localStorage.setItem('svms_active_rx_ref_id', refId);
      window.dispatchEvent(new Event('storage'));

      const now = new Date();
      setSuccessData({
        referenceId: refId,
        fileUrl:     publicUrl,
        timestamp:   now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      });

      // Reset form
      setSelectedFile(null);
      setNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      showToast('🎉 Prescription received. Our pharmacist will contact you within 15 minutes.', 'OK');

    } catch (err) {
      console.error('[UploadRx] Upload process error:', err);
      const msg = err.message || 'An unexpected error occurred. Please try again.';
      setErrorMsg(msg);
      showToast(`Upload failed: ${msg}`, 'Dismiss');
    } finally {
      setBusy(false);
      setUploadProgress('');
    }
  };

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id).then(() => showToast('Reference ID copied!', 'OK'));
  };

  const handleReset = () => {
    setSuccessData(null);
    setErrorMsg('');
    if (user) {
      setCustomerName(user.name || '');
      setPhone(user.phone || '');
    } else {
      setCustomerName('');
      setPhone('');
    }
    setNotes('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Shared input style ── */
  const inputStyle = {
    width: '100%',
    height: '42px',
    padding: '0 12px',
    fontSize: '13px',
    outline: 'none',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'white',
    borderRadius: '8px',
    boxSizing: 'border-box',
  };

  /* ────────────────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────────────────── */
  return (
    <section
      className="upx-section reveal-slide-up is-visible"
      id="upload-rx"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Section header */}
      <div className="section-header-premium">
        <span className="section-badge-pill">PRESCRIPTION SERVICES</span>
        <h2 className="section-main-title">
          Upload Prescription &amp; <span>Order Medicines</span>
        </h2>
        <p className="section-desc-lbl">
          Licensed pharmacists verify every prescription before processing.
        </p>
      </div>

      <div
        className="upx-hero"
        style={{
          backgroundImage: `url(${bannerBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'right center',
          backgroundRepeat: 'no-repeat',
          minHeight: 'auto',
          padding: '40px 24px',
        }}
      >
        {/* Overlays */}
        <div className="upx-left-overlay" />
        <div className="upx-bg-glow upx-ga" />
        <div className="upx-bg-glow upx-gb" />
        <div className="upx-dotgrid" />
        <div className="upx-particles">
          <span className="upx-particle p1">+</span>
          <span className="upx-particle p2">💊</span>
          <span className="upx-particle p3">✚</span>
          <span className="upx-particle p4">🩺</span>
        </div>

        <div
          className="upx-grid"
          style={{ width: '100%', maxWidth: '100%', margin: '0 auto', zIndex: 10 }}
        >
          <div className="upx-left" style={{ width: '100%', maxWidth: '620px' }}>
            {/* Badge */}
            <div className="upx-badge" style={{ marginBottom: '16px' }}>
              <IconShield /> Verify &amp; Reserve
            </div>

            {/* ── LOADING state ── */}
            {!authReady && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Checking session…
              </div>
            )}

            {/* ── NOT LOGGED IN gate ── */}
            {authReady && !isAuthenticated && !successData && (
              <div
                style={{
                  background: 'rgba(10,18,34,0.82)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  padding: '32px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '2px solid rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Lock size={26} style={{ color: 'rgba(255,255,255,0.6)' }} />
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', margin: 0 }}>
                  Login Required
                </h3>
                <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>
                  Please login before uploading a prescription.<br />
                  Your prescription will be linked to your account for tracking.
                </p>

                <button
                  type="button"
                  onClick={() => openLogin('/')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '4px',
                    padding: '12px 28px',
                    background: 'var(--teal-accent, #00A884)',
                    color: 'white',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(0,168,132,0.4)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <LogIn size={16} /> Login to Upload
                </button>

                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => openRegister('/')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.6)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: 0,
                      font: 'inherit'
                    }}
                  >
                    Register here
                  </button>
                </p>
              </div>
            )}

            {/* ── FORM (authenticated) ── */}
            {authReady && isAuthenticated && !successData && (
              <form
                onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
                noValidate
              >
                <h2 className="upx-h2" style={{ fontSize: '26px', marginBottom: '4px', lineHeight: 1.2 }}>
                  Have a Prescription?
                  <span className="upx-h2-line2" style={{ display: 'block', fontSize: '26px' }}>
                    Upload &amp; Order
                  </span>
                </h2>

                <p className="upx-desc" style={{ fontSize: '13px', opacity: 0.85 }}>
                  Share your contact details and prescription. Our pharmacist will review and contact you within 15 minutes.
                </p>

                {/* Error banner */}
                {errorMsg && (
                  <div
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '8px',
                      background: 'rgba(239,68,68,0.12)',
                      border: '1px solid rgba(239,68,68,0.35)',
                      borderRadius: '8px', padding: '10px 12px',
                      fontSize: '12.5px', color: '#fca5a5', lineHeight: 1.4,
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px', color: '#f87171' }} />
                    {errorMsg}
                  </div>
                )}

                {/* Name + Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Customer Name *
                    </label>
                    <input
                      id="rx-customer-name"
                      type="text"
                      placeholder="Your Full Name"
                      value={customerName}
                      onChange={e => { setCustomerName(e.target.value); setErrorMsg(''); }}
                      style={inputStyle}
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginBottom: '5px', textTransform: 'uppercase' }}>
                      Phone Number *
                    </label>
                    <input
                      id="rx-phone"
                      type="tel"
                      placeholder="10-digit mobile"
                      maxLength={10}
                      value={phone}
                      onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setErrorMsg(''); }}
                      style={inputStyle}
                      autoComplete="tel"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Optional Notes
                  </label>
                  <textarea
                    id="rx-notes"
                    placeholder="Brand preferences, quantities, special instructions…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    style={{ ...inputStyle, height: '68px', padding: '10px 12px', resize: 'none' }}
                  />
                </div>

                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  onChange={handleFileChange}
                />

                {/* Selected file indicator */}
                {selectedFile && (
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: 'rgba(20,184,166,0.08)',
                      border: '1px solid rgba(20,184,166,0.25)',
                      padding: '8px 12px', borderRadius: '7px',
                      fontSize: '12px', color: 'var(--teal-accent, #00C896)',
                    }}
                  >
                    <FileText size={14} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <b>{selectedFile.name}</b>
                      <span style={{ opacity: 0.65, marginLeft: '6px' }}>
                        ({(selectedFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </span>
                  </div>
                )}

                {/* Progress text */}
                {busy && uploadProgress && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    {uploadProgress}
                  </div>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                  <button
                    type="button"
                    onClick={handlePickFile}
                    disabled={busy}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                      height: '46px', background: 'rgba(255,255,255,0.06)',
                      border: '1.5px dashed rgba(255,255,255,0.28)', borderRadius: '9px',
                      color: 'white', cursor: busy ? 'not-allowed' : 'pointer',
                      fontSize: '13px', fontWeight: 600, opacity: busy ? 0.6 : 1, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => !busy && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    onMouseLeave={e => !busy && (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  >
                    <Upload size={15} />
                    {selectedFile ? 'Change File' : 'Select Prescription'}
                  </button>

                  <button
                    type="submit"
                    disabled={busy}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                      height: '46px',
                      background: busy ? 'rgba(0,168,132,0.55)' : 'var(--teal-accent, #00A884)',
                      border: 'none', borderRadius: '9px', color: 'white',
                      cursor: busy ? 'not-allowed' : 'pointer',
                      fontSize: '13px', fontWeight: 700, transition: 'all 0.2s',
                      boxShadow: busy ? 'none' : '0 4px 14px rgba(0,168,132,0.35)',
                    }}
                  >
                    {busy ? (
                      <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…</>
                    ) : (
                      <><FileText size={16} /> Upload &amp; Order</>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ── SUCCESS CARD ── */}
            {successData && (
              <div
                style={{
                  background: 'rgba(10,18,34,0.82)',
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(20,184,166,0.35)',
                  borderRadius: '18px', padding: '32px 28px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                }}
              >
                {/* Pulsing check */}
                <div
                  style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: 'rgba(20,184,166,0.12)',
                    border: '2px solid var(--teal-accent, #00A884)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '18px', boxShadow: '0 0 20px rgba(20,184,166,0.5)',
                    animation: 'rxPulse 2s ease-in-out infinite',
                  }}
                >
                  <CheckCircle2 size={34} style={{ color: 'var(--teal-accent, #00A884)' }} />
                </div>

                <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'white', marginBottom: '10px' }}>
                  Prescription Received
                </h3>
                <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.6, marginBottom: '6px' }}>
                  Our pharmacist will review your prescription and contact you within approximately 15 minutes.
                </p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', marginBottom: '6px' }}>
                  You can track the status from your My Prescriptions page.
                </p>
                <p style={{ fontSize: '12.5px', color: 'var(--teal-accent, #00A884)', fontWeight: 700, marginBottom: '20px', lineHeight: 1.5 }}>
                  Prescription uploaded successfully! Redirecting to My Prescriptions in {countdown} second{countdown !== 1 ? 's' : ''}…
                </p>

                {/* Reference ID */}
                <div
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: '10px', padding: '16px', marginBottom: '16px', textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Reference ID
                    </span>
                    <button
                      onClick={() => handleCopyId(successData.referenceId)}
                      style={{
                        background: 'none', border: 'none',
                        color: 'var(--teal-accent, #00A884)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '11px', fontWeight: 600, padding: 0,
                      }}
                    >
                      <Copy size={11} /> Copy
                    </button>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--teal-accent, #00A884)', letterSpacing: '1px', marginBottom: '8px' }}>
                    {successData.referenceId}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                    <span>Submitted</span>
                    <span>{successData.timestamp}</span>
                  </div>
                </div>

                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '22px' }}>
                  Keep this reference ID for future tracking.
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
                  <button
                    onClick={handleReset}
                    style={{
                      flex: 1, height: '42px',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                      color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    <RefreshCw size={13} /> Upload Another
                  </button>
                  <button
                    onClick={() => {
                      clearInterval(countdownRef.current);
                      navigate('/my-prescriptions');
                    }}
                    style={{
                      flex: 1, height: '42px',
                      background: 'var(--teal-accent, #00A884)', border: 'none',
                      color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    View My Prescriptions <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right decorative element */}
          <div className="upx-visual" />
        </div>
      </div>

      <style>{`
        @keyframes rxPulse {
          0%   { box-shadow: 0 0 0 0   rgba(20,184,166,0.55); }
          60%  { box-shadow: 0 0 0 12px rgba(20,184,166,0);   }
          100% { box-shadow: 0 0 0 0   rgba(20,184,166,0);    }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
};

export default UploadRxBanner;
