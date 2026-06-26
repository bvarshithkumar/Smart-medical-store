import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { supabaseUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState(null);

  const fetchNotifications = useCallback(async () => {
    if (!supabaseUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const normalized = data.map(n => {
          const isRead = n.is_read !== undefined ? n.is_read : n.read;
          return {
            ...n,
            read: isRead,
            is_read: isRead
          };
        });
        setNotifications(normalized);
        setUnreadCount(normalized.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [supabaseUser]);

  useEffect(() => {
    fetchNotifications();

    if (!supabaseUser) return;

    // Listen to real-time insertions/updates to the notifications table for this user
    const channel = supabase
      .channel(`user-notifications-${supabaseUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${supabaseUser.id}`
        },
        (payload) => {
          console.log('[NotificationContext] Realtime notification update:', payload);
          fetchNotifications();

          if (payload.eventType === 'INSERT') {
            const n = payload.new;
            setActiveToast({
              id: n.id,
              title: n.title,
              message: n.message,
              type: n.type || 'general'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabaseUser, fetchNotifications]);

  // Toast Auto-dismiss
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read: true })
        .eq('id', notificationId);

      if (error) {
        // Fallback to read only if is_read column doesn't exist yet
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notificationId);
      }

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!supabaseUser) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read: true })
        .eq('user_id', supabaseUser.id);

      if (error) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', supabaseUser.id);
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const addNotification = async (
    title,
    message,
    targetUserId = supabaseUser?.id,
    type = 'general',
    prescriptionId = null,
    quoteId = null,
    createdBy = null
  ) => {
    try {
      const payload = {
        user_id: targetUserId,
        title,
        message,
        type,
        prescription_id: prescriptionId,
        quote_id: quoteId,
        created_by: createdBy,
        is_read: false,
        read: false
      };

      const { error } = await supabase
        .from('notifications')
        .insert(payload);

      if (error) {
        console.warn('[NotificationContext] Primary notification insert failed, trying fallback:', error);
        // Fallback for backward compatibility
        const { error: fallbackError } = await supabase
          .from('notifications')
          .insert({
            user_id: targetUserId,
            title,
            message,
            read: false
          });
        if (fallbackError) throw fallbackError;
      }
    } catch (err) {
      console.error('Error adding notification:', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
        refreshNotifications: fetchNotifications
      }}
    >
      {children}
      
      {/* Floating Premium Notification Toast */}
      {activeToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(6, 182, 212, 0.15)',
          maxWidth: '380px',
          width: 'calc(100% - 48px)',
          animation: 'slideInToast 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          color: '#fff',
          fontFamily: 'Inter, sans-serif'
        }}>
          <style>{`
            @keyframes slideInToast {
              from { opacity: 0; transform: translateY(30px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          <div style={{
            background: 'rgba(6, 182, 212, 0.15)',
            color: '#06b6d4',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            flexShrink: 0,
            boxShadow: '0 0 10px rgba(6, 182, 212, 0.2)'
          }}>
            🔔
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 800, letterSpacing: '0.01em', color: '#fff' }}>
              {activeToast.title}
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
              {activeToast.message}
            </p>
          </div>
          <button 
            onClick={() => setActiveToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
              transition: 'color 0.2s',
              alignSelf: 'flex-start',
              marginTop: '-2px'
            }}
          >
            ×
          </button>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
