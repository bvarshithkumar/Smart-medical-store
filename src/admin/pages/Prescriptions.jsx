import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { jsPDF } from 'jspdf';
import { generateQuotePDF } from '../../services/pdfService';
import { mapProduct } from '../../services/medicineService';
import QRCode from 'qrcode';
import {
  CheckCircle, XCircle, ZoomIn, ZoomOut, Clock,
  Store, FileText, Search, RefreshCw, ExternalLink,
  Loader2, AlertCircle, WifiOff, Download, Printer,
  CheckCheck, X
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const RX_TABS = [
  { label: 'All',              value: 'all'              },
  { label: 'Pending',          value: 'pending'          },
  { label: 'Under Review',     value: 'under_review'     },
  { label: 'Quote Generated',  value: 'quote_generated'  },
  { label: 'Quote Sent',       value: 'quote_sent'       },
  { label: 'Changes Requested', value: 'customer_requested_changes' },
  { label: 'Revised Quote',    value: 'revised_quote_generated' },
  { label: 'Accepted By Customer', value: 'accepted_by_customer' },
  { label: 'Preparing Medicines', value: 'preparing_medicines' },
  { label: 'Ready for Pickup', value: 'ready_for_pickup' },
  { label: 'Collected',        value: 'collected'        },
  { label: 'Rejected',         value: 'rejected'         },
  { label: 'Quote Rejected',   value: 'customer_rejected'},
];

const statusBadge = (s) => {
  const v = (s || '').toLowerCase().replace(/ /g, '_');
  if (v === 'pending' || v === 'uploaded') return 'badge-pending';
  if (v === 'under_review')     return 'badge-processing';
  if (v === 'quote_generated')  return 'badge-quote-generated';
  if (v === 'quote_sent')       return 'badge-quote-sent';
  if (v === 'customer_requested_changes') return 'badge-warning';
  if (v === 'revised_quote_generated') return 'badge-quote-generated';
  if (v === 'customer_accepted' || v === 'accepted_by_customer') return 'badge-approved';
  if (v === 'customer_rejected') return 'badge-rejected';
  if (v === 'preparing_medicines') return 'badge-processing';
  if (v === 'ready_for_pickup') return 'badge-ready';
  if (v === 'collected')        return 'badge-completed';
  if (v === 'completed')        return 'badge-completed';
  if (v === 'rejected')         return 'badge-rejected';
  return '';
};

const statusLabel = (s) => {
  const v = (s || '').toLowerCase();
  if (v === 'customer_requested_changes') return 'Changes Requested';
  return (s || 'pending').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const mapRx = (rx) => {
  // Resolve customer name: prefer prescription customer_name, then joined profile full_name,
  // then email extracted from profile — only fall back to 'Walk-in Customer' if nothing exists.
  const customerName =
    (rx.customer_name && rx.customer_name.trim()) ||
    (rx.profiles?.full_name && rx.profiles.full_name.trim()) ||
    '';

  return {
    id:            rx.id,
    reference_id:  rx.reference_id  || '',
    userId:        rx.user_id       || null,
    customerName:  customerName || 'Walk-in Customer',
    customerPhone: rx.phone         || '',
    notes:         rx.notes         || rx.customer_notes || '',
    file:          rx.image_url     || rx.file_url || '',
    status:        (rx.status || 'pending').toLowerCase().replace(/ /g, '_'),
    admin_notes:   rx.pharmacist_notes || '',
    uploadTime:    rx.created_at    || new Date().toISOString(),
    date:          rx.created_at
      ? rx.created_at.split('T')[0]
      : new Date().toISOString().split('T')[0],
  };
};

/* ─────────────────────────────────────────────────────────────
   TOAST NOTIFICATION
───────────────────────────────────────────────────────────── */
const Toast = ({ toasts, onRemove }) => (
  <div style={{
    position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
    display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end'
  }}>
    {toasts.map(t => (
      <div key={t.id} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: t.type === 'success' ? 'rgba(34,197,94,0.15)' : t.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
        border: `1px solid ${t.type === 'success' ? 'rgba(34,197,94,0.4)' : t.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)'}`,
        borderRadius: 10, padding: '12px 16px',
        fontSize: 13, fontWeight: 500,
        color: t.type === 'success' ? '#86efac' : t.type === 'error' ? '#fca5a5' : '#a5b4fc',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        maxWidth: 360, animation: 'slideInRight 0.3s ease',
        fontFamily: 'Inter, sans-serif'
      }}>
        {t.type === 'success' ? <CheckCheck size={16} style={{ flexShrink: 0 }} />
          : t.type === 'error' ? <AlertCircle size={16} style={{ flexShrink: 0 }} />
          : <Loader2 size={16} style={{ flexShrink: 0 }} />}
        <span style={{ flex: 1 }}>{t.message}</span>
        <button onClick={() => onRemove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2, opacity: 0.6, flexShrink: 0 }}>
          <X size={14} />
        </button>
      </div>
    ))}
  </div>
);

export const getMedicineCardDetails = (med) => {
  const name = med.name || med.medicine_name || 'Unknown Medicine';
  
  let brand = med.products?.manufacturer || med.brand || 'Generic';
  let genericName = 'Essential Medicine';
  let strength = 'Standard Strength';
  let image = med.products?.image_url || med.image || '/images/cat_medicines.png';
  let availability = 'In Stock';
  
  const lowerName = name.toLowerCase();
  if (lowerName.includes('dolo') || lowerName.includes('paracetamol')) {
    brand = 'Micro Labs';
    genericName = 'Paracetamol';
    strength = '650 mg';
    image = '/images/dolo 650 tablet image.png';
  } else if (lowerName.includes('zincovit')) {
    brand = 'Abbott';
    genericName = 'Multivitamins & Minerals';
    strength = 'Standard Strength';
    image = '/images/Zincovit tablet image.png';
  } else if (lowerName.includes('kof-kure') || lowerName.includes('cough syrup')) {
    brand = 'Kof-Kure Pharma';
    genericName = 'Dextromethorphan + Guaifenesin';
    strength = '100 ml';
    image = '/images/kuf-kure syrup image.png';
  } else if (lowerName.includes('relief-max') || lowerName.includes('pain gel')) {
    brand = 'Relief-Max Therapeutics';
    genericName = 'Diclofenac + Methyl Salicylate';
    strength = '30 gm';
    image = '/images/Relief max image.png';
  }
  
  const strengthMatch = name.match(/\b\d+\s*(?:mg|ml|gm|g|mcg)\b/i);
  if (strengthMatch) {
    strength = strengthMatch[0];
  }
  
  if (med.products) {
    if (med.products.manufacturer) brand = med.products.manufacturer;
    if (med.products.stock_quantity === 0) availability = 'Out of Stock';
  }
  
  return {
    name,
    brand,
    genericName,
    strength,
    image,
    availability,
    qty: med.qty || med.quantity || 1,
    unitPrice: med.unit_price || med.price || 0,
    totalPrice: med.total_price || med.total || ((med.unit_price || med.price || 0) * (med.qty || med.quantity || 1))
  };
};

