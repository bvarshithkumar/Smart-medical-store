import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, ArrowLeft, FileText, ShieldCheck, Package, Store, CheckCircle, Search, AlertCircle, Clock, FileInput, Copy, MessageSquare, XCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { fetchWithTimeout } from '../hooks/useFetchWithTimeout';
import { SkeletonCard, ErrorState } from '../components/LoadingStates';


const rxStatusFlow = [
  { index: 0, label: 'Uploaded',              desc: 'Prescription received and queued for review.',             status: 'pending' },
  { index: 1, label: 'Under Review',          desc: 'Pharmacist is reviewing your prescription.',               status: 'under_review' },
  { index: 2, label: 'Quote Generated',       desc: 'Quote prepared — check My Prescriptions.',                status: 'quote_generated' },
  { index: 3, label: 'Changes Requested',     desc: 'You requested changes to the quote.',                     status: 'customer_requested_changes' },
  { index: 4, label: 'Revised Quote Ready',   desc: 'Pharmacist prepared a revised quote for you.',            status: 'revised_quote_generated' },
  { index: 5, label: 'Accepted',              desc: 'Quote accepted — reservation confirmed.',                  status: 'customer_accepted' },
  { index: 6, label: 'Preparing Medicines',   desc: 'Pharmacist is packing your medicines.',                   status: 'preparing_medicines' },
  { index: 7, label: 'Ready for Pickup',      desc: 'Medicines ready. Visit the Gachibowli store.',           status: 'ready_for_pickup' },
  { index: 8, label: 'Collected',             desc: 'Medicines collected. Thank you!',                         status: 'collected' },
];

