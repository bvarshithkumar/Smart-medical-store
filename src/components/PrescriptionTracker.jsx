import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { 
  FileText, ClipboardCheck, Store, CheckCircle, 
  Clock, ShieldCheck, Copy, XCircle 
} from 'lucide-react';

const trackingFlow = [
  {
    status: 'pending',
    label: 'Received',
    title: 'Prescription Received',
    badge: 'RECEIVED',
    icon: FileText,
    desc: 'Securely uploaded & queued.',
    detailedStatus: 'We have securely received your prescription file. Our registered pharmacist will begin reviewing your dosage, items, and compatibility shortly.',
    eta: 'Review starts in ~5 mins',
    actionText: 'Pharmacist Review Pending'
  },
  {
    status: 'under_review',
    label: 'Reviewing',
    title: 'Under Pharmacist Review',
    badge: 'UNDER REVIEW',
    icon: ClipboardCheck,
    desc: 'Verifying dosage & inventory.',
    detailedStatus: 'A licensed pharmacist is actively verifying your prescription against safety regulations, dosage compatibility, and store inventory.',
    eta: 'Verification takes ~10 mins',
    actionText: 'Pharmacist Reviewing'
  },
  {
    status: 'approved',
    label: 'Approved',
    title: 'Prescription Approved',
    badge: 'APPROVED',
    icon: ShieldCheck,
    desc: 'Medicines verified.',
    detailedStatus: 'Your prescription has been successfully verified. We are preparing the medicines and setting them aside for your order.',
    eta: 'Preparation in progress',
    actionText: 'Prescription Approved'
  },
  {
    status: 'ready_for_pickup',
    label: 'Ready',
    title: 'Ready for Pickup',
    badge: 'READY',
    icon: Store,
    desc: 'Collect from counter.',
    detailedStatus: 'Your medicines are ready for collection! Please visit Sri Venkateshwara Medical & General Stores in Gachibowli. Bring your original physical prescription.',
    eta: 'Ready at Counter',
    actionText: 'Ready for Collection'
  },
  {
    status: 'completed',
    label: 'Completed',
    title: 'Order Completed',
    badge: 'COMPLETED',
    icon: CheckCircle,
    desc: 'Picked up successfully.',
    detailedStatus: 'Thank you for choosing Sri Venkateshwara Medical & General Stores! Your prescription order has been picked up. Stay healthy!',
    eta: 'Transaction Complete',
    actionText: 'Order Completed'
  }
];