/* ─────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────── */
const Prescriptions = () => {
  const { updatePrescription } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();

  /* ── Prescriptions list state ── */
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState('');

  /* ── UI state ── */
  const [activeTab,   setActiveTab]   = useState('pending');
  const [selected,    setSelected]    = useState(null);
  const [adminNotes,  setAdminNotes]  = useState('');
  const [zoom,        setZoom]        = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionBusy,  setActionBusy]  = useState(false);
  const [actionError, setActionError] = useState('');

  /* ── Realtime General Support Chats State ── */
  const [generalChats, setGeneralChats] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const [isChatUploading, setIsChatUploading] = useState(false);
  const [customerTypingText, setCustomerTypingText] = useState('');
  const [isPharmacistTyping, setIsPharmacistTyping] = useState(false);

  const chatEndRef = useRef(null);
  const chatFileInputRef = useRef(null);
  const pharmacistTypingTimeoutRef = useRef(null);
  const adminChatSubRef = useRef(null);
  const adminTypingChanRef = useRef(null);

  const scrollChatToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ── Pickup date/time for reservation ── */
  const today = new Date().toISOString().split('T')[0];
  const [pickupDate, setPickupDate] = useState(today);
  const [pickupTime, setPickupTime] = useState('10:00');

  /* ── Medicines state (loaded from prescription_medicines) ── */
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [medsLoading,       setMedsLoading]       = useState(false);
  const [productSearch,     setProductSearch]      = useState('');
  const [productResults,    setProductResults]     = useState([]);
  const [searchLoading,     setSearchLoading]      = useState(false);

  /* ── Quote Change Requests and Versions History ── */
  const [changeRequests,    setChangeRequests]    = useState([]);
  const [quotesHistory,     setQuotesHistory]     = useState([]);
  const [reservation,       setReservation]       = useState(null);

  /* ── Customer profile (loaded from profiles table) ── */
  const [customerProfile,   setCustomerProfile]   = useState(null);

  /* ── Quote Delivery Modal ── */
  const [showDeliveryModal,     setShowDeliveryModal]     = useState(false);
  const [deliverToDashboard,    setDeliverToDashboard]    = useState(true);
  const [deliverViaWhatsApp,    setDeliverViaWhatsApp]    = useState(true);
  const [deliveryBusy,          setDeliveryBusy]          = useState(false);

  /* ── Toast notifications ── */
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /* ── Load medicines from prescription_medicines table ── */
  const loadMedicines = useCallback(async (rxId) => {
    if (!rxId) { setSelectedMedicines([]); return; }
    setMedsLoading(true);
    try {
      const { data, error } = await supabase
        .from('prescription_medicines')
        .select(`
          id,
          prescription_id,
          product_id,
          medicine_name,
          quantity,
          unit_price,
          total_price,
          products (
            id,
            name,
            selling_price,
            image_url,
            manufacturer,
            stock_quantity,
            prescription_required
          )
        `)
        .eq('prescription_id', rxId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setSelectedMedicines(data.map(m => ({
          db_id:       m.id,           // UUID in prescription_medicines
          product_id:  m.product_id,
          name:        m.medicine_name || m.products?.name || 'Unknown Product',
          quantity:    m.quantity,
          unit_price:  m.unit_price,
          total_price: m.total_price,
          products:    m.products
        })));
      } else {
        setSelectedMedicines([]);
      }
    } catch (err) {
      console.error('[loadMedicines] error:', err);
      setSelectedMedicines([]);
    } finally {
      setMedsLoading(false);
    }
  }, []);

  const loadChangeRequests = useCallback(async (rxId) => {
    if (!rxId) { setChangeRequests([]); return; }
    try {
      const { data, error } = await supabase
        .from('quote_change_requests')
        .select('*')
        .eq('prescription_id', rxId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setChangeRequests(data || []);
    } catch (err) {
      console.error('[loadChangeRequests] error:', err);
      setChangeRequests([]);
    }
  }, []);

  const loadQuotesHistory = useCallback(async (rxId) => {
    if (!rxId) { setQuotesHistory([]); return; }
    try {
      const { data, error } = await supabase
        .from('prescription_quotes')
        .select('*')
        .eq('prescription_id', rxId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setQuotesHistory(data || []);
    } catch (err) {
      console.error('[loadQuotesHistory] error:', err);
      setQuotesHistory([]);
    }
  }, []);

  const loadReservation = useCallback(async (rxId) => {
    if (!rxId) { setReservation(null); return; }
    try {
      const { data, error } = await supabase
        .from('pickup_reservations')
        .select('*')
        .eq('prescription_id', rxId)
        .maybeSingle();
      if (error) throw error;
      setReservation(data || null);
    } catch (err) {
      console.error('[loadReservation] error:', err);
      setReservation(null);
    }
  }, []);

  const loadCustomerProfile = useCallback(async (userId) => {
    if (!userId) { setCustomerProfile(null); return; }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, phone_number, email, customer_type')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      setCustomerProfile(data || null);
    } catch (err) {
      console.error('[loadCustomerProfile] error:', err);
      setCustomerProfile(null);
    }
  }, []);

  /* ── Reload when selection changes ── */
  useEffect(() => {
    if (selected) {
      loadMedicines(selected.id);
      loadChangeRequests(selected.id);
      loadQuotesHistory(selected.id);
      loadReservation(selected.id);
      loadCustomerProfile(selected.userId);
    } else {
      setSelectedMedicines([]);
      setChangeRequests([]);
      setQuotesHistory([]);
      setReservation(null);
      setCustomerProfile(null);
    }
  }, [selected, loadMedicines, loadChangeRequests, loadQuotesHistory, loadReservation, loadCustomerProfile]);

  /* ── Product search ── */
  const handleProductSearch = async (query) => {
    setProductSearch(query);
    if (!query.trim()) { setProductResults([]); return; }
    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike('name', `%${query}%`)
        .eq('is_active', true)
        .limit(10);
      if (!error && data) {
        setProductResults(data.map(mapProduct));
      }
    } catch (e) {
      console.error('[productSearch] error:', e);
    } finally {
      setSearchLoading(false);
    }
  };

  const addMedicine = (prod) => {
    if (selectedMedicines.some(m => m.product_id === prod.id)) {
      addToast('Product already added — update its quantity instead.', 'info');
      return;
    }
    const price = prod.selling_price || prod.price || 0;
    // Guard against null/empty product names (bad DB data). Generate a fallback label.
    const resolvedName = (prod.name && prod.name.trim())
      ? prod.name.trim()
      : (prod.generic_name && prod.generic_name.trim())
        ? prod.generic_name.trim()
        : `Product-${String(prod.id).substring(0, 8)}`;
    if (!prod.name || !prod.name.trim()) {
      console.error('[addMedicine] WARNING: product.name is null/empty for product ID:', prod.id, prod);
    }
    setSelectedMedicines(prev => [...prev, {
      db_id:       null,  // not yet saved
      product_id:  prod.id,
      name:        resolvedName,
      quantity:    1,
      unit_price:  price,
      total_price: price,
    }]);
    setProductSearch('');
    setProductResults([]);
  };

  const updateQty = (prodId, qty) => {
    if (qty < 1) return;
    setSelectedMedicines(prev => prev.map(m =>
      m.product_id === prodId
        ? { ...m, quantity: qty, total_price: parseFloat((m.unit_price * qty).toFixed(2)) }
        : m
    ));
  };

  const removeMedicine = (prodId) => {
    setSelectedMedicines(prev => prev.filter(m => m.product_id !== prodId));
  };

  const grandTotal = selectedMedicines.reduce((s, m) => s + (m.total_price || 0), 0);

  /* ── SAVE MEDICINES to prescription_medicines (upsert) ── */
  const saveMedicines = async (prescriptionId) => {
    // Delete all existing rows for this prescription, then insert fresh
    const { error: delErr } = await supabase
      .from('prescription_medicines')
      .delete()
      .eq('prescription_id', prescriptionId);
    if (delErr) throw new Error('Failed to clear existing medicines: ' + delErr.message);

    if (selectedMedicines.length === 0) return;

    // Validate and verify payload values before insert
    for (const m of selectedMedicines) {
      // Safely coerce name — never call .trim() on null/undefined
      const medicineName = (m.name != null ? String(m.name) : '').trim();
      const quantity = m.quantity;
      const unitPrice = m.unit_price;

      if (!medicineName) {
        throw new Error(
          `Validation failed: medicine_name cannot be null or empty (Product ID: ${m.product_id}). ` +
          'Please remove this item and re-add it by searching for the correct product.'
        );
      }
      if (quantity === undefined || quantity === null || quantity <= 0) {
        throw new Error(`Validation failed: quantity must be greater than 0 for medicine "${medicineName}"`);
      }
      if (unitPrice === undefined || unitPrice === null || unitPrice <= 0) {
        throw new Error(`Validation failed: unit_price must be greater than 0 for medicine "${medicineName}"`);
      }
    }

    const rows = selectedMedicines.map(m => {
      // Final null-safety: ensure medicine_name is always a non-empty string
      const safeName = (m.name != null ? String(m.name) : '').trim()
        || `Medicine-${String(m.product_id).substring(0, 8)}`;
      return {
        prescription_id: prescriptionId,
        product_id:      m.product_id,
        medicine_name:   safeName,
        quantity:        m.quantity,
        unit_price:      m.unit_price,
        total_price:     m.total_price,
      };
    });

    // Before insert, log the payload in the browser console
    console.log('[saveMedicines] Payload for prescription_medicines:', rows);

    const { error: insErr } = await supabase
      .from('prescription_medicines')
      .insert(rows);
    if (insErr) throw new Error('Failed to save medicines: ' + insErr.message);
  };

  /* ── GENERATE QUOTE (main action) ── */
  const generateQuote = async () => {
    if (!selected || actionBusy) return;
    if (selectedMedicines.length === 0) {
      addToast('Please add at least one medicine before generating a quote.', 'error');
      return;
    }
    if (!pickupDate || !pickupTime) {
      addToast('Please set a pickup date and time.', 'error');
      return;
    }

    setActionBusy(true);
    setActionError('');
    const loadingToastId = addToast('Generating quote…', 'info', 0);

    try {
      /* 1. Save/upsert medicines in prescription_medicines */
      await saveMedicines(selected.id);

      /* 2. Generate a unique quote_number */
      const quoteNumber = `QT-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${selected.id.substring(0, 4).toUpperCase()}`;

      /* 3. Generate Quote PDF */
      const doc = await generateQuotePDF({
        action:          'generate',
        quoteNumber,
        customerName:    resolvedCustomerName,
        customerPhone:   displayPhone || 'N/A',
        prescriptionRef: selected.reference_id || selected.id?.substring(0, 8),
        pickupDate,
        pickupTime,
        pharmacistNotes: adminNotes.trim(),
        medicines:       selectedMedicines.map(m => ({
          name:        m.name,
          quantity:    m.quantity,
          unit_price:  m.unit_price,
          total_price: m.total_price,
        })),
        grandTotal,
      });

      /* 4. Upload Quote PDF to Supabase Storage */
      const pdfBlob = doc.output('blob');
      const quotePath = `quotes/Quote_${quoteNumber}_${selected.id}.pdf`;
      
      const { error: uploadErr } = await supabase.storage
        .from('prescriptions')
        .upload(quotePath, pdfBlob, { cacheControl: '3600', upsert: true });
      if (uploadErr) throw new Error('Failed to upload Quote PDF to storage: ' + uploadErr.message);

      const { data: { publicUrl } } = supabase.storage
        .from('prescriptions')
        .getPublicUrl(quotePath);

      /* 5. Insert new Quote Record in prescription_quotes (always a fresh row) */
      const payload = {
        prescription_id: selected.id,
        quote_number:    quoteNumber,
        total_amount:    grandTotal,
        quote_pdf_url:   publicUrl,
        status:          'Quote Generated',
        version_number:  1,
        is_active:       true,
        quote_status:    'active',
        pharmacist_notes: adminNotes.trim() || null,
      };

      console.log('[generateQuote] INSERT PAYLOAD', payload);

      const { data: insertData, error: insertError } = await supabase
        .from('prescription_quotes')
        .insert([payload])
        .select();

      console.log('[generateQuote] INSERT RESULT DATA:', insertData);
      console.log('[generateQuote] INSERT RESULT ERROR:', insertError);

      if (insertError) {
        throw new Error('Supabase Quote Insert Failed: ' + (insertError.message || JSON.stringify(insertError)));
      }

      /* 6. Update prescription status → Quote Generated */
      const { error: rxErr } = await supabase
        .from('prescriptions')
        .update({
          status:      'Quote Generated',
          pharmacist_notes: adminNotes.trim() || null,
        })
        .eq('id', selected.id);
      if (rxErr) throw new Error('Failed to update prescription status: ' + rxErr.message);

      if (selected.userId) {
        await supabase.from('notifications').insert({
          user_id: selected.userId,
          title: 'Quote Ready',
          message: 'Your prescription quote has been generated. Please review it.',
          type: 'quote_generated',
          related_id: selected.id,
          is_read: false,
          read: false
        });
      }

      /* 7. Optimistic UI update */
      setPrescriptions(prev =>
        prev.map(p => p.id === selected.id
          ? { ...p, status: 'quote_generated', admin_notes: adminNotes.trim() }
          : p
        )
      );
      setSelected(prev => ({ ...prev, status: 'quote_generated', admin_notes: adminNotes.trim() }));

      removeToast(loadingToastId);
      addToast('Customer Quote Generated Successfully', 'success', 6000);

      /* 8. Trigger Quote PDF download */
      doc.save(`Quote_${quoteNumber}.pdf`);

      /* 9. Reload medicines from DB to sync db_ids */
      await loadMedicines(selected.id);

    } catch (err) {
      console.error('[generateQuote] error:', err);
      removeToast(loadingToastId);
      const msg = err.message || 'Failed to generate quote. Please try again.';
      setActionError(msg);
      addToast(msg, 'error', 8000);
    } finally {
      setActionBusy(false);
    }
  };

  /* ── OPEN QUOTE DELIVERY MODAL ── */
  const handleOpenDeliveryModal = () => {
    if (!selected || !activeQuote) return;
    setDeliverToDashboard(true);
    setDeliverViaWhatsApp(true);
    setShowDeliveryModal(true);
  };

  /* ── SEND QUOTE (with channel tracking) ── */
  const handleSendQuote = async () => {
    if (!selected || deliveryBusy) return;
    setDeliveryBusy(true);
    const loadingToastId = addToast('Sending quote to customer…', 'info', 0);
    try {
      /* 1. Build WhatsApp link if needed */
      const waLink = deliverViaWhatsApp ? getWhatsAppLink('send_quote') : null;

      /* 2. Update prescription status */
      const { error: rxErr } = await supabase
        .from('prescriptions')
        .update({ status: 'quote_sent' })
        .eq('id', selected.id);
      if (rxErr) throw rxErr;

      /* 3. Update the active quote with delivery tracking */
      await supabase
        .from('prescription_quotes')
        .update({
          status:             'Quote Sent',
          sent_to_dashboard:  deliverToDashboard,
          sent_to_whatsapp:   deliverViaWhatsApp,
          sent_at:            new Date().toISOString(),
        })
        .eq('prescription_id', selected.id)
        .eq('is_active', true);

      /* 4. Send dashboard notification if checked */
      if (deliverToDashboard && selected.userId) {
        const { data: { user: adminAuthUser } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        await supabase.from('notifications').insert({
          user_id:         selected.userId,
          title:           'New Quote Available',
          message:         `A quotation for your prescription has been sent. Quote: ${activeQuote?.quote_number} · Amount: ₹${activeQuote?.total_amount?.toFixed(2)}`,
          type:            'quote_sent',
          prescription_id: selected.id,
          quote_id:        activeQuote?.id || null,
          created_by:      adminAuthUser?.id || null,
          is_read:         false,
          read:            false,
        });
      }

      /* 5. Open WhatsApp tab if checked */
      if (deliverViaWhatsApp && waLink && waLink !== '#') {
        window.open(waLink, '_blank', 'noopener,noreferrer');
      }

      removeToast(loadingToastId);
      const channels = [deliverToDashboard && 'Dashboard', deliverViaWhatsApp && 'WhatsApp'].filter(Boolean).join(' + ');
      addToast(`Quote sent via ${channels || 'no channels'}!`, 'success');

      /* 6. Optimistic UI update */
      setPrescriptions(prev =>
        prev.map(p => p.id === selected.id ? { ...p, status: 'quote_sent' } : p)
      );
      setSelected(prev => ({ ...prev, status: 'quote_sent' }));

      /* 7. Reload quotes history to reflect sent_at / delivery flags */
      await loadQuotesHistory(selected.id);

      setShowDeliveryModal(false);
    } catch (err) {
      console.error('[handleSendQuote] error:', err);
      removeToast(loadingToastId);
      addToast('Failed to send quote: ' + err.message, 'error');
    } finally {
      setDeliveryBusy(false);
    }
  };

  /* ── GENERATE REVISED CUSTOMER QUOTE ── */
  const generateRevisedQuote = async () => {
    if (!selected || actionBusy) return;
    if (selectedMedicines.length === 0) {
      addToast('Add medicines first', 'error');
      return;
    }

    setActionBusy(true);
    setActionError('');
    const loadingToastId = addToast('Generating revised quote…', 'info', 0);

    try {
      /* 1. Save/upsert medicines in prescription_medicines */
      await saveMedicines(selected.id);

      /* 2. Count existing quotes to determine version number */
      const { count, error: countErr } = await supabase
        .from('prescription_quotes')
        .select('*', { count: 'exact', head: true })
        .eq('prescription_id', selected.id);
      
      if (countErr) {
        console.error("Error counting quotes:", countErr);
      }
      
      const nextVer = (count || 0) + 1;
      const baseQuoteNumber = `QT-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${selected.id.substring(0, 4).toUpperCase()}`;
      const quoteNumber = `${baseQuoteNumber}_V${nextVer}`;

      /* 3. Generate Quote PDF */
      const doc = await generateQuotePDF({
        action:          'generate',
        quoteNumber,
        customerName:    resolvedCustomerName,
        customerPhone:   displayPhone || 'N/A',
        prescriptionRef: selected.reference_id || selected.id?.substring(0, 8),
        pickupDate,
        pickupTime,
        pharmacistNotes: adminNotes.trim(),
        medicines:       selectedMedicines.map(m => ({
          name:        m.name,
          quantity:    m.quantity,
          unit_price:  m.unit_price,
          total_price: m.total_price,
        })),
        grandTotal,
      });

      /* 4. Upload Quote PDF to Supabase Storage */
      const pdfBlob = doc.output('blob');
      const quotePath = `quotes/Quote_${quoteNumber}_${selected.id}.pdf`;
      
      const { error: uploadErr } = await supabase.storage
        .from('prescriptions')
        .upload(quotePath, pdfBlob, { cacheControl: '3600', upsert: true });
      if (uploadErr) throw new Error('Failed to upload Quote PDF to storage: ' + uploadErr.message);

      const { data: { publicUrl } } = supabase.storage
        .from('prescriptions')
        .getPublicUrl(quotePath);

      /* 5. Mark all previous quotes as Superseded (is_active=false, quote_status='superseded') */
      const { error: updateOldErr } = await supabase
        .from('prescription_quotes')
        .update({
          status:       'Superseded',
          is_active:    false,
          quote_status: 'superseded',
        })
        .eq('prescription_id', selected.id);
      if (updateOldErr) {
        console.error('[generateRevisedQuote] Error marking old quotes superseded:', updateOldErr);
      }

      /* 6. Insert new Quote Record with versioning fields */
      const payload = {
        prescription_id:  selected.id,
        quote_number:     quoteNumber,
        total_amount:     grandTotal,
        quote_pdf_url:    publicUrl,
        status:           'Active',
        version_number:   nextVer,
        is_active:        true,
        quote_status:     'active',
        pharmacist_notes: adminNotes.trim() || null,
      };

      const { data: newQuoteData, error: insertErr } = await supabase
        .from('prescription_quotes')
        .insert([payload])
        .select('id');
 
       if (insertErr) throw new Error('Failed to insert revised quote: ' + insertErr.message);
       const newQuoteId = newQuoteData?.[0]?.id || null;
 
       /* 7. Mark the quote_change_requests as processed */
       const { error: reqErr } = await supabase
         .from('quote_change_requests')
         .update({ status: 'processed' })
         .eq('prescription_id', selected.id)
         .eq('status', 'pending');
       if (reqErr) {
         console.error("Error updating change requests to processed:", reqErr);
       }
 
       /* 8. Update prescription status → revised_quote_generated */
       const { error: rxErr } = await supabase
         .from('prescriptions')
         .update({
           status:      'revised_quote_generated',
           pharmacist_notes: adminNotes.trim() || null,
         })
         .eq('id', selected.id);
       if (rxErr) throw new Error('Failed to update prescription status: ' + rxErr.message);
 
       /* 9. Send Notification */
       if (selected.userId) {
         const { data: { user: adminAuthUser } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
         await supabase.from('notifications').insert({
           user_id:         selected.userId,
           title:           'Revised Quote Ready',
           message:         'A revised quote has been prepared based on your requested changes.',
           type:            'quote_revised',
           prescription_id: selected.id,
           quote_id:        newQuoteId,
           created_by:      adminAuthUser?.id || null,
           is_read:         false,
           read:            false
         });
       }

      /* 10. Optimistic UI update */
      setPrescriptions(prev =>
        prev.map(p => p.id === selected.id
          ? { ...p, status: 'revised_quote_generated', admin_notes: adminNotes.trim() }
          : p
        )
      );
      setSelected(prev => ({ ...prev, status: 'revised_quote_generated', admin_notes: adminNotes.trim() }));

      removeToast(loadingToastId);
      addToast('Revised Customer Quote Generated Successfully', 'success', 6000);

      /* 11. Trigger PDF download */
      doc.save(`Quote_${quoteNumber}.pdf`);

      /* 12. Reload medicines, change requests and quotes history to sync */
      await loadMedicines(selected.id);
      await loadChangeRequests(selected.id);
      await loadQuotesHistory(selected.id);

    } catch (err) {
      console.error('[generateRevisedQuote] error:', err);
      removeToast(loadingToastId);
      const msg = err.message || 'Failed to generate revised quote. Please try again.';
      setActionError(msg);
      addToast(msg, 'error', 8000);
    } finally {
      setActionBusy(false);
    }
  };

  /* ── SAVE MEDICINES ONLY (without generating quote) ── */
  const handleSaveMedicines = async () => {
    if (!selected || actionBusy) return;
    setActionBusy(true);
    try {
      await saveMedicines(selected.id);
      await loadMedicines(selected.id);
      addToast('Medicines saved to prescription_medicines.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  /* ── Fetch prescriptions (join profiles to get full_name as fallback name) ── */
  const load = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        profiles (
          full_name,
          phone,
          phone_number
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      // If join fails (e.g. profiles table RLS issue), fall back to plain select
      console.warn('[Prescriptions] Joined load failed, trying plain select:', error.message);
      const { data: plainData, error: plainError } = await supabase
        .from('prescriptions')
        .select('*')
        .order('created_at', { ascending: false });
      if (plainError) {
        setFetchError(`[${plainError.code}] ${plainError.message}`);
        setLoading(false);
        return;
      }
      setPrescriptions((plainData || []).map(mapRx));
      setLoading(false);
      return;
    }
    setPrescriptions((data || []).map(mapRx));
    setLoading(false);
  }, []);

  const loadGeneralChats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .is('prescription_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by user_id (if exists) or customer_name (if guest)
      const groups = {};
      (data || []).forEach(msg => {
        const key = msg.user_id ? msg.user_id : msg.customer_name;
        if (!groups[key]) {
          // Format guest name cleanly
          let displayName = msg.customer_name || 'Guest Customer';
          let isGuest = false;
          let guestIdVal = null;
          if (msg.customer_name && msg.customer_name.startsWith('Guest:')) {
            isGuest = true;
            const match = msg.customer_name.match(/Guest:\s*(\S+)\s*\(([^)]+)\)/);
            if (match) {
              guestIdVal = match[1];
              displayName = `${match[2]} (Guest)`;
            }
          }
          
          groups[key] = {
            id: key,
            isGeneralChat: true,
            userId: msg.user_id,
            guestId: guestIdVal,
            customerName: displayName,
            rawCustomerName: msg.customer_name,
            customerPhone: '',
            lastMessage: msg.message || 'Sent an attachment',
            uploadTime: msg.created_at,
            date: msg.created_at ? msg.created_at.split('T')[0] : '',
            unreadCount: 0,
            status: 'general_chat',
            reference_id: 'General Support',
            admin_notes: ''
          };
        }
        if (msg.sender_role === 'customer' && !msg.is_read) {
          groups[key].unreadCount += 1;
        }
      });

      setGeneralChats(Object.values(groups));
    } catch (err) {
      console.error('[Chat] Load general chats error:', err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Realtime subscription ── */
  useEffect(() => {
    const channel = supabase
      .channel('admin-rx-page-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescription_quotes' }, async (payload) => {
        console.log('[PrescriptionsAdmin] Realtime quote change:', payload);
        await load();
        if (selected) {
          loadQuotesHistory(selected.id);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_change_requests' }, async (payload) => {
        console.log('[PrescriptionsAdmin] Realtime change request change:', payload);
        await load();
        if (selected) {
          loadChangeRequests(selected.id);
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [load, selected, loadQuotesHistory, loadChangeRequests]);

  /* ── General Chats Sync and Subscription ── */
  useEffect(() => {
    loadGeneralChats();
    const chatChannel = supabase
      .channel('admin-chat-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => {
          loadGeneralChats();
        }
      )
      .subscribe();
    return () => supabase.removeChannel(chatChannel);
  }, [loadGeneralChats]);

  /* ── Filtered list ── */
  const filtered = prescriptions.filter(p => {
    const matchTab = activeTab === 'all' || (p.status || 'pending').toLowerCase() === activeTab;
    if (!matchTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.reference_id  || '').toLowerCase().includes(q) ||
      (p.customerName  || '').toLowerCase().includes(q) ||
      (p.customerPhone || '').includes(q)
    );
  });

  const filteredGeneral = generalChats.filter(g => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return g.customerName.toLowerCase().includes(q);
  });

  /* ── Auto-select first item ── */
  useEffect(() => {
    if (activeTab === 'general_chat') {
      if (filteredGeneral.length > 0) {
        const stillVisible = filteredGeneral.find(g => g.id === selected?.id);
        if (!stillVisible) {
          setSelected(filteredGeneral[0]);
          setZoom(1);
        }
      } else {
        setSelected(null);
      }
    } else {
      if (filtered.length > 0) {
        const stillVisible = filtered.find(p => p.id === selected?.id);
        if (!stillVisible) {
          setSelected(filtered[0]);
          setAdminNotes(filtered[0].admin_notes || '');
          setZoom(1);
        }
      } else {
        setSelected(null);
      }
    }
    setActionError('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, prescriptions, generalChats, searchQuery]);

  /* ── Search parameters routing handler ── */
  useEffect(() => {
    const rxParam = searchParams.get('rx');
    const tabParam = searchParams.get('tab');
    
    if (tabParam === 'general_chat') {
      setActiveTab('general_chat');
      const chatId = searchParams.get('chat');
      if (chatId) {
        const matched = generalChats.find(g => g.id === chatId);
        if (matched) {
          setSelected(matched);
        }
      }
    } else if (rxParam) {
      const matched = prescriptions.find(p => p.id === rxParam);
      if (matched) {
        setSelected(matched);
        setActiveTab('all');
      }
    }
  }, [searchParams, prescriptions, generalChats]);

  /* ── Tab count ── */
  const tabCount = (v) => {
    if (v === 'general_chat') return generalChats.length;
    if (v === 'all') return prescriptions.length;
    return prescriptions.filter(p => (p.status || 'pending').toLowerCase() === v).length;
  };

  /* ── Realtime Patient Consultation Chat Logics ── */
  useEffect(() => {
    if (!selected) {
      setChatMessages([]);
      setCustomerTypingText('');
      if (adminChatSubRef.current) supabase.removeChannel(adminChatSubRef.current);
      if (adminTypingChanRef.current) supabase.removeChannel(adminTypingChanRef.current);
      return;
    }

    setTimeout(scrollChatToBottom, 100);

    const fetchChatMessages = async () => {
      try {
        let query = supabase.from('chat_messages').select('*');
        if (selected.isGeneralChat) {
          query = query.is('prescription_id', null);
          if (selected.userId) {
            query = query.eq('user_id', selected.userId);
          } else {
            query = query.eq('customer_name', selected.rawCustomerName);
          }
        } else {
          query = query.eq('prescription_id', selected.id);
        }
        
        const { data, error } = await query.order('created_at', { ascending: true });
        if (error) throw error;
        setChatMessages(data || []);

        // Mark customer messages as read
        const unreadIds = (data || [])
          .filter(m => m.sender_role === 'customer' && !m.is_read)
          .map(m => m.id);

        if (unreadIds.length > 0) {
          await supabase
            .from('chat_messages')
            .update({ is_read: true })
            .in('id', unreadIds);
          
          loadGeneralChats();
        }
      } catch (err) {
        console.error('[PharmacistChat] Fetch messages failed:', err);
      }
    };

    fetchChatMessages();

    const roomFilter = selected.isGeneralChat
      ? `prescription_id=is.null`
      : `prescription_id=eq.${selected.id}`;

    const channelKey = `admin-room-${selected.id}`;
    const sub = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: roomFilter },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            if (selected.isGeneralChat) {
              if (selected.userId && payload.new.user_id !== selected.userId) return;
              if (!selected.userId && payload.new.customer_name !== selected.rawCustomerName) return;
            }

            setChatMessages(prev => {
              if (prev.some(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });

            if (payload.new.sender_role === 'customer' && !payload.new.is_read) {
              await supabase
                .from('chat_messages')
                .update({ is_read: true })
                .eq('id', payload.new.id);
            }
          } else if (payload.eventType === 'UPDATE') {
            setChatMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
          }
        }
      )
      .subscribe();

    adminChatSubRef.current = sub;

    const typingChan = supabase.channel(`typing-${selected.id}`);
    typingChan
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.sender === 'customer') {
          setCustomerTypingText(payload.isTyping ? 'Customer is typing...' : '');
        }
      })
      .subscribe();

    adminTypingChanRef.current = typingChan;

    return () => {
      if (adminChatSubRef.current) supabase.removeChannel(adminChatSubRef.current);
      if (adminTypingChanRef.current) supabase.removeChannel(adminTypingChanRef.current);
    };
  }, [selected, loadGeneralChats]);

  const handleAdminSendMessage = async (textToSend = null) => {
    const text = (textToSend || chatInput).trim();
    if (!text && !chatFileInputRef.current?.files?.[0]) return;

    setIsChatSending(true);
    setChatInput('');

    let uploadedUrl = null;
    if (chatFileInputRef.current?.files?.[0]) {
      const file = chatFileInputRef.current.files[0];
      chatFileInputRef.current.value = '';
      uploadedUrl = await handleAdminFileUpload(file);
    }

    try {
      const messagePayload = {
        prescription_id: selected.isGeneralChat ? null : selected.id,
        user_id: selected.isGeneralChat ? (selected.userId || null) : (selected.userId || null),
        customer_name: selected.isGeneralChat ? selected.rawCustomerName : selected.customerName,
        message: text || null,
        image_url: uploadedUrl,
        sender_role: 'pharmacist',
        is_read: false,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messagePayload)
        .select('*')
        .single();

      if (error) throw error;

      setChatMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, data];
      });

      if (adminTypingChanRef.current) {
        adminTypingChanRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { sender: 'pharmacist', isTyping: false }
        });
      }
    } catch (err) {
      console.error('[Chat] Failed to send pharmacist reply:', err);
      addToast('Failed to send message. Try again.', 'error');
    } finally {
      setIsChatSending(false);
    }
  };

  const handleAdminFileUpload = async (file) => {
    if (!file) return null;
    setIsChatUploading(true);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const fileName = `chat_attach_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      
      const { error } = await supabase.storage
        .from('prescriptions')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('prescriptions')
        .getPublicUrl(fileName);

      return urlData?.publicUrl || null;
    } catch (err) {
      console.error('[Chat] Attachment upload failed:', err);
      addToast('Image upload failed. Try again.', 'error');
      return null;
    } finally {
      setIsChatUploading(false);
    }
  };

  const sendAdminTypingStatus = (typing) => {
    if (adminTypingChanRef.current) {
      adminTypingChanRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { sender: 'pharmacist', isTyping: typing }
      });
    }
  };

  const handleAdminInputChange = (e) => {
    setChatInput(e.target.value);
    if (!isPharmacistTyping) {
      setIsPharmacistTyping(true);
      sendAdminTypingStatus(true);
    }
    if (pharmacistTypingTimeoutRef.current) clearTimeout(pharmacistTypingTimeoutRef.current);
    pharmacistTypingTimeoutRef.current = setTimeout(() => {
      setIsPharmacistTyping(false);
      sendAdminTypingStatus(false);
    }, 2000);
  };

  const renderChatWindow = (fullHeight = false) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: fullHeight ? '100%' : 300, background: 'rgba(0,0,0,0.15)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }} className="chat-messages-container">
          {chatMessages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4, gap: 6 }}>
              <span style={{ fontSize: 24 }}>💬</span>
              <p style={{ fontSize: 12, margin: 0 }}>No messages yet. Send a message to start consulting.</p>
            </div>
          ) : (
            chatMessages.map(m => (
              <div 
                key={m.id} 
                style={{
                  alignSelf: m.sender_role === 'pharmacist' ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  background: m.sender_role === 'pharmacist' ? 'var(--purple)' : 'var(--bg-elevated)',
                  border: m.sender_role === 'pharmacist' ? 'none' : '1px solid var(--border)',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: 12,
                  fontSize: 12,
                  lineHeight: 1.4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  wordBreak: 'break-word',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                {m.message && <div>{m.message}</div>}
                {m.image_url && (
                  <img 
                    src={m.image_url} 
                    alt="Attachment" 
                    style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 6, marginTop: 4, cursor: 'pointer', objectFit: 'cover' }}
                    onClick={() => window.open(m.image_url, '_blank')}
                  />
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, fontSize: 9, opacity: 0.7 }}>
                  <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {m.sender_role === 'pharmacist' && (
                    <span>
                      {m.is_read ? <span style={{ color: 'var(--cyan)' }}>✓✓</span> : <span>✓</span>}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
          {customerTypingText && (
            <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: 10, fontSize: 11, display: 'flex', gap: 4, alignItems: 'center' }}>
              <span>{customerTypingText}</span>
              <span className="dot-pulse" />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <style>{`
          .chat-messages-container {
            scrollbar-width: thin;
          }
          .dot-pulse {
            width: 4px;
            height: 4px;
            background: var(--text-muted);
            border-radius: 50%;
            animation: bounce 1s infinite alternate;
          }
        `}</style>

        <div style={{ display: 'flex', gap: 8, padding: 8, borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <button 
            type="button" 
            className="btn btn-ghost btn-sm btn-icon" 
            title="Attach image"
            disabled={isChatSending || isChatUploading}
            onClick={() => chatFileInputRef.current?.click()}
          >
            {isChatUploading ? (
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <span style={{ fontSize: 16 }}>📎</span>
            )}
          </button>
          <input 
            type="file" 
            ref={chatFileInputRef} 
            style={{ display: 'none' }} 
            accept="image/*"
            onChange={() => handleAdminSendMessage()}
          />
          
          <input
            type="text"
            className="form-input"
            placeholder="Type a response to customer…"
            value={chatInput}
            onChange={handleAdminInputChange}
            onKeyDown={e => { if (e.key === 'Enter') handleAdminSendMessage(); }}
            style={{ flex: 1, height: 32, fontSize: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)' }}
            disabled={isChatSending}
          />
          
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handleAdminSendMessage()}
            style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 50, background: 'var(--purple)', border: 'none', fontWeight: 700 }}
            disabled={isChatSending || isChatUploading || (!chatInput.trim() && !chatFileInputRef.current?.files?.[0])}
          >
            {isChatSending ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : 'Send'}
          </button>
        </div>
      </div>
    );
  };

  /* ── Relative time ── */
  const timeAgo = (iso) => {
    if (!iso) return 'just now';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m <= 0) return 'just now';
    if (d >= 1) return `${d}d ago`;
    if (h >= 1) return `${h}h ago`;
    return `${m}m ago`;
  };

  /* ── Status update ── */
  const handleAction = async (nextStatus) => {
    if (!selected || actionBusy) return;
    setActionBusy(true);
    setActionError('');
    try {
      await updatePrescription(selected.id, {
        status:      nextStatus,
        pharmacist_notes: adminNotes.trim() || null,
      });

      // Sync with pickup_reservations
      if (nextStatus === 'ready_for_pickup') {
        await supabase
          .from('pickup_reservations')
          .update({ status: 'Ready For Pickup' })
          .eq('prescription_id', selected.id);
      } else if (nextStatus === 'collected' || nextStatus === 'completed') {
        await supabase
          .from('pickup_reservations')
          .update({ status: 'Collected', collected_at: new Date().toISOString() })
          .eq('prescription_id', selected.id);
      }

      // Insert customer notification for state transition
      if (selected.userId) {
        let title = '';
        let message = '';
        let type = '';

        if (nextStatus === 'preparing_medicines') {
          title = 'Preparing Medicines';
          message = 'Our pharmacist is preparing your medicines.';
          type = 'preparing_medicines';
        } else if (nextStatus === 'ready_for_pickup') {
          title = 'Ready For Pickup';
          message = 'Your medicines are ready for collection.';
          type = 'ready_for_pickup';
        } else if (nextStatus === 'collected' || nextStatus === 'completed') {
          title = 'Reservation Completed';
          message = 'Thank you for choosing Sri Venkateshwara Medical Store.';
          type = 'collected';
        }

        if (title) {
          await supabase.from('notifications').insert({
            user_id: selected.userId,
            title,
            message,
            type,
            related_id: selected.id,
            is_read: false,
            read: false
          });
        }
      }

      setPrescriptions(prev =>
        prev.map(p => p.id === selected.id
          ? { ...p, status: nextStatus, admin_notes: adminNotes.trim() }
          : p
        )
      );
      setSelected(prev => ({ ...prev, status: nextStatus, admin_notes: adminNotes.trim() }));
      addToast(`Status updated to "${statusLabel(nextStatus)}"`, 'success');
    } catch (e) {
      const msg = e.message || 'Failed to update status. Please try again.';
      setActionError(msg);
      addToast(msg, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const curStatus = (selected?.status || 'pending').toLowerCase();

  const counts = {
    pending:          tabCount('pending') + tabCount('uploaded'),
    under_review:     tabCount('under_review'),
    quote_generated:  tabCount('quote_generated'),
    quote_sent:       tabCount('quote_sent'),
    customer_requested_changes: tabCount('customer_requested_changes'),
    revised_quote_generated: tabCount('revised_quote_generated'),
    accepted_by_customer: tabCount('accepted_by_customer') + tabCount('customer_accepted'),
    preparing_medicines: tabCount('preparing_medicines'),
    ready_for_pickup: tabCount('ready_for_pickup'),
    collected:        tabCount('collected'),
    rejected:         tabCount('rejected'),
  };

  // Use is_active flag (not legacy status field) to find the current quote
  const activeQuote = quotesHistory.find(q => q.is_active === true) || quotesHistory[0];

  const rawPhone = customerProfile?.phone_number || customerProfile?.phone || selected?.customerPhone || '';
  const cleanPhoneDigits = rawPhone.replace(/\D/g, '');
  const tenDigitPhone = cleanPhoneDigits.length >= 10 ? cleanPhoneDigits.slice(-10) : cleanPhoneDigits;
  const displayPhone = tenDigitPhone ? `+91${tenDigitPhone}` : '';

  /**
   * resolvedCustomerName — the single source of truth for the customer name.
   * Priority:
   *   1. prescription.customer_name  (entered at upload time)
   *   2. profiles.full_name          (loaded after selection from profiles table)
   *   3. 'Walk-in Customer'          (only if genuinely no name exists anywhere)
   */
  const resolvedCustomerName =
    (selected?.customerName && selected.customerName !== 'Walk-in Customer'
      ? selected.customerName
      : null) ||
    (customerProfile?.full_name && customerProfile.full_name.trim()
      ? customerProfile.full_name.trim()
      : null) ||
    'Walk-in Customer';


  const getWhatsAppLink = (type) => {
    if (!selected) return '#';
    const phone = customerProfile?.phone_number || customerProfile?.phone || selected.customerPhone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const tenDigitPhone = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
    const formattedPhone = tenDigitPhone ? `91${tenDigitPhone}` : '';
    
    let message = '';
    const rxRef = selected.reference_id || selected.id?.substring(0, 8);
    const quoteNum = activeQuote?.quote_number || '';
    const totalAmt = activeQuote?.total_amount ? activeQuote.total_amount.toFixed(2) : '0.00';
    const secureQuoteUrl = `${window.location.origin}/my-prescriptions?rx=${rxRef}`;
    
    if (type === 'send_quote' || type === 'send_revised_quote') {
      if (!activeQuote) return '#';
      message = `Hello ${resolvedCustomerName},

Your prescription quote is ready.

Prescription Reference:
${rxRef}

Quote Number:
${quoteNum}

Total Amount:
₹${totalAmt}

Please review your quote here:

${secureQuoteUrl}

You can:

• View Quote
• Download Quote PDF
• Accept Quote
• Request Changes
• Reject Quote

Pickup Date:
${pickupDate || 'N/A'}

Thank you,
Sri Venkateshwara Medical & General Stores`;
    } else if (type === 'ready_for_pickup') {
      if (!reservation) return '#';
      message = `Hello ${resolvedCustomerName},

Your medicines are ready for pickup.

Reservation ID:
${reservation.reservation_id}

Pickup Time:
${reservation.pickup_time || 'N/A'}

Please bring your QR code while visiting the store.

Thank you,
Sri Venkateshwara Medical Store`;
    } else if (type === 'pickup_reminder') {
      if (!reservation) return '#';
      message = `Hello ${resolvedCustomerName},

This is a reminder regarding your medicine reservation.

Reservation ID:
${reservation.reservation_id}

Pickup Time:
${reservation.pickup_time || 'N/A'}

We look forward to serving you.`;
    }
    
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  };

  /* ─────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────── */
  return (
    <AdminLayout>
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Prescription Review Center</h1>
          <p>
            {prescriptions.length} total &nbsp;·&nbsp;
            <span style={{ color: 'var(--amber)' }}>{counts.pending} pending</span>
            &nbsp;·&nbsp;
            <span style={{ color: 'var(--green)' }}>{counts.approved} approved</span>
            &nbsp;·&nbsp;
            <span style={{ color: 'var(--red)' }}>{counts.rejected} rejected</span>
          </p>
        </div>
        <button
          className="btn btn-ghost"
          onClick={load}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* ── Fetch Error Banner ── */}
      {fetchError && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          fontSize: 13, color: '#fca5a5',
        }}>
          <WifiOff size={18} style={{ flexShrink: 0, color: '#f87171' }} />
          <div>
            <b>Failed to fetch prescriptions from Supabase:</b><br />
            <code style={{ fontSize: 11, opacity: 0.85 }}>{fetchError}</code>
          </div>
          <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>Retry</button>
        </div>
      )}

      {/* ── Stat Pills ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { label: 'Pending',          count: counts.pending,                                  color: '#f59e0b' },
          { label: 'Under Review',     count: counts.under_review,                             color: '#3b82f6' },
          { label: 'Quotes Generated', count: counts.quote_generated + counts.quote_sent + counts.revised_quote_generated, color: '#a855f7' },
          { label: 'Changes Req.',     count: counts.customer_requested_changes,                color: '#f59e0b' },
          { label: 'Accepted',         count: counts.accepted_by_customer,                     color: '#22c55e' },
          { label: 'Preparing',        count: counts.preparing_medicines,                      color: '#3b82f6' },
          { label: 'Ready for Pickup', count: counts.ready_for_pickup,                         color: '#06b6d4' },
          { label: 'Collected',        count: counts.collected,                                color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card)', border: `1px solid ${s.color}40`, borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
            <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
            <span style={{ color: s.color, fontWeight: 800 }}>{s.count}</span>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="tab-bar" style={{ marginBottom: 16, display: 'flex', overflowX: 'auto', gap: 4, paddingBottom: 4 }}>
        {RX_TABS.map(t => (
          <button
            key={t.value}
            className={`tab-btn${activeTab === t.value ? ' active' : ''}`}
            onClick={() => setActiveTab(t.value)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {t.label}
            <span className="tab-count">{tabCount(t.value)}</span>
          </button>
        ))}
      </div>

      {/* ── Split Panel ── */}
      <div className="rx-layout">

        {/* ── Queue Panel ── */}
        <div className="rx-queue" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="rx-queue-header">
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Prescription Queue</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {loading ? 'Loading…' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Search */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by name, ref ID, phone…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', height: 34, padding: '0 10px 0 30px', fontSize: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && activeTab !== 'general_chat' ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <Loader2 size={32} style={{ opacity: 0.4, animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>Fetching prescriptions…</p>
              </div>
            ) : fetchError ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-state-icon">⚠️</div>
                <h3>Could Not Load</h3>
                <p style={{ fontSize: 12 }}>Check the error banner above.</p>
              </div>
            ) : activeTab === 'general_chat' ? (
              filteredGeneral.length === 0 ? (
                <div className="empty-state" style={{ padding: 32 }}>
                  <div className="empty-state-icon">💬</div>
                  <h3>No General Chats</h3>
                  <p style={{ fontSize: 12 }}>General customer queries will appear here.</p>
                </div>
              ) : (
                filteredGeneral.map(g => (
                  <div
                    key={g.id}
                    className={`rx-queue-item${selected?.id === g.id ? ' selected' : ''}`}
                    onClick={() => { setSelected(g); setZoom(1); setActionError(''); }}
                    style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', padding: 12, borderBottom: '1px solid var(--border)' }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>💬</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                          {g.customerName}
                          {g.unreadCount > 0 && (
                            <span style={{ marginLeft: 6, background: '#ef4444', color: '#fff', fontSize: 10, padding: '1px 5px', borderRadius: 10, fontWeight: 800 }}>
                              {g.unreadCount}
                            </span>
                          )}
                        </div>
                        <span className="badge badge-quote-sent" style={{ fontSize: 9, padding: '2px 6px', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>General Chat</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                        {g.lastMessage}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        <span>⏱ {timeAgo(g.uploadTime)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-state-icon">📋</div>
                <h3>{prescriptions.length === 0 ? 'No Prescriptions Yet' : 'No Matches'}</h3>
                <p style={{ fontSize: 12 }}>
                  {prescriptions.length === 0
                    ? 'Customer prescriptions will appear here.'
                    : `No "${statusLabel(activeTab)}" prescriptions.`}
                </p>
              </div>
            ) : (
              filtered.map(p => (
                <div
                  key={p.id}
                  className={`rx-queue-item${selected?.id === p.id ? ' selected' : ''}`}
                  onClick={() => { setSelected(p); setAdminNotes(p.admin_notes || ''); setZoom(1); setActionError(''); }}
                  style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', padding: 12, borderBottom: '1px solid var(--border)' }}
                >
                  {p.file ? (
                    <img src={p.file} alt="Rx" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)', flexShrink: 0 }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 4, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📋</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{p.customerName}</div>
                      <span className={`badge ${statusBadge(p.status)}`} style={{ fontSize: 9, padding: '2px 6px', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>{statusLabel(p.status)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      <span>🆔 {p.reference_id || p.id?.substring(0, 8) || '—'}</span>
                      <span>⏰ {timeAgo(p.uploadTime)}</span>
                    </div>
                    {p.customerPhone && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>📞 {p.customerPhone}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Detail Panel ── */}
        {selected ? (
          <div className="rx-viewer" style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <div className="rx-viewer-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>{resolvedCustomerName}</h3>
                <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span>Ref: <b style={{ color: 'var(--text-primary)' }}>{selected.reference_id || selected.id?.substring(0, 8) || '—'}</b></span>
                  {selected.customerPhone && <span>📞 <b style={{ color: 'var(--text-primary)' }}>{selected.customerPhone}</b></span>}
                  <span>⏱ <b>{new Date(selected.uploadTime).toLocaleString('en-IN')}</b></span>
                  <span className={`badge ${selected.isGeneralChat ? 'badge-quote-sent' : statusBadge(selected.status)}`}>
                    {selected.isGeneralChat ? 'General Support Chat' : statusLabel(selected.status)}
                  </span>
                </div>
              </div>
              {!selected.isGeneralChat && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}><ZoomOut size={14} /></button>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 38, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setZoom(z => Math.min(3, z + 0.25))}><ZoomIn size={14} /></button>
                  {selected.file && (
                    <a href={selected.file} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm btn-icon" title="Open in new tab">
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              )}
            </div>

            {selected.isGeneralChat ? (
              /* General Chat View Panel */
              <div className="rx-viewer-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, overflow: 'hidden' }}>
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 16
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(6,182,212,0.15)', border: '2px solid rgba(6,182,212,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 800, color: 'var(--cyan)', flexShrink: 0,
                  }}>
                    💬
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>{resolvedCustomerName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Real-time Consultation · In-App Support Chat
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {renderChatWindow(true)}
                </div>
              </div>
            ) : (
              <>
                {/* Standard Prescription View Panel */}
                <div className="rx-viewer-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ── Customer Info Card ── */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'rgba(168,85,247,0.15)', border: '2px solid rgba(168,85,247,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 800, color: 'var(--purple)', flexShrink: 0,
                    }}>
                      {(resolvedCustomerName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>{resolvedCustomerName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        RX Ref: <b style={{ color: 'var(--cyan)' }}>{selected.reference_id || selected.id?.substring(0,8)}</b>
                      </div>
                    </div>
                  </div>

                  {/* Customer Type Badge */}
                  {(() => {
                    const ct = customerProfile?.customer_type || (selected.userId ? 'registered' : 'walk_in');
                    const ctColors = {
                      registered: { bg: 'rgba(6,182,212,0.12)', color: '#06b6d4', border: 'rgba(6,182,212,0.3)', icon: '👤' },
                      returning:  { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', border: 'rgba(34,197,94,0.3)',  icon: '⭐' },
                      guest:      { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)', icon: '🙋' },
                      walk_in:    { bg: 'rgba(99,102,241,0.12)', color: '#818cf8', border: 'rgba(99,102,241,0.3)', icon: '🏪' },
                    };
                    const s = ctColors[ct] || ctColors.registered;
                    return (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        {s.icon} {ct.replace('_', ' ')}
                      </span>
                    );
                  })()}
                </div>

                {/* Phone row with quick actions */}
                {displayPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>📞 Phone:</span>
                    <b style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {displayPhone}
                    </b>
                    <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                      {/* Copy */}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(displayPhone);
                          addToast('Phone number copied!', 'success', 2000);
                        }}
                        title="Copy Number"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 8px', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
                      >
                        📋 Copy
                      </button>
                      {/* Call */}
                      <a
                        href={`tel:${displayPhone}`}
                        title="Call Customer"
                        style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 5, padding: '3px 8px', fontSize: 11, color: 'var(--cyan)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        📞 Call
                      </a>
                      {/* WhatsApp */}
                      <a
                        href={getWhatsAppLink('send_quote')}
                        target="_blank"
                        rel="noreferrer"
                        title="Open WhatsApp"
                        style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 5, padding: '3px 8px', fontSize: 11, color: '#22c55e', textDecoration: 'none', fontWeight: 600 }}
                      >
                        💬 WhatsApp
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* File Viewer */}
              {selected.file ? (
                <div style={{ display: 'flex', justifyContent: 'center', overflow: 'auto', padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid var(--border)', minHeight: 220 }}>
                  {/\.pdf$/i.test(selected.file) ? (
                    <iframe src={selected.file} title="Prescription PDF" style={{ width: '100%', minHeight: 380, border: 'none', borderRadius: 4 }} />
                  ) : (
                    <img src={selected.file} alt="Prescription" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.15s', maxWidth: '100%', maxHeight: 380, objectFit: 'contain', borderRadius: 4 }} />
                  )}
                </div>
              ) : (
                <div className="rx-image-placeholder">
                  <span style={{ fontSize: 64 }}>📋</span>
                  <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No File Attached</p>
                </div>
              )}

              {/* Customer Notes */}
              {selected.notes && (
                <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Customer Notes</p>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{selected.notes}</p>
                </div>
              )}

              {/* Change Request Alert Block */}
              {selected.status === 'customer_requested_changes' && changeRequests.length > 0 && (
                <div style={{
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: '10px',
                  padding: '16px',
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: 700, fontSize: '14px' }}>
                    <Clock size={16} />
                    <span>Change Request Pending</span>
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Request Type:</span> <strong style={{ color: '#fbbf24' }}>{changeRequests[0].request_type}</strong>
                  </div>
                  <div style={{ fontSize: '13px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', fontStyle: 'italic' }}>
                    "{changeRequests[0].customer_message}"
                  </div>
                </div>
              )}

              {/* ── Prescribed Medicines Section ── */}
              <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 10, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    Prescribed Medicines
                    {medsLoading && <Loader2 size={12} style={{ marginLeft: 8, animation: 'spin 1s linear infinite', display: 'inline-block', verticalAlign: 'middle' }} />}
                  </h4>
                  {selectedMedicines.length > 0 && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleSaveMedicines}
                      disabled={actionBusy}
                      style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      {actionBusy ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={11} />}
                      Save Medicines
                    </button>
                  )}
                </div>

                {/* Product Search */}
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search medicines from inventory to add…"
                    value={productSearch}
                    onChange={e => handleProductSearch(e.target.value)}
                    style={{ width: '100%', height: 34, padding: '0 10px 0 30px', fontSize: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', outline: 'none' }}
                  />
                  {searchLoading && (
                    <div style={{ position: 'absolute', right: 10, top: 10 }}>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                  )}

                  {/* Search Results Dropdown */}
                  {productResults.length > 0 && (
                    <div style={{ position: 'absolute', top: 38, left: 0, right: 0, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6, zIndex: 100, maxHeight: 200, overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                      {productResults.map(p => (
                        <div
                          key={p.id}
                          onClick={() => addMedicine(p)}
                          style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div>
                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                            {p.brand && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>({p.brand})</span>}
                          </div>
                          <span style={{ fontWeight: 700, color: 'var(--cyan)', flexShrink: 0, marginLeft: 8 }}>₹{p.selling_price || p.price || 0}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Medicines List */}
                {medsLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading medicines from database…
                  </div>
                ) : selectedMedicines.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                    No medicines added yet. Search above to add from inventory.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedMedicines.map(med => {
                      const details = getMedicineCardDetails(med);
                      return (
                        <div
                          key={med.product_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px 14px',
                            background: 'var(--bg-elevated, rgba(30,41,59,0.7))',
                            border: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                            borderRadius: '12px',
                            gap: '12px',
                          }}
                        >
                          {/* Image */}
                          <div style={{ width: '42px', height: '42px', borderRadius: '6px', overflow: 'hidden', background: '#fff', padding: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <img src={details.image} alt={details.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={(e) => { e.target.src = '/images/cat_medicines.png'; }} />
                          </div>

                          {/* Details */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{details.name}</span>
                              <span style={{ fontSize: '9px', fontWeight: '600', padding: '1px 5px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--cyan)' }}>
                                {details.strength}
                              </span>
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Brand: {details.brand} | Generic: {details.genericName}
                            </div>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: details.availability === 'In Stock' ? '#10b981' : '#ef4444', marginTop: '2px' }}>
                              ● {details.availability}
                            </div>
                          </div>

                          {/* Quantity Controls */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button type="button" onClick={() => updateQty(med.product_id, med.quantity - 1)} style={{ width: 24, height: 24, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>−</button>
                            <span style={{ width: 24, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{med.quantity}</span>
                            <button type="button" onClick={() => updateQty(med.product_id, med.quantity + 1)} style={{ width: 24, height: 24, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>+</button>
                          </div>

                          {/* Price & Delete */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 90, justifyContent: 'flex-end', flexShrink: 0 }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>₹{(med.total_price || 0).toFixed(2)}</div>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>₹{details.unitPrice.toFixed(2)} each</div>
                            </div>
                            <button type="button" onClick={() => removeMedicine(med.product_id)} style={{ border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, padding: '2px 4px', fontWeight: 700, lineHeight: 1 }}>×</button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Grand Total Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Grand Total:</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--cyan)' }}>₹{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quote History Version Section (Admin) */}
              <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 10, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  Quote Timeline & Version History
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Latest Active Quote */}
                  {activeQuote && (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(6,182,212,0.3)', fontSize: 12,
                      background: 'rgba(6,182,212,0.08)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                          background: 'var(--cyan)', color: '#fff',
                        }}>V{activeQuote.version_number || '1'}</span>
                        <b style={{ color: 'var(--text-primary)' }}>{activeQuote.quote_number}</b>
                        <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>₹{activeQuote.total_amount?.toFixed(2)}</span>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Latest Active</span>
                      </div>
                      {activeQuote.quote_pdf_url && (
                        <a href={activeQuote.quote_pdf_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', flexShrink: 0, color: 'var(--cyan)' }}>
                          <Download size={12} /> View PDF
                        </a>
                      )}
                    </div>
                  )}

                  {/* Previous versions */}
                  {quotesHistory && quotesHistory.map(hist => {
                    if (hist.id === activeQuote?.id) return null;
                    return (
                      <div key={hist.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12,
                        background: 'rgba(0,0,0,0.15)',
                        borderColor: 'var(--border)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                            background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}>V{hist.version_number || '?'}</span>
                          <b style={{ color: 'var(--text-muted)' }}>{hist.quote_number}</b>
                          <span style={{ color: 'var(--text-muted)' }}>₹{hist.total_amount.toFixed(2)}</span>
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Superseded</span>
                        </div>
                        {hist.quote_pdf_url && (
                          <a href={hist.quote_pdf_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', flexShrink: 0 }}>
                            <Download size={12} /> View PDF
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Quote Delivery Audit Log */}
              {activeQuote && (
                <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 10, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    Quote Delivery Audit Log
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <span>Dashboard Delivery:</span>
                      <b style={{ color: activeQuote.sent_to_dashboard ? 'var(--green)' : 'var(--text-muted)' }}>
                        {activeQuote.sent_to_dashboard ? '✓ Sent' : '✗ Pending'}
                      </b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <span>WhatsApp Delivery:</span>
                      <b style={{ color: activeQuote.sent_to_whatsapp ? 'var(--green)' : 'var(--text-muted)' }}>
                        {activeQuote.sent_to_whatsapp ? '✓ Sent' : '✗ Pending'}
                      </b>
                    </div>
                    {activeQuote.sent_at && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <span>Sent At:</span>
                        <b style={{ color: 'var(--text-primary)' }}>{new Date(activeQuote.sent_at).toLocaleString('en-IN')}</b>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <span>Customer Viewed:</span>
                      <b style={{ color: activeQuote.viewed_at ? 'var(--green)' : 'var(--text-muted)' }}>
                        {activeQuote.viewed_at ? '✓ Opened' : '✗ Unread'}
                      </b>
                    </div>
                    {activeQuote.viewed_at && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Viewed At:</span>
                        <b style={{ color: 'var(--text-primary)' }}>{new Date(activeQuote.viewed_at).toLocaleString('en-IN')}</b>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Pickup Schedule ── */}
              <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 10, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Pickup Schedule</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>Pickup Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={pickupDate}
                      min={today}
                      onChange={e => setPickupDate(e.target.value)}
                      style={{ height: 36, fontSize: 13 }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>Pickup Time</label>
                    <select
                      className="form-select"
                      value={pickupTime}
                      onChange={e => setPickupTime(e.target.value)}
                      style={{ height: 36, fontSize: 13 }}
                    >
                      {['09:00','09:30','10:00','10:30','11:00','11:30','12:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)' }}>Pharmacist Notes</label>
                <textarea
                  className="form-textarea"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Add review notes, approved brands, or rejection reason…"
                  style={{ minHeight: 70, resize: 'vertical' }}
                />
              </div>

              {/* ── Real-time Chat Section (Prescription Specific) ── */}
              <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 10, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  💬 Real-time Patient Consultation
                </h4>
                {renderChatWindow(false)}
              </div>
            </div>

            {/* ── Footer: Actions ── */}
            <div className="rx-viewer-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
              {actionError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#fca5a5', marginBottom: 10 }}>
                  <AlertCircle size={14} />{actionError}
                </div>
              )}

              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                Pharmacist Actions
                {actionBusy && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
              </p>

              <div className="rx-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {/* GENERATE QUOTE — primary action for review/pending stages */}
                {['pending', 'uploaded', 'under_review'].includes(curStatus) && (
                  <button
                    className="btn btn-primary"
                    disabled={actionBusy || selectedMedicines.length === 0}
                    onClick={generateQuote}
                    title={selectedMedicines.length === 0 ? 'Add medicines first' : 'Save medicines and generate quote PDF'}
                    style={{ backgroundColor: 'rgba(168,85,247,0.15)', borderColor: 'var(--purple)', color: 'var(--purple)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {actionBusy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={14} />}
                    Generate Customer Quote
                  </button>
                )}

                {/* GENERATE REVISED QUOTE — action for changes requested stage */}
                {curStatus === 'customer_requested_changes' && (
                  <button
                    className="btn btn-primary"
                    disabled={actionBusy || selectedMedicines.length === 0}
                    onClick={generateRevisedQuote}
                    title={selectedMedicines.length === 0 ? 'Add medicines first' : 'Generate revised quote PDF and upload'}
                    style={{ backgroundColor: 'rgba(168,85,247,0.15)', borderColor: 'var(--purple)', color: 'var(--purple)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {actionBusy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={14} />}
                    Generate Revised Quote
                  </button>
                )}

                {/* SEND QUOTE — opens multi-channel delivery modal */}
                {(curStatus === 'quote_generated' || curStatus === 'revised_quote_generated') && (
                  <button
                    className="btn btn-primary"
                    disabled={actionBusy || !activeQuote}
                    onClick={handleOpenDeliveryModal}
                    style={{ backgroundColor: 'var(--green)', borderColor: 'var(--green)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {actionBusy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
                    Send Quote Delivery
                  </button>
                )}

                {['pending', 'uploaded'].includes(curStatus) && (
                  <button className="btn btn-secondary" disabled={actionBusy} onClick={() => handleAction('under_review')} style={{ backgroundColor: 'rgba(217,119,6,0.15)', borderColor: 'var(--amber)', color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} /> Under Review
                  </button>
                )}

                {(curStatus === 'accepted_by_customer' || curStatus === 'customer_accepted') && (
                  <button className="btn btn-secondary" disabled={actionBusy} onClick={() => handleAction('preparing_medicines')} style={{ backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'var(--blue)', color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} /> Start Preparing
                  </button>
                )}

                {curStatus === 'preparing_medicines' && (
                  <button className="btn btn-secondary" disabled={actionBusy} onClick={() => handleAction('ready_for_pickup')} style={{ backgroundColor: 'rgba(6,182,212,0.15)', borderColor: 'var(--cyan)', color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Store size={14} /> Ready for Pickup
                  </button>
                )}

                {curStatus === 'ready_for_pickup' && (
                  <button className="btn btn-primary" disabled={actionBusy} onClick={() => handleAction('collected')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={14} /> Complete
                  </button>
                )}

                {['pending', 'uploaded', 'under_review', 'quote_generated', 'customer_requested_changes', 'revised_quote_generated'].includes(curStatus) && (
                  <button className="btn btn-danger" disabled={actionBusy} onClick={() => handleAction('rejected')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <XCircle size={14} /> Reject
                  </button>
                )}
              </div>

              {/* WhatsApp Communications section */}
              <div style={{ marginTop: 20, borderTop: '1px dashed var(--border)', paddingTop: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', marginBottom: 10, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  💬 WhatsApp Communications
                </p>
                {!displayPhone ? (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Customer phone number not available.</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Customer Phone details as required by Requirement 3 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>Customer Phone:</span>
                      <b style={{ fontSize: 13, color: 'var(--text-primary)' }}>{displayPhone}</b>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {/* Copy */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(displayPhone);
                            addToast('Phone number copied!', 'success', 2000);
                          }}
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 8px', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
                        >
                          📋 Copy
                        </button>
                        {/* Call */}
                        <a
                          href={`tel:${displayPhone}`}
                          style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 5, padding: '3px 8px', fontSize: 11, color: 'var(--cyan)', textDecoration: 'none', fontWeight: 600 }}
                        >
                          📞 Call
                        </a>
                        {/* WhatsApp */}
                        <a
                          href={getWhatsAppLink('send_quote')}
                          target="_blank"
                          rel="noreferrer"
                          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 5, padding: '3px 8px', fontSize: 11, color: '#22c55e', textDecoration: 'none', fontWeight: 600 }}
                        >
                          💬 WhatsApp
                        </a>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {activeQuote ? (
                      <a
                        href={getWhatsAppLink('send_quote')}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{
                          backgroundColor: 'rgba(34,197,94,0.15)',
                          borderColor: '#22c55e',
                          color: '#22c55e',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          padding: '6px 12px'
                        }}
                      >
                        Send Quote
                      </a>
                    ) : (
                      <button disabled className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px', opacity: 0.5 }}>Send Quote</button>
                    )}
                    {activeQuote && (curStatus === 'revised_quote_generated' || activeQuote.quote_number?.includes('_V')) ? (
                      <a
                        href={getWhatsAppLink('send_revised_quote')}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{
                          backgroundColor: 'rgba(34,197,94,0.15)',
                          borderColor: '#22c55e',
                          color: '#22c55e',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          padding: '6px 12px'
                        }}
                      >
                        Send Revised Quote
                      </a>
                    ) : (
                      <button disabled className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px', opacity: 0.5 }}>Send Revised Quote</button>
                    )}
                    {reservation ? (
                      <>
                        <a
                          href={getWhatsAppLink('ready_for_pickup')}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{
                            backgroundColor: 'rgba(34,197,94,0.15)',
                            borderColor: '#22c55e',
                            color: '#22c55e',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            padding: '6px 12px'
                          }}
                        >
                          Send Ready For Pickup
                        </a>
                        <a
                          href={getWhatsAppLink('pickup_reminder')}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{
                            backgroundColor: 'rgba(34,197,94,0.15)',
                            borderColor: '#22c55e',
                            color: '#22c55e',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            padding: '6px 12px'
                          }}
                        >
                          Send Pickup Reminder
                        </a>
                      </>
                    ) : (
                      <>
                        <button disabled className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px', opacity: 0.5 }}>Send Ready For Pickup</button>
                        <button disabled className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px', opacity: 0.5 }}>Send Pickup Reminder</button>
                      </>
                    )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
        ) : (
          <div className="rx-viewer" style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>{loading ? 'Loading…' : prescriptions.length === 0 ? 'No prescriptions yet' : 'Select a Prescription'}</h3>
              <p>{loading ? 'Fetching from Supabase…' : prescriptions.length === 0 ? 'Customer prescriptions appear here in real time.' : 'Click a prescription from the queue to review it.'}</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .badge-quote-generated { background: rgba(14,165,233,0.15) !important; color: #38bdf8 !important; border: 1px solid rgba(14,165,233,0.3) !important; }
        .badge-quote-sent { background: rgba(168,85,247,0.15) !important; color: #c084fc !important; border: 1px solid rgba(168,85,247,0.3) !important; }
        .badge-warning { background: rgba(245,158,11,0.15) !important; color: #f59e0b !important; border: 1px solid rgba(245,158,11,0.3) !important; }
        .delivery-channel-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px; border-radius: 8px; border: 1px solid var(--border); cursor: pointer; transition: border-color 0.2s, background 0.2s; }
        .delivery-channel-row:hover { border-color: rgba(6,182,212,0.35); background: rgba(6,182,212,0.04); }
        .delivery-channel-row.active { border-color: rgba(6,182,212,0.5); background: rgba(6,182,212,0.08); }
      `}</style>

      {/* ── Quote Delivery Modal ── */}
      {showDeliveryModal && activeQuote && selected && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: 16,
          }}
          onClick={() => setShowDeliveryModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(6,182,212,0.25)',
              borderRadius: 16,
              maxWidth: 520, width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 28,
              display: 'flex', flexDirection: 'column', gap: 20,
              boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 30px rgba(6,182,212,0.1)',
              animation: 'modalFadeIn 0.25s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  📤 Send Quote to Customer
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Choose how to deliver the quote
                </p>
              </div>
              <button onClick={() => setShowDeliveryModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* Quote Summary */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Customer</span>
                <b style={{ color: 'var(--text-primary)' }}>{resolvedCustomerName}</b>
              </div>
              {displayPhone && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Phone</span>
                  <b style={{ color: 'var(--cyan)' }}>{displayPhone}</b>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Quote #</span>
                <b style={{ color: 'var(--text-primary)' }}>{activeQuote.quote_number}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Amount</span>
                <b style={{ color: 'var(--cyan)', fontSize: 14 }}>₹{activeQuote.total_amount?.toFixed(2)}</b>
              </div>
            </div>

            {/* Delivery Channels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Delivery Channels</p>

              {/* Dashboard */}
              <div
                className={`delivery-channel-row${deliverToDashboard ? ' active' : ''}`}
                onClick={() => setDeliverToDashboard(v => !v)}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1,
                  background: deliverToDashboard ? 'var(--cyan)' : 'transparent',
                  border: `2px solid ${deliverToDashboard ? 'var(--cyan)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 12, transition: 'all 0.2s',
                }}>{ deliverToDashboard ? '✓' : '' }</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>📊 Customer Dashboard</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Creates a notification on the customer's dashboard with the quote details and action buttons.</div>
                </div>
              </div>

              {/* WhatsApp */}
              <div
                className={`delivery-channel-row${deliverViaWhatsApp ? ' active' : ''}`}
                onClick={() => setDeliverViaWhatsApp(v => !v)}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1,
                  background: deliverViaWhatsApp ? '#22c55e' : 'transparent',
                  border: `2px solid ${deliverViaWhatsApp ? '#22c55e' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 12, transition: 'all 0.2s',
                }}>{ deliverViaWhatsApp ? '✓' : '' }</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>💬 WhatsApp</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Opens WhatsApp with a pre-filled message. You confirm the send inside WhatsApp.</div>
                  {deliverViaWhatsApp && (
                    <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(34,197,94,0.06)', borderRadius: 6, border: '1px solid rgba(34,197,94,0.15)', fontSize: 11, color: '#86efac', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {`Hello ${resolvedCustomerName},

Your prescription quote is ready.

Prescription Reference:
${selected.reference_id || selected.id?.substring(0, 8)}

Quote Number:
${activeQuote.quote_number}

Total Amount:
₹${activeQuote.total_amount?.toFixed(2)}

Please review your quote here:

${window.location.origin}/my-prescriptions?rx=${selected.reference_id || selected.id?.substring(0, 8)}

You can:

• View Quote
• Download Quote PDF
• Accept Quote
• Request Changes
• Reject Quote

Pickup Date:
${pickupDate || 'N/A'}

Thank you,
Sri Venkateshwara Medical & General Stores`}
                    </div>
                  )}
                </div>
              </div>

              {/* Email (Future) */}
              <div
                className="delivery-channel-row disabled"
                style={{ opacity: 0.5, cursor: 'not-allowed', display: 'flex', gap: '12px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1,
                  background: 'transparent',
                  border: '2px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 12,
                }}></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)' }}>✉️ Email (Future)</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Automatically email quotation PDF and details directly to customer's registered email address.</div>
                </div>
              </div>

              {/* SMS (Future) */}
              <div
                className="delivery-channel-row disabled"
                style={{ opacity: 0.5, cursor: 'not-allowed', display: 'flex', gap: '12px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1,
                  background: 'transparent',
                  border: '2px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 12,
                }}></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)' }}>📱 SMS (Future)</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Send quotation summary and secure link via standard text SMS notification.</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button
                onClick={() => setShowDeliveryModal(false)}
                disabled={deliveryBusy}
                style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendQuote}
                disabled={deliveryBusy || (!deliverToDashboard && !deliverViaWhatsApp)}
                style={{
                  padding: '9px 22px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  background: 'var(--green)', border: 'none', color: '#fff', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 6,
                  opacity: (!deliverToDashboard && !deliverViaWhatsApp) ? 0.5 : 1,
                }}
              >
                {deliveryBusy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
                {deliveryBusy ? 'Sending…' : 'Send Quote →'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
};

export default Prescriptions;
