import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { supabaseUser } = useAuth();
  const [cart, setCart] = useState([]);

  // ── Load and merge cart from Supabase when user logs in ──────────────────
  useEffect(() => {
    if (supabaseUser) {
      const loadCart = async () => {
        try {
          const stored = localStorage.getItem('reservation_cart');
          const localCart = stored ? JSON.parse(stored) : [];

          if (localCart.length > 0) {
            for (const item of localCart) {
              const { data: existing } = await supabase
                .from('cart_items')
                .select('*')
                .eq('user_id', supabaseUser.id)
                .eq('product_id', item.id)
                .maybeSingle();

              if (existing) {
                await supabase
                  .from('cart_items')
                  .update({ quantity: existing.quantity + item.qty })
                  .eq('id', existing.id);
              } else {
                await supabase
                  .from('cart_items')
                  .insert({
                    user_id: supabaseUser.id,
                    product_id: item.id,
                    quantity: item.qty
                  });
              }
            }
            localStorage.removeItem('reservation_cart');
          }

          const { data, error } = await supabase
            .from('cart_items')
            .select('*')
            .eq('user_id', supabaseUser.id);

          if (!error && data) {
            setCart(data.map(item => ({ id: item.product_id, qty: item.quantity })));
          }
        } catch (e) {
          console.error('Error loading cart from Supabase:', e);
        }
      };
      loadCart();
    } else {
      // Local storage fallback when logged out
      try {
        const stored = localStorage.getItem('reservation_cart');
        setCart(stored ? JSON.parse(stored) : []);
      } catch (e) {
        setCart([]);
      }
    }
  }, [supabaseUser]);

  // ── Sync state to localStorage when logged out ───────────────────────────
  useEffect(() => {
    if (!supabaseUser) {
      localStorage.setItem('reservation_cart', JSON.stringify(cart));
    }
  }, [cart, supabaseUser]);

  // ── Legacy bottom-bar toast (kept for backward compatibility) ────────────
  const [toast, setToast] = useState({
    show: false,
    message: '',
    actionText: 'View Cart',
    callback: null,
    timeoutId: null
  });

  const showToast = (message, actionText = 'View Cart', callback = null) => {
    setToast(prev => {
      if (prev.timeoutId) clearTimeout(prev.timeoutId);
      const newTimeoutId = setTimeout(hideToast, 3500);
      return { show: true, message, actionText, callback, timeoutId: newTimeoutId };
    });
  };

  const hideToast = () => {
    setToast(prev => {
      if (prev.timeoutId) clearTimeout(prev.timeoutId);
      return { ...prev, show: false, timeoutId: null };
    });
  };

  // ── Premium top-right cart notifications ─────────────────────────────────
  const [cartNotifications, setCartNotifications] = useState([]);

  const showCartNotification = useCallback((message, type = 'added') => {
    const id = Date.now() + Math.random();
    setCartNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setCartNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);

  const dismissCartNotification = useCallback((id) => {
    setCartNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // ── Cart count bump animation state ─────────────────────────────────────
  const [cartBump, setCartBump] = useState(false);

  const triggerCartBump = useCallback(() => {
    setCartBump(true);
    setTimeout(() => setCartBump(false), 400);
  }, []);

  // ── addItem — returns whether item was new or qty-increased ──────────────
  const addItem = async (id, qty = 1, productName = '') => {
    const quantity = parseInt(qty) || 1;
    let wasExisting = false;
    let newQty = quantity;

    setCart(prevCart => {
      const existingIdx = prevCart.findIndex(item => item.id === id);
      if (existingIdx > -1) {
        wasExisting = true;
        newQty = prevCart[existingIdx].qty + quantity;
        const newCart = [...prevCart];
        newCart[existingIdx] = { ...newCart[existingIdx], qty: newQty };
        return newCart;
      } else {
        return [...prevCart, { id, qty: quantity }];
      }
    });

    triggerCartBump();

    // Show premium notification
    if (productName) {
      if (wasExisting) {
        showCartNotification(`✓ ${productName} quantity increased to ${newQty}`, 'quantity');
      } else {
        showCartNotification(`✓ ${productName} added to cart`, 'added');
      }
    }

    if (supabaseUser) {
      try {
        const { data: existing } = await supabase
          .from('cart_items')
          .select('*')
          .eq('user_id', supabaseUser.id)
          .eq('product_id', id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('cart_items')
            .update({ quantity: existing.quantity + quantity })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('cart_items')
            .insert({ user_id: supabaseUser.id, product_id: id, quantity });
        }
      } catch (e) {
        console.error('Error adding item to Supabase:', e);
      }
    }

    return { wasExisting, newQty };
  };

  const updateQty = async (id, qty) => {
    const quantity = parseInt(qty) || 0;

    setCart(prevCart => {
      const existingIdx = prevCart.findIndex(item => item.id === id);
      if (existingIdx > -1) {
        const newCart = [...prevCart];
        if (quantity <= 0) {
          newCart.splice(existingIdx, 1);
        } else {
          newCart[existingIdx] = { ...newCart[existingIdx], qty: quantity };
        }
        return newCart;
      }
      return prevCart;
    });

    if (supabaseUser) {
      try {
        if (quantity <= 0) {
          await supabase.from('cart_items').delete()
            .eq('user_id', supabaseUser.id).eq('product_id', id);
        } else {
          await supabase.from('cart_items').update({ quantity })
            .eq('user_id', supabaseUser.id).eq('product_id', id);
        }
      } catch (e) {
        console.error('Error updating quantity in Supabase:', e);
      }
    }
  };

  const removeItem = async (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));

    if (supabaseUser) {
      try {
        await supabase.from('cart_items').delete()
          .eq('user_id', supabaseUser.id).eq('product_id', id);
      } catch (e) {
        console.error('Error removing item from Supabase:', e);
      }
    }
  };

  const clearCart = async () => {
    setCart([]);
    if (supabaseUser) {
      try {
        await supabase.from('cart_items').delete().eq('user_id', supabaseUser.id);
      } catch (e) {
        console.error('Error clearing cart in Supabase:', e);
      }
    }
  };

  const getCartCount = () => cart.reduce((sum, item) => sum + item.qty, 0);

  const getCartTotal = (medicineDb) =>
    cart.reduce((sum, item) => {
      const med = medicineDb[item.id];
      return sum + (med ? med.priceDiscounted * item.qty : 0);
    }, 0);

  return (
    <CartContext.Provider value={{
      cart,
      addItem,
      updateQty,
      removeItem,
      clearCart,
      getCartCount,
      getCartTotal,
      toast,
      showToast,
      hideToast,
      // Premium notification system
      cartNotifications,
      showCartNotification,
      dismissCartNotification,
      cartBump,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
