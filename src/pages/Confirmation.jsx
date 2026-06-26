import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Check, 
  Calendar, 
  Clock, 
  MapPin, 
  FileText, 
  Home, 
  ShoppingBag, 
  Download, 
  User, 
  Phone,
  AlertCircle
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useReservation } from '../context/ReservationContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { fetchWithTimeout } from '../hooks/useFetchWithTimeout';
import { SkeletonCard, ErrorState, EmptyState } from '../components/LoadingStates';


// React Class Error Boundary for Confirmation Page
class ConfirmationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ConfirmationErrorBoundary] Caught render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell">
          <header className="navbar" style={{ position: 'sticky', top: 0, padding: '12px 16px', zIndex: 100 }}>
            <div className="nav-top" style={{ margin: 0, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link to="/" className="logo-container" style={{ textDecoration: 'none' }}>
                  <div className="logo-icon">V</div>
                  <div className="logo-text">
                    SVMS
                    <span>Medical Store</span>
                  </div>
                </Link>
              </div>
              <div className="nav-actions">
                <Link to="/" className="icon-btn" aria-label="Go home">
                  <Home size={20} />
                </Link>
              </div>
            </div>
          </header>
          <main className="reservation-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '65vh', padding: '24px' }}>
            <div className="pickup-empty-card" style={{ maxWidth: '500px', border: '1px dashed var(--accent-red)', padding: '32px', textAlign: 'center', borderRadius: '16px', background: 'var(--bg-card)' }}>
              <div className="pickup-empty-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'var(--accent-red)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                <FileText size={32} />
              </div>
              <h2 style={{ color: 'var(--accent-red)', fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>Something Went Wrong</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                An error occurred while loading your pickup receipt details. Please view your reservations in your profile or try reloading.
              </p>
              <div className="pickup-empty-actions" style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <Link to="/" className="pickup-cta-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}>
                  <Home size={15} />
                  Back to Home
                </Link>
                <Link to="/reservations" className="pickup-cta-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}>
                  <ShoppingBag size={15} />
                  View Reservations
                </Link>
              </div>
            </div>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}

const Confirmation = () => {
  const { lastReservation } = useReservation();
  const { showToast } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');


  // 1. Fetch Reservation Details (from URL param)
  const loadReservation = useCallback(async () => {
    const queryParams = new URLSearchParams(location.search);
    const resIdParam = queryParams.get('id');

    if (!resIdParam) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await fetchWithTimeout(async (signal) => {
        const { data, error } = await supabase
          .from('pickup_reservations')
          .select('*')
          .eq('reservation_id', resIdParam)
          .abortSignal(signal)
          .maybeSingle();

        if (error) throw error;
        return data;
      });

      if (data) {
        setReservation(data);

        // Generate QR code only after successful database retrieval
        const qrUrl = await QRCode.toDataURL(data.qr_payload || data.reservation_id, {
          width: 250,
          margin: 1,
          color: {
            dark: '#0f172a', // Slate-900
            light: '#ffffff'
          }
        });
        setQrCodeUrl(qrUrl);
      } else {
        setError('Reservation not found.');
      }
    } catch (e) {
      console.error('Error fetching reservation details:', e);
      setError(e.message || 'Failed to load reservation details.');
    } finally {
      setLoading(false);
    }
  }, [location.search]);

  useEffect(() => {
    loadReservation();
  }, [loadReservation]);


  // 2. Realtime status subscription
  useEffect(() => {
    if (!reservation?.id) return;

    // Listen to changes on pickup_reservations where ID matches
    const channel = supabase
      .channel(`reservation-status-${reservation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pickup_reservations',
          filter: `id=eq.${reservation.id}`
        },
        (payload) => {
          console.log('[Confirmation] Live status update received:', payload.new);
          setReservation(prev => ({
            ...prev,
            status: payload.new.status
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reservation?.id]);

  // 3. Status display color mappings
  const getStatusDetails = (status) => {
    switch (status) {
      case 'Pending':
        return { text: 'Pending Confirmation', className: 'status-pending-live', pulse: true };
      case 'Preparing':
      case 'Preparing Medicines':
        return { text: 'Preparing Medicines', className: 'status-preparing-live', pulse: true };
      case 'Ready For Pickup':
        return { text: 'Ready For Pickup', className: 'status-ready-live', pulse: true };
      case 'Collected':
      case 'Completed':
        return { text: 'Pickup Completed', className: 'status-completed-live', pulse: false };
      case 'Cancelled':
        return { text: 'Reservation Cancelled', className: 'status-cancelled-live', pulse: false };
      default:
        return { text: status, className: 'status-default-live', pulse: false };
    }
  };

  // 4. Download PDF receipt builder
  const downloadPDF = () => {
    if (!reservation) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Color Palette
      const primaryBlue = [37, 99, 235]; // Blue
      const textDark = [31, 41, 55]; // Gray-800
      const textMuted = [107, 114, 128]; // Gray-500

      // Header: Draw Cross Logo
      doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.roundedRect(15, 12, 6, 18, 1, 1, 'F'); // Vertical bar
      doc.roundedRect(9, 18, 18, 6, 1, 1, 'F'); // Horizontal bar

      // Header: Store Name
      doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('Sri Venkateshwara Medical Store', 38, 19);

      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Licensed Pharmacy | Gachibowli, Hyderabad, Telangana', 38, 24);
      doc.text('Phone: +91 98765 43210 | GSTIN: 36AAAAA1111A1Z1', 38, 28);

      // Divider Line
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(15, 34, 195, 34);

      // Invoice Title & Date
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('PHARMACY RESERVATION RECEIPT', 15, 43);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Date: ${reservation.pickup_date}`, 148, 43);

      // Reservation Info Card (light box background)
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(15, 48, 180, 24, 2, 2, 'F');
      doc.setDrawColor(243, 244, 246);
      doc.roundedRect(15, 48, 180, 24, 2, 2, 'S');

      // Left Column details
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.setFontSize(9.5);
      doc.text('Reservation ID:', 20, 54);
      doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.setFont('Helvetica', 'bold');
      doc.text(reservation.reservation_id || '', 50, 54);

      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.setFont('Helvetica', 'normal');
      doc.text('Customer:', 20, 60);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFont('Helvetica', 'bold');
      doc.text(reservation.customer_name || 'Walk-in Customer', 50, 60);

      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.setFont('Helvetica', 'normal');
      doc.text('Phone:', 20, 66);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(reservation.phone_number || 'N/A', 50, 66);

      // Right Column details
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text('Pickup Date:', 115, 54);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFont('Helvetica', 'bold');
      doc.text(reservation.pickup_date || '', 142, 54);

      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.setFont('Helvetica', 'normal');
      doc.text('Pickup Time:', 115, 60);
      doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.setFont('Helvetica', 'bold');
      doc.text(reservation.pickup_time || '', 142, 60);

      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.setFont('Helvetica', 'normal');
      doc.text('Status:', 115, 66);
      doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.setFont('Helvetica', 'bold');
      doc.text(reservation.status || 'Pending', 142, 66);

      // Table Header Row
      let y = 80;
      doc.setFillColor(243, 244, 246);
      doc.rect(15, y, 180, 8, 'F');
      
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Medicine Item', 20, y + 5.5);
      doc.text('Qty', 120, y + 5.5);
      doc.text('Unit Price', 145, y + 5.5);
      doc.text('Total', 175, y + 5.5);

      y += 8;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);

      const items = Array.isArray(reservation.medicines) ? reservation.medicines : [];
      items.forEach((item) => {
        // Row divider
        doc.setDrawColor(243, 244, 246);
        doc.line(15, y + 8, 195, y + 8);

        doc.text(item.name || 'Medicine', 20, y + 5.5);
        doc.text(String(item.qty), 121, y + 5.5);
        doc.text(`₹${(item.price || 0).toFixed(2)}`, 145, y + 5.5);
        doc.text(`₹${((item.price || 0) * item.qty).toFixed(2)}`, 175, y + 5.5);

        y += 8;
      });

      // Grand Total Right Alignment
      y += 4;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Grand Total Amount:', 115, y + 5.5);
      doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.text(`₹${reservation.total_amount?.toFixed(2)}`, 175, y + 5.5);

      // QR Code and Collection Instructions
      y += 18;
      if (qrCodeUrl) {
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Scan QR Code at Store Counter to Collect:', 15, y + 5);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text('• Show this QR code to the pharmacist upon arrival.', 15, y + 12);
        doc.text('• Your medicines are pre-packaged and verified.', 15, y + 17);
        doc.text('• Pay via Cash, UPI, or Card at the store counter.', 15, y + 22);

        // Add QR image to PDF
        doc.addImage(qrCodeUrl, 'PNG', 145, y, 32, 32);
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text('Thank you for reserving with Sri Venkateshwara Medical Store!', 62, 275);

      // Save PDF document
      doc.save(`Invoice_${reservation.reservation_id}.pdf`);
    } catch (err) {
      console.error('Failed to generate receipt PDF:', err);
      showToast('Unable to download PDF. Please try again.', 'OK');
    }
  };

  // If loading details
  if (loading) {
    return (
      <div className="app-shell">
        <Navbar showSearch={false} />
        <main className="reservation-main" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </main>
      </div>
    );
  }

  // If error occurred
  if (error) {
    return (
      <div className="app-shell">
        <Navbar showSearch={false} />
        <main className="reservation-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '65vh', padding: '24px' }}>
          <ErrorState message={error} onRetry={loadReservation} />
        </main>
      </div>
    );
  }

  // If no reservation found
  if (!reservation) {
    return (
      <div className="app-shell">
        <Navbar showSearch={false} />
        <main className="reservation-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '65vh', padding: '24px' }}>
          <EmptyState
            icon={AlertCircle}
            title="Reservation Not Found"
            message="We could not find the requested pickup reservation. It may have expired or does not belong to this account."
            ctaLabel="Back to Home"
            onCta={() => navigate('/')}
          />
        </main>
      </div>
    );
  }


  // Loaded Details
  const isPending = reservation.status === 'Pending';
  const rxItemsOnly = Array.isArray(reservation.medicines) && reservation.medicines.some(it => it.id === 'prescription-only');
  const statusInfo = getStatusDetails(reservation.status);

  return (
    <div className="app-shell">
      <Navbar showSearch={false} />

      <main className="reservation-main" style={{ padding: '24px 16px', maxWidth: '100%', margin: '0 auto' }}>
        {/* Step Tracker (Only display during checkout flow) */}
        {!new URLSearchParams(location.search).get('id') && (
          <div className="steps-progress-bar" style={{ marginBottom: '32px' }}>
            <div className="steps-progress-line" style={{ width: '100%' }}></div>
            <div className="step-indicator completed">1</div>
            <div className="step-indicator completed">2</div>
            <div className="step-indicator active">3</div>
          </div>
        )}

        <div className="receipt-view-card animate-fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
          {/* Header Banner */}
          <div style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.04) 0%, rgba(20, 184, 166, 0.04) 100%)', padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={26} strokeWidth={3} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Reservation Confirmed</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Show QR code at the counter for pickup</p>
              </div>
            </div>

            {/* Live Status Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`live-status-pill ${statusInfo.className}`}>
                {statusInfo.pulse && <span className="status-ping-dot" />}
                {statusInfo.text}
              </span>
            </div>
          </div>

          <div style={{ padding: '24px' }}>
            {/* Pharmacy Receipt Invoice Block */}
            <div className="receipt-invoice-body" style={{ background: 'var(--bg-white)', border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '20px', position: 'relative' }}>
              {/* Receipt Header details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px dashed var(--border-color)' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Sri Venkateshwara Medical Store</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} /> Gachibowli, Hyderabad
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Reservation ID</span>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-color)' }}>{reservation.reservation_id}</div>
                </div>
              </div>

              {/* Customer Contact Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Customer Name</label>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={13} style={{ color: 'var(--text-secondary)' }} /> {reservation.customer_name || 'Walk-in Customer'}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Phone Number</label>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={13} style={{ color: 'var(--text-secondary)' }} /> {reservation.phone_number || 'N/A'}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Pickup Slot</label>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={13} /> {reservation.pickup_date}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={13} /> {reservation.pickup_time}</span>
                  </div>
                </div>
              </div>

              {/* Medicine Item Table */}
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>Reserved Medicines</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Array.isArray(reservation.medicines) && reservation.medicines.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</span>
                        {item.id !== 'prescription-only' && (
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>₹{(item.price || 0).toFixed(2)} each</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Qty: {item.qty}</span>
                        {item.id !== 'prescription-only' && (
                          <strong style={{ color: 'var(--text-primary)', width: '60px', textAlign: 'right' }}>₹{((item.price || 0) * item.qty).toFixed(2)}</strong>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotals & Pay Info */}
                {!rxItemsOnly && reservation.total_amount > 0 && (
                  <div style={{ borderTop: '1.5px dashed var(--border-color)', marginTop: '16px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>Total Amount to Pay</span>
                    <strong style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary-color)' }}>₹{reservation.total_amount?.toFixed(2)}</strong>
                  </div>
                )}
              </div>

              {/* QR and Scan details inside receipt */}
              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: '1', minWidth: '220px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>Collection QR Code</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    Our pharmacists will scan this barcode to retrieve your pre-packaged medicines. Skip the registration queues entirely!
                  </p>
                </div>
                {qrCodeUrl ? (
                  <div style={{ width: '120px', height: '120px', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', padding: '6px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={qrCodeUrl} alt="Reservation QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div style={{ width: '120px', height: '120px', backgroundColor: 'var(--bg-light)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="sim-loading-ring" style={{ width: '20px', height: '20px' }} />
                  </div>
                )}
              </div>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
              <button 
                className="reservation-cta-btn" 
                onClick={downloadPDF}
                style={{ width: '100%', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', marginTop: 0 }}
              >
                <Download size={18} />
                Download Receipt PDF
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button 
                  className="download-btn" 
                  onClick={() => navigate('/reservations')}
                  style={{ height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}
                >
                  <ShoppingBag size={16} />
                  My Reservations
                </button>
                <button 
                  className="download-btn" 
                  onClick={() => navigate('/')}
                  style={{ height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}
                >
                  <Home size={16} />
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .live-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.01em;
          text-transform: uppercase;
        }

        .status-pending-live {
          background-color: rgba(245, 158, 11, 0.08);
          color: #d97706;
          border: 1.5px solid rgba(245, 158, 11, 0.2);
        }

        .status-preparing-live {
          background-color: rgba(37, 99, 235, 0.08);
          color: #2563eb;
          border: 1.5px solid rgba(37, 99, 235, 0.2);
        }

        .status-ready-live {
          background-color: rgba(16, 185, 129, 0.08);
          color: #059669;
          border: 1.5px solid rgba(16, 185, 129, 0.2);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.15);
        }

        .status-completed-live {
          background-color: rgba(15, 118, 110, 0.08);
          color: #0f766e;
          border: 1.5px solid rgba(15, 118, 110, 0.2);
        }

        .status-cancelled-live {
          background-color: rgba(239, 68, 68, 0.08);
          color: #dc2626;
          border: 1.5px solid rgba(239, 68, 68, 0.2);
        }

        .status-default-live {
          background-color: rgba(107, 114, 128, 0.08);
          color: #4b5563;
          border: 1.5px solid rgba(107, 114, 128, 0.2);
        }

        .status-ping-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: currentColor;
          display: inline-block;
          animation: status-ping 1.4s infinite ease-in-out;
        }

        @keyframes status-ping {
          0% {
            transform: scale(0.85);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(0.85);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

const ConfirmationWithBoundary = () => (
  <ConfirmationErrorBoundary>
    <Confirmation />
  </ConfirmationErrorBoundary>
);

export default ConfirmationWithBoundary;
