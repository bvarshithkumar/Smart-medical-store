import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import { Search, Eye, Printer, Calendar, Clock, ShoppingBag, AlertCircle, Pill, Download, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { fetchWithTimeout } from '../../hooks/useFetchWithTimeout';
import { SkeletonTable, ErrorState, EmptyState } from '../../components/LoadingStates';


const STATUSES = ['All', 'Accepted By Customer', 'Ready For Pickup', 'Collected'];
const SELECTABLE_STATUSES = ['Accepted By Customer', 'Ready For Pickup', 'Collected'];

const statusBadge = (s) => ({
  'Accepted By Customer': 'badge-approved',
  'Ready For Pickup': 'badge-ready',
  Collected: 'badge-completed',
  Cancelled: 'badge-cancelled'
}[s] || '');

/* ─── Modal Component ─────────────────────────────────────────── */
const Modal = ({ open, onClose, size = 'modal-md', children }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className={`modal ${size}`}
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

/* ─── Main Component ──────────────────────────────────────────── */
const Reservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;


  /* Modal states */
  const [detailsRes, setDetailsRes] = useState(null);
  const [medicinesRes, setMedicinesRes] = useState(null);
  const [modalMeds, setModalMeds] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  /* QR Scanner states */
  const [showScanner, setShowScanner] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [manualInput, setManualInput] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  /* ── Data Fetching ── */
  const fetchReservations = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchWithTimeout(async (signal) => {
        const { data, error } = await supabase
          .from('pickup_reservations')
          .select('*')
          .order('created_at', { ascending: false })
          .abortSignal(signal);
        if (error) throw error;
        return data || [];
      });
      const validStatuses = ['Accepted By Customer', 'Ready For Pickup', 'Collected'];
      const active = data.filter(r =>
        validStatuses.includes(r.status)
      );
      setReservations(active);
    } catch (e) {
      console.error('Error fetching reservations:', e);
      setError(e.message || 'Failed to load reservations.');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => { fetchReservations(); }, []);

  /* ── Medicines Loader ── */
  const loadMedicines = async (res) => {
    if (!res) return;
    setModalLoading(true);
    setModalError('');
    setModalMeds([]);
    try {
      const list = Array.isArray(res.medicines) ? res.medicines : [];
      const rxItem = list.find(m => m.id === 'prescription-only');

      if (rxItem) {
        const rxUrl = rxItem.name?.replace(/^Prescription \((.*)\)$/, '$1');
        if (rxUrl) {
          const { data: rxData } = await supabase
            .from('prescriptions')
            .select('id')
            .eq('image_url', rxUrl)
            .maybeSingle();

          if (rxData) {
            const { data: rxMeds, error: medsErr } = await supabase
              .from('prescription_medicines')
              .select('id, quantity, unit_price, total_price, products(name)')
              .eq('prescription_id', rxData.id);
            if (medsErr) throw medsErr;
            if (rxMeds?.length > 0) {
              setModalMeds(rxMeds.map(m => ({
                name: m.products?.name || 'Unknown Product',
                qty: m.quantity,
                price: m.unit_price,
                total: m.total_price
              })));
              return;
            }
          }
        }
        setModalMeds([{ name: 'Prescription Item (Pending Review)', qty: 1, price: 0, total: 0 }]);
      } else {
        setModalMeds(list.map(m => ({
          name: m.name || 'Medicine',
          qty: m.qty || m.quantity || 1,
          price: m.price || m.unit_price || 0,
          total: (m.price || m.unit_price || 0) * (m.qty || m.quantity || 1)
        })));
      }
    } catch (err) {
      console.error('Failed to load medicines:', err);
      setModalError('Failed to load medicines: ' + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const openDetails = (res) => { setDetailsRes(res); };
  const closeDetails = () => { setDetailsRes(null); };

  const openMedicines = (res) => {
    setMedicinesRes(res);
    loadMedicines(res);
  };
  const closeMedicines = () => { setMedicinesRes(null); setModalMeds([]); setModalError(''); };

  /* ── QR Scanner ── */
  useEffect(() => {
    if (!showScanner) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    script.async = true;
    script.onload = () => startCamera();
    document.body.appendChild(script);
    return () => {
      stopCamera();
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [showScanner]);

  const startCamera = async () => {
    setScanError('');
    setScannedResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', true);
        videoRef.current.play();
      }
      streamRef.current = stream;
      requestAnimationFrame(tick);
    } catch (err) {
      setScanError('Camera access denied. Please enter the Reservation ID manually below.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const tick = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      if (streamRef.current) requestAnimationFrame(tick);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (window.jsQR) {
      const code = window.jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
      if (code) { handleLookupReservation(code.data); return; }
    }
    if (streamRef.current) requestAnimationFrame(tick);
  };

  const handleLookupReservation = async (id) => {
    stopCamera();
    try {
      const { data, error } = await supabase
        .from('pickup_reservations')
        .select('*')
        .eq('reservation_id', id.trim())
        .maybeSingle();
      if (error) throw error;
      if (data) setScannedResult(data);
      else setScanError(`Reservation "${id}" not found.`);
    } catch (err) {
      setScanError('Error: ' + err.message);
    }
  };

  const closeScanner = () => {
    stopCamera();
    setShowScanner(false);
    setScannedResult(null);
    setScanError('');
    setManualInput('');
  };

  /* ── Status Update ── */
  const notifyCustomer = async (res, status) => {
    const messages = {
      'Ready For Pickup': [
        `Medicines Ready`,
        `Your medicines are ready for collection for reservation ${res.reservation_id}.`,
        `ready_for_pickup`
      ],
      'Collected': [
        `Pickup Completed`,
        `Thank you for choosing Sri Venkateshwara Medical Store. Your pickup has been completed.`,
        `collected`
      ],
      'Cancelled': [
        `Reservation Cancelled`,
        `Your reservation ${res.reservation_id} has been cancelled.`,
        `reservation_cancelled`
      ],
    };
    const [title, message, type] = messages[status] || [];
    if (!title) return;

    const { data: { user: adminAuthUser } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

    // Send customer notification if user_id is present
    if (res.user_id) {
      await supabase.from('notifications').insert({
        user_id:         res.user_id,
        title,
        message,
        type,
        prescription_id: res.prescription_id || null,
        created_by:      adminAuthUser?.id || null,
        is_read:         false,
        read:            false
      });
    }

    // Also send admin notification for these key status updates
    let adminTitle = '';
    let adminMsg = '';
    if (status === 'Collected') {
      adminTitle = 'Pickup Completed';
      adminMsg = `Pickup completed for reservation ID: ${res.reservation_id}`;
    } else if (status === 'Cancelled') {
      adminTitle = 'Reservation Cancelled';
      adminMsg = `Reservation ${res.reservation_id} has been cancelled.`;
    }

    if (adminTitle) {
      await supabase.from('notifications').insert({
        user_id:         null, // admin
        title:           adminTitle,
        message:         adminMsg,
        type:            type,
        prescription_id: res.prescription_id || null,
        created_by:      adminAuthUser?.id || null,
        is_read:         false,
        read:            false
      });
    }
  };

  const completeAsOrder = async (res) => {
    setLoading(true);
    try {
      const orderNumber = `ORD-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: res.user_id || null,
          order_type: 'Store Pickup',
          fulfillment_method: 'pickup',
          total_amount: res.total_amount,
          status: 'Completed',
          pickup_date: res.pickup_date,
          pickup_time: res.pickup_time,
          notes: res.reservation_id,
          created_at: new Date().toISOString()
        })
        .select('*')
        .single();
      if (orderErr) throw orderErr;

      const medicines = Array.isArray(res.medicines) ? res.medicines : [];
      if (medicines.length > 0) {
        await supabase.from('order_items').insert(
          medicines.map(item => ({
            order_id: orderData.id,
            product_id: item.id,
            quantity: item.qty,
            unit_price: item.price || 0,
            subtotal: (item.price || 0) * item.qty
          }))
        );
        for (const item of medicines) {
          if (item.id) {
            const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', item.id).single();
            if (prod) await supabase.from('products').update({ stock_quantity: Math.max(0, (prod.stock_quantity || 0) - item.qty) }).eq('id', item.id);
          }
        }
      }

      await supabase.from('pickup_reservations').update({
        status: 'Collected',
        collected_at: new Date().toISOString()
      }).eq('id', res.id);

      if (res.prescription_id) {
        await supabase.from('prescriptions').update({ status: 'collected' }).eq('id', res.prescription_id);
      }

      await notifyCustomer(res, 'Collected');
      await generatePDF(res, 'print');
      alert(`Reservation completed as Order ${orderNumber}!`);
      await fetchReservations();
      closeDetails();
      closeMedicines();
      closeScanner();
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    const record = reservations.find(r => r.id === id) || scannedResult;
    if (newStatus === 'Collected') {
      if (record) await completeAsOrder(record);
      else alert('Could not locate reservation record.');
      return;
    }
    try {
      const { error } = await supabase.from('pickup_reservations').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      if (record) notifyCustomer(record, newStatus);

      // Synchronize with prescription if linked
      if (record && record.prescription_id) {
        let rxStatus = newStatus === 'Ready For Pickup' ? 'ready_for_pickup' : (newStatus === 'Accepted By Customer' ? 'accepted_by_customer' : newStatus.toLowerCase());
        await supabase.from('prescriptions').update({ status: rxStatus }).eq('id', record.prescription_id);
      }

      setReservations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      if (detailsRes?.id === id) setDetailsRes(p => ({ ...p, status: newStatus }));
      if (medicinesRes?.id === id) setMedicinesRes(p => ({ ...p, status: newStatus }));
      if (scannedResult?.id === id) setScannedResult(p => ({ ...p, status: newStatus }));
    } catch (e) {
      alert('Failed to update status: ' + e.message);
    }
  };

  /* ── PDF Generation ── */
  const generatePDF = async (res, action = 'download') => {
    try {
      let items = Array.isArray(res.medicines) ? res.medicines : [];
      const rxItem = items.find(m => m.id === 'prescription-only');
      if (rxItem) {
        const rxUrl = rxItem.name?.replace(/^Prescription \((.*)\)$/, '$1');
        if (rxUrl) {
          const { data: rxData } = await supabase.from('prescriptions').select('id').eq('image_url', rxUrl).maybeSingle();
          if (rxData) {
            const { data: rxMeds } = await supabase.from('prescription_medicines').select('id, quantity, unit_price, total_price, products(name)').eq('prescription_id', rxData.id);
            if (rxMeds?.length > 0) items = rxMeds.map(m => ({ name: m.products?.name || 'Unknown', qty: m.quantity, price: m.unit_price, total: m.total_price }));
          }
        }
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const blue = [37, 99, 235];
      const dark = [31, 41, 55];
      const muted = [107, 114, 128];

      doc.setFillColor(...blue);
      doc.roundedRect(15, 12, 6, 18, 1, 1, 'F');
      doc.roundedRect(9, 18, 18, 6, 1, 1, 'F');
      doc.setTextColor(...blue);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('Sri Venkateshwara Medical Store', 38, 19);
      doc.setTextColor(...muted);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Licensed Pharmacy | Gachibowli, Hyderabad, Telangana', 38, 24);
      doc.text('Phone: +91 99891 48660', 38, 28);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(15, 34, 195, 34);
      doc.setTextColor(...dark);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('PHARMACY RESERVATION RECEIPT', 15, 43);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Date: ${res.pickup_date || new Date().toISOString().split('T')[0]}`, 148, 43);

      doc.setFillColor(249, 250, 251);
      doc.roundedRect(15, 48, 180, 24, 2, 2, 'F');
      doc.setDrawColor(243, 244, 246);
      doc.roundedRect(15, 48, 180, 24, 2, 2, 'S');
      doc.setTextColor(...muted);
      doc.setFontSize(9.5);
      doc.text('Reservation ID:', 20, 54);
      doc.setTextColor(...blue);
      doc.setFont('Helvetica', 'bold');
      doc.text(res.reservation_id || '', 50, 54);
      doc.setTextColor(...muted);
      doc.setFont('Helvetica', 'normal');
      doc.text('Customer:', 20, 60);
      doc.setTextColor(...dark);
      doc.setFont('Helvetica', 'bold');
      doc.text(res.customer_name || 'Walk-in', 50, 60);
      doc.setTextColor(...muted);
      doc.setFont('Helvetica', 'normal');
      doc.text('Phone:', 20, 66);
      doc.setTextColor(...dark);
      doc.text(res.phone_number || 'N/A', 50, 66);
      doc.setTextColor(...muted);
      doc.text('Pickup Date:', 115, 54);
      doc.setTextColor(...dark);
      doc.setFont('Helvetica', 'bold');
      doc.text(res.pickup_date || '', 142, 54);
      doc.setTextColor(...muted);
      doc.setFont('Helvetica', 'normal');
      doc.text('Pickup Time:', 115, 60);
      doc.setTextColor(...blue);
      doc.setFont('Helvetica', 'bold');
      doc.text(res.pickup_time || '', 142, 60);
      doc.setTextColor(...muted);
      doc.setFont('Helvetica', 'normal');
      doc.text('Status:', 115, 66);
      doc.setTextColor(...blue);
      doc.setFont('Helvetica', 'bold');
      doc.text(res.status || 'Pending', 142, 66);

      let y = 80;
      doc.setFillColor(243, 244, 246);
      doc.rect(15, y, 180, 8, 'F');
      doc.setTextColor(...dark);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Check', 18, y + 5.5);
      doc.text('Medicine Item', 35, y + 5.5);
      doc.text('Qty', 122, y + 5.5);
      doc.text('Unit Price', 142, y + 5.5);
      doc.text('Total', 173, y + 5.5);
      y += 8;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      items.forEach(item => {
        doc.setDrawColor(156, 163, 175);
        doc.setLineWidth(0.3);
        // Draw Checkbox
        doc.rect(21, y + 2.2, 3, 3);

        const qty = item.qty || item.quantity || 1;
        const price = item.price || item.unit_price || 0;
        doc.setTextColor(...dark);
        doc.text((item.name || 'Medicine').substring(0, 42), 35, y + 5.5);
        doc.text(String(qty), 124, y + 5.5);
        doc.setTextColor(...muted);
        doc.text(`Rs.${price.toFixed(2)}`, 140, y + 5.5);
        doc.setTextColor(...dark);
        doc.setFont('Helvetica', 'bold');
        doc.text(`Rs.${(price * qty).toFixed(2)}`, 170, y + 5.5);
        doc.setFont('Helvetica', 'normal');
        y += 8;
      });
      y += 4;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...dark);
      doc.text('Grand Total Amount:', 115, y + 5.5);
      doc.setTextColor(...blue);
      doc.text(`₹${(res.total_amount || 0).toFixed(2)}`, 175, y + 5.5);

      y += 18;
      const qrPayload = res.qr_payload || res.reservation_id;
      if (qrPayload) {
        const qrUrl = await QRCode.toDataURL(qrPayload, { width: 250, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } });
        doc.setTextColor(...dark);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Scan QR Code at Store Counter to Collect:', 15, y + 5);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...muted);
        doc.text('• Show this QR code to the pharmacist upon arrival.', 15, y + 12);
        doc.text('• Your medicines are pre-packaged and verified.', 15, y + 17);
        doc.text('• Pay via Cash, UPI, or Card at the store counter.', 15, y + 22);
        doc.addImage(qrUrl, 'PNG', 145, y, 32, 32);
      }
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text('Thank you for reserving with Sri Venkateshwara Medical Store!', 62, 275);

      if (action === 'print') {
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
      } else {
        doc.save(`Invoice_${res.reservation_id}.pdf`);
      }
    } catch (err) {
      console.error('PDF error:', err);
      alert('Unable to generate PDF. Please try again.');
    }
  };

  /* ── Filtering & Pagination ── */
  const filtered = reservations.filter(r => {
    const matchTab = tab === 'All' || r.status === tab;
    const q = search.toLowerCase();
    const matchSearch = (r.reservation_id || '').toLowerCase().includes(q)
      || (r.customer_name || '').toLowerCase().includes(q)
      || (r.phone_number || '').toLowerCase().includes(q);
    return matchTab && matchSearch;
  });
  const pages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const tabCount = (s) => s === 'All' ? reservations.length : reservations.filter(r => r.status === s).length;

  /* ─────────────────────────── RENDER ─────────────────────────── */
  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Reservations</h1>
          <p>{reservations.filter(r => r.status === 'Pending').length} pending · {reservations.length} total</p>
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setShowScanner(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            📷 Scan QR Code
          </button>
          <button className="btn btn-secondary" onClick={fetchReservations}>Refresh</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: 16 }}>
        {STATUSES.map(s => (
          <button key={s} className={`tab-btn${tab === s ? ' active' : ''}`} onClick={() => { setTab(s); setPage(1); }}>
            {s} <span className="tab-count">{tabCount(s)}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="filter-search">
          <Search size={14} className="filter-search-icon" />
          <input placeholder="Search by ID, customer, or phone…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} results</span>
      </div>

      {/* Table */}
      <div className="table-card">
        {loading ? (
          <SkeletonTable rows={5} cols={8} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchReservations} />
        ) : paged.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No Reservations Found"
            message="There are no pickup reservations matching the criteria."
          />
        ) : (

          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reservation ID</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Pickup</th>
                  <th>Amount</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(r => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--cyan)', fontWeight: 700 }}>{r.reservation_id}</td>
                    <td style={{ fontWeight: 600 }}>{r.customer_name}</td>
                    <td>{r.phone_number}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <Calendar size={13} style={{ color: 'var(--text-muted)' }} /> {r.pickup_date}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        <Clock size={11} /> {r.pickup_time}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>₹{(r.total_amount || 0).toFixed(2)}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <select
                        className="filter-select"
                        style={{ width: 'auto', fontSize: 12, height: 28, padding: '0 6px' }}
                        value={r.status}
                        onChange={e => handleUpdateStatus(r.id, e.target.value)}
                      >
                        {SELECTABLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          title="View Reservation"
                          onClick={() => openDetails(r)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}
                          onClick={() => openMedicines(r)}
                        >
                          <Pill size={13} style={{ color: 'var(--cyan)' }} /> View Medicines
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          title="Generate Invoice"
                          onClick={() => generatePDF(r, 'download')}
                        >
                          <Download size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pages > 1 && (
              <div className="pagination">
                <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                {Array.from({ length: pages }, (_, i) => (
                  <button key={i + 1} className={`page-btn${page === i + 1 ? ' active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
                ))}
                <button className="page-btn" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>›</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Reservation Details Modal ── */}
      <Modal open={!!detailsRes} onClose={closeDetails} size="modal-md">
        <div className="modal-header">
          <div>
            <h2>Reservation Details</h2>
            <p style={{ margin: 0 }}>ID: <b style={{ color: 'var(--cyan)' }}>{detailsRes?.reservation_id}</b></p>
          </div>
          <button className="modal-close" onClick={closeDetails}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {detailsRes && (
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                ['Reservation ID', detailsRes.reservation_id, 'var(--cyan)'],
                ['Customer Name', detailsRes.customer_name],
                ['Phone Number', detailsRes.phone_number || 'N/A'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{label}</span>
                  <p style={{ fontWeight: 700, fontSize: 15, color: color || 'var(--text-primary)', margin: '4px 0 0' }}>{val}</p>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pickup Date</span>
                  <p style={{ fontWeight: 600, fontSize: 14, margin: '4px 0 0' }}>{detailsRes.pickup_date}</p>
                </div>
                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pickup Time</span>
                  <p style={{ fontWeight: 600, fontSize: 14, margin: '4px 0 0' }}>{detailsRes.pickup_time}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</span>
                  <div style={{ marginTop: 6 }}>
                    <span className={`badge ${statusBadge(detailsRes.status)}`}>{detailsRes.status}</span>
                  </div>
                </div>
                <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Amount</span>
                  <p style={{ fontWeight: 800, fontSize: 18, color: 'var(--green)', margin: '4px 0 0' }}>₹{(detailsRes.total_amount || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ gap: 8 }}>
          {detailsRes?.status === 'Accepted By Customer' && (
            <button
              className="btn btn-primary"
              onClick={() => handleUpdateStatus(detailsRes.id, 'Ready For Pickup')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              Ready For Pickup
            </button>
          )}
          {detailsRes?.status === 'Ready For Pickup' && (
            <button
              className="btn btn-success"
              onClick={() => handleUpdateStatus(detailsRes.id, 'Collected')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              Mark As Collected
            </button>
          )}
          <button className="btn btn-secondary" onClick={closeDetails}>Close</button>
          <button className="btn btn-ghost" onClick={() => generatePDF(detailsRes, 'download')}>
            <Download size={14} /> Download PDF
          </button>
          <button className="btn btn-ghost" onClick={() => generatePDF(detailsRes, 'print')}>
            <Printer size={14} /> Print PDF
          </button>
        </div>
      </Modal>

      {/* ── Medicines Modal ── */}
      <Modal open={!!medicinesRes} onClose={closeMedicines} size="modal-lg">
        <div className="modal-header">
          <div>
            <h2>Reserved Medicines</h2>
            <p style={{ margin: 0 }}>ID: <b style={{ color: 'var(--cyan)' }}>{medicinesRes?.reservation_id}</b></p>
          </div>
          <button className="modal-close" onClick={closeMedicines}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto' }}>
          {modalLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--cyan-dim)', borderTopColor: 'var(--cyan)', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading medicines…</span>
            </div>
          ) : modalError ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 20, background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
              <AlertCircle size={28} style={{ color: 'var(--red)' }} />
              <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, margin: 0 }}>{modalError}</p>
              <button className="btn btn-secondary btn-sm" onClick={() => loadMedicines(medicinesRes)}>Retry</button>
            </div>
          ) : modalMeds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <ShoppingBag size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontSize: 14 }}>No medicines found for this reservation.</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Qty</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Unit Price</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {modalMeds.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td style={{ textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ textAlign: 'right' }}>₹{(item.price || 0).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{((item.price || 0) * item.qty).toFixed(2)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>Grand Total</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--cyan)', fontSize: 15 }}>
                    ₹{modalMeds.reduce((s, m) => s + (m.price || 0) * m.qty, 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-footer" style={{ gap: 8 }}>
          <button className="btn btn-secondary" onClick={closeMedicines}>Close</button>
          <button className="btn btn-ghost" onClick={() => generatePDF(medicinesRes, 'download')} disabled={modalLoading || !!modalError || modalMeds.length === 0}>
            <Download size={14} /> Download PDF
          </button>
          <button className="btn btn-ghost" onClick={() => generatePDF(medicinesRes, 'print')} disabled={modalLoading || !!modalError || modalMeds.length === 0}>
            <Printer size={14} /> Print PDF
          </button>
        </div>
      </Modal>

      {/* ── QR Scanner Modal ── */}
      <Modal open={showScanner} onClose={closeScanner} size="modal-lg">
        <div className="modal-header">
          <div>
            <h2>Scan Customer QR Code</h2>
            <p style={{ margin: 0 }}>Align the QR code inside the camera viewfinder</p>
          </div>
          <button className="modal-close" onClick={closeScanner}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', overflowY: 'auto' }}>

          {!scannedResult && (
            <div style={{ position: 'relative', width: '100%', maxWidth: 400, aspectRatio: '4/3', overflow: 'hidden', borderRadius: 8, background: '#000', border: '2px solid rgba(255,255,255,0.1)' }}>
              <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: '15%', left: '15%', right: '15%', bottom: '15%', border: '2px dashed #10b981', borderRadius: 8, pointerEvents: 'none', boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}>
                <div style={{ width: '100%', height: 2, background: '#10b981', position: 'absolute', top: '50%', boxShadow: '0 0 8px #10b981', animation: 'pulse-scan 2s infinite linear' }} />
              </div>
            </div>
          )}

          {!scannedResult && (
            <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {scanError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: 10, fontSize: 13, color: '#fca5a5' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{scanError}</span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Manual Reservation ID lookup:</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. SVMS-20260623-001"
                    value={manualInput}
                    onChange={e => setManualInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLookupReservation(manualInput)}
                    style={{ height: 36, flex: 1 }}
                  />
                  <button className="btn btn-secondary" onClick={() => handleLookupReservation(manualInput)} style={{ height: 36 }}>Look Up</button>
                </div>
              </div>
            </div>
          )}

          {scannedResult && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Scanned ID</p>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--cyan)', margin: '4px 0 0' }}>{scannedResult.reservation_id}</h3>
                </div>
                <span className={`badge ${statusBadge(scannedResult.status)}`}>{scannedResult.status}</span>
              </div>
              <div className="grid-2">
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Customer</span>
                  <p style={{ fontWeight: 700, fontSize: 14, margin: '4px 0 0' }}>{scannedResult.customer_name}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '2px 0 0' }}>📞 {scannedResult.phone_number}</p>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pickup</span>
                  <p style={{ fontWeight: 700, fontSize: 14, margin: '4px 0 0' }}>{scannedResult.pickup_date}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '2px 0 0' }}>🕐 {scannedResult.pickup_time}</p>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Medicines</span>
                <table className="admin-table" style={{ marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th>Medicine</th><th>Qty</th><th>Price</th><th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(scannedResult.medicines) ? scannedResult.medicines : []).map((item, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td>{item.qty}</td>
                        <td>₹{item.price || 0}</td>
                        <td style={{ fontWeight: 700 }}>₹{((item.price || 0) * item.qty).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>Grand Total</td>
                      <td style={{ fontWeight: 800, color: 'var(--cyan)', fontSize: 15 }}>₹{(scannedResult.total_amount || 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-success" onClick={() => handleUpdateStatus(scannedResult.id, 'Collected')} disabled={scannedResult.status === 'Collected'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  ✓ Mark As Collected
                </button>
                <button className="btn btn-danger" onClick={() => { if (window.confirm('Cancel this reservation?')) handleUpdateStatus(scannedResult.id, 'Cancelled'); }} disabled={scannedResult.status === 'Cancelled'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  × Cancel Reservation
                </button>
                <button className="btn btn-secondary" onClick={startCamera} style={{ marginLeft: 'auto' }}>Scan Another</button>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={closeScanner}>Close Scanner</button>
        </div>
      </Modal>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </AdminLayout>
  );
};

export default Reservations;
