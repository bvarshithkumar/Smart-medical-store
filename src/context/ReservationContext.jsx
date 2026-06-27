import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const ReservationContext = createContext();

export const ReservationProvider = ({ children }) => {
  const { supabaseUser } = useAuth();
  const [pickupDate, setPickupDate] = useState(() => localStorage.getItem('pickup_date') || '');
  const [pickupTime, setPickupTime] = useState(() => localStorage.getItem('pickup_time') || '');
  const [reservationId, setReservationId] = useState(() => localStorage.getItem('pickup_reservation_id') || '');
  const [prescriptionFile, setPrescriptionFile] = useState(() => localStorage.getItem('rx_file') || '');
  const [prescriptionStatus, setPrescriptionStatus] = useState(() => localStorage.getItem('rx_status') || 'idle');
  
  const [lastReservation, setLastReservation] = useState(() => {
    try {
      const stored = localStorage.getItem('last_reservation');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const [latestPrescription, setLatestPrescription] = useState(null);

  const fetchLatestPrescription = useCallback(async () => {
    if (!supabaseUser) return null;
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('customer_name, phone')
        .eq('user_id', supabaseUser.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!error && data && data.length > 0 && (data[0].customer_name || data[0].phone)) {
        const details = {
          customerName: data[0].customer_name || '',
          phoneNumber: data[0].phone || ''
        };
        setLatestPrescription(details);
        return details;
      }
    } catch (err) {
      console.error('Error fetching latest prescription:', err);
    }
    return null;
  }, [supabaseUser]);

  useEffect(() => {
    fetchLatestPrescription();
  }, [supabaseUser, fetchLatestPrescription]);

  useEffect(() => {
    if (pickupDate) localStorage.setItem('pickup_date', pickupDate);
    else localStorage.removeItem('pickup_date');
  }, [pickupDate]);

  useEffect(() => {
    if (pickupTime) localStorage.setItem('pickup_time', pickupTime);
    else localStorage.removeItem('pickup_time');
  }, [pickupTime]);

  useEffect(() => {
    if (reservationId) localStorage.setItem('pickup_reservation_id', reservationId);
    else localStorage.removeItem('pickup_reservation_id');
  }, [reservationId]);

  useEffect(() => {
    if (prescriptionFile) localStorage.setItem('rx_file', prescriptionFile);
    else localStorage.removeItem('rx_file');
  }, [prescriptionFile]);

  useEffect(() => {
    if (prescriptionStatus) localStorage.setItem('rx_status', prescriptionStatus);
    else localStorage.removeItem('rx_status');
  }, [prescriptionStatus]);

  useEffect(() => {
    if (lastReservation) {
      localStorage.setItem('last_reservation', JSON.stringify(lastReservation));
    } else {
      localStorage.removeItem('last_reservation');
    }
  }, [lastReservation]);

  const setPickupSlot = (date, time) => {
    setPickupDate(date);
    setPickupTime(time);
  };

  const uploadPrescription = (fileName) => {
    setPrescriptionFile(fileName);
    setPrescriptionStatus('uploaded');
  };

  const approvePrescription = () => {
    setPrescriptionStatus('reviewed');
  };

  const clearPrescriptionState = () => {
    setPrescriptionFile('');
    setPrescriptionStatus('idle');
  };

  const confirmReservation = async (cartItems, totalPrice, prepTime, date, time, customerName, phoneNumber, rawDate) => {
    // 1. Fetch authenticated user directly from Supabase Auth
    console.log('[confirmReservation] Fetching authenticated user from Supabase Auth...');
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    console.log('[confirmReservation] Auth user from Supabase:', authUser);
    if (authError || !authUser) {
      console.error('[confirmReservation] Auth check failed:', authError);
      throw new Error('Authentication failed. You must be logged in to make a reservation.');
    }

    const userId = authUser.id;
    console.log('[confirmReservation] User UUID:', userId);
    if (!userId) {
      console.error('[confirmReservation] user_id is null!');
      throw new Error('Failed to resolve authenticated user UUID.');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const datePart = todayStr.replace(/-/g, '');
    let finalOrderId = 'SVMS-' + datePart + '-' + String(Math.floor(100 + Math.random() * 900)).padStart(3, '0');

    // Sync to Supabase database - now mandatory for everyone
    let success = false;
    let attempts = 0;
    
    try {
      while (attempts < 5 && !success) {
        console.log('[confirmReservation] Database SELECT: Querying count of reservations to generate unique ID...');
        const { count, error: countErr } = await supabase
          .from('pickup_reservations')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', `${todayStr}T00:00:00.000Z`);

        if (countErr) {
          console.error('[confirmReservation] Database SELECT count FAILED on table public.pickup_reservations:', countErr);
          throw new Error(`Database SELECT count FAILED on table public.pickup_reservations: ${countErr.message}`);
        }

        const nextNum = (count || 0) + 1 + attempts;
        const suffix = String(nextNum).padStart(3, '0');
        const testId = `SVMS-${datePart}-${suffix}`;

        const payload = {
          reservation_id: testId,
          user_id: userId,
          customer_name: customerName || 'Walk-in Customer',
          phone_number: phoneNumber || '',
          medicines: cartItems,
          total_amount: totalPrice,
          pickup_date: rawDate || todayStr,
          pickup_time: time,
          status: 'Pending',
          qr_payload: testId,
          created_at: new Date().toISOString()
        };

        console.log('[confirmReservation] Database INSERT: Inserting row into pickup_reservations...', payload);

        // Storing QR data as reservation_id itself
        const { data, error: orderError } = await supabase
          .from('pickup_reservations')
          .insert(payload)
          .select();

        if (!orderError) {
          console.log('[confirmReservation] Database INSERT succeeded on table public.pickup_reservations:', data);
          
          // Reduce stock for cart items and log transaction
          for (const item of cartItems) {
            const prodId = item.id || item.product_id;
            const itemQty = item.qty || item.quantity || item.count || 0;
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
                      username: customerName || 'Customer',
                      reason: `Reservation Confirmed (Ref: ${testId})`,
                      previous_stock: prevStock,
                      new_stock: newStock,
                      created_at: new Date().toISOString()
                    });
                  } catch (logErr) {
                    console.warn('[ReservationContext] Failed to save inventory log:', logErr);
                  }
                }
              } catch (err) {
                console.error('[ReservationContext] Failed to reduce stock for:', prodId, err);
              }
            }
          }

          finalOrderId = testId;
          success = true;
          if (userId) {
            try {
              const notiPayload = {
                user_id: userId,
                title: 'Reservation Created',
                message: `Your pickup reservation ${testId} for ₹${totalPrice.toFixed(2)} has been successfully created.`,
                read: false
              };
              console.log('[confirmReservation] Database INSERT: Creating customer notification...', notiPayload);
              const { error: notiErr } = await supabase.from('notifications').insert(notiPayload);
              if (notiErr) {
                console.warn('[confirmReservation] Customer notification FAILED on table public.notifications:', notiErr);
              } else {
                console.log('[confirmReservation] Customer notification succeeded.');
              }
            } catch (notiErr) {
              console.warn('[confirmReservation] Notification insert exception:', notiErr);
            }
          }
        } else if (orderError.code === '23505') { // Unique violation
          console.warn('[confirmReservation] Unique violation, retrying...', testId);
          attempts++;
        } else {
          console.error('[confirmReservation] Database INSERT FAILED on table public.pickup_reservations:', orderError);
          throw new Error(`Database INSERT FAILED on table public.pickup_reservations: ${orderError.message} (Payload: ${JSON.stringify(payload)})`);
        }
      }

      if (!success) {
        throw new Error('Failed to generate a unique reservation ID after 5 attempts.');
      }

      // 2. Save prescription row to prescriptions table if uploaded
      if (prescriptionFile && supabaseUser) {
        const rxPayload = {
          user_id: supabaseUser.id,
          status: 'Pending',
          image_url: prescriptionFile,
          customer_name: customerName,
          phone: phoneNumber
        };
        console.log('[confirmReservation] Database INSERT: Saving prescription row to prescriptions table...', rxPayload);
        const { error: rxError } = await supabase
          .from('prescriptions')
          .insert(rxPayload);
        if (rxError) {
          console.error('[confirmReservation] Database INSERT FAILED on table public.prescriptions:', rxError);
        } else {
          console.log('[confirmReservation] Database INSERT succeeded on table public.prescriptions.');
        }
        fetchLatestPrescription(); // Refresh details
      }
    } catch (e) {
      console.error('[confirmReservation] Error confirming reservation:', e);
      throw e; // Bubble up error so navigation is prevented
    }

    setReservationId(finalOrderId);
    setPickupDate(date);
    setPickupTime(time);

    const reservationPayload = {
      id: finalOrderId,
      date: date,
      time: time,
      prepTime,
      totalPrice,
      items: cartItems,
      customerName: customerName || 'Walk-in Customer',
      phoneNumber: phoneNumber || '',
      rxFile: prescriptionFile || null
    };

    setLastReservation(reservationPayload);
    clearPrescriptionState();
    return finalOrderId;
  };

  const clearReservationState = () => {
    setPickupDate('');
    setPickupTime('');
    setReservationId('');
    clearPrescriptionState();
  };

  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);

  return (
    <ReservationContext.Provider value={{
      pickupDate,
      pickupTime,
      reservationId,
      lastReservation,
      prescriptionFile,
      prescriptionStatus,
      latestPrescription,
      fetchLatestPrescription,
      setPickupSlot,
      uploadPrescription,
      approvePrescription,
      clearPrescriptionState,
      confirmReservation,
      clearReservationState,
      setLastReservation,
      isSchedulerOpen,
      setIsSchedulerOpen
    }}>
      {children}
    </ReservationContext.Provider>
  );
};

export const useReservation = () => {
  const context = useContext(ReservationContext);
  if (!context) {
    throw new Error('useReservation must be used within a ReservationProvider');
  }
  return context;
};
