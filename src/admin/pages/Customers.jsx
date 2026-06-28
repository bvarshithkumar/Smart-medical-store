import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAdmin } from '../context/AdminContext';
import AdminLayout from '../components/AdminLayout';
import {
  Search, Eye, ShoppingBag, FileText, Clock, Phone, Mail, MapPin,
  Calendar, TrendingUp, MessageSquare, X, ChevronDown, ChevronUp,
  Download, ExternalLink, ZoomIn, ZoomOut, RotateCw, Printer,
  Package, FileCheck, AlertCircle, Loader2, User, CreditCard,
  CheckCircle, XCircle, RefreshCw, UserX, ShieldOff, ShieldCheck, Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

/* ─── Helpers ─────────────────────────────────────────────────── */
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not Set';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
const fmtDateTime = (d) => d ? `${fmt(d)}, ${fmtTime(d)}` : 'Pending';

/* ─── Customer Type Classification ───────────────────────────── */
const CUSTOMER_TYPES = {
  vip:      { key: 'vip',      label: 'VIP',      icon: '👑', bg: 'rgba(245,158,11,0.18)', color: '#f59e0b', border: 'rgba(245,158,11,0.4)',  shadow: 'rgba(245,158,11,0.25)' },
  frequent: { key: 'frequent', label: 'Frequent',  icon: '⭐', bg: 'rgba(139,92,246,0.18)', color: '#a78bfa', border: 'rgba(139,92,246,0.4)',  shadow: 'rgba(139,92,246,0.25)' },
  regular:  { key: 'regular',  label: 'Regular',   icon: '👤', bg: 'rgba(16,185,129,0.18)', color: '#10b981', border: 'rgba(16,185,129,0.4)',  shadow: 'rgba(16,185,129,0.25)' },
  new:      { key: 'new',      label: 'New',       icon: '🆕', bg: 'rgba(59,130,246,0.18)', color: '#60a5fa', border: 'rgba(59,130,246,0.4)',  shadow: 'rgba(59,130,246,0.25)' },
  inactive: { key: 'inactive', label: 'Inactive',  icon: '😴', bg: 'rgba(148,163,184,0.18)',color: '#94a3b8', border: 'rgba(148,163,184,0.4)', shadow: 'rgba(148,163,184,0.15)' },
};

/**
 * Pure classification function — never reads from DB, always re-derives from stats.
 * Priority (highest wins): VIP → Inactive → Frequent → Regular → New
 */
const getCustomerType = ({ ordersCount, totalSpent, lastOrderDate, registeredAt }) => {
  const now = Date.now();
  const daysSinceRegistered = registeredAt ? (now - new Date(registeredAt).getTime()) / 86400000 : 999;
  const daysSinceLastOrder  = lastOrderDate ? (now - new Date(lastOrderDate).getTime()) / 86400000 : 999;

  // 1. VIP — highest priority
  if (ordersCount > 15 || totalSpent > 10000) {
    return {
      ...CUSTOMER_TYPES.vip,
      tooltip: `VIP Customer\n${ordersCount} Orders\n₹${totalSpent.toLocaleString('en-IN')} Total Spent`,
    };
  }

  // 2. Inactive — no order in last 90 days
  if (daysSinceLastOrder > 90 && ordersCount > 0) {
    return {
      ...CUSTOMER_TYPES.inactive,
      tooltip: `Inactive Customer\n${ordersCount} Orders\nLast Order: ${lastOrderDate ? fmt(lastOrderDate) : 'Never'}`,
    };
  }

  // 3. Frequent — 6–15 orders AND spent > ₹2,000
  if (ordersCount >= 6 && ordersCount <= 15 && totalSpent > 2000) {
    return {
      ...CUSTOMER_TYPES.frequent,
      tooltip: `Frequent Customer\n${ordersCount} Orders\n₹${totalSpent.toLocaleString('en-IN')} Total Spent`,
    };
  }

  // 4. Regular — 2–5 orders AND ordered in last 60 days
  if (ordersCount >= 2 && ordersCount <= 5 && daysSinceLastOrder <= 60) {
    return {
      ...CUSTOMER_TYPES.regular,
      tooltip: `Regular Customer\n${ordersCount} Orders\nLast Order: ${lastOrderDate ? fmt(lastOrderDate) : 'Never'}`,
    };
  }

  // 5. New — registered within 7 days AND ≤1 order
  if (daysSinceRegistered <= 7 && ordersCount <= 1) {
    return {
      ...CUSTOMER_TYPES.new,
      tooltip: `New Customer\nJoined ${Math.floor(daysSinceRegistered)} day(s) ago\n${ordersCount} Order(s)`,
    };
  }

  // Default: New for zero-order customers, Inactive for others with no recent activity
  if (ordersCount === 0) {
    return {
      ...CUSTOMER_TYPES.new,
      tooltip: `New Customer\nNo orders yet\nJoined ${fmt(registeredAt)}`,
    };
  }

  return {
    ...CUSTOMER_TYPES.inactive,
    tooltip: `Inactive Customer\n${ordersCount} Orders\nLast Order: ${lastOrderDate ? fmt(lastOrderDate) : 'Never'}`,
  };
};

/* ─── CustomerTypeBadge ───────────────────────────────────────── */
const CustomerTypeBadge = ({ type, style: extraStyle }) => {
  if (!type) return null;
  const BADGE_CSS = `
    .ctype-badge { position:relative; display:inline-flex; align-items:center; gap:5px;
      padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700;
      border:1px solid; cursor:default; white-space:nowrap;
      animation:ctypePop 0.25s cubic-bezier(0.34,1.56,0.64,1) both;
      transition:box-shadow 0.2s, transform 0.2s; }
    .ctype-badge:hover { transform:translateY(-1px); }
    .ctype-tooltip { position:absolute; bottom:calc(100% + 8px); left:50%; transform:translateX(-50%);
      background:#1e293b; color:#f1f5f9; border:1px solid rgba(255,255,255,0.1);
      padding:8px 12px; border-radius:8px; font-size:12px; font-weight:500; white-space:pre;
      pointer-events:none; opacity:0; transition:opacity 0.15s; z-index:9999; line-height:1.6;
      box-shadow:0 8px 24px rgba(0,0,0,0.4); min-width:160px; text-align:center; }
    .ctype-badge:hover .ctype-tooltip { opacity:1; }
    @keyframes ctypePop { from { opacity:0; transform:scale(0.8); } to { opacity:1; transform:scale(1); } }
  `;
  return (
    <>
      <style>{BADGE_CSS}</style>
      <span
        className="ctype-badge"
        style={{
          background: type.bg, color: type.color,
          borderColor: type.border,
          boxShadow: `0 2px 8px ${type.shadow}`,
          ...extraStyle
        }}
      >
        <span>{type.icon}</span>
        <span>{type.label}</span>
        <span className="ctype-tooltip">{type.tooltip}</span>
      </span>
    </>
  );
};

const STATUS_COLORS = {
  pending:           { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'Pending' },
  'under review':    { bg: 'rgba(99,102,241,0.15)', color: '#6366f1', label: 'Under Review' },
  'quote sent':      { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', label: 'Quote Sent' },
  'quote generated': { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', label: 'Quote Generated' },
  accepted:          { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Accepted' },
  preparing:         { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Preparing' },
  ready:             { bg: 'rgba(6,182,212,0.15)', color: '#06b6d4', label: 'Ready' },
  'ready for pickup':{ bg: 'rgba(6,182,212,0.15)', color: '#06b6d4', label: 'Ready for Pickup' },
  collected:         { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Collected' },
  completed:         { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Completed' },
  cancelled:         { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444', label: 'Cancelled' },
};

const statusStyle = (s) => {
  const key = (s || '').toLowerCase();
  return STATUS_COLORS[key] || { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', label: s || 'Unknown' };
};

const renderPrescriptionRef = (prescription, reservation, order) => {
  if (reservation?.prescription_id) {
    if (prescription) {
      if (!prescription.image_url && !prescription.file_url) {
        return (
          <span className="badge badge-pending" style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12 }}>
            ⚠️ Pending Upload
          </span>
        );
      }
      return (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {prescription.reference_id || `Rx-${prescription.id.slice(0, 8)}`}
        </span>
      );
    } else {
      return (
        <span className="badge badge-pending" style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12 }}>
          ⚠️ Pending Upload
        </span>
      );
    }
  } else {
    const hasMeds = (reservation?.medicines && Array.isArray(reservation.medicines) && reservation.medicines.length > 0) || 
                    (order?.medicines && order.medicines.length > 0);
    if (hasMeds) {
      return (
        <span className="badge" style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' }}>
          OTC Order
        </span>
      );
    } else {
      return (
        <span className="badge" style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' }}>
          Not Required
        </span>
      );
    }
  }
};

const renderQuoteNumber = (quote) => {
  if (quote?.quote_number) {
    if (quote.quote_pdf_url) {
      return (
        <a 
          href={quote.quote_pdf_url} 
          target="_blank" 
          rel="noreferrer" 
          className="badge" 
          style={{ 
            fontSize: 11, 
            fontWeight: 700, 
            padding: '3px 8px', 
            borderRadius: 12, 
            background: 'rgba(6, 182, 212, 0.15)', 
            color: '#06b6d4', 
            textDecoration: 'none',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          title="Click to view Quotation PDF"
        >
          📄 {quote.quote_number}
        </a>
      );
    } else {
      return (
        <span 
          className="badge" 
          style={{ 
            fontSize: 11, 
            fontWeight: 600, 
            padding: '3px 8px', 
            borderRadius: 12, 
            background: 'rgba(148, 163, 184, 0.15)', 
            color: '#94a3b8' 
          }}
        >
          {quote.quote_number}
        </span>
      );
    }
  } else {
    return (
      <span 
        className="badge" 
        style={{ 
          fontSize: 11, 
          fontWeight: 600, 
          padding: '3px 8px', 
          borderRadius: 12, 
          background: 'rgba(245, 158, 11, 0.15)', 
          color: '#f59e0b' 
        }}
      >
        Pending Quote
      </span>
    );
  }
};

const TIMELINE_STEPS = [
  { key: 'pending',           label: 'Prescription Uploaded' },
  { key: 'under review',      label: 'Under Review' },
  { key: 'quote generated',   label: 'Quote Generated' },
  { key: 'quote sent',        label: 'Quote Sent' },
  { key: 'accepted',          label: 'Accepted' },
  { key: 'preparing',         label: 'Preparing' },
  { key: 'ready for pickup',  label: 'Ready for Pickup' },
  { key: 'collected',         label: 'Collected' },
];

const STATUS_ORDER = TIMELINE_STEPS.map(t => t.key);
const statusIndex = (s) => {
  const idx = STATUS_ORDER.indexOf((s || '').toLowerCase());
  return idx === -1 ? 0 : idx;
};

/* ─── PrescriptionViewer ──────────────────────────────────────── */
const PrescriptionViewer = ({ url, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0);
  const isPdf = url && (url.includes('.pdf') || url.includes('application/pdf'));

  if (!url) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
      <AlertCircle size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
      <p>Prescription file not available</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {!isPdf && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
              <ZoomIn size={14} /> Zoom In
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
              <ZoomOut size={14} /> Zoom Out
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setRotate(r => (r + 90) % 360)}>
              <RotateCw size={14} /> Rotate
            </button>
          </>
        )}
        <a href={url} download target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
          <Download size={14} /> Download
        </a>
        <button className="btn btn-ghost btn-sm" onClick={() => window.open(url, '_blank')}>
          <ExternalLink size={14} /> Open
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => { const w = window.open(url, '_blank'); w.print(); }}>
          <Printer size={14} /> Print
        </button>
      </div>
      {isPdf ? (
        <iframe src={url} title="Prescription" style={{ width: '100%', height: 480, border: 'none', borderRadius: 8, background: '#fff' }} />
      ) : (
        <div style={{ overflow: 'auto', maxHeight: 480, textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: 8, padding: 16 }}>
          <img
            src={url}
            alt="Prescription"
            style={{ transform: `scale(${zoom}) rotate(${rotate}deg)`, transition: 'transform 0.2s', maxWidth: '100%', borderRadius: 6 }}
          />
        </div>
      )}
    </div>
  );
};

/* ─── ChatHistoryPanel ────────────────────────────────────────── */
const ChatHistoryPanel = ({ prescriptionId, conversationId }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  useEffect(() => {
    if (!prescriptionId && !conversationId) { setLoading(false); return; }
    const fetch = async () => {
      setLoading(true);
      let q = supabase.from('chat_messages').select('*').order('created_at', { ascending: true });
      if (conversationId) q = q.eq('conversation_id', conversationId);
      else if (prescriptionId) q = q.eq('prescription_id', prescriptionId);
      const { data } = await q;
      setMessages(data || []);
      setLoading(false);
    };
    fetch();
  }, [prescriptionId, conversationId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></div>;
  if (messages.length === 0) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No chat messages for this order.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto', padding: '4px 0' }}>
      {messages.map(m => {
        const isAdmin = m.sender_role === 'admin' || m.sender_role === 'pharmacist';
        return (
          <div key={m.id} style={{ display: 'flex', flexDirection: isAdmin ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
            <div style={{
              maxWidth: '70%', padding: '10px 14px', borderRadius: isAdmin ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
              background: isAdmin ? 'linear-gradient(135deg, var(--cyan), var(--indigo))' : 'var(--bg-elevated)',
              border: isAdmin ? 'none' : '1px solid var(--border)',
              color: isAdmin ? '#fff' : 'var(--text-primary)',
              fontSize: 13, lineHeight: 1.5
            }}>
              {m.image_url && <img src={m.image_url} alt="attachment" style={{ maxWidth: 200, borderRadius: 8, marginBottom: 6 }} />}
              {m.message && <p style={{ margin: 0 }}>{m.message}</p>}
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, textAlign: isAdmin ? 'left' : 'right' }}>
                {fmtDateTime(m.created_at)} {m.is_read ? '✓✓' : '✓'}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
};

/* ─── OrderDetailPanel ────────────────────────────────────────── */
const OrderDetailPanel = ({ order }) => {
  if (!order) return null;
  const { reservation, prescription, quote, medicines } = order;
  const ss = statusStyle(reservation.status);
  const currentIdx = statusIndex(reservation.status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Status Timeline */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Order Timeline</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
          {TIMELINE_STEPS.map((step, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <React.Fragment key={step.key}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: done ? (active ? 'var(--cyan)' : '#10b981') : 'var(--bg-elevated)',
                    border: done ? 'none' : '2px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: done ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.3s'
                  }}>
                    {done ? (i < currentIdx ? '✓' : '●') : i + 1}
                  </div>
                  <div style={{ fontSize: 10, color: done ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'center', marginTop: 6, lineHeight: 1.3, fontWeight: done ? 600 : 400 }}>
                    {step.label}
                  </div>
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: i < currentIdx ? '#10b981' : 'var(--border)', minWidth: 16, marginBottom: 20 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Order Info */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Order Information</p>
          {[
            { label: 'Reservation ID', value: reservation.reservation_id || reservation.id },
            { label: 'Status', value: <span style={{ padding: '3px 10px', borderRadius: 20, background: ss.bg, color: ss.color, fontSize: 12, fontWeight: 600 }}>{ss.label}</span> },
            { label: 'Pickup Date', value: fmt(reservation.pickup_date) },
            { label: 'Pickup Time', value: reservation.pickup_time || 'Not Scheduled' },
            { label: 'Created At', value: fmtDateTime(reservation.created_at) },
            { label: 'Collected At', value: reservation.collected_at ? fmtDateTime(reservation.collected_at) : 'Not Collected' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-light, rgba(255,255,255,0.05))' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.value}</span>
            </div>
          ))}
        </div>

        {/* Quote Info */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Quotation & Payment</p>
          {[
            { label: 'Quote Number', value: renderQuoteNumber(quote) },
            { label: 'Quote Status', value: quote?.status || 'Pending Generation' },
            { label: 'Quote Amount', value: quote ? `₹${Number(quote.total_amount).toLocaleString('en-IN')}` : 'Pending' },
            { label: 'Total Amount', value: reservation.total_amount ? `₹${Number(reservation.total_amount).toLocaleString('en-IN')}` : 'Pending' },
            { label: 'Prescription Ref', value: renderPrescriptionRef(prescription, reservation, order) },
            { label: 'Collected By', value: reservation.collected_by || 'Not Collected' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-light, rgba(255,255,255,0.05))' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Medicine List */}
      {medicines && medicines.length > 0 && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Medicine List ({medicines.length} items)
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Medicine', 'Qty', 'Unit Price', 'Total'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'left', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {medicines.map((m, i) => (
                <tr key={m.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {m.image_url && <img src={m.image_url} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
                    <span style={{ fontWeight: 600 }}>{m.medicine_name || m.name || 'Unknown'}</span>
                  </td>
                  <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{m.quantity || m.qty || 1}</td>
                  <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>₹{Number(m.unit_price || m.price || 0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '8px', fontWeight: 700 }}>
                    ₹{Number((m.unit_price || m.price || 0) * (m.quantity || m.qty || 1)).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* From reservation medicines JSON if no prescription_medicines */}
      {(!medicines || medicines.length === 0) && reservation.medicines && Array.isArray(reservation.medicines) && reservation.medicines.length > 0 && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Medicines ({reservation.medicines.length} items)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {reservation.medicines.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{m.name || m.medicine_name || m}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Qty: {m.quantity || m.qty || 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Documents</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Quotation PDF', url: quote?.quote_pdf_url, icon: '📄' },
            { label: 'Invoice / Receipt', url: reservation.receipt_url, icon: '🧾' },
            { label: 'Prescription', url: prescription?.image_url || prescription?.file_url, icon: '🩺' },
          ].map(doc => (
            <div key={doc.label} style={{ flex: 1, minWidth: 140, background: 'var(--bg-card)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{doc.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{doc.label}</div>
              {doc.url ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <a href={doc.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                    <ExternalLink size={12} /> Open
                  </a>
                  <a href={doc.url} download target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                    <Download size={12} />
                  </a>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 0' }}>Not Available</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Confirm Dialog ──────────────────────────────────────────── */
const ConfirmDialog = ({ open, title, message, confirmLabel, confirmColor = '#ef4444', onConfirm, onCancel, loading }) => {
  if (!open) return null;
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed', inset: 0, zIndex: 20000, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
      }}
    >
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
        padding: '28px 32px', maxWidth: 420, width: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)', animation: 'fadeIn 0.15s ease'
      }}>
        <style>{`@keyframes fadeIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }`}</style>
        <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800 }}>{title}</h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
          <button
            className="btn"
            onClick={onConfirm}
            disabled={loading}
            style={{ background: confirmColor, color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── CustomerCRMModal (MUST be outside Customers to avoid remount) */
const CustomerCRMModal = ({ customer, onClose, onDeactivate, onDelete }) => {
  const [crmData, setCrmData] = useState({ reservations: [], loading: true, error: null });
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [activePanel, setActivePanel] = useState(null); // { type: 'details'|'prescription'|'chat', order }
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type: 'deactivate'|'delete' }
  const [actionLoading, setActionLoading] = useState(false);

  /* Fetch all data for this customer */
  const fetchCRMData = useCallback(async (customerId) => {
    setCrmData({ reservations: [], loading: true, error: null });
    try {
      // 1. Fetch all reservations for this customer
      const { data: resData, error: resErr } = await supabase
        .from('pickup_reservations')
        .select('*')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false });

      if (resErr) throw resErr;
      const reservations = resData || [];

      // 2. Collect all prescription IDs
      const prescriptionIds = [...new Set(reservations.map(r => r.prescription_id).filter(Boolean))];

      // 3. Fetch prescriptions
      let prescriptionsMap = {};
      if (prescriptionIds.length > 0) {
        const { data: rxData } = await supabase
          .from('prescriptions')
          .select('*')
          .in('id', prescriptionIds);
        (rxData || []).forEach(rx => { prescriptionsMap[rx.id] = rx; });
      }

      // 4. Fetch quotes
      let quotesMap = {};
      if (prescriptionIds.length > 0) {
        const { data: qData } = await supabase
          .from('prescription_quotes')
          .select('*')
          .in('prescription_id', prescriptionIds)
          .order('created_at', { ascending: false });
        (qData || []).forEach(q => {
          // Keep latest quote per prescription
          if (!quotesMap[q.prescription_id]) quotesMap[q.prescription_id] = q;
        });
      }

      // 5. Fetch medicines for each prescription
      let medicinesMap = {};
      if (prescriptionIds.length > 0) {
        const { data: medData } = await supabase
          .from('prescription_medicines')
          .select('*')
          .in('prescription_id', prescriptionIds);
        (medData || []).forEach(m => {
          if (!medicinesMap[m.prescription_id]) medicinesMap[m.prescription_id] = [];
          medicinesMap[m.prescription_id].push(m);
        });
      }

      // 6. Enrich reservations
      const enriched = reservations.map(r => ({
        reservation: r,
        prescription: r.prescription_id ? prescriptionsMap[r.prescription_id] || null : null,
        quote: r.prescription_id ? quotesMap[r.prescription_id] || null : null,
        medicines: r.prescription_id ? medicinesMap[r.prescription_id] || [] : [],
      }));

      setCrmData({ reservations: enriched, loading: false, error: null });
    } catch (err) {
      console.error('[CustomerCRM] fetch error:', err);
      setCrmData({ reservations: [], loading: false, error: err.message });
    }
  }, []);

  useEffect(() => {
    if (customer?.id) {
      fetchCRMData(customer.id);
      setActivePanel(null);
      setExpandedOrder(null);
      setSearch('');
      setDateFilter('all');
    }
  }, [customer?.id, fetchCRMData]);

  /* Derived metrics */
  const totalSpent = crmData.reservations.reduce((s, o) => s + Number(o.reservation.total_amount || 0), 0);
  const totalOrders = crmData.reservations.length;
  const completedOrders = crmData.reservations.filter(o => ['collected','completed'].includes((o.reservation.status||'').toLowerCase())).length;
  const totalRx = [...new Set(crmData.reservations.map(o => o.reservation.prescription_id).filter(Boolean))].length;
  const avgOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;

  const lastOrderDate = crmData.reservations.length > 0
    ? crmData.reservations[0].reservation.created_at
    : null;

  /* Date filter */
  const filterByDate = (orders) => {
    if (dateFilter === 'all') return orders;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return orders.filter(o => {
      const d = new Date(o.reservation.created_at);
      if (dateFilter === 'today') return d >= today;
      if (dateFilter === 'yesterday') { const y = new Date(today); y.setDate(y.getDate()-1); return d >= y && d < today; }
      if (dateFilter === 'week') { const w = new Date(today); w.setDate(w.getDate()-7); return d >= w; }
      if (dateFilter === 'month') { const m = new Date(today); m.setDate(m.getDate()-30); return d >= m; }
      return true;
    });
  };

  /* Search filter */
  const filtered = filterByDate(crmData.reservations).filter(o => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (o.reservation.reservation_id || '').toLowerCase().includes(q) ||
      (o.reservation.id || '').toLowerCase().includes(q) ||
      (o.prescription?.reference_id || '').toLowerCase().includes(q) ||
      (o.quote?.quote_number || '').toLowerCase().includes(q) ||
      (o.reservation.status || '').toLowerCase().includes(q) ||
      (o.reservation.phone_number || '').includes(q)
    );
  });

  const email = customer?.email || '—';
  const phone = customer?.phone || customer?.phone_number || '—';
  const address = customer?.address || '—';
  const initials = (customer?.full_name || 'C').slice(0,2).toUpperCase();

  const openPanel = (type, order, e) => {
    e?.stopPropagation();
    setActivePanel({ type, order });
  };

  const closePanel = () => setActivePanel(null);

  const isDeactivated = customer?.role === 'deactivated';

  const handleConfirmAction = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      if (confirm.type === 'deactivate') {
        await onDeactivate(customer, isDeactivated);
      } else if (confirm.type === 'delete') {
        await onDelete(customer);
        onClose();
      }
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
        opacity: 1, pointerEvents: 'auto'
      }}
    >
      {/* Main CRM Drawer */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '92vw', maxWidth: 1100, height: '100vh',
          background: 'var(--bg-card)', display: 'flex', flexDirection: 'column',
          overflowY: 'hidden', boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
          animation: 'slideInRight 0.25s ease'
        }}
      >
        <style>{`
          @keyframes slideInRight { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes spin { to { transform: rotate(360deg); } }
          .crm-action-btn { display:inline-flex; align-items:center; gap:5px; padding:5px 10px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid var(--border); background:var(--bg-elevated); color:var(--text-primary); transition:all 0.15s; white-space:nowrap; }
          .crm-action-btn:hover:not(:disabled) { background:var(--cyan); color:#fff; border-color:var(--cyan); }
          .crm-action-btn:disabled { opacity:0.4; cursor:not-allowed; }
          .crm-metric { display:flex; flex-direction:column; gap:4px; padding:14px 20px; border-right:1px solid var(--border); }
          .crm-metric:last-child { border-right:none; }
          .crm-danger-btn { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; border:1px solid; transition:all 0.15s; white-space:nowrap; }
        `}</style>

        {/* Header */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--cyan), var(--indigo))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color: '#fff', fontSize: 22, flexShrink: 0
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{customer?.full_name || 'Customer'}</h2>
              {/* Customer type badge in CRM drawer — computed inline from crmData */}
              {crmData && !crmData.loading && (() => {
                const totalSpent = crmData.reservations.reduce((s, o) => s + Number(o.reservation.total_amount || 0), 0);
                const ordersCount = crmData.reservations.length;
                const sorted = crmData.reservations.map(o => o.reservation.created_at).filter(Boolean).sort((a,b) => new Date(b)-new Date(a));
                const lastOrderDate = sorted[0] || null;
                const ct = getCustomerType({ ordersCount, totalSpent, lastOrderDate, registeredAt: customer?.created_at });
                return <CustomerTypeBadge type={ct} style={{ fontSize: 12 }} />;
              })()}
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-muted)' }}>
                <Phone size={13} /> {phone}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-muted)' }}>
                <Mail size={13} /> {email}
              </span>
              {address !== '—' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-muted)' }}>
                  <MapPin size={13} /> {address}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-muted)' }}>
                <Calendar size={13} /> Joined {fmt(customer?.created_at)}
              </span>
              {lastOrderDate && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-muted)' }}>
                  <Clock size={13} /> Last Order {fmt(lastOrderDate)}
                </span>
              )}
            </div>
          </div>
          {/* Account Actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {isDeactivated && (
              <span style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 11, fontWeight: 700, border: '1px solid rgba(239,68,68,0.3)' }}>
                🚫 DEACTIVATED
              </span>
            )}
            <button
              className="crm-danger-btn"
              onClick={() => setConfirm({ type: 'deactivate' })}
              style={{
                background: isDeactivated ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                color: isDeactivated ? '#10b981' : '#f59e0b',
                borderColor: isDeactivated ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)',
              }}
              title={isDeactivated ? 'Reactivate this customer account' : 'Deactivate this customer account'}
            >
              {isDeactivated ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
              {isDeactivated ? 'Reactivate' : 'Deactivate'}
            </button>
            <button
              className="crm-danger-btn"
              onClick={() => setConfirm({ type: 'delete' })}
              style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
              title="Permanently delete this customer"
            >
              <Trash2 size={14} /> Delete
            </button>
            <button
              onClick={onClose}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Metrics Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto' }}>
          {[
            { label: 'Total Reservations', value: totalOrders, icon: <ShoppingBag size={16} />, color: 'var(--cyan)' },
            { label: 'Completed', value: completedOrders, icon: <CheckCircle size={16} />, color: '#10b981' },
            { label: 'Total Spent', value: `₹${totalSpent.toLocaleString('en-IN')}`, icon: <CreditCard size={16} />, color: '#8b5cf6' },
            { label: 'Avg Order Value', value: `₹${Math.round(avgOrder).toLocaleString('en-IN')}`, icon: <TrendingUp size={16} />, color: '#f59e0b' },
            { label: 'Prescriptions', value: totalRx, icon: <FileText size={16} />, color: '#06b6d4' },
          ].map(m => (
            <div key={m.label} className="crm-metric" style={{ flex: '1 0 120px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: m.color }}>{m.icon}<span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</span></div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Body: Split layout when panel open */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Orders Table column */}
          <div style={{ flex: activePanel ? '0 0 55%' : '1', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: activePanel ? '1px solid var(--border)' : 'none' }}>

            {/* Search + Date Filter */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by Order ID, Rx ID, Quote No, Status…"
                  style={{ width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 7, paddingBottom: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['all','today','yesterday','week','month'].map(f => (
                  <button
                    key={f}
                    onClick={() => setDateFilter(f)}
                    style={{
                      padding: '5px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                      background: dateFilter === f ? 'var(--cyan)' : 'var(--bg-elevated)',
                      color: dateFilter === f ? '#fff' : 'var(--text-muted)',
                      border: '1px solid var(--border)', cursor: 'pointer', textTransform: 'capitalize'
                    }}
                  >{f === 'all' ? 'All Time' : f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : f.charAt(0).toUpperCase()+f.slice(1)}</button>
                ))}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{filtered.length} orders</span>
            </div>

            {/* Orders List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 16px' }}>
              {crmData.loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 10 }} />
                  <p>Loading orders…</p>
                </div>
              ) : crmData.error ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#ef4444' }}>
                  <AlertCircle size={24} style={{ marginBottom: 8 }} />
                  <p>{crmData.error}</p>
                  <button className="btn btn-ghost btn-sm" onClick={() => fetchCRMData(customer.id)} style={{ marginTop: 8 }}>
                    <RefreshCw size={14} /> Retry
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Package size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <p style={{ fontSize: 14 }}>No orders found</p>
                  {(search || dateFilter !== 'all') && <p style={{ fontSize: 12, marginTop: 4 }}>Try clearing filters</p>}
                </div>
              ) : (
                filtered.map(order => {
                  const { reservation, prescription, quote } = order;
                  const ss = statusStyle(reservation.status);
                  const isExpanded = expandedOrder === reservation.id;
                  const isActiveDetails = activePanel?.type === 'details' && activePanel?.order?.reservation?.id === reservation.id;
                  const isActivePrescription = activePanel?.type === 'prescription' && activePanel?.order?.reservation?.id === reservation.id;
                  const isActiveChat = activePanel?.type === 'chat' && activePanel?.order?.reservation?.id === reservation.id;

                  return (
                    <div
                      key={reservation.id}
                      style={{
                        margin: '0 16px 8px', borderRadius: 12,
                        background: isExpanded ? 'var(--bg-elevated)' : 'var(--bg-card)',
                        border: `1px solid ${isExpanded ? 'var(--cyan)' : 'var(--border)'}`,
                        transition: 'all 0.2s', overflow: 'hidden'
                      }}
                    >
                      {/* Order Row */}
                      <div
                        style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                        onClick={() => setExpandedOrder(isExpanded ? null : reservation.id)}
                      >
                        <div style={{ flex: '0 0 auto' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--cyan)', fontFamily: 'monospace' }}>
                            {reservation.reservation_id || reservation.id?.slice(-8)}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {fmtDateTime(reservation.created_at)}
                          </div>
                        </div>

                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12, alignItems: 'center' }}>
                          <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 4 }}>Prescription Ref</div>
                            <div style={{ display: 'inline-flex' }}>{renderPrescriptionRef(prescription, reservation, order)}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 4 }}>Quote No</div>
                            <div style={{ display: 'inline-flex' }}>{renderQuoteNumber(quote)}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 4 }}>Amount</div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {reservation.total_amount ? `₹${Number(reservation.total_amount).toLocaleString('en-IN')}` : 'Pending'}
                            </div>
                          </div>
                        </div>

                        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: ss.bg, color: ss.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {ss.label}
                        </span>
                        <span style={{ color: 'var(--text-muted)', flexShrink: 0, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                          <ChevronDown size={16} />
                        </span>
                      </div>

                      {/* Action Buttons */}
                      {isExpanded && (
                        <div style={{ padding: '8px 16px 14px', display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
                          <button
                            className="crm-action-btn"
                            disabled={!quote?.quote_pdf_url}
                            title={quote?.quote_pdf_url ? 'Open Quotation PDF' : 'Quotation Not Generated'}
                            onClick={e => { e.stopPropagation(); if (quote?.quote_pdf_url) window.open(quote.quote_pdf_url, '_blank'); }}
                          >
                            📄 View Quotation
                          </button>
                          <button
                            className="crm-action-btn"
                            disabled={!reservation.receipt_url}
                            title={reservation.receipt_url ? 'Open Invoice/Receipt' : 'Invoice Not Generated'}
                            onClick={e => { e.stopPropagation(); if (reservation.receipt_url) window.open(reservation.receipt_url, '_blank'); }}
                          >
                            🧾 View Invoice
                          </button>
                          <button
                            className="crm-action-btn"
                            disabled={!prescription?.image_url && !prescription?.file_url}
                            title={(prescription?.image_url || prescription?.file_url) ? 'View Prescription' : 'No Prescription Uploaded'}
                            onClick={e => isActivePrescription ? closePanel() : openPanel('prescription', order, e)}
                            style={{ background: isActivePrescription ? 'var(--cyan)' : undefined, color: isActivePrescription ? '#fff' : undefined, borderColor: isActivePrescription ? 'var(--cyan)' : undefined }}
                          >
                            🩺 View Prescription
                          </button>
                          <button
                            className="crm-action-btn"
                            onClick={e => isActiveDetails ? closePanel() : openPanel('details', order, e)}
                            style={{ background: isActiveDetails ? 'var(--cyan)' : undefined, color: isActiveDetails ? '#fff' : undefined, borderColor: isActiveDetails ? 'var(--cyan)' : undefined }}
                          >
                            📦 View Order Details
                          </button>
                          <button
                            className="crm-action-btn"
                            onClick={e => isActiveChat ? closePanel() : openPanel('chat', order, e)}
                            style={{ background: isActiveChat ? 'var(--cyan)' : undefined, color: isActiveChat ? '#fff' : undefined, borderColor: isActiveChat ? 'var(--cyan)' : undefined }}
                          >
                            💬 View Chat
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Side Panel */}
          {activePanel && (
            <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                    {activePanel.type === 'details' ? '📦 Order Details' : activePanel.type === 'prescription' ? '🩺 Prescription' : '💬 Chat History'}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {activePanel.order?.reservation?.reservation_id || activePanel.order?.reservation?.id?.slice(-8)}
                  </p>
                </div>
                <button
                  onClick={closePanel}
                  style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {activePanel.type === 'details' && <OrderDetailPanel order={activePanel.order} />}
                {activePanel.type === 'prescription' && (
                  <PrescriptionViewer
                    url={activePanel.order?.prescription?.image_url || activePanel.order?.prescription?.file_url}
                  />
                )}
                {activePanel.type === 'chat' && (
                  <ChatHistoryPanel
                    prescriptionId={activePanel.order?.reservation?.prescription_id}
                    conversationId={null}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-sm"
              onClick={() => setConfirm({ type: 'deactivate' })}
              style={{ background: isDeactivated ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: isDeactivated ? '#10b981' : '#f59e0b', border: `1px solid ${isDeactivated ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {isDeactivated ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
              {isDeactivated ? 'Reactivate Account' : 'Deactivate Account'}
            </button>
            <button
              className="btn btn-sm"
              onClick={() => setConfirm({ type: 'delete' })}
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Trash2 size={13} /> Delete Customer
            </button>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={!!confirm}
          title={confirm?.type === 'delete' ? '⚠️ Delete Customer?' : isDeactivated ? '✅ Reactivate Customer?' : '⚠️ Deactivate Customer?'}
          message={
            confirm?.type === 'delete'
              ? `This will permanently remove ${customer?.full_name || 'this customer'} from the system. Their orders and prescriptions will be anonymised. This cannot be undone.`
              : isDeactivated
              ? `${customer?.full_name || 'This customer'}'s account will be restored. They will be able to log in again.`
              : `${customer?.full_name || 'This customer'}'s account will be suspended. They will not be able to log in. Their data and order history are preserved.`
          }
          confirmLabel={confirm?.type === 'delete' ? 'Delete Permanently' : isDeactivated ? 'Reactivate' : 'Deactivate'}
          confirmColor={confirm?.type === 'delete' ? '#ef4444' : isDeactivated ? '#10b981' : '#f59e0b'}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirm(null)}
          loading={actionLoading}
        />
      </div>
    </div>
  );
};

/* ─── Main Customers Component ────────────────────────────────── */
const Customers = () => {
  const { orders, prescriptions, allReservations } = useAdmin();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchCustomers = useCallback(async () => {
    try {
      // Fetch both active customers AND deactivated ones
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['customer', 'deactivated'])
        .order('created_at', { ascending: false });
      if (!error) setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  /* Deactivate / Reactivate */
  const handleDeactivate = useCallback(async (customer, isCurrentlyDeactivated) => {
    const newRole = isCurrentlyDeactivated ? 'customer' : 'deactivated';
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', customer.id);
    if (error) {
      alert(`Failed to ${isCurrentlyDeactivated ? 'reactivate' : 'deactivate'} customer: ${error.message}`);
      return;
    }
    // Update local state immediately
    setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, role: newRole } : c));
    // Also update selected so the CRM header reflects the change
    if (selected?.id === customer.id) setSelected(prev => ({ ...prev, role: newRole }));
  }, [selected]);

  /* Soft delete — set role to 'deleted', hide from list */
  const handleDelete = useCallback(async (customer) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'deleted' })
      .eq('id', customer.id);
    if (error) {
      alert(`Failed to delete customer: ${error.message}`);
      return;
    }
    setCustomers(prev => prev.filter(c => c.id !== customer.id));
    setSelected(null);
  }, []);

  const getEmail = (c) => c?.email || (c?.full_name ? `${c.full_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com` : '—');

  const getStats = (c) => {
    // Use allReservations (pickup_reservations) as the primary order source
    const resOrders = (allReservations || []).filter(o => o.user_id === c.id);
    // Also include orders table data for completeness
    const tableOrders = (orders || []).filter(o => o.user_id === c.id);
    // Merge both, prefer reservation data since it's the main flow
    const allCustomerOrders = resOrders.length > 0 ? resOrders : tableOrders;
    const customerRx = (prescriptions || []).filter(p => p.userId === c.id);

    const ordersCount = allCustomerOrders.length;
    const totalSpent  = allCustomerOrders.reduce((s, o) => s + Number(o.total || o.total_amount || 0), 0);

    // Find the most recent order date (from created_at)
    const sortedDates = allCustomerOrders
      .map(o => o.created_at)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a));
    const lastOrderDate = sortedDates[0] || null;

    return {
      ordersCount,
      totalSpent,
      prescriptionsCount: customerRx.length,
      lastOrderDate,
    };
  };

  const filteredBase = customers
    .filter(c => showDeactivated ? true : c.role !== 'deactivated')
    .filter(c => {
      const q = search.toLowerCase();
      return (
        (c.full_name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        getEmail(c).toLowerCase().includes(q)
      );
    });

  // Apply customer type filter
  const filtered = typeFilter === 'all'
    ? filteredBase
    : filteredBase.filter(c => {
        const s = getStats(c);
        const ct = getCustomerType({ ordersCount: s.ordersCount, totalSpent: s.totalSpent, lastOrderDate: s.lastOrderDate, registeredAt: c.created_at });
        return ct.key === typeFilter;
      });

  const deactivatedCount = customers.filter(c => c.role === 'deactivated').length;

  // Count per type for filter pill badges
  const typeCounts = filteredBase.reduce((acc, c) => {
    const s = getStats(c);
    const ct = getCustomerType({ ordersCount: s.ordersCount, totalSpent: s.totalSpent, lastOrderDate: s.lastOrderDate, registeredAt: c.created_at });
    acc[ct.key] = (acc[ct.key] || 0) + 1;
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Customer Management</h1>
          <p>
            {customers.filter(c => c.role === 'customer').length} active customers ·{' '}
            {customers.filter(c => {
              const d = new Date(); d.setMonth(d.getMonth() - 1);
              return c.created_at && c.role === 'customer' ? new Date(c.created_at) > d : false;
            }).length} joined this month
            {deactivatedCount > 0 && ` · ${deactivatedCount} deactivated`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {deactivatedCount > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowDeactivated(v => !v)}
              style={{ fontSize: 12 }}
            >
              {showDeactivated ? '👁 Hide Deactivated' : `👁 Show Deactivated (${deactivatedCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Customer Type Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All', icon: '' },
          { key: 'new', ...CUSTOMER_TYPES.new },
          { key: 'regular', ...CUSTOMER_TYPES.regular },
          { key: 'frequent', ...CUSTOMER_TYPES.frequent },
          { key: 'vip', ...CUSTOMER_TYPES.vip },
          { key: 'inactive', ...CUSTOMER_TYPES.inactive },
        ].map(t => {
          const isActive = typeFilter === t.key;
          const count = t.key === 'all' ? filteredBase.length : (typeCounts[t.key] || 0);
          return (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s', border: '1px solid',
                background: isActive ? (t.bg || 'var(--cyan)') : 'var(--bg-elevated)',
                color: isActive ? (t.color || 'var(--text-primary)') : 'var(--text-muted)',
                borderColor: isActive ? (t.border || 'var(--cyan)') : 'var(--border)',
                boxShadow: isActive && t.shadow ? `0 2px 10px ${t.shadow}` : 'none',
                transform: isActive ? 'translateY(-1px)' : 'none',
              }}
            >
              {t.icon && <span>{t.icon}</span>}
              {t.key === 'all' ? 'All' : t.label}
              <span style={{
                background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-card)',
                color: isActive ? (t.color || '#fff') : 'var(--text-muted)',
                borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 800
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="filter-search">
          <Search size={14} className="filter-search-icon" />
          <input
            placeholder="Search by name, phone, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
            <p>Loading customers…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Customer Type</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Prescriptions</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No customers found</td></tr>
              ) : filtered.map(c => {
                const s = getStats(c);
                const ct = getCustomerType({ ordersCount: s.ordersCount, totalSpent: s.totalSpent, lastOrderDate: s.lastOrderDate, registeredAt: c.created_at });
                const isDeactivated = c.role === 'deactivated';
                return (
                  <tr key={c.id} style={{ opacity: isDeactivated ? 0.6 : 1 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: isDeactivated ? 'linear-gradient(135deg, #64748b, #475569)' : 'linear-gradient(135deg, var(--cyan), var(--indigo))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: 13, flexShrink: 0 }}>
                          {(c.full_name || 'C')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{c.full_name || 'Customer'}</div>
                          {isDeactivated && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: 4 }}>DEACTIVATED</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="muted">{c.phone || '—'}</td>
                    <td className="muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{getEmail(c)}</td>
                    <td><CustomerTypeBadge type={ct} /></td>
                    <td><span style={{ fontWeight: 700, color: 'var(--cyan)' }}>{s.ordersCount}</span></td>
                    <td style={{ fontWeight: 600 }}>₹{s.totalSpent.toLocaleString('en-IN')}</td>
                    <td><span style={{ fontWeight: 700, color: 'var(--purple)' }}>{s.prescriptionsCount}</span></td>
                    <td className="muted">{c.created_at ? c.created_at.split('T')[0] : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={(e) => { e.stopPropagation(); setSelected(c); }}
                          title="Open Customer CRM"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={(e) => { e.stopPropagation(); handleDeactivate(c, isDeactivated); }}
                          title={isDeactivated ? 'Reactivate account' : 'Deactivate account'}
                          style={{ color: isDeactivated ? '#10b981' : '#f59e0b' }}
                        >
                          {isDeactivated ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete ${c.full_name || 'this customer'}? This cannot be undone.`)) handleDelete(c); }}
                          title="Delete customer"
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* CRM Drawer Modal */}
      {selected && (
        <CustomerCRMModal
          customer={selected}
          onClose={() => setSelected(null)}
          onDeactivate={handleDeactivate}
          onDelete={handleDelete}
        />
      )}
    </AdminLayout>
  );
};

export default Customers;