const Tracking = () => {
  const { user, supabaseUser } = useAuth();
  const { showToast } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Search input state
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // User's prescriptions list
  const [userPrescriptions, setUserPrescriptions] = useState([]);
  
  // Currently tracked prescription
  const [trackedPrescription, setTrackedPrescription] = useState(null);

  // Customer profile type + active quote
  const [trackedCustomerType, setTrackedCustomerType] = useState(null);
  const [trackedActiveQuote,  setTrackedActiveQuote]  = useState(null);

  // 1. Check if we received a Reference ID from location state or localStorage
  useEffect(() => {
    if (location.state?.referenceId) {
      setSearchId(location.state.referenceId);
      handleSearchById(location.state.referenceId);
    } else {
      const storedRefId = localStorage.getItem('svms_active_rx_ref_id');
      if (storedRefId && !supabaseUser) {
        setSearchId(storedRefId);
        handleSearchById(storedRefId);
      }
    }
  }, [location.state, supabaseUser]);

  // 2. Fetch logged-in user's prescriptions
  useEffect(() => {
    const fetchUserPrescriptions = async () => {
      if (!supabaseUser) return;
      setLoading(true);
      setErrorMsg('');
      try {
        const data = await fetchWithTimeout(async (signal) => {
          const { data, error } = await supabase
            .from('prescriptions')
            .select('*')
            .eq('user_id', supabaseUser.id)
            .order('created_at', { ascending: false })
            .abortSignal(signal);

          if (error) throw error;
          return data || [];
        });

        setUserPrescriptions(data);
        // If not already tracking a specific ID from location state, select the latest one
        if (!location.state?.referenceId && data.length > 0) {
          setTrackedPrescription(data[0]);
          setSearchId(data[0].reference_id);
          subscribeToRealtime(data[0].id);
        }
      } catch (err) {
        console.error('Error fetching user prescriptions:', err);
        setErrorMsg(err.message || 'Failed to load your prescriptions.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserPrescriptions();
  }, [supabaseUser, location.state]);


  // 3. Setup realtime channel helper
  const subscribeToRealtime = (rxId) => {
    supabase.channel(`rx-tracking-page-${rxId}`).unsubscribe();

    const channel = supabase
      .channel(`rx-tracking-page-${rxId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'prescriptions', 
          filter: `id=eq.${rxId}` 
        },
        (payload) => {
          console.log('Realtime tracking update:', payload.new);
          setTrackedPrescription(payload.new);

          // Update userPrescriptions list item state
          setUserPrescriptions(prev => prev.map(p => p.id === rxId ? payload.new : p));

          // Toast notifications for status changes
          if (payload.old && payload.new && payload.old.status !== payload.new.status) {
            const statusMessages = {
              pending: "Your prescription has been received and is waiting for pharmacist review.",
              under_review: "Our pharmacist is currently reviewing your prescription.",
              approved: "Your prescription has been approved.",
              rejected: "Your prescription requires clarification. Please contact the store.",
              ready_for_pickup: "Your medicines are ready for pickup.",
              completed: "Order completed successfully."
            };
            const msg = statusMessages[payload.new.status] || `Status updated to ${payload.new.status}`;
            showToast(msg, 'Dismiss');
          }
        }
      )
      .subscribe();
  };

  // 4. Search function helper
  const handleSearchById = async (idToSearch) => {
    const id = (idToSearch || searchId).trim().toUpperCase();
    if (!id) return;

    setLoading(true);
    setErrorMsg('');
    setTrackedPrescription(null);

    try {
      const data = await fetchWithTimeout(async (signal) => {
        const { data, error } = await supabase
          .from('prescriptions')
          .select('*')
          .eq('reference_id', id)
          .abortSignal(signal)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            throw new Error('No prescription found matching this Reference ID.');
          } else {
            throw error;
          }
        }
        return data;
      });

      if (data) {
        setTrackedPrescription(data);
        setSearchId(data.reference_id);
        subscribeToRealtime(data.id);

        // Fetch customer type from profiles if user_id exists
        if (data.user_id) {
          supabase
            .from('profiles')
            .select('customer_type')
            .eq('id', data.user_id)
            .maybeSingle()
            .then(({ data: prof }) => setTrackedCustomerType(prof?.customer_type || 'registered'));
        } else {
          setTrackedCustomerType('walk_in');
        }

        // Fetch active quote (include viewed_at and created_at)
        supabase
          .from('prescription_quotes')
          .select('quote_number, total_amount, status, is_active, quote_status, version_number, sent_at, viewed_at, created_at')
          .eq('prescription_id', data.id)
          .eq('is_active', true)
          .maybeSingle()
          .then(({ data: q }) => setTrackedActiveQuote(q || null));
      }
    } catch (err) {
      console.error('Search error:', err);
      setErrorMsg(err.message || 'Search failed. Please check your network.');
    } finally {
      setLoading(false);
    }
  };


  const handleDropdownSelect = (e) => {
    const selectedId = e.target.value;
    const selected = userPrescriptions.find(p => p.id === selectedId);
    if (selected) {
      setTrackedPrescription(selected);
      setSearchId(selected.reference_id);
      subscribeToRealtime(selected.id);
      setErrorMsg('');
      // Load customer type
      if (selected.user_id) {
        supabase
          .from('profiles')
          .select('customer_type')
          .eq('id', selected.user_id)
          .maybeSingle()
          .then(({ data: prof }) => setTrackedCustomerType(prof?.customer_type || 'registered'));
      } else {
        setTrackedCustomerType('walk_in');
      }
      // Load active quote
      supabase
        .from('prescription_quotes')
        .select('quote_number, total_amount, status, is_active, quote_status, version_number, sent_at, viewed_at, created_at')
        .eq('prescription_id', selected.id)
        .eq('is_active', true)
        .maybeSingle()
        .then(({ data: q }) => setTrackedActiveQuote(q || null));
    }
  };

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    showToast('Reference ID copied!', 'Success');
  };

  const getStatusIndex = (status) => {
    const s = status ? status.toLowerCase() : '';
    if (s === 'pending' || s === 'uploaded') return 0;
    if (s === 'under_review') return 1;
    if (s === 'quote_generated' || s === 'quote_sent') return 2;
    if (s === 'customer_requested_changes') return 3;
    if (s === 'revised_quote_generated') return 4;
    if (s === 'customer_accepted' || s === 'accepted_by_customer') return 5;
    if (s === 'preparing_medicines') return 6;
    if (s === 'ready_for_pickup') return 7;
    if (s === 'collected' || s === 'completed') return 8;
    if (s === 'rejected') return -1;
    return 0;
  };

  const getStepIcon = (idx) => {
    switch (idx) {
      case 0: return <FileInput size={14} />;
      case 1: return <Clock size={14} />;
      case 2: return <FileText size={14} />;
      case 3: return <MessageSquare size={14} />;
      case 4: return <FileText size={14} />;
      case 5: return <CheckCircle size={14} />;
      case 6: return <Package size={14} />;
      case 7: return <Store size={14} />;
      case 8: return <ShieldCheck size={14} />;
      default: return null;
    }
  };

  // State derivations
  const activeStep = trackedPrescription ? getStatusIndex(trackedPrescription.status) : 0;
  const isRejected = trackedPrescription?.status === 'rejected';
  const fillPercent = isRejected ? 12 : (activeStep / (rxStatusFlow.length - 1)) * 100;

  return (
    <div className="app-shell">
      <Navbar showSearch={false} />

      <main className="reservation-main">
        {/* Page Title */}
        <div className="page-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin style={{ color: 'var(--teal-accent, #00A884)', width: '22px', height: '22px' }} />
            <h2 className="page-title">Track Prescription Status</h2>
          </div>
          
          {/* Back to Home Link */}
          <button 
            onClick={() => navigate('/')} 
            className="download-btn"
            style={{ border: 'none', background: 'rgba(255,255,255,0.05)', color: 'white', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} />
            Back to Storefront
          </button>
        </div>

        {/* Action Controls Section */}
        <div style={{
          display: 'flex',
          gap: '16px',
          margin: '24px 0',
          flexWrap: 'wrap',
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '16px',
          alignItems: 'center'
        }}>
          {/* Dropdown for logged in user */}
          {supabaseUser && userPrescriptions.length > 0 && (
            <div style={{ flex: 1, minWidth: '240px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #64748b)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Your Uploaded Prescriptions
              </label>
              <select 
                value={trackedPrescription?.id || ''}
                onChange={handleDropdownSelect}
                style={{
                  width: '100%',
                  height: '42px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'white',
                  padding: '0 10px',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {userPrescriptions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.reference_id} ({p.status.toUpperCase().replace('_', ' ')}) - {new Date(p.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reference ID manual search */}
          <div style={{ flex: 1.5, minWidth: '280px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #64748b)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Search Prescription ID
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Enter Reference ID (e.g. RX-20260624-A1B2C)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                style={{
                  flex: 1,
                  height: '42px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'white',
                  padding: '0 12px',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <button 
                onClick={() => handleSearchById()}
                disabled={loading}
                style={{
                  height: '42px',
                  background: 'var(--teal-accent, #00A884)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  padding: '0 16px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'opacity 0.2s'
                }}
              >
                <Search size={14} />
                {loading ? 'Searching...' : 'Track'}
              </button>
            </div>
          </div>
        </div>

        {/* Display Error Message */}
        {errorMsg && (
          <div style={{
            textAlign: 'center',
            color: '#ef4444',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '10px',
            padding: '12px',
            fontSize: '13px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            {errorMsg}
          </div>
        )}

        {/* Main Grid Timeline Layout */}
        {loading ? (
          <SkeletonCard lines={4} style={{ marginTop: '24px' }} />
        ) : errorMsg ? (
          <ErrorState message={errorMsg} onRetry={() => {
            if (searchId) {
              handleSearchById(searchId);
            } else if (userPrescriptions.length > 0) {
              handleSearchById(userPrescriptions[0].reference_id);
            }
          }} />
        ) : trackedPrescription ? (
          <div className="tracker-main-layout">
            
            {/* Left Column: Visual Timeline Card */}
            <div className="tracker-card" style={{ background: 'rgba(15, 23, 42, 0.65)' }}>
              <h3 className="tracker-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Live Tracker</span>
                <span className="rx-status-pill-badge rx-status-pill--pending" style={{
                  background: isRejected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(20, 184, 166, 0.1)',
                  color: isRejected ? '#f87171' : 'var(--teal-accent, #00A884)',
                  border: isRejected ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(20, 184, 166, 0.2)',
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '20px'
                }}>
                  {trackedPrescription.status.toUpperCase().replace('_', ' ')}
                </span>
              </h3>

              {!isRejected ? (
                <div className="timeline" style={{ position: 'relative', marginTop: '24px' }}>
                  {/* Fill Line */}
                  <div 
                    className="timeline-progress-fill" 
                    id="timeline-fill"
                    style={{ 
                      height: `${fillPercent}%`,
                      background: 'var(--teal-accent, #00A884)',
                      boxShadow: '0 0 10px rgba(20,184,166,0.3)'
                    }}
                  />

                  {rxStatusFlow.map((step) => {
                    let stepClass = '';
                    if (step.index < activeStep) stepClass = 'completed';
                    else if (step.index === activeStep) stepClass = 'active';

                    return (
                      <div key={step.index} className={`timeline-step ${stepClass}`} data-step={step.index}>
                        <div className="timeline-dot" style={{
                          background: stepClass === 'completed' || stepClass === 'active' ? 'var(--teal-accent, #00A884)' : undefined,
                          color: stepClass === 'completed' || stepClass === 'active' ? 'white' : undefined,
                          borderColor: stepClass === 'completed' || stepClass === 'active' ? 'var(--teal-accent, #00A884)' : undefined
                        }}>
                          {getStepIcon(step.index)}
                        </div>
                        <span className="timeline-label" style={{
                          color: stepClass === 'active' ? 'var(--teal-accent, #00A884)' : undefined,
                          fontWeight: stepClass === 'active' ? 800 : undefined
                        }}>{step.label}</span>
                        <span className="timeline-desc">{step.desc}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Rejection Timeline State */
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 16px',
                  textAlign: 'center',
                  background: 'rgba(239,68,68,0.02)',
                  border: '1px dashed rgba(239,68,68,0.2)',
                  borderRadius: '12px',
                  marginTop: '16px'
                }}>
                  <XCircle size={36} style={{ color: '#ef4444', marginBottom: '12px' }} />
                  <h4 style={{ color: '#f87171', fontWeight: 800, fontSize: '15px', marginBottom: '6px' }}>
                    Prescription Requires Clarification
                  </h4>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4', maxWidth: '340px' }}>
                    The pharmacist has flagged this prescription. Please review the explanation in the details panel or contact the storefront directly.
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Prescription details card */}
            <div className="summary-column">
              <div className="summary-card" style={{ background: 'rgba(15, 23, 42, 0.65)' }}>
                <h3 className="summary-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                  <span>Prescription Details</span>
                  <button 
                    onClick={() => handleCopyId(trackedPrescription.reference_id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--teal-accent, #00A884)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Copy size={11} />
                    Copy
                  </button>
                </h3>

                <div className="receipt-row" style={{ margin: '14px 0 10px 0', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary, #64748b)' }}>Reference ID</span>
                  <span style={{ fontWeight: 800, color: 'var(--teal-accent, #00A884)' }}>
                    {trackedPrescription.reference_id}
                  </span>
                </div>

                {/* Customer Type Badge */}
                {trackedCustomerType && (
                  <div className="receipt-row" style={{ marginBottom: '10px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary, #64748b)' }}>Customer Type</span>
                    {(() => {
                      const ctColors = {
                        registered: { bg: 'rgba(6,182,212,0.1)',  color: '#06b6d4', icon: '👤' },
                        returning:  { bg: 'rgba(34,197,94,0.1)',  color: '#22c55e', icon: '⭐' },
                        guest:      { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', icon: '🙋' },
                        walk_in:    { bg: 'rgba(99,102,241,0.1)', color: '#818cf8', icon: '🏪' },
                      };
                      const s = ctColors[trackedCustomerType] || ctColors.registered;
                      return (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: s.bg, color: s.color }}>
                          {s.icon} {trackedCustomerType.replace('_',' ')}
                        </span>
                      );
                    })()}
                  </div>
                )}

                <div className="receipt-row" style={{ marginBottom: '10px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary, #64748b)' }}>Customer Name</span>
                  <span style={{ fontWeight: 700, color: 'white' }}>
                    {trackedPrescription.customer_name}
                  </span>
                </div>

                <div className="receipt-row" style={{ marginBottom: '10px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary, #64748b)' }}>Phone Number</span>
                  <span style={{ fontWeight: 700, color: 'white' }}>
                    {trackedPrescription.phone}
                  </span>
                </div>

                <div className="receipt-row" style={{ marginBottom: '10px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary, #64748b)' }}>Uploaded Date</span>
                  <span style={{ fontWeight: 700, color: 'white' }}>
                    {new Date(trackedPrescription.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Active Quote Status Panel */}
                {trackedActiveQuote && (
                  <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 12, paddingTop: 12,
                    display: 'flex', flexDirection: 'column', gap: 8
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Quote Details
                    </span>

                    {/* Status + Version */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Status</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                        background: trackedActiveQuote.is_active ? 'rgba(6,182,212,0.12)' : 'rgba(239,68,68,0.1)',
                        color: trackedActiveQuote.is_active ? '#06b6d4' : '#ef4444',
                        border: trackedActiveQuote.is_active ? '1px solid rgba(6,182,212,0.25)' : '1px solid rgba(239,68,68,0.2)',
                      }}>
                        {(trackedActiveQuote.status || trackedActiveQuote.quote_status || '').replace(/_/g,' ')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Quote Number</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{trackedActiveQuote.quote_number}</span>
                    </div>

                    {trackedActiveQuote.version_number && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Version</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
                          v{trackedActiveQuote.version_number}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Amount</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--teal-accent, #00A884)' }}>
                        ₹{trackedActiveQuote.total_amount?.toFixed(2)}
                      </span>
                    </div>

                    {trackedActiveQuote.created_at && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Generated</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                          {new Date(trackedActiveQuote.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                    )}

                    {trackedActiveQuote.sent_at && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Quote Sent</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                          {new Date(trackedActiveQuote.sent_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                    )}

                    {trackedActiveQuote.viewed_at && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Viewed By Customer</span>
                        <span style={{ fontSize: 11, color: '#22c55e' }}>
                          ✓ {new Date(trackedActiveQuote.viewed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {trackedPrescription.notes && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '12px', paddingTop: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #64748b)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Customer Notes
                    </span>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      {trackedPrescription.notes}
                    </p>
                  </div>
                )}

                {/* Rejection / Pharmacist Notes Reason Box */}
                {isRejected && (
                  <div style={{ borderTop: '1px dashed #ef4444', marginTop: '12px', paddingTop: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Pharmacist Rejection Reason
                    </span>
                    <div style={{
                      fontSize: '12px',
                      color: '#f87171',
                      background: 'rgba(239, 68, 68, 0.05)',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      fontWeight: 600,
                      lineHeight: '1.4'
                    }}>
                      ⚠️ {trackedPrescription.admin_notes || 'Your prescription requires clarification. Please contact Gachibowli store directly.'}
                    </div>
                  </div>
                )}

                {/* Normal Admin Notes if available (non-rejected) */}
                {!isRejected && trackedPrescription.admin_notes && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '12px', paddingTop: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #64748b)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Pharmacist Notes
                    </span>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', background: 'rgba(20, 184, 166, 0.03)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(20, 184, 166, 0.1)' }}>
                      {trackedPrescription.admin_notes}
                    </p>
                  </div>
                )}

                {/* Prescription Image Preview */}
                {trackedPrescription.image_url && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '12px', paddingTop: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #64748b)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Prescription File Preview
                    </span>
                    <div style={{ 
                      borderRadius: '8px', 
                      overflow: 'hidden', 
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.02)',
                      display: 'flex',
                      justifyContent: 'center',
                      padding: '8px'
                    }}>
                      <img 
                        src={trackedPrescription.image_url} 
                        alt="Prescription Uploaded File" 
                        style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '4px', objectFit: 'contain' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          /* Empty Search Box Prompt */
          <div className="pickup-empty-card reveal-slide-up" style={{ marginTop: '24px', background: 'rgba(15, 23, 42, 0.65)' }}>
            <div className="pickup-empty-icon" style={{ background: 'rgba(20, 184, 166, 0.1)', color: 'var(--teal-accent, #00A884)' }}>
              <Package size={36} />
            </div>
            <h2>No active tracking selected.</h2>
            <p>
              Please enter your unique Prescription Reference ID (e.g. RX-20260624-A1B2C) in the search input above to track verification status, or sign in to load your prescriptions automatically.
            </p>
          </div>
        )}

      </main>
    </div>
  );
};

export default Tracking;
