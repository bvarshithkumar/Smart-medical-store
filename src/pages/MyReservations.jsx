import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, ShoppingBag, Eye, History, XCircle, Download, Package } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { fetchWithTimeout } from '../hooks/useFetchWithTimeout';
import { SkeletonCard, ErrorState, EmptyState } from '../components/LoadingStates';

const MyReservations = () => {
  const { user } = useAuth();
  const { showToast } = useCart();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReservations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
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
      setReservations(data);
    } catch (e) {
      console.error('Exception fetching reservations:', e);
      setError(e.message || 'Failed to load reservations.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const cancelReservation = useCallback(async (res) => {
    if (!window.confirm(`Cancel reservation ${res.reservation_id}? This action cannot be undone.`)) return;
    try {
      const { error } = await supabase
        .from('pickup_reservations')
        .update({ status: 'Cancelled' })
        .eq('id', res.id);
      if (error) throw error;
      showToast('Reservation cancelled successfully.', 'OK');
      fetchReservations();
    } catch (e) {
      console.error('Cancel reservation error:', e);
      showToast(`Failed to cancel: ${e.message}`, 'OK');
    }
  }, [fetchReservations, showToast]);


  const getStatusColorClass = (status) => {
    switch (status) {
      case 'Pending':
        return 'status-pending-pill';
      case 'Accepted By Customer':
        return 'status-accepted-pill';
      case 'Preparing':
      case 'Preparing Medicines':
        return 'status-preparing-pill';
      case 'Ready For Pickup':
        return 'status-ready-pill';
      case 'Collected':
      case 'Completed':
        return 'status-completed-pill';
      case 'Cancelled':
        return 'status-cancelled-pill';
      default:
        return 'status-default-pill';
    }
  };

  const canCancel = (status) => !['Collected', 'Completed', 'Cancelled'].includes(status);

  return (
    <div className="app-shell">
      <Navbar showSearch={false} />

      <main className="reservation-main" style={{ maxWidth: '100%', margin: '0 auto', padding: '24px 16px' }}>
        {/* Page Title */}
        <div className="page-title-row" style={{ marginBottom: '24px' }}>
          <History style={{ color: 'var(--primary-color)', width: '24px', height: '24px' }} />
          <h2 className="page-title" style={{ fontSize: '22px', fontWeight: 800 }}>My Pickup Reservations</h2>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchReservations} />
        ) : reservations.length === 0 ? (
          <EmptyState
            title="No Reservations Found"
            message="You don't have any pharmacy reservations scheduled yet. Browse medicines or upload a prescription to reserve your pickup slot."
            ctaLabel="Browse Medicines"
            onCta={() => navigate('/')}
          />
        ) : (

          <div className="reservations-container">
            {/* Desktop Table View */}
            <div className="desktop-reservations-table-wrapper" style={{ display: 'none' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px' }}>
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>Reservation ID</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>Pickup Details</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>Medicines</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>Total Amount</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((res) => (
                    <tr key={res.id} className="glass-reservation-row" style={{ background: 'var(--bg-card)', borderRadius: '12px', transition: 'transform 0.2s' }}>
                      <td style={{ padding: '16px', fontWeight: 800, color: 'var(--primary-color)', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                        {res.reservation_id}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={13} style={{ color: 'var(--primary-color)' }} /> {res.pickup_date}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={13} style={{ color: 'var(--text-secondary)' }} /> {res.pickup_time}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px', maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '13px' }}>
                        {Array.isArray(res.medicines)
                          ? res.medicines.map(m => `${m.name} (${m.qty})`).join(', ')
                          : 'Prescription Item'}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: 800, fontSize: '15px' }}>
                        ₹{res.total_amount?.toFixed(2)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <span className={`status-pill-badge ${getStatusColorClass(res.status)}`}>
                          {res.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                          <button 
                            className="view-receipt-row-btn"
                            onClick={() => navigate(`/confirmation?id=${res.reservation_id}`)}
                            style={{
                              background: 'rgba(20, 184, 166, 0.08)',
                              color: 'var(--primary-color)',
                              border: '1.5px solid rgba(20, 184, 166, 0.2)',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Eye size={13} />
                            Receipt
                          </button>
                          {res.receipt_url && (
                            <a
                              href={res.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                background: 'rgba(99,102,241,0.08)',
                                color: '#818cf8',
                                border: '1.5px solid rgba(99,102,241,0.2)',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '12px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                textDecoration: 'none',
                                transition: 'all 0.2s'
                              }}
                              title="Download Reservation PDF"
                            >
                              <Download size={13} />
                              PDF
                            </a>
                          )}
                          {canCancel(res.status) && (
                            <button
                              onClick={() => cancelReservation(res)}
                              title="Cancel Reservation"
                              style={{
                                background: 'rgba(239,68,68,0.08)',
                                color: '#f87171',
                                border: '1.5px solid rgba(239,68,68,0.2)',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s'
                              }}
                            >
                              <XCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="mobile-reservations-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reservations.map((res) => (
                <div 
                  key={res.id} 
                  className="glass-reservation-card"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {/* Top line ID & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary-color)' }}>
                      {res.reservation_id}
                    </span>
                    <span className={`status-pill-badge ${getStatusColorClass(res.status)}`}>
                      {res.status}
                    </span>
                  </div>

                  {/* Medicines list */}
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                    {Array.isArray(res.medicines)
                      ? res.medicines.map(m => `${m.name} (x${m.qty})`).join(', ')
                      : 'Prescription Item'}
                  </div>

                  {/* Pickup slot and Price */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} /> {res.pickup_date}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {res.pickup_time}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Amount</span>
                      <strong style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>₹{res.total_amount?.toFixed(2)}</strong>
                    </div>
                  </div>

                  {/* Action buttons row */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button 
                      onClick={() => navigate(`/confirmation?id=${res.reservation_id}`)}
                      className="download-btn"
                      style={{ flex: 1, height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}
                    >
                      <Eye size={15} />
                      View Receipt
                    </button>
                    {res.receipt_url && (
                      <a
                        href={res.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          height: '40px', width: '40px', borderRadius: '8px',
                          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#818cf8', flexShrink: 0, textDecoration: 'none'
                        }}
                        title="Download PDF"
                      >
                        <Download size={16} />
                      </a>
                    )}
                    {canCancel(res.status) && (
                      <button
                        onClick={() => cancelReservation(res)}
                        style={{
                          height: '40px', width: '40px', borderRadius: '8px',
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#f87171', cursor: 'pointer', flexShrink: 0
                        }}
                        title="Cancel Reservation"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Embedded styles specifically for table layout and status pills */}
      <style>{`
        @media (min-width: 768px) {
          .desktop-reservations-table-wrapper {
            display: block !important;
          }
          .mobile-reservations-list {
            display: none !important;
          }
        }

        .status-pill-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .status-pending-pill {
          background-color: rgba(245, 158, 11, 0.08);
          color: #d97706;
          border: 1px solid rgba(245, 158, 11, 0.15);
        }

        .status-preparing-pill {
          background-color: rgba(37, 99, 235, 0.08);
          color: #2563eb;
          border: 1px solid rgba(37, 99, 235, 0.15);
        }

        .status-ready-pill {
          background-color: rgba(16, 185, 129, 0.08);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.15);
        }

        .status-accepted-pill {
          background-color: rgba(37, 99, 235, 0.08);
          color: #60a5fa;
          border: 1px solid rgba(37, 99, 235, 0.15);
        }

        .status-completed-pill {
          background-color: rgba(15, 118, 110, 0.08);
          color: #0f766e;
          border: 1px solid rgba(15, 118, 110, 0.15);
        }

        .status-cancelled-pill {
          background-color: rgba(239, 68, 68, 0.08);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.15);
        }

        .status-default-pill {
          background-color: rgba(107, 114, 128, 0.08);
          color: #4b5563;
          border: 1px solid rgba(107, 114, 128, 0.15);
        }

        .glass-reservation-row:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
          border-color: rgba(20, 184, 166, 0.15);
        }

        .view-receipt-row-btn:hover {
          background-color: var(--primary-color) !important;
          color: white !important;
        }
      `}</style>
    </div>
  );
};

export default MyReservations;
