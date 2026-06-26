import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { mapProduct } from '../../services/medicineService';
import {
  mockCustomers,
  mockInventory, mockInventoryLogs, mockCoupons, mockNotifications,
  mockActivityLogs, mockCMSData, defaultSettings, CATEGORIES
} from '../data/mockData';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('svms_admin_theme') || 'dark');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [customers, setCustomers] = useState(mockCustomers);
  const [prescriptions, setPrescriptions] = useState([]);
  const [inventory, setInventory] = useState(mockInventory);
  const [inventoryLogs, setInventoryLogs] = useState(mockInventoryLogs);
  const [coupons, setCoupons] = useState(mockCoupons);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [activityLogs, setActivityLogs] = useState(mockActivityLogs);
  const [cmsData, setCmsData] = useState(mockCMSData);
  const [settings, setSettings] = useState(defaultSettings);
  const [adminToasts, setAdminToasts] = useState([]);
  // ── Global data loading state exposed to all pages ──
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError,   setDataError]   = useState('');

  const addAdminToast = useCallback((message, type = 'info', onClickValue = null) => {
    const id = Date.now() + Math.random();
    setAdminToasts(prev => [...prev, { id, message, type, onClickValue }]);
    setTimeout(() => {
      setAdminToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  }, []);

  const removeAdminToast = useCallback((id) => {
    setAdminToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toggleTheme = () => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem('svms_admin_theme', next);
      return next;
    });
  };

  /* ── Fetch prescriptions (join profiles for full_name fallback) ─ */
  const fetchPrescriptions = useCallback(async () => {
    console.log('[AdminContext] fetchPrescriptions: calling Supabase…');

    let rxData, rxError;

    // Try joined query first; fall back to plain select if RLS blocks the join
    ({ data: rxData, error: rxError } = await supabase
      .from('prescriptions')
      .select(`
        *,
        profiles (
          full_name,
          phone,
          phone_number
        )
      `)
      .order('created_at', { ascending: false }));

    if (rxError) {
      console.warn('[AdminContext] Joined fetch failed, falling back to plain select:', rxError.message);
      ({ data: rxData, error: rxError } = await supabase
        .from('prescriptions')
        .select('*')
        .order('created_at', { ascending: false }));
    }

    console.log('[AdminContext] fetchPrescriptions result — error:', rxError, '| rows:', rxData?.length);

    if (rxError) {
      console.error('[AdminContext] fetchPrescriptions FAILED:', rxError.code, rxError.message);
      return;
    }

    if (!rxData || rxData.length === 0) {
      console.warn('[AdminContext] fetchPrescriptions: 0 rows returned. Check Supabase RLS policies.');
      setPrescriptions([]);
      return;
    }

    console.log('[AdminContext] fetchPrescriptions: mapping', rxData.length, 'rows…');

    setPrescriptions(
      rxData.map(rx => {
        // Priority: prescription.customer_name → profiles.full_name → 'Walk-in Customer'
        const customerName =
          (rx.customer_name && rx.customer_name.trim()) ||
          (rx.profiles?.full_name && rx.profiles.full_name.trim()) ||
          'Walk-in Customer';
        return {
          id:            rx.id,
          reference_id:  rx.reference_id  || '',
          userId:        rx.user_id       || null,
          customerName,
          customerPhone: rx.phone         || '',
          notes:         rx.notes         || rx.customer_notes || '',
          file:          rx.image_url     || rx.file_url || '',
          image_url:     rx.image_url     || rx.file_url || '',
          status:        (rx.status || 'pending').toLowerCase().replace(/ /g, '_'),
          admin_notes:   rx.pharmacist_notes || '',
          uploadTime:    rx.created_at    || new Date().toISOString(),
          date:          rx.created_at
            ? rx.created_at.split('T')[0]
            : new Date().toISOString().split('T')[0],
        };
      })
    );
  }, []);


  const fetchNotificationsAdmin = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNotifications(
          data.map(n => {
            const isRead = n.is_read !== undefined ? n.is_read : n.read;
            return {
              id: n.id,
              user_id: n.user_id,
              title: n.title,
              message: n.message,
              type: n.type || 'general',
              read: isRead,
              is_read: isRead,
              created_at: n.created_at,
              icon: n.title.toLowerCase().includes('quote') ? '📄' : n.title.toLowerCase().includes('prescription') ? '💊' : '🔔',
              time: n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
              date: n.created_at ? new Date(n.created_at).toLocaleDateString() : ''
            };
          })
        );
      }
    } catch (err) {
      console.error('[AdminContext] Error fetching notifications:', err);
    }
  }, []);


  /* ── Fetch all other live data from Supabase ── */
  const fetchAllData = useCallback(async () => {
    setDataLoading(true);
    setDataError('');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      // 1. Fetch products
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .abortSignal(controller.signal);
      if (prodData) setProducts(prodData.map(mapProduct));

      // 2. Fetch pickup reservations (active ones)
      const { data: resData } = await supabase
        .from('pickup_reservations')
        .select('*')
        .order('created_at', { ascending: false })
        .abortSignal(controller.signal);
      if (resData) {
        const activeRes = resData.filter(r =>
          !['collected', 'completed', 'cancelled'].includes((r.status || '').toLowerCase())
        );
        setReservations(activeRes.map(r => ({
          id: r.id,
          reservation_id: r.reservation_id,
          user_id: r.user_id,
          customerName: r.customer_name || 'Walk-in Customer',
          customerPhone: r.phone_number || '',
          status: r.status,
          date: r.pickup_date,
          time: r.pickup_time,
          total: r.total_amount || 0,
          paymentStatus: 'Pending',
          items: Array.isArray(r.medicines) ? r.medicines : [],
          timeline: [
            { event: 'Reservation Created', done: true, time: r.created_at },
            { event: 'Preparing Medicines', done: r.status !== 'Pending', time: r.status !== 'Pending' ? r.created_at : null },
            { event: 'Ready for Pickup', done: ['Ready For Pickup', 'Completed', 'Collected'].includes(r.status), time: null },
            { event: 'Collected', done: ['Completed', 'Collected'].includes(r.status), time: null }
          ]
        })));
      }

      // 3. Fetch completed orders from the database orders table
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          *,
          profiles (
            full_name,
            phone
          ),
          order_items (
            *,
            products (
              name,
              selling_price
            )
          )
        `)
        .order('created_at', { ascending: false })
        .abortSignal(controller.signal);

      if (orderData) {
        setOrders(orderData.map(o => ({
          id: o.id,
          reservation_id: o.notes || o.order_number,
          order_number: o.order_number,
          user_id: o.user_id,
          customerName: o.profiles?.full_name || 'Walk-in Customer',
          customerPhone: o.profiles?.phone || '',
          status: o.status,
          date: o.pickup_date,
          time: o.pickup_time,
          total: o.total_amount || 0,
          paymentStatus: 'Paid',
          items: (o.order_items || []).map(item => ({
            id: item.product_id,
            name: item.products?.name || 'Unknown Medicine',
            qty: item.quantity,
            price: item.unit_price || item.products?.selling_price || 0
          }))
        })));
      }

      // 4. Prescriptions — delegated to fetchPrescriptions
      await fetchPrescriptions();

      // 5. Fetch profiles for customer count
      const { data: custData } = await supabase
        .from('profiles')
        .select('*')
        .abortSignal(controller.signal);
      if (custData) {
        setCustomers(custData.map(c => ({
          id: c.id,
          name: c.full_name || 'Customer',
          phone: c.phone || '',
          role: c.role
        })));
      }
    } catch (e) {
      const isTimeout = e?.name === 'AbortError' || controller.signal.aborted;
      const msg = isTimeout
        ? 'Data load timed out. Please refresh the page.'
        : (e?.message || 'Failed to load admin data.');
      console.error('[AdminContext] fetchAllData error:', e);
      setDataError(msg);
    } finally {
      clearTimeout(timer);
      setDataLoading(false);
    }
  }, [fetchPrescriptions]);

  useEffect(() => {
    fetchAllData();
    fetchNotificationsAdmin();

    // Realtime subscription — refetch prescriptions on any change
    const rxChannel = supabase
      .channel('prescriptions-admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prescriptions' },
        (payload) => {
          console.log('[AdminContext] Realtime prescription change:', payload);
          fetchPrescriptions();
        }
      )
      .subscribe();

    // Realtime subscription — refetch reservations/orders on any change
    const resChannel = supabase
      .channel('reservations-admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pickup_reservations' },
        (payload) => {
          console.log('[AdminContext] Realtime reservation change:', payload);
          fetchAllData();
        }
      )
      .subscribe();

    // Realtime subscription — refetch notifications on any change
    const notifChannel = supabase
      .channel('notifications-admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('[AdminContext] Realtime notification change:', payload);
          fetchNotificationsAdmin();
          
          if (payload.eventType === 'INSERT') {
            const noti = payload.new;
            // Check if user_id is null (means sent to admin)
            if (noti.user_id === null) {
              addAdminToast(`🔔 ${noti.title}: ${noti.message}`, 'info', noti.related_id || noti.prescription_id || 'general');
              
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`🔔 ${noti.title}`, {
                  body: noti.message,
                  icon: '/favicon.ico'
                });
              }
            }
          }
        }
      )
      .subscribe();

    // Realtime subscription — handle incoming chat messages
    const chatChannel = supabase
      .channel('chat-messages-admin')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          console.log('[AdminContext] Realtime chat message insert:', payload);
          if (payload.new.sender_role === 'customer') {
            const customerName = payload.new.customer_name || 'Guest Customer';
            const rxId = payload.new.prescription_id;
            
            // Format name cleanly if guest
            let displayName = customerName;
            if (customerName.startsWith('Guest:')) {
              const match = customerName.match(/Guest:\s*\S+\s*\(([^)]+)\)/);
              if (match) displayName = `${match[1]} (Guest)`;
            }

            // HTML5 browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`💬 New message from ${displayName}`, {
                body: payload.new.message || 'Sent an attachment',
                icon: '/favicon.ico'
              });
            }

            // Global dashboard toast
            addAdminToast(
              `💬 New message from ${displayName}`,
              'info',
              rxId ? rxId : 'general'
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rxChannel);
      supabase.removeChannel(resChannel);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(chatChannel);
    };
  }, [fetchAllData, fetchPrescriptions, fetchNotificationsAdmin, addAdminToast]);

  // ── Notification helpers ──────────────────────────────────
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read: true })
        .eq('is_read', false);
      if (error) {
        // fallback
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('read', false);
      }
      setNotifications(ns => ns.map(n => ({ ...n, read: true, is_read: true })));
    } catch (err) {
      console.error('[AdminContext] markAllRead failed:', err);
    }
  };

  const markRead = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read: true })
        .eq('id', id);
      if (error) {
        // fallback
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', id);
      }
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true, is_read: true } : n));
    } catch (err) {
      console.error('[AdminContext] markRead failed:', err);
    }
  };

  // ── Activity log helper ───────────────────────────────────
  const addLog = useCallback((action, category) => {
    const now = new Date();
    setActivityLogs(prev => [{
      id: `AL${Date.now()}`,
      user: 'Admin',
      action,
      category,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().slice(0, 5),
    }, ...prev]);
  }, []);

  // ── Product CRUD ──────────────────────────────────────────
  const addProduct = async (product) => {
    const prodId = product.id || `prod-${Date.now()}`;
    try {
      const { error } = await supabase
        .from('products')
        .insert({
          id: prodId,
          name: product.name,
          category: product.category,
          description: product.description || '',
          selling_price: product.price || 0,
          mrp: product.mrp || 0,
          stock_quantity: product.stock || 0,
          prescription_required: !!product.prescriptionRequired,
          image_url: product.image || '/images/cat_medicines.png'
        });

      if (!error) {
        fetchAllData();
        addLog(`Added new product: ${product.name}`, 'Product');
      } else {
        console.error('Error inserting product in Supabase:', error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateProduct = async (id, data) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: data.name,
          category: data.category,
          description: data.description || '',
          selling_price: data.price || 0,
          mrp: data.mrp || 0,
          stock_quantity: data.stock || 0,
          prescription_required: !!data.prescriptionRequired,
          image_url: data.image || '/images/cat_medicines.png'
        })
        .eq('id', id);

      if (!error) {
        fetchAllData();
        addLog(`Updated product: ${data.name || id}`, 'Product');
      } else {
        console.error('Error updating product in Supabase:', error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteProduct = async (id) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (!error) {
        fetchAllData();
        addLog(`Deleted product: ${id}`, 'Product');
      } else {
        console.error('Error deleting product in Supabase:', error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ── Reservation CRUD ──────────────────────────────────────
  const updateOrderStatus = async (id, status) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id);

      if (!error) {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
        addLog(`Changed order ${id} status to ${status}`, 'Order');
      } else {
        console.error('Error updating order status in Supabase:', error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateReservationStatus = async (id, status) => {
    try {
      const { error } = await supabase
        .from('pickup_reservations')
        .update({ status })
        .eq('id', id);

      if (!error) {
        setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        addLog(`Changed reservation ${id} status to ${status}`, 'Reservation');
      } else {
        console.error('Error updating reservation status in Supabase:', error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ── Prescription CRUD ─────────────────────────────────────
  const updatePrescription = async (id, data) => {
    try {
      console.log(`[AdminContext] updatePrescription id=${id}`, data);

      // Every update query should save notes into pharmacist_notes instead of admin_notes
      const updateObj = { status: data.status };
      const notes = data.pharmacist_notes !== undefined ? data.pharmacist_notes : data.admin_notes;
      if (notes !== undefined) {
        updateObj.pharmacist_notes = notes || null;
      }

      const { error } = await supabase
        .from('prescriptions')
        .update(updateObj)
        .eq('id', id);

      if (!error) {
        // Optimistic local update; Realtime will also refetch
        setPrescriptions(prev =>
          prev.map(p => p.id === id
            ? { ...p, status: data.status, admin_notes: notes || '' }
            : p
          )
        );
        addLog(`Prescription ${id} → ${data.status}`, 'Prescription');
        console.log(`[AdminContext] Prescription ${id} updated to status: ${data.status}`);
      } else {
        console.error('[AdminContext] updatePrescription DB error:', error);
      }
    } catch (e) {
      console.error('[AdminContext] updatePrescription exception:', e);
    }
  };

  // ── Inventory CRUD ────────────────────────────────────────
  const adjustStock = (id, delta, note) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(0, item.stock + delta);
    setInventory(prev => prev.map(i => i.id === id ? { ...i, stock: newQty, lastUpdated: new Date().toISOString().split('T')[0] } : i));
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newQty } : p));
    const logEntry = {
      id: `LOG${Date.now()}`,
      product: item.name,
      action: delta > 0 ? 'Stock Added' : 'Stock Removed',
      quantity: Math.abs(delta),
      user: 'Admin',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
    };
    setInventoryLogs(prev => [logEntry, ...prev]);
    addLog(`Updated stock for ${item.name} (${delta > 0 ? '+' : ''}${delta} units)`, 'Inventory');
  };

  // ── Coupon CRUD ───────────────────────────────────────────
  const addCoupon = (coupon) => {
    setCoupons(prev => [{ ...coupon, id: `CPN-${Date.now()}`, used: 0 }, ...prev]);
    addLog(`Created coupon: ${coupon.code}`, 'Promotion');
  };
  const updateCoupon = (id, data) => setCoupons(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  const deleteCoupon = (id) => {
    const c = coupons.find(x => x.id === id);
    setCoupons(prev => prev.filter(c => c.id !== id));
    if (c) addLog(`Deleted coupon: ${c.code}`, 'Promotion');
  };

  // ── CMS CRUD ──────────────────────────────────────────────
  const updateCMS = (key, data) => {
    setCmsData(prev => ({ ...prev, [key]: data }));
    addLog(`Updated CMS: ${key}`, 'CMS');
  };

  // ── Settings ──────────────────────────────────────────────
  const updateSettings = (data) => {
    setSettings(prev => ({ ...prev, ...data }));
    addLog('Updated store settings', 'Settings');
  };

  // ── Computed metrics ──────────────────────────────────────
  const metrics = {
    todaySales: orders.filter(o => o.date === new Date().toISOString().split('T')[0]).reduce((s, o) => s + o.total, 0),
    weeklySales: orders.reduce((s, o) => s + o.total, 0),
    monthlySales: orders.reduce((s, o) => s + o.total, 0),
    totalRevenue: orders.reduce((s, o) => s + o.total, 0),
    totalOrders: orders.length,
    pendingOrders: reservations.filter(r => r.status === 'Pending').length,
    processingOrders: reservations.filter(r => ['Preparing', 'Preparing Medicines'].includes(r.status)).length,
    completedOrders: orders.length,
    cancelledOrders: 0, // Completed orders table only stores completed transactions
    totalProducts: products.length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= 10).length,
    outOfStock: products.filter(p => p.stock === 0).length,
    totalCustomers: customers.length,
    newCustomers: 0,
    // Rx counts use lowercase status values from the database
    totalRx:          prescriptions.length,
    pendingRx:        prescriptions.filter(p => p.status === 'pending').length,
    underReviewRx:    prescriptions.filter(p => p.status === 'under_review').length,
    quoteGeneratedRx: prescriptions.filter(p => p.status === 'quote_generated').length,
    quoteSentRx:      prescriptions.filter(p => p.status === 'quote_sent').length,
    acceptedByCustomerRx: prescriptions.filter(p => p.status === 'accepted_by_customer').length,
    approvedRx:       prescriptions.filter(p => p.status === 'approved').length,
    rejectedRx:       prescriptions.filter(p => p.status === 'rejected').length,
    readyForPickupRx: prescriptions.filter(p => p.status === 'ready_for_pickup').length,
    completedRx:      prescriptions.filter(p => p.status === 'completed').length,
    collectedRx:      prescriptions.filter(p => p.status === 'collected').length,
  };

  return (
    <AdminContext.Provider value={{
      theme, toggleTheme,
      products, addProduct, updateProduct, deleteProduct, CATEGORIES,
      orders, updateOrderStatus,
      reservations, updateReservationStatus,
      customers,
      prescriptions, updatePrescription, fetchPrescriptions,
      inventory, inventoryLogs, adjustStock,
      coupons, addCoupon, updateCoupon, deleteCoupon,
      notifications, unreadCount, markAllRead, markRead,
      activityLogs,
      cmsData, updateCMS,
      settings, updateSettings,
      metrics,
      adminToasts, addAdminToast, removeAdminToast,
      // Global async loading state
      dataLoading, dataError, refetchAllData: fetchAllData,
    }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
};
