import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, XCircle, Loader2, AlertCircle, Download, ExternalLink, Calendar, Clock, QrCode, Trash2, Plus, Minus, Edit } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { generateQuotePDF } from '../services/pdfService';
import { fetchWithTimeout } from '../hooks/useFetchWithTimeout';
import { SkeletonList, ErrorState, EmptyState } from '../components/LoadingStates';

const statusBadge = (s) => {
  const v = (s || '').toLowerCase();
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
  if (v === 'rejected')         return 'badge-rejected';
  return 'badge-pending';
};

const statusLabel = (s) => {
  const v = (s || '').toLowerCase();
  if (v === 'customer_requested_changes') return 'Changes Requested';
  return (s || 'pending').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const STATUS_ORDER = {
  'uploaded': 1,
  'pending': 1,
  'under_review': 2,
  'quote_generated': 3,
  'quote_sent': 3,
  'customer_requested_changes': 4,
  'revised_quote_generated': 5,
  'customer_accepted': 6,
  'accepted_by_customer': 6,
  'preparing_medicines': 7,
  'ready_for_pickup': 8,
  'collected': 9,
  'rejected': -1,
  'customer_rejected': -1,
};

export const parseChangeRequest = (req) => {
  if (!req) return null;
  if (req.customer_message && req.customer_message.startsWith('{')) {
    try {
      const parsed = JSON.parse(req.customer_message);
      if (parsed.__is_structured) {
        return {
          ...req,
          customer_message: parsed.customer_message,
          structured_items: parsed.structured_items,
          confidence_score: parsed.confidence_score,
          processing_type: parsed.processing_type,
          old_total: parsed.old_total,
          new_total: parsed.new_total,
          changes_summary: parsed.changes_summary,
          audit_timeline: parsed.audit_timeline,
          original_version: parsed.original_version,
          new_version: parsed.new_version,
          processed_at: parsed.processed_at,
          processed_by: parsed.processed_by,
          admin_notes: parsed.admin_notes
        };
      }
    } catch (e) {
      // Not JSON or parse failed
    }
  }
  return req;
};

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

export const calculateDiff = (oldMeds, newMeds) => {
  const removed = [];
  const added = [];
  const updated = [];
  
  const oldMap = new Map(oldMeds.map(m => [m.product_id, m]));
  const newMap = new Map(newMeds.map(m => [m.product_id, m]));
  
  for (const [prodId, oldMed] of oldMap) {
    if (!newMap.has(prodId)) {
      removed.push({
        product_id: prodId,
        name: oldMed.name,
        qty: oldMed.qty || oldMed.quantity,
        price: oldMed.price || oldMed.unit_price,
        total: oldMed.total || oldMed.total_price
      });
    } else {
      const newMed = newMap.get(prodId);
      const oldQty = oldMed.qty || oldMed.quantity;
      const newQty = newMed.qty || newMed.quantity;
      if (oldQty !== newQty) {
        updated.push({
          product_id: prodId,
          name: oldMed.name,
          oldQty,
          newQty,
          unitPrice: oldMed.price || oldMed.unit_price,
          oldTotal: oldMed.total || oldMed.total_price,
          newTotal: newMed.total || newMed.total_price,
          diff: (newMed.total || newMed.total_price) - (oldMed.total || oldMed.total_price)
        });
      }
    }
  }
  
  for (const [prodId, newMed] of newMap) {
    if (!oldMap.has(prodId)) {
      added.push({
        product_id: prodId,
        name: newMed.name,
        qty: newMed.qty || newMed.quantity,
        price: newMed.price || newMed.unit_price,
        total: newMed.total || newMed.total_price
      });
    }
  }
  
  const oldTotal = oldMeds.reduce((sum, m) => sum + (m.total || m.total_price || 0), 0);
  const newTotal = newMeds.reduce((sum, m) => sum + (m.total || m.total_price || 0), 0);
  const difference = newTotal - oldTotal;
  
  return {
    removed,
    added,
    updated,
    oldTotal,
    newTotal,
    difference
  };
};

const MyPrescriptions = () => {
  const { user } = useAuth();
  const { showToast } = useCart();
  const navigate = useNavigate();

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  // Change request modal states
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [selectedRxForChange, setSelectedRxForChange] = useState(null);
  const [requestType, setRequestType] = useState('Remove Medicine');
  const [customerMessage, setCustomerMessage] = useState('');
  const [modalMedicines, setModalMedicines] = useState([]);
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Reject quote modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRxForReject, setSelectedRxForReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchPrescriptions = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchWithTimeout(async (signal) => {
        // 1. Fetch prescriptions first
        const { data: rxData, error: rxError } = await supabase
          .from('prescriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .abortSignal(signal);

        if (rxError) throw rxError;

        const mapped = [];
        const rxIds = (rxData || []).map(r => r.id);

        if (rxIds.length > 0) {
          // 2. Fetch quotes in batch
          let quotes = [];
          try {
            const { data: quoteData, error: quoteError } = await supabase
              .from('prescription_quotes')
              .select(`
                id,
                prescription_id,
                quote_number,
                total_amount,
                quote_pdf_url,
                status,
                is_active,
                quote_status,
                version_number,
                sent_to_dashboard,
                sent_to_whatsapp,
                sent_at,
                viewed_at,
                created_at
              `)
              .in('prescription_id', rxIds)
              .abortSignal(signal);
            if (!quoteError && quoteData) quotes = quoteData;
          } catch (err) {
            console.warn('[MyPrescriptions] Failed to fetch quotes:', err);
          }

          // 3. Fetch change requests in batch
          let changeRequests = [];
          try {
            const { data: changeData, error: changeError } = await supabase
              .from('quote_change_requests')
              .select(`
                id,
                prescription_id,
                quote_id,
                request_type,
                customer_message,
                status,
                created_at
              `)
              .in('prescription_id', rxIds)
              .abortSignal(signal);
            if (!changeError && changeData) changeRequests = changeData;
          } catch (err) {
            console.warn('[MyPrescriptions] Failed to fetch change requests:', err);
          }

          // 4. Fetch pickup reservations
          let reservations = [];
          try {
            const { data: resData, error: resError } = await supabase
              .from('pickup_reservations')
              .select(`
                id,
                reservation_id,
                pickup_date,
                pickup_time,
                status,
                receipt_url,
                qr_payload,
                prescription_id
              `)
              .in('prescription_id', rxIds)
              .abortSignal(signal);

            if (!resError && resData) {
              reservations = resData;
            } else {
              const { data: userResData, error: userResError } = await supabase
                .from('pickup_reservations')
                .select(`
                  id,
                  reservation_id,
                  pickup_date,
                  pickup_time,
                  status,
                  receipt_url,
                  qr_payload
                `)
                .eq('user_id', user.id)
                .abortSignal(signal);
              if (!userResError && userResData) {
                reservations = userResData;
              }
            }
          } catch (err) {
            console.warn('[MyPrescriptions] Failed to fetch reservations:', err);
          }

          // Map everything
          for (const rx of rxData) {
            let medicines = [];
            const hasMeds = !['pending', 'uploaded', 'under_review', 'rejected'].includes((rx.status || '').toLowerCase());
            if (hasMeds) {
              try {
                const { data: meds, error: medError } = await supabase
                  .from('prescription_medicines')
                  .select(`
                    id,
                    product_id,
                    quantity,
                    unit_price,
                    total_price,
                    medicine_name,
                    products (
                      name,
                      image_url
                    )
                  `)
                  .eq('prescription_id', rx.id)
                  .abortSignal(signal);

                if (!medError && meds) {
                  medicines = meds.map(m => ({
                    product_id: m.product_id,
                    name: m.medicine_name || m.products?.name || 'Unknown Product',
                    qty: m.quantity,
                    price: m.unit_price,
                    total: m.total_price,
                    image: m.products?.image_url
                  }));
                }
              } catch (err) {
                console.warn('[MyPrescriptions] Failed to fetch medicines for rx:', rx.id, err);
              }
            }

            const rxQuotes = quotes.filter(q => q.prescription_id === rx.id);
            const sortedQuotes = [...rxQuotes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            const activeQuote = sortedQuotes.find(q => q.is_active === true) || sortedQuotes[0] || null;
            const historicalQuotes = sortedQuotes.filter(q => q.id !== activeQuote?.id);

            const rxChanges = changeRequests.filter(c => c.prescription_id === rx.id);
            const sortedRequests = [...rxChanges].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            let rxReservation = reservations.find(r => r.prescription_id === rx.id) || null;
            if (!rxReservation && reservations.length > 0) {
              rxReservation = reservations.find(r => r.reservation_id?.includes(rx.reference_id) || r.reservation_id?.includes(rx.id.substring(0, 8))) || null;
            }

            mapped.push({
              ...rx,
              medicines,
              quote: activeQuote,
              quotesHistory: historicalQuotes,
              changeRequests: sortedRequests,
              reservation: rxReservation
            });
          }
        }
        return mapped;
      });
      setPrescriptions(data);
    } catch (e) {
      console.error('Error fetching prescriptions:', e);
      setError(e.message || 'Failed to load prescriptions.');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchPrescriptions();

    if (!user) return;

    // Realtime listener for customer prescriptions, quotes and change requests
    const rxChannel = supabase
      .channel(`customer-prescriptions-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prescriptions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('[MyPrescriptions] Realtime prescriptions change detected:', payload);
          fetchPrescriptions();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prescription_quotes' },
        (payload) => {
          console.log('[MyPrescriptions] Realtime quotes change detected:', payload);
          fetchPrescriptions();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quote_change_requests' },
        (payload) => {
          console.log('[MyPrescriptions] Realtime change requests change detected:', payload);
          fetchPrescriptions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rxChannel);
    };
  }, [user]);

  // Mark quote as viewed when customer opens the page and has an unviewed quote_sent prescription
  useEffect(() => {
    if (!user || !prescriptions.length) return;
    prescriptions.forEach(rx => {
      if (
        rx.quote?.is_active &&
        rx.quote?.sent_to_dashboard &&
        !rx.quote?.viewed_at &&
        ['quote_sent', 'quote_generated', 'revised_quote_generated'].includes(rx.status?.toLowerCase())
      ) {
        supabase
          .from('prescription_quotes')
          .update({ viewed_at: new Date().toISOString() })
          .eq('id', rx.quote.id)
          .is('viewed_at', null)
          .then(({ error }) => {
            if (error) console.warn('[MyPrescriptions] viewed_at update failed:', error);
          });
      }
    });
  }, [prescriptions, user]);

  // Handle auto-focus / scroll & highlight for secure rx URL parameter
  useEffect(() => {
    if (loading || prescriptions.length === 0) return;
    const searchParams = new URLSearchParams(window.location.search);
    const targetRxRef = searchParams.get('rx');
    if (targetRxRef) {
      setTimeout(() => {
        let element = document.getElementById(`rx-card-${targetRxRef}`);
        if (!element) {
          const match = prescriptions.find(r => r.reference_id === targetRxRef || r.id === targetRxRef);
          if (match) {
            element = document.getElementById(`rx-card-${match.reference_id || match.id}`);
          }
        }
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('glow-highlight');
          setTimeout(() => {
            element.classList.remove('glow-highlight');
          }, 6000);
        }
      }, 500);
    }
  }, [loading, prescriptions]);

  const handleCancelRequest = async (rxId) => {
    if (actionBusy) return;
    if (!window.confirm("Are you sure you want to cancel this prescription request?")) return;

    setActionBusy(true);
    try {
      const { error } = await supabase
        .from('prescriptions')
        .update({ status: 'rejected', pharmacist_notes: 'Cancelled by customer' })
        .eq('id', rxId);

      if (error) throw error;

      await fetchPrescriptions();
      showToast('Prescription request cancelled.', 'OK');
    } catch (err) {
      console.error('Error cancelling request:', err);
      alert('Failed to cancel request: ' + err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRejectQuote = async () => {
    if (!selectedRxForReject || actionBusy) return;
    setActionBusy(true);
    try {
      const { error } = await supabase
        .from('prescriptions')
        .update({
          status: 'customer_rejected',
          customer_notes: rejectReason.trim() ? `Rejected: ${rejectReason.trim()}` : 'Customer rejected the quote.',
        })
        .eq('id', selectedRxForReject.id);
      if (error) throw error;

      // Notify admin
      try {
        await supabase.from('notifications').insert({
          user_id: null,
          title: 'Customer Rejected Quote',
          message: `A customer has rejected the quote${rejectReason.trim() ? `: "${rejectReason.trim()}"` : '.'}`,
          type: 'quote_rejected',
          related_id: selectedRxForReject.id,
          is_read: false,
          read: false,
        });
      } catch (notiErr) {
        console.warn('[MyPrescriptions] Admin notification insert failed:', notiErr);
      }

      setShowRejectModal(false);
      setSelectedRxForReject(null);
      setRejectReason('');
      await fetchPrescriptions();
      showToast('Quote rejected. The pharmacist has been notified.', 'OK');
    } catch (err) {
      console.error('Error rejecting quote:', err);
      alert('Failed to reject quote: ' + err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const handleSubmitChangeRequest = async () => {
    if (!selectedRxForChange || actionBusy) return;

    // Filter out items that are marked as removed
    const activeMeds = modalMedicines.filter(m => !m.removed);
    
    // Check if any changes were made compared to selectedRxForChange.medicines
    const diff = calculateDiff(selectedRxForChange.medicines, activeMeds);
    
    const hasChanges = diff.removed.length > 0 || diff.added.length > 0 || diff.updated.length > 0;
    
    if (!hasChanges && !additionalInstructions.trim()) {
      alert("Please make some changes or provide additional instructions.");
      return;
    }

    setActionBusy(true);
    
    try {
      const isAuto = !additionalInstructions.trim() && hasChanges;
      const confidenceScore = isAuto ? 98 : 90;
      const processingType = isAuto ? 'automatic' : 'manual';
      
      const structuredItems = {
        actions: [
          ...diff.removed.map(m => ({ action: 'REMOVE', product_id: m.product_id, medicine_name: m.name })),
          ...diff.updated.map(m => ({ action: 'UPDATE_QUANTITY', product_id: m.product_id, medicine_name: m.name, new_quantity: m.newQty }))
        ],
        previous_medicines: selectedRxForChange.medicines
      };
      
      const changesSummary = {
        removed: diff.removed.map(m => m.name),
        added: diff.added.map(m => m.name),
        updated: diff.updated.map(m => ({ name: m.name, oldQty: m.oldQty, newQty: m.newQty })),
        difference: diff.difference
      };

      const auditTimeline = [
        { time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), text: `Customer requested changes: ${isAuto ? 'Automatic processing' : 'Pharmacist review needed'}` }
      ];

      const oldTotal = diff.oldTotal;
      const newTotal = diff.newTotal;
      const originalVersion = selectedRxForChange.quote?.version_number || 1;
      
      if (isAuto) {
        // --- AUTOMATED PROCESSING ---
        auditTimeline.push(
          { time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), text: 'Quote recalculated' }
        );
        
        // 1. Calculate new version number
        const nextVersion = originalVersion + 1;
        const baseQuoteNumber = `QT-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${selectedRxForChange.id.substring(0, 4).toUpperCase()}`;
        const newQuoteNumber = `${baseQuoteNumber}_V${nextVersion}`;
        
        auditTimeline.push(
          { time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), text: `Version ${nextVersion} generated` }
        );

        // 2. Save medicines to prescription_medicines (delete and insert)
        const { error: delErr } = await supabase
          .from('prescription_medicines')
          .delete()
          .eq('prescription_id', selectedRxForChange.id);
        if (delErr) throw delErr;

        if (activeMeds.length > 0) {
          const insertRows = activeMeds.map(m => ({
            prescription_id: selectedRxForChange.id,
            product_id: m.product_id,
            medicine_name: m.name,
            quantity: m.qty,
            unit_price: m.price,
            total_price: m.total
          }));
          const { error: insErr } = await supabase
            .from('prescription_medicines')
            .insert(insertRows);
          if (insErr) throw insErr;
        }

        // 3. Generate Quote PDF
        const pickupDate = selectedRxForChange.reservation?.pickup_date || selectedRxForChange.quote?.pickup_date || new Date().toISOString().split('T')[0];
        const pickupTime = selectedRxForChange.reservation?.pickup_time || selectedRxForChange.quote?.pickup_time || '10:00';
        const notes = selectedRxForChange.quote?.pharmacist_notes || '';

        const doc = await generateQuotePDF({
          action: 'generate',
          quoteNumber: newQuoteNumber,
          customerName: selectedRxForChange.customer_name?.trim() || user?.name?.trim() || user?.full_name?.trim() || user?.email || 'Customer',
          customerPhone: selectedRxForChange.phone || '',
          prescriptionRef: selectedRxForChange.reference_id || selectedRxForChange.id.substring(0, 8),
          pickupDate,
          pickupTime,
          pharmacistNotes: notes,
          medicines: activeMeds.map(m => ({
            name: m.name,
            quantity: m.qty,
            unit_price: m.price,
            total_price: m.total
          })),
          grandTotal: newTotal
        });

        // 4. Upload Quote PDF to Supabase Storage
        const pdfBlob = doc.output('blob');
        const quotePath = `quotes/Quote_${newQuoteNumber}_${selectedRxForChange.id}.pdf`;
        const { error: uploadErr } = await supabase.storage
          .from('prescriptions')
          .upload(quotePath, pdfBlob, { cacheControl: '3600', upsert: true });
        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage
          .from('prescriptions')
          .getPublicUrl(quotePath);

        // 5. Mark all previous quotes as superseded
        await supabase
          .from('prescription_quotes')
          .update({
            status: 'Superseded',
            is_active: false,
            quote_status: 'superseded'
          })
          .eq('prescription_id', selectedRxForChange.id);

        // 6. Insert new Quote
        const { error: quoteErr } = await supabase
          .from('prescription_quotes')
          .insert({
            prescription_id: selectedRxForChange.id,
            quote_number: newQuoteNumber,
            total_amount: newTotal,
            quote_pdf_url: publicUrl,
            status: 'Active',
            version_number: nextVersion,
            is_active: true,
            quote_status: 'active',
            pharmacist_notes: notes || null
          });
        if (quoteErr) throw quoteErr;

        // 7. Update Prescription Status to revised_quote_generated
        const { error: rxErr } = await supabase
          .from('prescriptions')
          .update({ status: 'revised_quote_generated' })
          .eq('id', selectedRxForChange.id);
        if (rxErr) throw rxErr;

        auditTimeline.push(
          { time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), text: 'Customer notified automatically' }
        );

        // 8. Insert processed quote_change_request
        const reqPayload = {
          quote_id: selectedRxForChange.quote?.id || null,
          prescription_id: selectedRxForChange.id,
          request_type: 'Remove/Update Quantity',
          customer_message: 'Quick actions applied automatically.',
          status: 'processed',
          processing_type: 'automatic',
          confidence_score: confidenceScore,
          old_total: oldTotal,
          new_total: newTotal,
          structured_items: structuredItems,
          changes_summary: changesSummary,
          audit_timeline: auditTimeline,
          original_version: originalVersion,
          new_version: nextVersion,
          processed_at: new Date().toISOString()
        };

        const { error: crErr } = await supabase
          .from('quote_change_requests')
          .insert(reqPayload);
        
        if (crErr) {
          console.warn('[MyPrescriptions] DB columns missing, falling back to JSON serialization inside customer_message:', crErr);
          const fallbackPayload = {
            quote_id: selectedRxForChange.quote?.id || null,
            prescription_id: selectedRxForChange.id,
            request_type: 'Remove/Update Quantity',
            customer_message: JSON.stringify({
              __is_structured: true,
              customer_message: 'Quick actions applied automatically.',
              status: 'processed',
              processing_type: 'automatic',
              confidence_score: confidenceScore,
              old_total: oldTotal,
              new_total: newTotal,
              structured_items: structuredItems,
              changes_summary: changesSummary,
              audit_timeline: auditTimeline,
              original_version: originalVersion,
              new_version: nextVersion,
              processed_at: new Date().toISOString()
            }),
            status: 'processed'
          };
          const { error: fallbackErr } = await supabase
            .from('quote_change_requests')
            .insert(fallbackPayload);
          if (fallbackErr) throw fallbackErr;
        }

        // 9. Send Notifications
        try {
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: 'Quote Automatically Updated',
            message: `Your quote was automatically updated to Version ${nextVersion}. New total: ₹${newTotal.toFixed(2)}`,
            type: 'quote_revised',
            related_id: selectedRxForChange.id
          });
          await supabase.from('notifications').insert({
            user_id: null,
            title: 'Quote Automatically Revised',
            message: `Quote ${newQuoteNumber} has been automatically revised by customer. Old: ₹${oldTotal.toFixed(2)} · New: ₹${newTotal.toFixed(2)}`,
            type: 'quote_revised',
            related_id: selectedRxForChange.id
          });
        } catch (notiErr) {
          console.warn('[MyPrescriptions] Notifications failed:', notiErr);
        }

        showToast(`Quote automatically updated to Version ${nextVersion}!`, 'OK');
      } else {
        // --- MANUAL REVIEW FLOW ---
        // 1. Update prescription status to customer_requested_changes
        const { error: rxErr } = await supabase
          .from('prescriptions')
          .update({ status: 'customer_requested_changes' })
          .eq('id', selectedRxForChange.id);
        if (rxErr) throw rxErr;

        // 2. Update active quote status to Changes Requested
        if (selectedRxForChange.quote?.id) {
          await supabase
            .from('prescription_quotes')
            .update({ status: 'Changes Requested' })
            .eq('id', selectedRxForChange.quote.id);
        }

        // 3. Insert change request
        const reqPayload = {
          quote_id: selectedRxForChange.quote?.id || null,
          prescription_id: selectedRxForChange.id,
          request_type: 'Manual Review Request',
          customer_message: additionalInstructions.trim(),
          status: 'pending',
          processing_type: 'manual',
          confidence_score: confidenceScore,
          old_total: oldTotal,
          new_total: newTotal,
          structured_items: structuredItems,
          changes_summary: changesSummary,
          audit_timeline: auditTimeline,
          original_version: originalVersion,
          new_version: null
        };

        const { error: crErr } = await supabase
          .from('quote_change_requests')
          .insert(reqPayload);
        
        if (crErr) {
          console.warn('[MyPrescriptions] DB columns missing, falling back to JSON serialization inside customer_message:', crErr);
          const fallbackPayload = {
            quote_id: selectedRxForChange.quote?.id || null,
            prescription_id: selectedRxForChange.id,
            request_type: 'Manual Review Request',
            customer_message: JSON.stringify({
              __is_structured: true,
              customer_message: additionalInstructions.trim(),
              status: 'pending',
              processing_type: 'manual',
              confidence_score: confidenceScore,
              old_total: oldTotal,
              new_total: newTotal,
              structured_items: structuredItems,
              changes_summary: changesSummary,
              audit_timeline: auditTimeline,
              original_version: originalVersion,
              new_version: null
            }),
            status: 'pending'
          };
          const { error: fallbackErr } = await supabase
            .from('quote_change_requests')
            .insert(fallbackPayload);
          if (fallbackErr) throw fallbackErr;
        }

        // 4. Send Notifications
        try {
          await supabase.from('notifications').insert({
            user_id: null,
            title: 'Customer Requested Changes',
            message: `Pharmacist review required for prescription ${selectedRxForChange.reference_id || selectedRxForChange.id.substring(0, 8)}.`,
            type: 'change_requested',
            related_id: selectedRxForChange.id
          });
        } catch (notiErr) {
          console.warn('[MyPrescriptions] Notifications failed:', notiErr);
        }

        showToast('Your change request has been sent to the pharmacist for review.', 'OK');
      }

      setShowChangeModal(false);
      setSelectedRxForChange(null);
      await fetchPrescriptions();
    } catch (err) {
      console.error('[handleSubmitChangeRequest] Error:', err);
      alert('Failed to submit changes: ' + err.message);
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <style>{`
        .glow-highlight {
          border-color: var(--cyan, #06b6d4) !important;
          box-shadow: 0 0 25px rgba(6, 182, 212, 0.4) !important;
          transform: scale(1.015);
          transition: all 0.5s ease-in-out;
        }
      `}</style>
      <Navbar showSearch={false} />

      <main className="reservation-main" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        <div className="page-title-row" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText style={{ color: 'var(--cyan, #06b6d4)', width: '24px', height: '24px' }} />
          <h2 className="page-title" style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>My Prescriptions</h2>
        </div>

        {loading ? (
          <SkeletonList rows={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchPrescriptions} />
        ) : prescriptions.length === 0 ? (
          <EmptyState
            title="No Prescriptions Uploaded"
            message="You haven't uploaded any prescriptions yet. Upload your prescription to get quotations, track status, and reserve medicines."
            ctaLabel="Upload Prescription"
            onCta={() => navigate('/')}
          />
        ) : (

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {prescriptions.map(rx => {
              const statusIndex = STATUS_ORDER[rx.status.toLowerCase()] || 1;
              const isRejected = rx.status.toLowerCase() === 'rejected';

              const timelineSteps = [
                { label: 'Uploaded', done: statusIndex >= 1 },
                { label: 'Reviewed', done: statusIndex >= 2 },
                { label: 'Quote Sent', done: statusIndex >= 3 },
                { label: 'Accepted', done: statusIndex >= 6 },
                { label: 'Preparing', done: statusIndex >= 7 },
                { label: 'Ready', done: statusIndex >= 8 },
                { label: 'Collected', done: statusIndex >= 9 },
              ];

              const activeStepsCount = timelineSteps.filter(s => s.done).length;
              const timelinePercent = activeStepsCount > 1 ? ((activeStepsCount - 1) / (timelineSteps.length - 1)) * 100 : 0;

              return (
                <div
                  key={rx.id}
                  id={`rx-card-${rx.reference_id || rx.id}`}
                  style={{
                    background: 'var(--bg-card, rgba(30,41,59,0.45))',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                  }}
                >
                  {/* Top Row: Info & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                        Prescription Request
                      </h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
                        Reference ID: <b style={{ color: 'var(--text-primary)' }}>{rx.reference_id || rx.id.substring(0, 8)}</b>
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
                        Uploaded on: {new Date(rx.created_at).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <span className={`badge ${statusBadge(rx.status)}`} style={{ textTransform: 'uppercase', fontSize: '11px', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
                      {statusLabel(rx.status)}
                    </span>
                  </div>

                  {/* Visual Timeline (only if not rejected) */}
                  {!isRejected ? (
                    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.06))' }}>
                      <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                        Tracking Timeline
                      </p>
                      <div style={{ position: 'relative', width: '100%', margin: '16px 0 24px' }}>
                        {/* Background track */}
                        <div style={{ position: 'absolute', top: '10px', left: '20px', right: '20px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', zIndex: 1 }} />
                        {/* Progress line */}
                        <div style={{ position: 'absolute', top: '10px', left: '20px', width: `calc(${timelinePercent}% - 32px)`, height: '4px', background: 'var(--cyan, #06b6d4)', borderRadius: '2px', zIndex: 1, transition: 'width 0.3s ease' }} />
                        
                        {/* Steps */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
                          {timelineSteps.map((step, idx) => (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                              <div style={{
                                width: '22px', height: '22px', borderRadius: '50%',
                                background: step.done ? 'var(--cyan, #06b6d4)' : 'var(--bg-elevated, #1e293b)',
                                border: `2px solid ${step.done ? 'var(--cyan, #06b6d4)' : 'var(--border-color, rgba(255,255,255,0.12))'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontSize: '9px', fontWeight: 'bold',
                                boxShadow: step.done ? '0 0 10px rgba(6,182,212,0.4)' : 'none',
                                transition: 'all 0.3s ease'
                              }}>
                                {step.done ? '✓' : idx + 1}
                              </div>
                              <span style={{ fontSize: '10px', color: step.done ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: '8px', fontWeight: step.done ? 600 : 400, textAlign: 'center', whiteSpace: 'nowrap' }}>
                                {step.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '12px', borderRadius: '8px', color: '#f87171', fontSize: '13px' }}>
                      <AlertCircle size={16} />
                      <span>This prescription request was rejected by the pharmacist. {rx.pharmacist_notes ? `Reason: ${rx.pharmacist_notes}` : ''}</span>
                    </div>
                  )}

                  {/* Body Section: Image & Notes */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    {/* Prescription image */}
                    {rx.image_url ? (
                      <div style={{ position: 'relative', width: '100%', maxHeight: '200px', overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <img
                          src={rx.image_url}
                          alt="Uploaded prescription"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <a
                          href={rx.image_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            position: 'absolute', bottom: '8px', right: '8px',
                            background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '11px',
                            padding: '4px 8px', borderRadius: '4px', textDecoration: 'none',
                            display: 'flex', alignItems: 'center', gap: '4px'
                          }}
                        >
                          <ExternalLink size={10} /> Full Size
                        </a>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', height: '120px', border: '1px dashed var(--border-color)' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No prescription file attached</span>
                      </div>
                    )}

                    {/* Pharmacist Review / Notes */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          My Notes
                        </span>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'pre-wrap', margin: 0 }}>
                          {rx.notes || rx.customer_notes || 'No notes added.'}
                        </p>
                      </div>

                      {rx.pharmacist_notes && (
                        <div style={{ padding: '12px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--cyan, #06b6d4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Pharmacist Message
                          </span>
                          <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px', whiteSpace: 'pre-wrap', margin: 0 }}>
                            {rx.pharmacist_notes}
                          </p>
                        </div>
                      )}

                      {/* Display change request status if pending */}
                      {rx.status.toLowerCase() === 'customer_requested_changes' && rx.changeRequests?.length > 0 && (
                        <div style={{ padding: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                            <Clock size={14} /> Change Request Sent ({rx.changeRequests[0].request_type})
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>
                            "{rx.changeRequests[0].customer_message}"
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
                            Sent: {new Date(rx.changeRequests[0].created_at).toLocaleString('en-IN')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* QUOTE SECTION */}
                  {['quote_sent', 'quote_generated', 'revised_quote_generated', 'customer_requested_changes', 'customer_accepted', 'accepted_by_customer', 'preparing_medicines', 'ready_for_pickup', 'collected'].includes(rx.status.toLowerCase()) && rx.medicines?.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-color, rgba(255,255,255,0.06))', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--cyan, #06b6d4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {rx.status.toLowerCase() === 'revised_quote_generated' ? 'Revised Quote Ready' : 'Prescription Approved & Quote Ready'}
                          </span>
                          {rx.quote && (
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                              Quote Number: <b>{rx.quote.quote_number}</b>
                            </p>
                          )}
                        </div>
                        {rx.quote?.quote_pdf_url && (
                          <a
                            href={rx.quote.quote_pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px', textDecoration: 'none', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                          >
                            <Download size={13} /> View Quote PDF
                          </a>
                        )}
                      </div>

                      {/* Medicines List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                        {rx.medicines.map((med) => {
                          const details = getMedicineCardDetails(med);
                          return (
                            <div
                              key={med.product_id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '12px 16px',
                                background: 'var(--bg-elevated, rgba(30, 41, 59, 0.5))',
                                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                                borderRadius: '12px',
                                gap: '16px',
                              }}
                            >
                              <div style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                background: '#fff',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <img
                                  src={details.image}
                                  alt={details.name}
                                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                  onError={(e) => { e.target.src = '/images/cat_medicines.png'; }}
                                />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{details.name}</span>
                                  <span style={{ fontSize: '9px', fontWeight: '600', padding: '1px 5px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--cyan)' }}>
                                    {details.strength}
                                  </span>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Brand: {details.brand} | Generic: {details.genericName}
                                </div>
                                <div style={{ fontSize: '10px', fontWeight: '700', color: details.availability === 'In Stock' ? '#10b981' : '#ef4444', marginTop: '2px' }}>
                                  ● {details.availability}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                  ₹{details.totalPrice.toFixed(2)}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  ₹{details.unitPrice.toFixed(2)} × {details.qty}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Version Changes Summary */}
                      {rx.quote?.version_number > 1 && rx.changeRequests?.length > 0 && (() => {
                        const latestChange = rx.changeRequests.find(c => c.status === 'processed' || c.new_version === rx.quote.version_number);
                        if (!latestChange || !latestChange.changes_summary) return null;
                        const summary = latestChange.changes_summary;
                        return (
                          <div style={{
                            background: 'rgba(6,182,212,0.05)',
                            border: '1px solid rgba(6,182,212,0.15)',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            marginTop: '4px',
                            fontSize: '13px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: 'var(--cyan, #06b6d4)', marginBottom: '8px' }}>
                              <span>⚡ Quote Automatically Updated (Version {rx.quote.version_number})</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)' }}>
                              {summary.removed && summary.removed.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>🗑 Removed:</span>
                                  <span>{summary.removed.join(', ')}</span>
                                </div>
                              )}
                              {summary.added && summary.added.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>➕ Added:</span>
                                  <span>{summary.added.join(', ')}</span>
                                </div>
                              )}
                              {summary.updated && summary.updated.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', flexDirection: 'column' }}>
                                  <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>📝 Quantity Updates:</span>
                                  <ul style={{ margin: '2px 0 0 16px', padding: 0, listStyleType: 'disc' }}>
                                    {summary.updated.map((u, i) => (
                                      <li key={i}>
                                        {u.name}: {u.oldQty} → <b>{u.newQty}</b>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                <span>Total Difference:</span>
                                <span style={{ color: summary.difference < 0 ? '#10b981' : '#f87171' }}>
                                  {summary.difference < 0 ? '-' : '+'}₹{Math.abs(summary.difference).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Grand Total */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.06))' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>Total Amount:</span>
                        <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--cyan, #06b6d4)' }}>
                          ₹{rx.quote ? rx.quote.total_amount.toFixed(2) : rx.medicines.reduce((sum, m) => sum + m.total, 0).toFixed(2)}
                        </span>
                      </div>

                      {/* Quote History Version Section */}
                      {rx.quotesHistory && rx.quotesHistory.length > 0 && (
                        <div style={{ marginTop: '4px', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.06))', paddingBottom: '12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Quote Version History
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                          {rx.quotesHistory.map(hist => (
                            <div key={hist.id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '8px 12px', borderRadius: '6px', fontSize: '12px',
                              background: 'rgba(255,255,255,0.01)',
                              border: '1px solid rgba(255,255,255,0.03)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {/* Version badge */}
                                <span style={{
                                  fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px',
                                  background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                }}>V{hist.version_number || '?'}</span>
                                <b style={{ color: 'var(--text-primary)' }}>{hist.quote_number}</b>
                                <span style={{ color: 'var(--text-muted)' }}>₹{hist.total_amount.toFixed(2)}</span>
                                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Superseded</span>
                              </div>
                              {hist.quote_pdf_url && (
                                <a href={hist.quote_pdf_url} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                  <ExternalLink size={10} /> View PDF
                                </a>
                              )}
                            </div>
                          ))}
                          </div>
                        </div>
                      )}

                      {/* Rich Quote Notification Card */}
                      {['quote_sent', 'quote_generated', 'revised_quote_generated'].includes(rx.status.toLowerCase()) && (
                        <div style={{
                          marginTop: '4px',
                          background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(168,85,247,0.06) 100%)',
                          border: '1px solid rgba(6,182,212,0.25)',
                          borderRadius: '12px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                        }}>
                          {/* Header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ fontSize: '22px' }}>🔔</div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--cyan)' }}>
                                {rx.status.toLowerCase() === 'revised_quote_generated' ? 'Revised Quote Ready!' : 'New Quote Available'}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Prescription: <b style={{ color: 'var(--text-primary)' }}>{rx.reference_id || rx.id.substring(0,12)}</b>
                              </div>
                            </div>
                            {rx.quote?.sent_at && (
                              <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>
                                Sent {new Date(rx.quote.sent_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            )}
                          </div>

                          {/* Amount & Quote # */}
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 120, background: 'rgba(6,182,212,0.08)', borderRadius: 8, padding: '10px 14px', border: '1px solid rgba(6,182,212,0.15)' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quote Amount</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--cyan)', marginTop: 2 }}>
                                ₹{rx.quote ? rx.quote.total_amount.toFixed(2) : rx.medicines.reduce((sum, m) => sum + m.total, 0).toFixed(2)}
                              </div>
                            </div>
                            {rx.quote?.quote_number && (
                              <div style={{ flex: 1, minWidth: 120, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quote #</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{rx.quote.quote_number}</div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons Grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                            {/* View Quote PDF */}
                            {rx.quote?.quote_pdf_url && (
                              <a
                                href={rx.quote.quote_pdf_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                  padding: '10px 14px', background: 'rgba(6,182,212,0.1)',
                                  border: '1px solid rgba(6,182,212,0.3)', borderRadius: '8px',
                                  color: 'var(--cyan)', fontWeight: 700, fontSize: '12px', textDecoration: 'none',
                                  transition: 'background 0.2s',
                                }}
                              >
                                <ExternalLink size={13} /> View Quote
                              </a>
                            )}

                            {/* Download Quote PDF */}
                            {rx.quote?.quote_pdf_url && (
                              <a
                                href={rx.quote.quote_pdf_url}
                                download={`Quote_${rx.quote.quote_number || rx.id}.pdf`}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                  padding: '10px 14px', background: 'rgba(99,102,241,0.1)',
                                  border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px',
                                  color: '#818cf8', fontWeight: 700, fontSize: '12px', textDecoration: 'none',
                                  transition: 'background 0.2s',
                                }}
                              >
                                <Download size={13} /> Download PDF
                              </a>
                            )}

                            {/* Accept Quote → guard: if reservation already exists go directly to confirmation */}
                            {rx.reservation ? (
                              <button
                                onClick={() => navigate(`/confirmation?id=${rx.reservation.reservation_id}`)}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                  padding: '10px 14px', background: 'rgba(20,184,166,0.12)',
                                  border: '1px solid rgba(20,184,166,0.35)', borderRadius: '8px',
                                  color: '#2dd4bf', fontWeight: 700, cursor: 'pointer', fontSize: '12px',
                                }}
                              >
                                📋 View Reservation
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate(`/pickup?prescription_id=${rx.id}`)}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                  padding: '10px 14px', background: '#10b981',
                                  border: 'none', borderRadius: '8px',
                                  color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '12px',
                                }}
                              >
                                ✅ Accept Quote & Schedule Pickup
                              </button>
                            )}

                             {/* Request Changes */}
                             <button
                               onClick={() => {
                                 setSelectedRxForChange(rx);
                                 setModalMedicines(rx.medicines.map(m => ({ ...m, qty: m.qty || m.quantity || 1 })));
                                 setAdditionalInstructions('');
                                 setShowChangeModal(true);
                               }}
                               style={{
                                 display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                 padding: '10px 14px', background: 'rgba(245,158,11,0.1)',
                                 border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px',
                                 color: '#f59e0b', fontWeight: 700, cursor: 'pointer', fontSize: '12px',
                               }}
                             >
                               📝 {rx.quote?.version_number > 1 ? 'Request More Changes' : 'Request Changes'}
                             </button>

                            {/* Reject Quote */}
                            <button
                              onClick={() => {
                                setSelectedRxForReject(rx);
                                setRejectReason('');
                                setShowRejectModal(true);
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                padding: '10px 14px', background: 'rgba(239,68,68,0.06)',
                                border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px',
                                color: '#ef4444', fontWeight: 600, cursor: 'pointer', fontSize: '12px',
                              }}
                            >
                              ❌ Reject Quote
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* RESERVATION DETAIL SECTION */}
                  {['accepted_by_customer', 'customer_accepted', 'preparing_medicines', 'ready_for_pickup', 'collected'].includes(rx.status.toLowerCase()) && rx.reservation && (
                    <div style={{ borderTop: '1px solid var(--border-color, rgba(255,255,255,0.06))', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--cyan, #06b6d4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Reservation Details
                      </span>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Reservation ID: <b style={{ color: 'var(--text-primary)' }}>{rx.reservation.reservation_id}</b>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                            <span>Pickup Date: <b style={{ color: 'var(--text-primary)' }}>{rx.reservation.pickup_date}</b></span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                            <span>Scheduled Time: <b style={{ color: 'var(--text-primary)' }}>{rx.reservation.pickup_time}</b></span>
                          </div>

                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Status: <span className={`badge ${statusBadge(rx.reservation.status)}`} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>{rx.reservation.status}</span>
                          </div>

                          {rx.reservation.status === 'Ready For Pickup' && (
                            <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px', fontSize: '12px', color: '#6ee7b7' }}>
                              🎉 <b>Your medicines are ready for pickup!</b> Please show the QR code on the right at the counter.
                            </div>
                          )}

                          {rx.reservation.receipt_url && (
                            <a
                              href={rx.reservation.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 14px', textDecoration: 'none', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', marginTop: '8px', width: 'fit-content' }}
                            >
                              <Download size={14} /> Download Reservation Slip
                            </a>
                          )}
                        </div>

                        {/* QR Code display */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color, rgba(255,255,255,0.05))', width: 'fit-content', margin: '0 auto' }}>
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(rx.reservation.reservation_id)}`}
                            alt="Reservation QR Code"
                            style={{ width: '130px', height: '130px', borderRadius: '6px', border: '4px solid #fff', background: '#fff' }}
                          />
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Counter Scan QR Code
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* General Cancel button for pending requests */}
                  {rx.status.toLowerCase() === 'pending' && (
                    <div style={{ borderTop: '1px solid var(--border-color, rgba(255,255,255,0.06))', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleCancelRequest(rx.id)}
                        disabled={actionBusy}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '8px 14px', background: 'rgba(239,68,68,0.1)',
                          color: 'var(--red, #ef4444)', border: 'none', borderRadius: '6px',
                          fontWeight: 600, cursor: 'pointer', fontSize: '12px'
                        }}
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Reject Quote Modal ── */}
      {showRejectModal && selectedRxForReject && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(11,15,25,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1001, padding: '16px'
        }} onClick={() => setShowRejectModal(false)}>
          <div style={{
            background: '#1e293b', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '16px', maxWidth: '480px', width: '100%',
            padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)', color: '#fff',
            fontFamily: 'Inter, sans-serif'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#f87171' }}>❌ Reject Quote</h3>
              <button onClick={() => setShowRejectModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
            </div>

            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              Are you sure you want to reject this quote? The pharmacist will be notified and may contact you.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Reason (Optional)</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Price too high, want to try elsewhere..."
                style={{
                  padding: '10px', borderRadius: '8px', background: '#0f172a',
                  border: '1px solid rgba(239,68,68,0.2)', color: '#fff', fontSize: '14px',
                  outline: 'none', minHeight: '80px', resize: 'vertical', width: '100%',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectQuote}
                disabled={actionBusy}
                style={{
                  padding: '8px 20px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                  background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700,
                  opacity: actionBusy ? 0.6 : 1
                }}
              >
                {actionBusy ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Request Changes Modal ── */}
      {showChangeModal && selectedRxForChange && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(11,15,25,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '16px'
        }} onClick={() => setShowChangeModal(false)}>
          <div style={{
            background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', maxWidth: '560px', width: '100%',
            padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)', color: '#fff',
            fontFamily: 'Inter, sans-serif', maxHeight: '90vh', overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Request Quote Modifications</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Quick actions are processed instantly. Custom text requires pharmacist review.</span>
              </div>
              <button onClick={() => setShowChangeModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
            </div>

            {/* Medicines with Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Medicines in Quote</label>
              {modalMedicines.map((med) => {
                const details = getMedicineCardDetails(med);
                const isRemoved = !!med.removed;
                
                return (
                  <div
                    key={med.product_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: isRemoved ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isRemoved ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: '8px',
                      gap: '12px',
                      opacity: isRemoved ? 0.6 : 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    {/* Tiny visual thumbnail */}
                    <div style={{ width: '36px', height: '36px', borderRadius: '4px', background: '#fff', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <img src={details.image} alt={details.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={(e) => { e.target.src = '/images/cat_medicines.png'; }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', textDecoration: isRemoved ? 'line-through' : 'none' }}>{details.name}</span>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>₹{details.unitPrice.toFixed(2)} / unit</div>
                    </div>

                    {isRemoved ? (
                      <button
                        onClick={() => setModalMedicines(prev => prev.map(m => m.product_id === med.product_id ? { ...m, removed: false } : m))}
                        style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Undo Remove
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Qty Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                          <button
                            onClick={() => {
                              if (med.qty > 1) {
                                setModalMedicines(prev => prev.map(m => m.product_id === med.product_id ? { ...m, qty: m.qty - 1, total: m.price * (m.qty - 1) } : m));
                              }
                            }}
                            disabled={med.qty <= 1}
                            style={{ padding: '6px', background: 'none', border: 'none', color: med.qty <= 1 ? '#475569' : '#fff', cursor: med.qty <= 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            value={med.qty}
                            min="1"
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setModalMedicines(prev => prev.map(m => m.product_id === med.product_id ? { ...m, qty: val, total: m.price * val } : m));
                            }}
                            style={{ width: '32px', background: 'none', border: 'none', color: '#fff', fontSize: '11px', textAlign: 'center', outline: 'none', fontFamily: 'inherit' }}
                          />
                          <button
                            onClick={() => {
                              setModalMedicines(prev => prev.map(m => m.product_id === med.product_id ? { ...m, qty: m.qty + 1, total: m.price * (m.qty + 1) } : m));
                            }}
                            style={{ padding: '6px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Remove item */}
                        <button
                          onClick={() => setModalMedicines(prev => prev.map(m => m.product_id === med.product_id ? { ...m, removed: true } : m))}
                          style={{ padding: '6px', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          title="Remove item"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Additional Text Instructions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Additional Instructions (Optional)</label>
              <textarea
                value={additionalInstructions}
                onChange={e => setAdditionalInstructions(e.target.value)}
                placeholder="e.g. Need cheaper alternative brand, explaining medicine, syrup instead, side effects or other professional requests..."
                style={{
                  padding: '10px', borderRadius: '8px', background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px',
                  outline: 'none', minHeight: '80px', resize: 'vertical', width: '100%',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Dynamic Changes Summary Block */}
            {(() => {
              const activeMeds = modalMedicines.filter(m => !m.removed);
              const diff = calculateDiff(selectedRxForChange.medicines, activeMeds);
              const hasDiff = diff.removed.length > 0 || diff.added.length > 0 || diff.updated.length > 0;
              const isAuto = !additionalInstructions.trim() && hasDiff;
              
              return (
                <div style={{
                  background: 'rgba(15,23,42,0.6)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '10px',
                  padding: '12px 14px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Changes Preview</div>
                  
                  {hasDiff ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                      {diff.removed.map(m => (
                        <div key={m.product_id} style={{ color: '#f87171' }}>🗑 Remove: {m.name}</div>
                      ))}
                      {diff.updated.map(m => (
                        <div key={m.product_id} style={{ color: '#fbbf24' }}>📝 Quantity change: {m.name} ({m.oldQty} → {m.newQty})</div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px', fontWeight: 'bold' }}>
                        <span>New Estimated Total:</span>
                        <span style={{ color: 'var(--cyan)' }}>₹{diff.newTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No item modifications made. Only comments will be sent.</div>
                  )}

                  {/* Automation indicator */}
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: isAuto ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.08)',
                    border: `1px solid ${isAuto ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}`,
                    fontSize: '11px',
                    color: isAuto ? '#6ee7b7' : '#a5b4fc',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>
                      {isAuto ? (
                        <>✅ <strong>Your updated quote will be available immediately.</strong></>
                      ) : (
                        <>🩺 <strong>Your request has been sent to our pharmacist for review.</strong></>
                      )}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                onClick={() => setShowChangeModal(false)}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitChangeRequest}
                className="btn btn-primary"
                disabled={actionBusy}
                style={{
                  padding: '8px 20px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                  background: 'var(--cyan, #06b6d4)', color: '#fff', border: 'none', fontWeight: 700,
                  opacity: actionBusy ? 0.6 : 1
                }}
              >
                {actionBusy ? 'Processing...' : (!additionalInstructions.trim() && (modalMedicines.some(m => m.removed) || modalMedicines.some(m => m.qty !== selectedRxForChange.medicines.find(o => o.product_id === m.product_id)?.qty))) ? 'Apply Changes Instantly' : 'Submit for Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .badge-pending   { background: rgba(245,158,11,0.12) !important; color: #f59e0b !important; border: 1px solid rgba(245,158,11,0.25) !important; }
        .badge-processing { background: rgba(59,130,246,0.12) !important; color: #3b82f6 !important; border: 1px solid rgba(59,130,246,0.25) !important; }
        .badge-quote-generated { background: rgba(14,165,233,0.12) !important; color: #38bdf8 !important; border: 1px solid rgba(14,165,233,0.25) !important; }
        .badge-quote-sent { background: rgba(168,85,247,0.12) !important; color: #c084fc !important; border: 1px solid rgba(168,85,247,0.25) !important; }
        .badge-warning   { background: rgba(245,158,11,0.12) !important; color: #f59e0b !important; border: 1px solid rgba(245,158,11,0.25) !important; }
        .badge-approved  { background: rgba(34,197,94,0.12) !important; color: #22c55e !important; border: 1px solid rgba(34,197,94,0.25) !important; }
        .badge-ready     { background: rgba(6,182,212,0.12) !important; color: #06b6d4 !important; border: 1px solid rgba(6,182,212,0.25) !important; }
        .badge-completed { background: rgba(34,197,94,0.12) !important; color: #22c55e !important; border: 1px solid rgba(34,197,94,0.25) !important; }
        .badge-rejected  { background: rgba(239,68,68,0.12) !important; color: #ef4444 !important; border: 1px solid rgba(239,68,68,0.25) !important; }
      `}</style>
    </div>
  );
};

export default MyPrescriptions;
