import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useReservation } from '../context/ReservationContext';
import { useOfflineContext } from '../context/OfflineContext';
import { ONLINE_REQUIRED_FEATURES } from '../hooks/useOffline';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

/* ── Pharmacist SVG Icon ────────────────────────────────────── */
const PharmacistIcon = ({ size = 20 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    aria-hidden="true"
  >
    <circle cx="12" cy="7" r="4" />
    <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
    <line x1="12" y1="13" x2="12" y2="17" strokeWidth="2.5" />
    <line x1="10" y1="15" x2="14" y2="15" strokeWidth="2.5" />
  </svg>
);

const FloatingPharmacist = () => {
  const { addItem, showToast } = useCart();
  const { requireOnline } = useOfflineContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [chatView, setChatView] = useState(null); // null (menu) | 'select_rx' | 'chat'
  const [myPrescriptions, setMyPrescriptions] = useState([]);
  const [activeRx, setActiveRx] = useState(null); // selected prescription, or null for general chat
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [isCurrentlyTyping, setIsCurrentlyTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPharmacistOnline, setIsPharmacistOnline] = useState(false);

  /* Track online presence of pharmacist */
  useEffect(() => {
    const presenceChannel = supabase.channel('online-presence');
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const hasPharmacist = Object.values(state).some(presences => 
          presences.some(p => p.role === 'pharmacist')
        );
        setIsPharmacistOnline(hasPharmacist);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  // Guest details states
  const [guestId, setGuestId] = useState(() => {
    let id = localStorage.getItem('svms_guest_chat_id');
    if (!id) {
      id = 'guest_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('svms_guest_chat_id', id);
    }
    return id;
  });
  const [guestName, setGuestName] = useState(() => localStorage.getItem('svms_guest_chat_name') || '');
  const [guestNameInput, setGuestNameInput] = useState('');
  const [showGuestForm, setShowGuestForm] = useState(false);

  const modalRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const subscriptionRef = useRef(null);
  const typingChanRef = useRef(null);

  /* Close modal on outside click (only if not inside chat view to avoid accidental closures) */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (chatView === 'chat') return; // Don't auto-close when chatting
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, chatView]);

  /* Close modal on Escape */
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  /* Request browser notification permissions on mount */
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  /* Load unread count & listen to new replies in background */
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        let count = 0;
        if (user) {
          // Fetch user's prescriptions
          const { data: rxList } = await supabase
            .from('prescriptions')
            .select('id')
            .eq('user_id', user.id);
          const rxIds = (rxList || []).map(p => p.id);

          let query = supabase
            .from('chat_messages')
            .select('id', { count: 'exact' })
            .eq('sender_role', 'pharmacist')
            .eq('is_read', false);

          if (rxIds.length > 0) {
            query = query.or(`user_id.eq.${user.id},prescription_id.in.(${rxIds.join(',')})`);
          } else {
            query = query.eq('user_id', user.id);
          }

          const { count: dbCount } = await query;
          count = dbCount || 0;
        } else if (guestName) {
          const { count: dbCount } = await supabase
            .from('chat_messages')
            .select('id', { count: 'exact' })
            .eq('sender_role', 'pharmacist')
            .eq('is_read', false)
            .eq('customer_name', `Guest: ${guestId} (${guestName})`)
            .is('prescription_id', null);
          count = dbCount || 0;
        }
        setUnreadCount(count);
      } catch (err) {
        console.error('[ChatBadge] Error fetching unread counts:', err);
      }
    };

    fetchUnreadCount();

    // Listen to inserting of replies from pharmacist
    const globalChatSub = supabase
      .channel('global-chat-replies')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          if (payload.new.sender_role === 'pharmacist') {
            // Verify if message is intended for this user
            let forThisUser = false;
            if (user) {
              if (payload.new.user_id === user.id) {
                forThisUser = true;
              } else if (payload.new.prescription_id) {
                // We'll verify against current cached rx list
                forThisUser = myPrescriptions.some(rx => rx.id === payload.new.prescription_id);
              }
            } else if (guestName) {
              if (payload.new.customer_name === `Guest: ${guestId} (${guestName})` && !payload.new.prescription_id) {
                forThisUser = true;
              }
            }

            if (forThisUser) {
              // Play a light notify sound
              try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav');
                audio.volume = 0.3;
                audio.play();
              } catch (_) {}

              // Increment count if modal or chat not active
              const chatRoomActive = chatView === 'chat' && isOpen && 
                ((activeRx && activeRx.id === payload.new.prescription_id) || 
                 (!activeRx && !payload.new.prescription_id));

              if (!chatRoomActive) {
                setUnreadCount(prev => prev + 1);

                // Show browser notification
                if (Notification.permission === 'granted') {
                  const notif = new Notification('💬 Message from Pharmacist', {
                    body: payload.new.message || 'Image attachment received',
                    icon: '/favicon.ico'
                  });
                  notif.onclick = () => {
                    window.focus();
                    setIsOpen(true);
                    // Determine which conversation to open
                    if (payload.new.prescription_id) {
                      const matchedRx = myPrescriptions.find(p => p.id === payload.new.prescription_id);
                      if (matchedRx) {
                        setActiveRx(matchedRx);
                        setChatView('chat');
                      }
                    } else {
                      setActiveRx(null);
                      setChatView('chat');
                    }
                  };
                }
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChatSub);
    };
  }, [user, guestId, guestName, chatView, isOpen, activeRx, myPrescriptions]);

  /* Set up realtime message sync and typing indicators for active chat room */
  useEffect(() => {
    if (chatView !== 'chat') {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      if (typingChanRef.current) supabase.removeChannel(typingChanRef.current);
      return;
    }

    // Scroll to bottom on load
    scrollToBottom();

    // 1. Fetch existing messages
    const fetchMessages = async () => {
      try {
        let query = supabase.from('chat_messages').select('*');
        if (activeRx) {
          query = query.eq('prescription_id', activeRx.id);
        } else {
          query = query.is('prescription_id', null);
          if (user) {
            query = query.eq('user_id', user.id);
          } else {
            query = query.eq('customer_name', `Guest: ${guestId} (${guestName})`);
          }
        }
        const { data, error } = await query.order('created_at', { ascending: true });
        if (error) throw error;
        setMessages(data || []);

        // Mark unread messages from pharmacist as read
        const unreadIds = (data || [])
          .filter(m => m.sender_role === 'pharmacist' && !m.is_read)
          .map(m => m.id);

        if (unreadIds.length > 0) {
          await supabase
            .from('chat_messages')
            .update({ is_read: true })
            .in('id', unreadIds);
          setUnreadCount(prev => Math.max(0, prev - unreadIds.length));
        }
      } catch (err) {
        console.error('[Chat] Fetch messages failed:', err);
      }
    };

    fetchMessages();

    // 2. Realtime listener for new messages
    const channelConfig = activeRx
      ? { event: '*', schema: 'public', table: 'chat_messages', filter: `prescription_id=eq.${activeRx.id}` }
      : { event: '*', schema: 'public', table: 'chat_messages' };

    const channelName = `chat-${activeRx ? activeRx.id : (user ? user.id : guestId)}`;
    const sub = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        channelConfig,
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Check if message belongs to this user's general support chat
            if (!activeRx) {
              if (payload.new.prescription_id) return;
              if (user && payload.new.user_id !== user.id) return;
              if (!user && payload.new.customer_name !== `Guest: ${guestId} (${guestName})`) return;
            }

            setMessages(prev => {
              if (prev.some(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });

            // Mark pharmacist message as read immediately
            if (payload.new.sender_role === 'pharmacist' && !payload.new.is_read) {
              await supabase
                .from('chat_messages')
                .update({ is_read: true, delivery_status: 'read' })
                .eq('id', payload.new.id);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Check if message belongs to this chat
            if (activeRx) {
              if (payload.new.prescription_id !== activeRx.id) return;
            } else {
              if (payload.new.prescription_id) return;
              if (user && payload.new.user_id !== user.id) return;
              if (!user && payload.new.customer_name !== `Guest: ${guestId} (${guestName})`) return;
            }
            setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
          }
        }
      )
      .subscribe();

    subscriptionRef.current = sub;

    // 3. Typing indicator channel
    const typingRoomKey = activeRx ? activeRx.id : (user ? user.id : guestId);
    const typingChan = supabase.channel(`typing-${typingRoomKey}`);
    typingChan
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.sender === 'pharmacist') {
          setTypingText(payload.isTyping ? 'Pharmacist is typing...' : '');
        }
      })
      .subscribe();

    typingChanRef.current = typingChan;

    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      if (typingChanRef.current) supabase.removeChannel(typingChanRef.current);
    };
  }, [chatView, activeRx, user, guestId, guestName]);

  // Auto scroll messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, typingText]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUserPrescriptions = async () => {
    if (!user) return [];
    try {
      let { data, error } = await supabase
        .from('prescriptions')
        .select('id, reference_id, status, created_at, image_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error && error.code === '42703') {
        const fallback = await supabase
          .from('prescriptions')
          .select('id, status, created_at, image_url')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        data = fallback.data;
        error = fallback.error;
      }
      
      if (error) throw error;
      setMyPrescriptions(data || []);
      return data || [];
    } catch (err) {
      console.error('[Chat] Fetch user prescriptions error:', err);
      return [];
    }
  };

  const handleFabClick = () => {
    setIsOpen((prev) => !prev);
    // When opening, reset back to options menu
    if (!isOpen) {
      setChatView(null);
      setActiveRx(null);
    }
  };

  const handleWhatsAppCta = () => {
    if (!requireOnline(ONLINE_REQUIRED_FEATURES.WHATSAPP_PHARMACIST)) return;
    setIsOpen(false);
    const msg = encodeURIComponent(
      'Hello Sri Venkateshwara Medical Store, I need medicine guidance from a pharmacist.'
    );
    window.open(`https://wa.me/919989148660?text=${msg}`, '_blank');
  };

  const handleCallCta = () => {
    setIsOpen(false);
    window.location.href = 'tel:+919989148660';
  };

  const handleUploadCta = () => {
    setIsOpen(false);
    const element = document.getElementById('upload-rx');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/', { state: { scrollTo: 'upload-rx' } });
    }
  };

  const handleChatCta = async () => {
    // If not logged in, show guest name form or general chat
    if (!user) {
      if (!guestName) {
        setShowGuestForm(true);
      } else {
        setActiveRx(null);
        setChatView('chat');
      }
      return;
    }

    // Authenticated user
    const prescriptions = await fetchUserPrescriptions();
    
    // Check active prescriptions
    const active = prescriptions.filter(p => 
      !['completed', 'collected', 'rejected', 'customer_rejected'].includes((p.status || '').toLowerCase())
    );

    if (active.length === 1) {
      // Exactly 1 active prescription: automatically open it
      setActiveRx(active[0]);
      setChatView('chat');
    } else if (prescriptions.length > 1) {
      // Multiple prescriptions exist: display selector list
      setChatView('select_rx');
    } else if (prescriptions.length === 1) {
      // Exactly 1 prescription in total: open it
      setActiveRx(prescriptions[0]);
      setChatView('chat');
    } else {
      // No prescriptions: open general support
      setActiveRx(null);
      setChatView('chat');
    }
  };

  const handleGuestFormSubmit = (e) => {
    e.preventDefault();
    if (!guestNameInput.trim()) return;
    const name = guestNameInput.trim();
    setGuestName(name);
    localStorage.setItem('svms_guest_chat_name', name);
    setShowGuestForm(false);
    setActiveRx(null);
    setChatView('chat');
  };

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputText).trim();
    if (!text && !fileInputRef.current?.files?.[0]) return;

    setIsSending(true);
    setInputText('');
    
    let uploadedUrl = null;
    if (fileInputRef.current?.files?.[0]) {
      const file = fileInputRef.current.files[0];
      // clear the file input
      fileInputRef.current.value = '';
      uploadedUrl = await handleFileUpload(file);
    }

    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      message: text || null,
      image_url: uploadedUrl,
      sender_role: 'customer',
      delivery_status: 'sending',
      created_at: new Date().toISOString()
    };

    // Optimistically add message
    setMessages(prev => [...prev, tempMsg]);

    try {
      const messagePayload = {
        prescription_id: activeRx ? activeRx.id : null,
        user_id: user ? user.id : null,
        customer_name: user ? (user.name || user.email) : `Guest: ${guestId} (${guestName})`,
        message: text || null,
        image_url: uploadedUrl,
        sender_role: 'customer',
        is_read: false,
        delivery_status: 'delivered',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messagePayload)
        .select('*')
        .single();

      if (error) throw error;

      // Replace optimistic message with actual data from Supabase
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));

      // Clear typing status
      if (typingChanRef.current) {
        typingChanRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { sender: 'customer', isTyping: false }
        });
      }
    } catch (err) {
      console.error('[Chat] Failed to send message:', err);
      // Update optimistic message status to failed
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, delivery_status: 'failed' } : m));
      showToast('Failed to send message. Please retry.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleRetrySend = async (msgToRetry) => {
    if (!msgToRetry) return;
    // Remove the failed message from local messages state
    setMessages(prev => prev.filter(m => m.id !== msgToRetry.id));
    // Resend using the message text
    await handleSendMessage(msgToRetry.message);
  };

  const handleFileUpload = async (file) => {
    if (!file) return null;
    setIsUploading(true);
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
      showToast('Image upload failed. Try again.', 'error');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const sendTypingStatus = (typing) => {
    if (typingChanRef.current) {
      typingChanRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { sender: 'customer', isTyping: typing }
      });
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!isCurrentlyTyping) {
      setIsCurrentlyTyping(true);
      sendTypingStatus(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsCurrentlyTyping(false);
      sendTypingStatus(false);
    }, 2000);
  };

  return (
    <>
      <style>{`
        .pharm-chat-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          font-size: 11px;
          font-weight: 800;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--bg-card, #0f172a);
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          animation: badgePulse 2s infinite;
        }
        @keyframes badgePulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        .chat-body-scroller {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: rgba(0,0,0,0.2);
        }
        .chat-bubble {
          max-width: 80%;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.4;
          display: flex;
          flex-direction: column;
          gap: 4px;
          word-break: break-word;
          animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .chat-bubble--customer {
          align-self: flex-end;
          background: var(--cyan, #06b6d4);
          color: #fff;
          border-bottom-right-radius: 2px;
          box-shadow: 0 4px 12px rgba(6,182,212,0.15);
        }
        .chat-bubble--pharmacist {
          align-self: flex-start;
          background: var(--bg-elevated, #1e293b);
          color: var(--text-primary, #f8fafc);
          border-bottom-left-radius: 2px;
          border: 1px solid var(--border, #334155);
        }
        .chat-bubble-img {
          max-width: 100%;
          max-height: 160px;
          border-radius: 8px;
          object-fit: cover;
          margin-top: 4px;
          cursor: pointer;
        }
        .chat-bubble-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          font-size: 10px;
          opacity: 0.8;
          margin-top: 2px;
        }
        .chat-actions-chips {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding: 8px 12px;
          background: rgba(255,255,255,0.02);
          border-top: 1px solid var(--border, #334155);
          scrollbar-width: none;
        }
        .chat-actions-chips::-webkit-scrollbar {
          display: none;
        }
        .chat-chip {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border, #334155);
          color: var(--text-secondary, #cbd5e1);
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chat-chip:hover {
          background: rgba(6,182,212,0.1);
          border-color: var(--cyan, #06b6d4);
          color: #fff;
        }
        .chat-input-area {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-top: 1px solid var(--border, #334155);
          background: var(--bg-card, #0f172a);
        }
        .chat-input-field {
          flex: 1;
          height: 36px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border, #334155);
          color: #fff;
          border-radius: 18px;
          padding: 0 14px;
          font-size: 13px;
          outline: none;
        }
        .chat-input-field:focus {
          border-color: var(--cyan, #06b6d4);
          background: rgba(255,255,255,0.06);
        }
        .chat-input-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: var(--text-secondary, #cbd5e1);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chat-input-btn:hover {
          background: rgba(255,255,255,0.06);
          color: #fff;
        }
        .chat-input-btn--send {
          background: var(--cyan, #06b6d4);
          color: #fff;
        }
        .chat-input-btn--send:hover {
          background: #0891b2;
          transform: scale(1.05);
        }
        .chat-input-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        .rx-select-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          border-radius: 8px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border, #334155);
          cursor: pointer;
          transition: all 0.2s;
        }
        .rx-select-item:hover {
          background: rgba(6,182,212,0.05);
          border-color: var(--cyan, #06b6d4);
        }
      `}</style>

      {/* ── Floating Action Button ──────────────────────────── */}
      <div className="pharm-fab-wrapper" aria-label="Ask Pharmacist">
        {/* Pulse ring — always visible */}
        <span className="pharm-pulse-ring" aria-hidden="true" />
        <span className="pharm-pulse-ring pharm-pulse-ring--delay" aria-hidden="true" />

        {/* Main FAB */}
        <button
          className={`pharm-fab-btn ${isOpen ? 'pharm-fab-btn--active' : ''}`}
          onClick={handleFabClick}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close pharmacist menu' : 'Ask Pharmacist'}
        >
          {/* Icon */}
          <span className="pharm-fab-icon">
            {isOpen ? (
              /* × close icon when open */
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" width="20" height="20" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <PharmacistIcon size={20} />
            )}
          </span>
          {/* Desktop label — hidden on mobile */}
          <span className="pharm-fab-label">
            Ask Pharmacist {unreadCount > 0 ? ` (${unreadCount})` : ''}
          </span>

          {/* Unread circle badge */}
          {unreadCount > 0 && !isOpen && (
            <span className="pharm-chat-badge">{unreadCount}</span>
          )}
        </button>

        {/* Online indicator dot */}
        <span 
          className="pharm-online-dot" 
          aria-label={isPharmacistOnline ? "Pharmacist online" : "Pharmacist offline"} 
          style={{ 
            background: isPharmacistOnline ? '#22c55e' : '#94a3b8', 
            boxShadow: isPharmacistOnline ? '0 0 6px rgba(34, 197, 94, 0.60)' : 'none' 
          }} 
        />
      </div>

      {/* ── Consultation Panel (popup) ──────────────────────── */}
      {isOpen && (
        <div className="pharm-panel" ref={modalRef} role="dialog" aria-modal="true"
          style={{ display: 'flex', flexDirection: 'column', height: chatView === 'chat' ? 480 : 'auto', maxHeight: '80vh' }}
          aria-label="Contact Pharmacist">

          {/* Header */}
          <div className="pharm-panel-header" style={{ flexShrink: 0 }}>
            {chatView && (
              <button 
                onClick={() => {
                  setChatView(null);
                  setActiveRx(null);
                }} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer', padding: '0 8px 0 0', display: 'flex', alignItems: 'center', fontSize: 13 }}
              >
                ← Back
              </button>
            )}
            <div className="pharm-avatar-wrap">
              <PharmacistIcon size={22} />
            </div>
            <div className="pharm-panel-head-text" style={{ flex: 1 }}>
              <h3 className="pharm-panel-title">
                {chatView === 'chat' ? (activeRx ? `Chat: ${activeRx.reference_id}` : 'General Support') : 'Consult a Pharmacist'}
              </h3>
              <p className="pharm-panel-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {typingText ? (
                  <span style={{ color: 'var(--cyan, #06b6d4)', fontWeight: 600 }}>{typingText}</span>
                ) : (
                  <>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: isPharmacistOnline ? '#10b981' : '#94a3b8', display: 'inline-block' }} />
                    <span>{isPharmacistOnline ? 'Pharmacist Online' : 'Pharmacist Offline'} · 8 AM – 10:30 PM</span>
                  </>
                )}
              </p>
            </div>
            <button className="pharm-panel-close" onClick={() => setIsOpen(false)}
              aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" width="16" height="16">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Guest Name Form */}
          {showGuestForm && (
            <form onSubmit={handleGuestFormSubmit} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary, #cbd5e1)', margin: 0 }}>
                Please enter your name to start a secure consultation chat:
              </p>
              <input
                type="text"
                placeholder="Your Full Name"
                className="chat-input-field"
                required
                value={guestNameInput}
                onChange={e => setGuestNameInput(e.target.value)}
                style={{ width: '100%', borderRadius: 6, height: 38 }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowGuestForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: 'var(--cyan, #06b6d4)', border: 'none', color: '#fff', padding: '0 14px', height: 32, borderRadius: 6, fontSize: 12, fontWeight: 700 }}>Start Chat</button>
              </div>
            </form>
          )}

          {/* VIEW: Options List */}
          {!chatView && !showGuestForm && (
            <div className="pharm-panel-options">

              {/* Call */}
              <button className="pharm-option pharm-option--call" onClick={handleCallCta}>
                <span className="pharm-opt-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <span className="pharm-opt-text">
                  <span className="pharm-opt-title">Call Pharmacist</span>
                  <span className="pharm-opt-sub">+91 99891 48660</span>
                </span>
                <span className="pharm-opt-arrow">→</span>
              </button>

              {/* WhatsApp */}
              <button className="pharm-option pharm-option--whatsapp" onClick={handleWhatsAppCta}>
                <span className="pharm-opt-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </span>
                <span className="pharm-opt-text">
                  <span className="pharm-opt-title">WhatsApp Chat</span>
                  <span className="pharm-opt-sub">Get instant guidance</span>
                </span>
                <span className="pharm-opt-arrow">→</span>
              </button>

              {/* Upload Rx */}
              <button className="pharm-option pharm-option--rx" onClick={handleUploadCta}>
                <span className="pharm-opt-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="12" x2="12" y2="18" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </span>
                <span className="pharm-opt-text">
                  <span className="pharm-opt-title">Upload Prescription</span>
                  <span className="pharm-opt-sub">Verified in minutes</span>
                </span>
                <span className="pharm-opt-arrow">→</span>
              </button>

              {/* Chat with Pharmacist (NEW) */}
              <button className="pharm-option" onClick={handleChatCta} style={{ borderLeft: '3px solid var(--cyan, #06b6d4)' }}>
                <span className="pharm-opt-icon" style={{ color: 'var(--cyan, #06b6d4)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <span className="pharm-opt-text">
                  <span className="pharm-opt-title">💬 Chat with Pharmacist</span>
                  <span className="pharm-opt-sub">In-app realtime support</span>
                </span>
                <span className="pharm-opt-arrow">→</span>
              </button>
            </div>
          )}

          {/* VIEW: Select Prescription */}
          {chatView === 'select_rx' && !showGuestForm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, overflowY: 'auto', flex: 1 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', margin: '0 0 4px 0', fontWeight: 600 }}>
                Select a prescription to open a chat:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myPrescriptions.map(rx => (
                  <div key={rx.id} className="rx-select-item" onClick={() => { setActiveRx(rx); setChatView('chat'); }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                        {rx.reference_id}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                        Status: <b style={{ color: 'var(--cyan, #06b6d4)' }}>{rx.status}</b>
                      </div>
                    </div>
                    <span style={{ color: 'var(--cyan, #06b6d4)', fontSize: 14 }}>💬 →</span>
                  </div>
                ))}

                {/* Add General Support room at bottom of list */}
                <div className="rx-select-item" onClick={() => { setActiveRx(null); setChatView('chat'); }} style={{ borderStyle: 'dashed', background: 'rgba(255,255,255,0.01)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                      💬 General Support Chat
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                      For medicine guidance and availability
                    </div>
                  </div>
                  <span style={{ color: 'var(--cyan, #06b6d4)', fontSize: 14 }}>💬 →</span>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: Chat Room */}
          {chatView === 'chat' && !showGuestForm && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              
              {/* Prescription thumbnail preview banner */}
              {activeRx && activeRx.image_url && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(6,182,212,0.06)', borderBottom: '1px solid rgba(6,182,212,0.12)', flexShrink: 0 }}>
                  <img 
                    src={activeRx.image_url} 
                    alt="Prescription preview" 
                    style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: 4, cursor: 'pointer', border: '1px solid rgba(6,182,212,0.2)' }}
                    onClick={() => window.open(activeRx.image_url, '_blank')}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-secondary, #cbd5e1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Linked Rx: <b style={{ color: 'var(--cyan, #06b6d4)' }}>{activeRx.reference_id}</b>
                  </div>
                  <button 
                    onClick={() => window.open(activeRx.image_url, '_blank')} 
                    style={{ background: 'none', border: 'none', color: 'var(--cyan, #06b6d4)', fontSize: 10, cursor: 'pointer', marginLeft: 'auto', fontWeight: 700 }}
                  >
                    View File
                  </button>
                </div>
              )}

              {/* Messages Body */}
              <div className="chat-body-scroller">
                {messages.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '18px 14px' }}>
                    <div style={{
                      background: 'rgba(6, 182, 212, 0.04)',
                      border: '1px solid rgba(6, 182, 212, 0.08)',
                      borderRadius: 12,
                      padding: 14,
                      display: 'flex',
                      gap: 12
                    }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0891b2, #0e7490)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        color: 'white',
                        flexShrink: 0
                      }}>👨‍⚕️</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'white' }}>Pharmacist Assistant</h4>
                        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: '#94a3b8' }}>
                          👋 Welcome to Sri Venkateshwara Medical Store!<br /><br />
                          How can we help you today?<br /><br />
                          You can choose one of the options below or type your question.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map(m => (
                    <div 
                      key={m.id} 
                      className={`chat-bubble chat-bubble--${m.sender_role}`}
                    >
                      {m.message && <div>{m.message}</div>}
                      {m.image_url && (
                        <img 
                          src={m.image_url} 
                          alt="Attachment" 
                          className="chat-bubble-img" 
                          onClick={() => window.open(m.image_url, '_blank')}
                        />
                      )}
                      <div className="chat-bubble-meta">
                        <span>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {m.sender_role === 'customer' && (
                          <span style={{ fontSize: 10, marginLeft: 4, display: 'inline-flex', alignItems: 'center', gap: 4, color: m.delivery_status === 'failed' ? '#ef4444' : '#67e8f9' }}>
                            {m.delivery_status === 'sending' ? 'Sending...' : m.delivery_status === 'failed' ? 'Failed' : (m.is_read || m.delivery_status === 'read' ? 'Read' : 'Delivered')}
                            {m.delivery_status === 'failed' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRetrySend(m); }}
                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontWeight: 700, fontSize: 10 }}
                              >
                                Retry
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
                
                {messages.length > 0 && messages[messages.length - 1].sender_role === 'customer' && !typingText && (
                  <div className="chat-bubble chat-bubble--pharmacist" style={{ display: 'flex', flexDirection: 'row', gap: 6, alignItems: 'center', padding: '8px 12px', width: 'fit-content', opacity: 0.75 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan, #06b6d4)', animation: 'pulse 1.2s infinite alternate' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>Waiting for pharmacist response...</span>
                    <style>{`
                      @keyframes pulse {
                        to { opacity: 0.2; transform: scale(0.8); }
                      }
                    `}</style>
                  </div>
                )}

                {typingText && (
                  <div className="chat-bubble chat-bubble--pharmacist" style={{ display: 'flex', flexDirection: 'row', gap: 4, alignItems: 'center', padding: '8px 12px', width: 'fit-content' }}>
                    <span>{typingText}</span>
                    <span style={{ display: 'inline-flex', gap: 2 }}>
                      <span style={{ width: 4, height: 4, background: 'var(--cyan, #06b6d4)', borderRadius: '50%', animation: 'bounce 0.6s infinite alternate' }} />
                      <span style={{ width: 4, height: 4, background: 'var(--cyan, #06b6d4)', borderRadius: '50%', animation: 'bounce 0.6s infinite alternate 0.2s' }} />
                      <span style={{ width: 4, height: 4, background: 'var(--cyan, #06b6d4)', borderRadius: '50%', animation: 'bounce 0.6s infinite alternate 0.4s' }} />
                    </span>
                    <style>{`
                      @keyframes bounce {
                        to { transform: translateY(-4px); }
                      }
                    `}</style>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Action Chips */}
              <div className="chat-actions-chips" style={{ flexShrink: 0 }}>
                {[
                  { label: '💊 Medicine Availability', text: "Hello, I'd like to know if a medicine is available." },
                  { label: '📄 Prescription Review', text: "Hi, I need help understanding my prescription." },
                  { label: '🔄 Alternative Medicine', text: "Can you suggest an alternative medicine if my prescribed medicine is unavailable?" },
                  { label: '💉 Dosage Information', text: "I have a question about the dosage of my medicine." },
                  { label: '🚚 Delivery & Pickup', text: "I would like information about home delivery or pickup timings." },
                  { label: '👨‍⚕️ Talk to Pharmacist', text: "Hello Pharmacist, I need assistance with my medicines." }
                ].map(action => (
                  <button 
                    key={action.label} 
                    className="chat-chip"
                    onClick={() => handleSendMessage(action.text)}
                    disabled={isSending}
                  >
                    {action.label}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className="chat-input-area" style={{ flexShrink: 0 }}>
                {/* Paperclip upload button */}
                <button 
                  type="button" 
                  className="chat-input-btn"
                  title="Attach image"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSending || isUploading}
                >
                  {isUploading ? (
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                  )}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/*"
                  onChange={() => handleSendMessage()}
                />

                {/* Input Text Box */}
                <input
                  type="text"
                  className="chat-input-field"
                  placeholder="Ask about medicines, prescriptions, dosage, or delivery..."
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
                  disabled={isSending}
                />

                {/* Send Button */}
                <button 
                  type="button" 
                  className="chat-input-btn chat-input-btn--send"
                  onClick={() => handleSendMessage()}
                  disabled={isSending || isUploading || (!inputText.trim() && !fileInputRef.current?.files?.[0])}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>

            </div>
          )}

          {/* Trust row */}
          {!chatView && !showGuestForm && (
            <div className="pharm-trust-row" style={{ flexShrink: 0 }}>
              <span className="pharm-trust-dot" />
              <span>Registered & Licensed Pharmacist</span>
              <span className="pharm-trust-sep">·</span>
              <span>Always Confidential</span>
            </div>
          )}
        </div>
      )}

    </>
  );
};

export default FloatingPharmacist;