const PrescriptionTracker = () => {
  const { supabaseUser } = useAuth();
  const { showToast } = useCart();
  const [prescription, setPrescription] = useState(null);

  // Status index mapping
  const getStatusIndex = (status) => {
    const s = status ? status.toLowerCase() : '';
    if (s === 'pending') return 0;
    if (s === 'under_review') return 1;
    if (s === 'approved') return 2;
    if (s === 'ready_for_pickup') return 3;
    if (s === 'completed') return 4;
    return 0;
  };

  const fetchLatestPrescription = async () => {
    let refId = localStorage.getItem('svms_active_rx_ref_id');
    
    // 1. If user is logged in, query latest prescription from db
    if (supabaseUser) {
      try {
        const { data, error } = await supabase
          .from('prescriptions')
          .select('*')
          .eq('user_id', supabaseUser.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          setPrescription(data[0]);
          subscribeToRealtime(data[0].id);
          return;
        }
      } catch (err) {
        console.error('Error fetching user latest prescription:', err);
      }
    }

    // 2. If reference_id is saved in localStorage (anonymous upload), fetch that one
    if (refId) {
      try {
        const { data, error } = await supabase
          .from('prescriptions')
          .select('*')
          .eq('reference_id', refId)
          .single();

        if (!error && data) {
          setPrescription(data);
          subscribeToRealtime(data.id);
        } else {
          setPrescription(null);
        }
      } catch (err) {
        console.error('Error fetching reference prescription:', err);
        setPrescription(null);
      }
    } else {
      setPrescription(null);
    }
  };

  useEffect(() => {
    fetchLatestPrescription();
  }, [supabaseUser]);

  // Listen to custom storage event for uploads made in the same tab
  useEffect(() => {
    const handleStorageChange = () => {
      fetchLatestPrescription();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [supabaseUser]);

  const subscribeToRealtime = (rxId) => {
    supabase.channel(`rx-track-home-${rxId}`).unsubscribe();

    const channel = supabase
      .channel(`rx-track-home-${rxId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'prescriptions', 
          filter: `id=eq.${rxId}` 
        },
        (payload) => {
          console.log('Realtime prescription update:', payload.new);
          setPrescription(payload.new);

          // Toast Notifications
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

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    showToast('Reference ID copied!', 'Success');
  };

  // Only show tracking after an actual prescription exists
  if (!prescription) {
    return null;
  }

  const activeStep = getStatusIndex(prescription.status);
  const isRejected = prescription.status === 'rejected';
  const progressPercent = isRejected ? 25 : (activeStep / 4) * 100;
  const currentStepData = isRejected 
    ? {
        title: 'Prescription Rejected',
        badge: 'REJECTED',
        detailedStatus: prescription.admin_notes || 'Your prescription requires clarification. Please contact Gachibowli store at +91 98765 43210.',
        eta: 'Clarification Required',
        actionText: 'Contact Store'
      }
    : trackingFlow[activeStep];

  return (
    <section className="tracker-section reveal-slide-up is-visible" id="prescription-tracker">
      <div className="tracker-wrapper-premium">
        
        {/* Section Header */}
        <div className="section-header-premium">
          <span className="section-badge-pill">LIVE STATUS SYSTEM</span>
          <h2 className="section-main-title">Prescription Review <span>Tracking</span></h2>
          <p className="section-desc-lbl">
            Track the verification progress of your prescription in real-time.
          </p>
        </div>

        {/* Unified Layout Grid */}
        <div className="rx-tracker-content">
          {/* Top Cards Row */}
          <div className="rx-top-cards-grid">
            
            {/* CARD 1: Meta Details */}
            <div className="rx-glass-card rx-meta-card" style={{ background: 'rgba(15, 23, 42, 0.5)' }}>
              <div className="rx-meta-header">
                <span className="rx-meta-badge">PRESCRIPTION ID</span>
                <span className="rx-meta-id" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => handleCopyId(prescription.reference_id)}>
                  {prescription.reference_id}
                  <Copy size={12} className="text-teal" />
                </span>
              </div>
              <div className="rx-meta-body">
                <div className="rx-meta-item">
                  <Clock size={16} className="rx-meta-icon text-teal" />
                  <div className="rx-meta-text">
                    <span className="rx-meta-lbl">Upload Status / ETA</span>
                    <span className="rx-meta-val text-teal">{currentStepData.eta}</span>
                  </div>
                </div>
                <div className="rx-meta-item">
                  <ShieldCheck size={16} className="rx-meta-icon text-blue" />
                  <div className="rx-meta-text">
                    <span className="rx-meta-lbl">Verification Flow</span>
                    <span className="rx-meta-val">{currentStepData.actionText}</span>
                  </div>
                </div>
              </div>
              <div className="rx-meta-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '10px' }}>
                <span className="rx-meta-pharmacist" style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Customer: <b>{prescription.customer_name}</b> · {prescription.phone}
                </span>
              </div>
            </div>

            {/* CARD 2: Active Status Detail */}
            <div className="rx-glass-card rx-status-card" style={{ 
              background: isRejected ? 'rgba(239, 68, 68, 0.05)' : 'rgba(15, 23, 42, 0.5)',
              border: isRejected ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255,255,255,0.08)'
            }}>
              <div className="rx-status-header">
                <span className={`rx-status-pill-badge rx-status-pill--${prescription.status.toLowerCase().replace('_', '-')}`} style={{
                  background: isRejected ? '#ef4444' : undefined,
                  color: isRejected ? 'white' : undefined
                }}>
                  {prescription.status.toUpperCase().replace('_', ' ')}
                </span>
                <span className="rx-status-live-dot" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span className="live-pulse-dot" style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%' }} />
                  REALTIME TRACKING
                </span>
              </div>
              <h3 className="rx-status-title" style={{ color: isRejected ? '#f87171' : 'white' }}>
                {currentStepData.title}
              </h3>
              <p className="rx-status-desc">{currentStepData.detailedStatus}</p>
              <div className="rx-status-footer-tip">
                {prescription.status === 'pending' && (
                  <span className="rx-status-tip-text">💡 Typical verification time: 10-15 minutes.</span>
                )}
                {prescription.status === 'under_review' && (
                  <span className="rx-status-tip-text">💡 The pharmacist is reviewing medicine compatibility and stock.</span>
                )}
                {prescription.status === 'approved' && (
                  <span className="rx-status-tip-text">💡 Your order details are being packaged. SMS confirmation sent shortly.</span>
                )}
                {prescription.status === 'ready_for_pickup' && (
                  <span className="rx-status-tip-text">💡 Quick counter pickup Reference ID: <b>{prescription.reference_id}</b></span>
                )}
                {isRejected && (
                  <span className="rx-status-tip-text" style={{ color: '#f87171' }}>⚠️ Contact our Gachibowli storefront directly to clarify details.</span>
                )}
              </div>
            </div>

          </div>

          {/* Timeline Progress Cards */}
          {!isRejected ? (
            <div className="rx-glass-card rx-timeline-card" style={{ background: 'rgba(15, 23, 42, 0.5)' }}>
              <div className="rx-timeline-container">
                {/* Track line background */}
                <div className="rx-timeline-track-bar">
                  <div 
                    className="rx-timeline-track-fill" 
                    style={{ width: `${progressPercent}%`, background: 'var(--teal-accent, #00A884)' }}
                  />
                </div>

                {/* Progress Nodes */}
                <div className="rx-timeline-nodes-row">
                  {trackingFlow.map((step, idx) => {
                    const StepIcon = step.icon;
                    let nodeState = 'pending'; // pending, active, completed
                    if (idx < activeStep) nodeState = 'completed';
                    else if (idx === activeStep) nodeState = 'active';

                    return (
                      <div key={idx} className={`rx-timeline-node node--${nodeState}`}>
                        <div className="rx-node-circle-wrap">
                          <div className="rx-node-circle" style={{
                            background: nodeState === 'completed' || nodeState === 'active' ? 'var(--teal-accent, #00A884)' : undefined,
                            borderColor: nodeState === 'completed' || nodeState === 'active' ? 'var(--teal-accent, #00A884)' : undefined,
                          }}>
                            {nodeState === 'completed' ? (
                              <CheckCircle size={16} className="rx-node-check-icon" />
                            ) : (
                              <StepIcon size={16} />
                            )}
                          </div>
                        </div>
                        <div className="rx-node-text-wrap">
                          <span className="rx-node-title" style={{
                            color: nodeState === 'active' ? 'var(--teal-accent, #00A884)' : undefined
                          }}>{step.label}</span>
                          <span className="rx-node-desc">{step.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Warning Box for Rejection */
            <div style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px dashed rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <XCircle size={32} style={{ color: '#ef4444' }} />
              <h4 style={{ fontWeight: 800, fontSize: '16px', color: '#f87171' }}>Prescription Rejected</h4>
              <p style={{ fontSize: '13px', opacity: 0.85, maxWidth: '500px' }}>
                Your prescription upload requires clarification. The reason provided by the pharmacist is:
              </p>
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '12px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171',
                marginTop: '6px'
              }}>
                "{prescription.admin_notes || 'No specific reason provided. Please contact store.'}"
              </div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                <a href="tel:+919876543210" style={{
                  padding: '8px 16px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}>
                  Call +91 98765 43210
                </a>
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};

export default PrescriptionTracker;
