import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MapPin, Clock, BookmarkCheck, ShoppingBag, FileText, UploadCloud, Calendar, ArrowLeft, CheckCircle2, Package, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useCart } from '../context/CartContext';
import { useReservation } from '../context/ReservationContext';
import { medicineService } from '../services/medicineService';
import { useOfflineContext } from '../context/OfflineContext';
import { ONLINE_REQUIRED_FEATURES } from '../hooks/useOffline';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { fetchWithTimeout } from '../hooks/useFetchWithTimeout';
import { SkeletonCard, ErrorState } from '../components/LoadingStates';


const PickupSchedule = () => {
  const { cart, clearCart, getCartCount, getCartTotal, showToast } = useCart();
  const { 
    pickupDate, 
    pickupTime, 
    prescriptionFile, 
    prescriptionStatus, 
    uploadPrescription, 
    approvePrescription, 
    confirmReservation,
    latestPrescription
  } = useReservation();
  const { requireOnline } = useOfflineContext();
  const { isAuthenticated, user, openLogin } = useAuth();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(window.location.search);
  const prescriptionId = queryParams.get('prescription_id');

  // ── Guard: redirect if a reservation already exists for this prescription ──
  // Prevents users from reopening the scheduling page after confirming.
  useEffect(() => {
    if (!prescriptionId) return;
    let cancelled = false;

    const checkExistingReservation = async () => {
      try {
        const { data, error } = await supabase
          .from('pickup_reservations')
          .select('reservation_id')
          .eq('prescription_id', prescriptionId)
          .maybeSingle();

        if (cancelled) return;
        if (error) return; // non-fatal: let the page load normally

        if (data?.reservation_id) {
          console.log('[PickupSchedule] Reservation already exists, redirecting to confirmation:', data.reservation_id);
          // Replace so back button on Confirmation goes Home, not back here
          navigate(`/confirmation?id=${data.reservation_id}`, { replace: true });
        }
      } catch {
        // non-fatal
      }
    };

    checkExistingReservation();
    return () => { cancelled = true; };
  }, [prescriptionId, navigate]);


  const [prescriptionData, setPrescriptionData] = useState(null);
  const [prescriptionMeds, setPrescriptionMeds] = useState([]);
  const [quoteData, setQuoteData] = useState(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);
  const [loadError, setLoadError] = useState('');

  // ── Form states ──
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // ── Action state ──
  const [confirming, setConfirming] = useState(false);

  // ─────────────────────────────────────────────────────────────────────
  // Load prescription + quote + medicines when prescription_id is present
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!prescriptionId) return;

    const load = async () => {
      setLoadingPrescription(true);
      setLoadError('');
      try {
        const result = await fetchWithTimeout(async (signal) => {
          // 1. Prescription row
          const { data: rx, error: rxErr } = await supabase
            .from('prescriptions')
            .select('*')
            .eq('id', prescriptionId)
            .abortSignal(signal)
            .maybeSingle();
          if (rxErr) throw new Error(`Prescription fetch failed: ${rxErr.message}`);

          // 2. Latest approved quote for this prescription
          const { data: quotes, error: qErr } = await supabase
            .from('prescription_quotes')
            .select('*')
            .eq('prescription_id', prescriptionId)
            .order('created_at', { ascending: false })
            .abortSignal(signal)
            .limit(1);
          if (qErr) throw new Error(`Quote fetch failed: ${qErr.message}`);
          const quote = quotes && quotes.length > 0 ? quotes[0] : null;

          // 3. Medicines with product details (for images, manufacturer)
          const { data: meds, error: mErr } = await supabase
            .from('prescription_medicines')
            .select(`
              *,
              products (
                id,
                name,
                image_url,
                manufacturer,
                category
              )
            `)
            .eq('prescription_id', prescriptionId)
            .abortSignal(signal);
          if (mErr) throw new Error(`Medicines fetch failed: ${mErr.message}`);

          return { rx, quote, meds: meds || [] };
        });

        console.log('[PickupSchedule] Loaded data:', result);

        if (result.rx) setPrescriptionData(result.rx);
        if (result.quote) setQuoteData(result.quote);
        // Normalise medicine rows — handle both old rows (medicine_name stored) and new (product_id FK)
        setPrescriptionMeds((result.meds || []).map(m => {
          const name = m.medicine_name || m.products?.name || 'Unknown Medicine';
          const strengthMatch = name.match(/\b\d+\s*(?:mg|ml|gm|g|mcg)\b/i);
          return {
            ...m,
            medicine_name: name,
            manufacturer:  m.products?.manufacturer || '',
            strength:      strengthMatch ? strengthMatch[0] : '',
            image_url:     m.products?.image_url || '',
          };
        }));
      } catch (err) {
        console.error('[PickupSchedule] Load error:', err);
        setLoadError(err.message || 'Failed to load prescription details.');
      } finally {
        setLoadingPrescription(false);
      }
    };

    load();
  }, [prescriptionId]);


  // ── Prefill customer details ──────────────────────────────────────────
  useEffect(() => {
    if (prescriptionData) {
      if (prescriptionData.customer_name) setCustomerName(prescriptionData.customer_name);
      if (prescriptionData.phone) setPhoneNumber(prescriptionData.phone);
    } else if (latestPrescription) {
      setCustomerName(latestPrescription.customerName || '');
      setPhoneNumber(latestPrescription.phoneNumber || '');
    } else if (user) {
      setCustomerName(user.name || '');
      setPhoneNumber(user.phone || '');
    }
  }, [prescriptionData, latestPrescription, user]);

  const fileInputRef = useRef(null);
  const [dateList, setDateList] = useState([]);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [reviewProgress, setReviewProgress] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [medicinesDb, setMedicinesDb] = useState({});

  // Fetch medicines catalog
  useEffect(() => {
    let active = true;
    medicineService.getMedicines().then(list => {
      if (!active) return;
      const db = list.reduce((acc, med) => {
        acc[med.id] = med;
        return acc;
      }, {});
      setMedicinesDb(db);
    });
    return () => { active = false; };
  }, []);

  // Generate date cards (next 5 days)
  useEffect(() => {
    const dates = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      
      let label = daysOfWeek[d.getDay()];
      if (i === 0) label = 'Today';
      else if (i === 1) label = 'Tomorrow';

      dates.push({
        index: i,
        dayName: label,
        dayDate: d.getDate(),
        monthName: months[d.getMonth()],
        year: d.getFullYear(),
        rawDate: d
      });
    }
    setDateList(dates);
  }, []);

  // Prescription review simulator
  useEffect(() => {
    if (prescriptionStatus === 'uploaded') {
      setIsVerifying(true);
      setReviewProgress(0);
      const interval = setInterval(() => {
        setReviewProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              approvePrescription();
              setIsVerifying(false);
              showToast('Prescription approved! You can now select a pickup slot.', 'OK');
            }, 600);
            return 100;
          }
          return prev + 5;
        });
      }, 150);
      return () => clearInterval(interval);
    } else {
      setIsVerifying(false);
    }
  }, [prescriptionStatus]);

  const rawSlots = [
    { time: '9:00 AM', hour: 9 },
    { time: '10:00 AM', hour: 10 },
    { time: '11:00 AM', hour: 11 },
    { time: '12:00 PM', hour: 12 },
    { time: '1:00 PM', hour: 13 },
    { time: '2:00 PM', hour: 14 },
    { time: '3:00 PM', hour: 15 },
    { time: '4:00 PM', hour: 16 },
    { time: '5:00 PM', hour: 17 },
    { time: '6:00 PM', hour: 18 },
    { time: '7:00 PM', hour: 19 },
    { time: '8:00 PM', hour: 20 },
    { time: '9:00 PM', hour: 21 },
  ];

  const handleUploadClick = () => {
    if (!requireOnline(ONLINE_REQUIRED_FEATURES.UPLOAD_PRESCRIPTION)) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        uploadPrescription(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // handleConfirm — main booking handler
  // ─────────────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!requireOnline(ONLINE_REQUIRED_FEATURES.SCHEDULE_PICKUP)) return;
    if (confirming) return; // prevent double submit

    if (!isAuthenticated) {
      showToast('Please sign in/register to confirm your medicine reservation.', 'Login', () => 
        openLogin(window.location.pathname + window.location.search)
      );
      return;
    }

    const selectedDateObj = dateList[selectedDateIndex];
    if (!selectedDateObj) {
      showToast('Please select a pickup date slot first.', 'OK');
      return;
    }

    if (!selectedTimeSlot) {
      showToast('Please select a pickup time slot first.', 'OK');
      return;
    }

    if (!prescriptionId && cart.length === 0 && !prescriptionFile) {
      showToast('Your reservation cart is empty. Please add medicines or upload a prescription first.', 'OK');
      return;
    }

    if (!customerName.trim()) {
      showToast('Please enter customer name.', 'OK');
      return;
    }
    if (phoneNumber.replace(/\D/g, '').length < 10) {
      showToast('Please enter a valid 10-digit phone number.', 'OK');
      return;
    }

    const formattedDate = selectedDateObj.dayName === 'Today' || selectedDateObj.dayName === 'Tomorrow'
      ? selectedDateObj.dayName
      : `${selectedDateObj.dayName}, ${selectedDateObj.dayDate} ${selectedDateObj.monthName}`;

    const dateStr = selectedDateObj.rawDate.toISOString().split('T')[0];

    setConfirming(true);

    if (prescriptionId) {
      // ── PRESCRIPTION FLOW ────────────────────────────────────────────
      try {
        // 1. Generate reservation ID
        const todayStr = new Date().toISOString().split('T')[0];
        const datePart = todayStr.replace(/-/g, '');
        
        const { count } = await supabase
          .from('pickup_reservations')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', `${todayStr}T00:00:00.000Z`);

        const nextNum = (count || 0) + 1;
        const finalOrderId = `SVMS-${datePart}-${String(nextNum).padStart(3, '0')}`;

        console.log('[PickupSchedule] Generating reservation:', finalOrderId);

        // 2. QR Code
        const qrUrl = await QRCode.toDataURL(finalOrderId, {
          width: 250,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' }
        });

        // 3. Resolve medicines + total
        const resolvedMeds = prescriptionMeds.length > 0
          ? prescriptionMeds
          : [];
        const totalAmount = quoteData?.total_amount
          ?? resolvedMeds.reduce((sum, m) => sum + (m.total_price || 0), 0);

        // 4. Generate PDF
        console.log('[PickupSchedule] Generating PDF…');
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const blue = [37, 99, 235];
        const dark = [31, 41, 55];
        const muted = [107, 114, 128];
        const green = [22, 163, 74];

        // Header logo cross
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
        doc.text('Phone: +91 99891 78696 | GSTIN: 36AAAAA1111A1Z1', 38, 28);
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.5);
        doc.line(15, 34, 195, 34);

        // Title bar
        doc.setTextColor(...dark);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('PHARMACY RESERVATION RECEIPT', 15, 43);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...muted);
        doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 148, 43);

        // Info card
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(15, 48, 180, 30, 2, 2, 'F');
        doc.setDrawColor(229, 231, 235);
        doc.roundedRect(15, 48, 180, 30, 2, 2, 'S');

        // Left column
        doc.setFontSize(9);
        doc.setTextColor(...muted);
        doc.text('Reservation ID:', 20, 54);
        doc.setTextColor(...blue); doc.setFont('Helvetica', 'bold');
        doc.text(finalOrderId, 52, 54);

        doc.setTextColor(...muted); doc.setFont('Helvetica', 'normal');
        doc.text('Customer:', 20, 60);
        doc.setTextColor(...dark); doc.setFont('Helvetica', 'bold');
        doc.text(customerName.trim(), 52, 60);

        doc.setTextColor(...muted); doc.setFont('Helvetica', 'normal');
        doc.text('Phone:', 20, 66);
        doc.setTextColor(...dark);
        doc.text(phoneNumber || 'N/A', 52, 66);

        doc.setTextColor(...muted);
        doc.text('Prescription Ref:', 20, 72);
        doc.setTextColor(...dark);
        doc.text(prescriptionId.substring(0, 8), 52, 72);

        // Right column
        doc.setTextColor(...muted);
        doc.text('Pickup Date:', 115, 54);
        doc.setTextColor(...dark); doc.setFont('Helvetica', 'bold');
        doc.text(formattedDate, 142, 54);

        doc.setTextColor(...muted); doc.setFont('Helvetica', 'normal');
        doc.text('Pickup Time:', 115, 60);
        doc.setTextColor(...blue); doc.setFont('Helvetica', 'bold');
        doc.text(selectedTimeSlot, 142, 60);

        doc.setTextColor(...muted); doc.setFont('Helvetica', 'normal');
        doc.text('Status:', 115, 66);
        doc.setTextColor(...green); doc.setFont('Helvetica', 'bold');
        doc.text('Accepted By Customer', 142, 66);

        doc.setTextColor(...muted); doc.setFont('Helvetica', 'normal');
        doc.text('Quote Ref:', 115, 72);
        doc.setTextColor(...dark);
        doc.text(quoteData?.quote_number || 'N/A', 142, 72);

        // Medicine table header
        let y = 88;
        doc.setFillColor(243, 244, 246);
        doc.rect(15, y, 180, 8, 'F');
        doc.setTextColor(...dark); doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('✓', 18, y + 5.5);
        doc.text('Medicine Name', 35, y + 5.5);
        doc.text('Qty', 120, y + 5.5);
        doc.text('Unit Price', 138, y + 5.5);
        doc.text('Total', 170, y + 5.5);
        y += 8;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);

        if (resolvedMeds.length > 0) {
          resolvedMeds.forEach((med) => {
            doc.setDrawColor(229, 231, 235);
            doc.setLineWidth(0.3);
            doc.rect(21, y + 2, 3, 3);
            doc.setTextColor(...dark);
            const nameStr = (med.medicine_name || '').substring(0, 44);
            doc.text(nameStr, 35, y + 5.5);
            doc.text(String(med.quantity || 0), 122, y + 5.5);
            doc.setTextColor(...muted);
            doc.text(`Rs.${(med.unit_price || 0).toFixed(2)}`, 137, y + 5.5);
            doc.setTextColor(...dark); doc.setFont('Helvetica', 'bold');
            doc.text(`Rs.${(med.total_price || 0).toFixed(2)}`, 168, y + 5.5);
            doc.setFont('Helvetica', 'normal');
            y += 8;
          });
        } else {
          doc.setTextColor(...muted);
          doc.text('Medicines listed in attached prescription', 35, y + 5.5);
          y += 8;
        }

        // Grand total
        y += 4;
        doc.setDrawColor(229, 231, 235);
        doc.line(15, y, 195, y);
        y += 6;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...dark);
        doc.text('Grand Total:', 128, y + 5);
        doc.setTextColor(...blue);
        doc.text(`Rs.${totalAmount.toFixed(2)}`, 165, y + 5);
        y += 12;

        // QR Code section
        doc.setDrawColor(229, 231, 235);
        doc.line(15, y, 195, y);
        y += 5;
        if (qrUrl) {
          doc.setTextColor(...dark);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(10);
          doc.text('Scan QR Code at Store Counter:', 15, y + 5);
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(...muted);
          doc.text('• Show this QR code to the pharmacist upon arrival.', 15, y + 12);
          doc.text('• Your medicines are pre-packaged and verified.', 15, y + 17);
          doc.text('• Pay via Cash, UPI, or Card at the store counter.', 15, y + 22);
          doc.addImage(qrUrl, 'PNG', 150, y, 30, 30);
        }

        y += 36;
        doc.setDrawColor(229, 231, 235);
        doc.line(15, y, 195, y);
        y += 8;

        // Pharmacist signature + store contact
        doc.setTextColor(...dark);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Pharmacist Signature:', 15, y);
        doc.line(15, y + 10, 65, y + 10);

        doc.text('Store Contact Details:', 115, y);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...muted);
        doc.text('WhatsApp: +91 99891 78696', 115, y + 4.5);
        doc.text('Email: svms@example.com', 115, y + 8.5);
        doc.text('Gachibowli, Hyderabad, TS 500032', 115, y + 12.5);

        // Terms
        y += 20;
        doc.setFontSize(7.5);
        doc.setTextColor(...muted);
        doc.text('Terms: Reservation is valid for the selected date only. Uncollected orders are cancelled after 24 hours.', 15, y + 8);

        // Footer
        doc.setFontSize(8);
        doc.text('Thank you for choosing Sri Venkateshwara Medical Store!', 60, 285);

        // ── 5. Upload PDF to Supabase Storage ──────────────────────────
        // Path: reservations/{user_id}/Reservation_{orderId}.pdf
        // This path matches the policy: name LIKE 'reservations/' || auth.uid() || '/%'
        const pdfBlob = doc.output('blob');
        const pdfPath = `reservations/${user.id}/Reservation_${finalOrderId}.pdf`;

        console.log('[PickupSchedule] Uploading PDF to storage…', {
          bucket: 'prescriptions',
          path: pdfPath,
          userId: user.id
        });

        const { error: uploadErr } = await supabase.storage
          .from('prescriptions')
          .upload(pdfPath, pdfBlob, {
            contentType: 'application/pdf',
            cacheControl: '3600',
            upsert: false,   // never upsert — avoids UPDATE policy requirement
          });

        if (uploadErr) {
          console.error('[PickupSchedule] Storage upload FAILED:', {
            path: pdfPath,
            error: uploadErr,
            isRLS: uploadErr.message?.toLowerCase().includes('row-level security') || uploadErr.statusCode === '403'
          });
          throw new Error(`PDF upload failed: ${uploadErr.message}`);
        }
        console.log('[PickupSchedule] PDF uploaded successfully:', pdfPath);

        const { data: { publicUrl } } = supabase.storage
          .from('prescriptions')
          .getPublicUrl(pdfPath);

        // ── 6. Build medicines list for reservation record ──────────────
        const medicinesList = resolvedMeds.map(m => ({
          id:    m.product_id   || m.products?.id || null,
          qty:   m.quantity     || 0,
          name:  m.medicine_name,
          price: m.unit_price   || 0,
          total: m.total_price  || 0,
          image: m.image_url    || m.products?.image_url || '',
        }));

        // ── 7. Insert reservation ───────────────────────────────────────
        const reservationPayload = {
          reservation_id:  finalOrderId,
          user_id:         user.id,
          customer_name:   customerName.trim(),
          phone_number:    phoneNumber,
          medicines:       medicinesList,
          total_amount:    totalAmount,
          pickup_date:     dateStr,
          pickup_time:     selectedTimeSlot,
          status:          'Accepted By Customer',
          qr_payload:      finalOrderId,
          receipt_url:     publicUrl,
          prescription_id: prescriptionId,
          created_at:      new Date().toISOString()
        };

        console.log('[PickupSchedule] Inserting reservation…', reservationPayload);
        const { error: insertErr } = await supabase
          .from('pickup_reservations')
          .insert(reservationPayload);
        if (insertErr) {
          console.error('[PickupSchedule] Reservation INSERT FAILED:', insertErr);
          throw new Error(`Reservation insert failed: ${insertErr.message}`);
        }
        console.log('[PickupSchedule] Reservation inserted successfully.');

        // Reduce stock and log transaction
        for (const item of medicinesList) {
          const prodId = item.id;
          const itemQty = item.qty || 0;
          if (prodId && itemQty > 0) {
            try {
              const { data: pData } = await supabase
                .from('products')
                .select('stock_quantity, name')
                .eq('id', prodId)
                .single();

              if (pData) {
                const prevStock = pData.stock_quantity ?? 0;
                const newStock = Math.max(0, prevStock - itemQty);
                
                await supabase
                  .from('products')
                  .update({ stock_quantity: newStock })
                  .eq('id', prodId);

                // Insert into inventory_logs table
                try {
                  await supabase.from('inventory_logs').insert({
                    product_id: prodId,
                    product_name: pData.name,
                    action: 'Stock Removed',
                    quantity: itemQty,
                    username: customerName.trim() || 'Customer',
                    reason: `Prescription Accepted (Ref: ${finalOrderId})`,
                    previous_stock: prevStock,
                    new_stock: newStock,
                    created_at: new Date().toISOString()
                  });
                } catch (logErr) {
                  console.warn('[PickupSchedule] Failed to save inventory log:', logErr);
                }
              }
            } catch (err) {
              console.error('[PickupSchedule] Failed to reduce stock for:', prodId, err);
            }
          }
        }

        // ── 8. Update prescription status ──────────────────────────────
        const { error: rxUpdateErr } = await supabase
          .from('prescriptions')
          .update({ status: 'accepted_by_customer' })
          .eq('id', prescriptionId);
        if (rxUpdateErr) {
          // Non-fatal — log only
          console.warn('[PickupSchedule] Prescription status update failed:', rxUpdateErr.message);
        }

        // ── 9. Notifications (non-fatal) ────────────────────────────────
        const notifications = [
          {
            user_id:         user.id,
            title:           'Reservation Approved',
            message:         `Your pickup slot reservation ${finalOrderId} has been successfully booked.`,
            type:            'reservation_approved',
            prescription_id: prescriptionId,
            quote_id:        quoteData?.id || null,
            is_read:         false,
            read:            false
          },
          {
            user_id:         user.id,
            title:           'Quote Approved',
            message:         `You accepted quotation ${quoteData?.quote_number || ''} for ₹${totalAmount.toFixed(2)}.`,
            type:            'quote_approved',
            prescription_id: prescriptionId,
            quote_id:        quoteData?.id || null,
            is_read:         false,
            read:            false
          },
          {
            user_id:         null, // admin notification
            title:           'New Reservation',
            message:         `Customer ${customerName.trim()} booked reservation ${finalOrderId} for ${dateStr} at ${selectedTimeSlot}.`,
            type:            'medicine_reserved',
            prescription_id: prescriptionId,
            quote_id:        quoteData?.id || null,
            is_read:         false,
            read:            false
          }
        ];

        for (const n of notifications) {
          try {
            const { error } = await supabase.from('notifications').insert(n);
            if (error) console.warn('[PickupSchedule] Notification insert failed (non-fatal):', error.message);
          } catch (e) {
            console.warn('[PickupSchedule] Notification exception (non-fatal):', e.message);
          }
        }

        // ── 10. Download PDF locally ────────────────────────────────────
        doc.save(`Reservation_${finalOrderId}.pdf`);

        showToast('Reservation booked successfully!', 'OK');
        // replace:true removes /pickup from the history stack so the back
        // button on the Confirmation page always returns to Home, never back here.
        navigate(`/confirmation?id=${finalOrderId}`, { replace: true });

      } catch (err) {
        console.error('[PickupSchedule] Reservation failed:', err);
        showToast(`Booking failed: ${err.message || 'Please try again.'}`, 'OK');
      } finally {
        setConfirming(false);
      }

    } else {
      // ── CART FLOW ──────────────────────────────────────────────────────
      try {
        const hasRxInCart = cart.some(item => medicinesDb[item.id]?.requiresPrescription);
        const requiresPrescription = hasRxInCart || !!prescriptionFile;
        const totalPrice = getCartTotal(medicinesDb);
        const prepTime = requiresPrescription ? '30 mins' : '15 mins';

        const cartItemsPayload = cart.map(item => {
          const med = medicinesDb[item.id];
          return {
            id: item.id,
            qty: item.qty,
            name: med ? med.name : 'Unknown Medicine',
            price: med ? med.priceDiscounted : 0
          };
        }).filter(Boolean);

        const finalCartItems = cartItemsPayload.length > 0 
          ? cartItemsPayload 
          : [{ id: 'prescription-only', name: `Prescription (${prescriptionFile})`, qty: 1 }];

        const orderId = await confirmReservation(finalCartItems, totalPrice, prepTime, formattedDate, selectedTimeSlot, customerName.trim(), phoneNumber.replace(/\D/g, ''), dateStr);
        if (orderId) {
          clearCart();
          navigate(`/confirmation?id=${orderId}`);
        } else {
          showToast('Failed to confirm reservation. Please try again.', 'OK');
        }
      } catch (err) {
        console.error('[PickupSchedule] Cart reservation failed:', err);
        showToast(`Error: ${err.message || 'Database insert failed.'}`, 'OK');
      } finally {
        setConfirming(false);
      }
    }
  };

  const hasCartItems = getCartCount() > 0;
  const hasPrescription = !!prescriptionFile;

  const selectedDateObj = dateList[selectedDateIndex];
  const now = new Date();
  const isToday = selectedDateObj?.index === 0;

  const renderedSlots = rawSlots.map(slot => {
    let isDisabled = false;
    if (isToday && now.getHours() >= slot.hour) isDisabled = true;
    return { ...slot, isDisabled };
  });

  const allTodaySlotsDisabled = isToday && renderedSlots.every(s => s.isDisabled);
  const hasRxInCart = cart.some(item => medicinesDb[item.id]?.requiresPrescription);
  const requiresPrescription = hasRxInCart || !!prescriptionFile;

  // Computed totals for summary box
  const summaryTotal = prescriptionId
    ? (quoteData?.total_amount ?? prescriptionMeds.reduce((s, m) => s + (m.total_price || 0), 0))
    : getCartTotal(medicinesDb);

  return (
    <div className="app-shell">
      <Navbar showSearch={false} />
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept="image/*,application/pdf"
        onChange={handleFileChange}
      />

      <main className="reservation-main">
        {/* Step Tracker */}
        <div className="steps-progress-bar">
          <div className="steps-progress-line" style={{ width: '60%' }}></div>
          <div className="step-indicator completed">1</div>
          <div className="step-indicator active">2</div>
          <div className="step-indicator">3</div>
        </div>

        {/* ── Loading prescription data ─────────────────────────────── */}
        {loadingPrescription ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px', margin: '40px auto' }}>
            <SkeletonCard lines={4} />
            <SkeletonCard lines={3} />
          </div>
        ) : loadError ? (
          <div style={{ maxWidth: '800px', margin: '40px auto' }}>
            <ErrorState
              message={loadError}
              onRetry={() => window.location.reload()}
            />
          </div>
        ) : (
          <>
            {/* CASE 1: Empty */}
            {!hasCartItems && !hasPrescription && !prescriptionId && (
              <div className="pickup-empty-card">
                <div className="pickup-empty-icon"><ShoppingBag size={36} /></div>
                <h2>Your pickup cart is empty.</h2>
                <p>
                  Please add medicines to your cart or upload a prescription before scheduling a pickup. 
                  Reserving a slot requires knowing what items our pharmacists need to prepare for you.
                </p>
                <div className="pickup-empty-actions" style={{ justifyContent: 'center' }}>
                  <button className="pickup-cta-secondary" onClick={() => navigate('/')} style={{ margin: '0 auto' }}>
                    <Store size={16} />
                    Browse Medicines
                  </button>
                </div>
              </div>
            )}

            {/* CASE 3: Prescription uploaded (review simulator) */}
            {hasPrescription && prescriptionStatus === 'uploaded' && (
              <div className="pickup-simulator-card">
                <div className="pickup-simulator-header">
                  <div className="simulator-icon-spin">
                    <span className="sim-loading-ring" />
                    <FileText size={24} style={{ color: 'var(--accent-color)', position: 'relative', zIndex: 2 }} />
                  </div>
                  <h2>Prescription Received</h2>
                  <div className="status-badge-review">
                    <span className="pulse-dot" />
                    Status: Waiting for Pharmacist Review
                  </div>
                </div>
                
                <div className="simulator-progress-bar-wrap">
                  <div className="progress-bar-label">
                    <span>Verifying and extracting prescription items...</span>
                    <span>{reviewProgress}%</span>
                  </div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${reviewProgress}%` }}></div>
                  </div>
                </div>

                <div className="simulator-file-info">
                  <span className="file-icon">📄</span>
                  <div className="file-details">
                    <strong>{prescriptionFile}</strong>
                    <span>Prescription Uploaded Successfully</span>
                  </div>
                </div>

                <p className="simulator-note">
                  SVMS Pharmacy pharmacists are reviewing your uploaded prescription to prepare the accurate medicine dosages. This simulation takes just a few seconds.
                </p>
              </div>
            )}

            {/* CASE 2 & APPROVED CASE 3: Slot Selection + Order Summary */}
            {((hasCartItems && prescriptionStatus !== 'uploaded') || (hasPrescription && prescriptionStatus === 'reviewed') || prescriptionId) && (
              <>
                {/* Store Details Card */}
                <div className="store-details-card">
                  <div className="store-icon-wrapper"><Store size={22} /></div>
                  <div className="store-info-text">
                    <h4>Sri Venkateshwara Medical Store</h4>
                    <p>
                      <MapPin size={11} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '2px' }} /> 
                      Gachibowli, Hyderabad
                    </p>
                    <p style={{ marginTop: '4px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <Clock size={11} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '2px' }} /> 
                      Open Daily: 9:00 AM – 10:00 PM
                    </p>
                  </div>
                </div>

                {/* Prescription verified alert */}
                {hasPrescription && prescriptionStatus === 'reviewed' && !prescriptionId && (
                  <div className="simulation-success-alert reveal-fade">
                    <CheckCircle2 size={20} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
                    <div>
                      <strong>Prescription Verified!</strong> Licensed pharmacist approved <strong>{prescriptionFile}</strong>. Choose your pickup slot below.
                    </div>
                  </div>
                )}

                {/* Two-column layout */}
                <div className="scheduler-column-layout">
                  
                  {/* LEFT — Date & Summary */}
                  <div className="scheduler-section">
                    <h3 className="section-subtitle">Select Pickup Date</h3>
                    <div className="date-scroller">
                      {dateList.map((item) => (
                        <div 
                          key={item.index} 
                          className={`date-card ${item.index === selectedDateIndex ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedDateIndex(item.index);
                            setSelectedTimeSlot('');
                          }}
                        >
                          <div className="date-card-day">{item.dayName}</div>
                          <div className="date-card-date">{item.dayDate}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>{item.monthName}</div>
                        </div>
                      ))}
                    </div>

                    {/* ── Order & Pickup Summary ─────────────────────── */}
                    <div className="pickup-summary-box">
                      <h4 className="summary-box-title">Order &amp; Pickup Summary</h4>

                      {prescriptionId ? (
                        <div className="summary-box-cart">
                          {/* Prescription reference */}
                          {prescriptionData && (
                            <div className="summary-box-row" style={{ marginBottom: 8 }}>
                              <span className="summary-label">Prescription Ref:</span>
                              <strong style={{ fontSize: 12, color: 'var(--primary-color)' }}>
                                {prescriptionData.reference_id || prescriptionId.substring(0, 8)}
                              </strong>
                            </div>
                          )}

                          {/* Quote number */}
                          {quoteData && (
                            <div className="summary-box-row" style={{ marginBottom: 8 }}>
                              <span className="summary-label">Quote:</span>
                              <strong style={{ fontSize: 12 }}>{quoteData.quote_number}</strong>
                            </div>
                          )}

                          {/* Medicine list */}
                          <div className="summary-box-row">
                            <span className="summary-label">Prescribed Medicines:</span>
                          </div>

                          {prescriptionMeds.length === 0 ? (
                            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
                              No medicines found for this prescription.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                              {prescriptionMeds.map((med, idx) => (
                                <div key={idx} style={{
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  background: 'var(--bg-elevated, rgba(255,255,255,0.04))',
                                  borderRadius: 8, padding: '8px 10px',
                                  border: '1px solid var(--border-color, rgba(255,255,255,0.08))'
                                }}>
                                  {/* Product image */}
                                  {med.image_url ? (
                                    <img
                                      src={med.image_url}
                                      alt={med.medicine_name}
                                      style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'contain', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
                                      onError={e => { e.target.style.display = 'none'; }}
                                    />
                                  ) : (
                                    <div style={{ width: 36, height: 36, borderRadius: 6, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <Package size={16} style={{ color: '#818cf8' }} />
                                    </div>
                                  )}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {med.medicine_name}
                                    </div>
                                    {med.manufacturer && (
                                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{med.manufacturer}</div>
                                    )}
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                      Qty: {med.quantity} {med.strength ? `· ${med.strength}` : ''}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                      ₹{(med.unit_price || 0).toFixed(2)} × {med.quantity}
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-color)' }}>
                                      ₹{(med.total_price || 0).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Total */}
                          <div className="summary-box-row highlight-row" style={{ marginTop: 12 }}>
                            <span className="summary-label">Total Price:</span>
                            <strong className="summary-val-price">₹{summaryTotal.toFixed(2)}</strong>
                          </div>
                        </div>

                      ) : hasCartItems ? (
                        <div className="summary-box-cart">
                          <div className="summary-box-row">
                            <span className="summary-label">Medicines List:</span>
                            <span className="summary-box-items-list">
                              {cart.map((item, idx) => {
                                const med = medicinesDb[item.id];
                                return (
                                  <div key={idx} className="summary-item-line">
                                    • {med ? med.name : 'Unknown Medicine'} <span className="summary-item-qty">({item.qty} {item.qty === 1 ? 'unit' : 'units'})</span>
                                  </div>
                                );
                              })}
                            </span>
                          </div>
                          <div className="summary-box-row highlight-row">
                            <span className="summary-label">Total Price:</span>
                            <strong className="summary-val-price">₹{getCartTotal(medicinesDb).toFixed(2)}</strong>
                          </div>
                        </div>

                      ) : (
                        <div className="summary-box-rx">
                          <div className="summary-box-row">
                            <span className="summary-label">Uploaded Prescription:</span>
                            <strong className="summary-val-file">{prescriptionFile}</strong>
                          </div>
                          <div className="summary-box-row rx-price-info">
                            <span className="summary-label">Total Price:</span>
                            <span className="rx-price-text">To be calculated at store counter.</span>
                          </div>
                        </div>
                      )}

                      <div className="summary-box-row border-top-row">
                        <span className="summary-label">Estimated Prep Time:</span>
                        <strong style={{ color: (requiresPrescription || prescriptionId) ? 'var(--primary-color)' : 'var(--accent-green)' }}>
                          {(requiresPrescription || prescriptionId) ? '30 mins' : '15 mins'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT — Time Slots & Customer Info */}
                  <div className="scheduler-section">
                    <h3 className="section-subtitle">Select Time Slot</h3>
                    
                    {allTodaySlotsDisabled ? (
                      <div style={{ padding: '12px', fontSize: '13px', color: 'var(--accent-red)', fontWeight: 600, textAlign: 'center' }}>
                        Today's slots are closed. Please select Tomorrow or another date above.
                      </div>
                    ) : (
                      <div className="time-grid">
                        {renderedSlots.map((slot, idx) => {
                          if (slot.isDisabled) {
                            return <div key={idx} className="time-slot disabled">{slot.time}</div>;
                          }
                          const isSelected = slot.time === selectedTimeSlot;
                          return (
                            <div 
                              key={idx} 
                              className={`time-slot ${isSelected ? 'active' : ''}`}
                              onClick={() => setSelectedTimeSlot(slot.time)}
                              style={{ cursor: 'pointer' }}
                            >
                              {slot.time}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Customer Details Form */}
                    <div className="pickup-summary-box" style={{ marginTop: '24px', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                      <h4 className="summary-box-title" style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 800 }}>Customer contact Info</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Customer Name *</label>
                          <input
                            type="text"
                            className="search-input"
                            placeholder="Enter full name"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px', fontSize: '13px', outline: 'none' }}
                            required
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Phone Number *</label>
                          <input
                            type="tel"
                            className="search-input"
                            placeholder="Enter 10-digit number"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').substring(0, 10))}
                            style={{ width: '100%', padding: '10px 14px', fontSize: '13px', outline: 'none' }}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="info-strip teal" style={{ marginTop: '24px', border: '1px solid rgba(0, 168, 150, 0.15)' }}>
                      <Clock className="info-strip-icon" style={{ color: 'var(--teal-accent)' }} size={18} />
                      <div>
                        <div className="info-strip-text info-strip-title" style={{ color: 'var(--teal-accent)' }}>Ready Before Arrival</div>
                        <div className="info-strip-text">Your medicines will be prepared, verified, and packaged at the counter before you arrive. Skip queue at counter!</div>
                      </div>
                    </div>

                    <button
                      className="reservation-cta-btn"
                      onClick={handleConfirm}
                      disabled={confirming}
                      style={{ marginTop: '24px', opacity: confirming ? 0.7 : 1, cursor: confirming ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                      {confirming ? (
                        <>
                          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                          Booking Slot…
                        </>
                      ) : (
                        <>
                          <BookmarkCheck size={20} />
                          Confirm Pickup Slot
                        </>
                      )}
                    </button>
                  </div>

                </div>
              </>
            )}
          </>
        )}
      </main>

    </div>
  );
};

export default PickupSchedule;
