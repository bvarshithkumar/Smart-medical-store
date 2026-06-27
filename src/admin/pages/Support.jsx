import React, { useState, useEffect, useRef } from 'react';
import { useAdmin } from '../context/AdminContext';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { 
  Search, Send, Paperclip, MessageSquare, Check, CheckCheck, 
  User, Mail, Phone, Calendar, FileText, CheckCircle2, 
  AlertCircle, Archive, Trash2, ShieldAlert
} from 'lucide-react';
const formatDistanceToNow = (date) => {
  if (!date) return '';
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const Support = () => {
  const { 
    supportConversations, setSupportConversations,
    reservations, prescriptions, refetchAllData 
  } = useAdmin();

  const [activeConv, setActiveConv] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'open', 'waiting_for_customer', 'resolved', 'closed'
  const [isCustomerTyping, setIsCustomerTyping] = useState(false);
  const [isPharmacistTyping, setIsPharmacistTyping] = useState(false);

  const activeChannelRef = useRef(null);
  const typingChanRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Setup presence channel to announce pharmacist availability
  useEffect(() => {
    const presenceChannel = supabase.channel('online-presence');
    presenceChannel
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ role: 'pharmacist', onlineAt: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isCustomerTyping]);

  // Load chat messages when active conversation changes
  useEffect(() => {
    if (!activeConv) {
      setChatMessages([]);
      setIsCustomerTyping(false);
      if (activeChannelRef.current) supabase.removeChannel(activeChannelRef.current);
      if (typingChanRef.current) supabase.removeChannel(typingChanRef.current);
      return;
    }

    // 1. Fetch historical messages
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', activeConv.id)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        setChatMessages(data || []);

        // 2. Mark any customer messages in this conversation as read
        const unreadIds = (data || [])
          .filter(m => m.sender_role === 'customer' && !m.is_read)
          .map(m => m.id);

        if (unreadIds.length > 0) {
          await supabase
            .from('chat_messages')
            .update({ is_read: true, delivery_status: 'read' })
            .in('id', unreadIds);
          
          // Clear unread counts locally
          await supabase
            .from('chat_conversations')
            .update({ unread_count_admin: 0 })
            .eq('id', activeConv.id);
        }
      } catch (err) {
        console.error('[SupportChat] Fetch messages failed:', err);
      }
    };

    fetchMessages();

    // 3. Setup real-time message sync
    if (activeChannelRef.current) supabase.removeChannel(activeChannelRef.current);
    
    const channelName = `admin-support-conv-${activeConv.id}`;
    const sub = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${activeConv.id}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            setChatMessages(prev => {
              if (prev.some(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });

            // Auto mark read if conversation is open
            if (payload.new.sender_role === 'customer' && !payload.new.is_read) {
              await supabase
                .from('chat_messages')
                .update({ is_read: true, delivery_status: 'read' })
                .eq('id', payload.new.id);

              await supabase
                .from('chat_conversations')
                .update({ unread_count_admin: 0 })
                .eq('id', activeConv.id);
            }
          } else if (payload.eventType === 'UPDATE') {
            setChatMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
          }
        }
      )
      .subscribe();

    activeChannelRef.current = sub;

    // 4. Setup typing broadcast receiver
    if (typingChanRef.current) supabase.removeChannel(typingChanRef.current);
    
    let typingRoomKey = activeConv.user_id || activeConv.customer_name;
    if (!activeConv.user_id && activeConv.customer_name?.startsWith('Guest:')) {
      const parts = activeConv.customer_name.split(' ');
      if (parts[1]) typingRoomKey = parts[1];
    }
    const typingChan = supabase.channel(`typing-${typingRoomKey}`);
    typingChan
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.sender === 'customer') {
          setIsCustomerTyping(payload.isTyping);
        }
      })
      .subscribe();

    typingChanRef.current = typingChan;

    return () => {
      if (activeChannelRef.current) supabase.removeChannel(activeChannelRef.current);
      if (typingChanRef.current) supabase.removeChannel(typingChanRef.current);
    };
  }, [activeConv]);

  // Send reply message
  const handleSendReply = async () => {
    if (!chatInput.trim() && !fileInputRef.current?.files?.[0]) return;
    if (!activeConv) return;

    setIsSending(true);
    const text = chatInput.trim();
    setChatInput('');

    let uploadedUrl = null;
    if (fileInputRef.current?.files?.[0]) {
      const file = fileInputRef.current.files[0];
      fileInputRef.current.value = '';
      uploadedUrl = await handleFileUpload(file);
    }

    try {
      const payload = {
        conversation_id: activeConv.id,
        prescription_id: null,
        user_id: activeConv.user_id,
        customer_name: activeConv.customer_name,
        message: text || null,
        image_url: uploadedUrl,
        sender_role: 'pharmacist',
        is_read: false,
        delivery_status: 'delivered',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;

      // Optimistic state updates
      setChatMessages(prev => [...prev, data]);
      
      // Update status of conversation to wait for customer
      await supabase
        .from('chat_conversations')
        .update({ status: 'waiting_for_customer' })
        .eq('id', activeConv.id);

      // Stop typing
      sendTypingBroadcast(false);
    } catch (err) {
      console.error('[Support] Send reply failed:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Upload attachments
  const handleFileUpload = async (file) => {
    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const fileName = `support_chat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      
      const { error } = await supabase.storage
        .from('prescriptions')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('prescriptions')
        .getPublicUrl(fileName);

      return urlData?.publicUrl || null;
    } catch (err) {
      console.error('[Support] Attachment upload failed:', err);
      alert('Upload failed: ' + err.message);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Typing broadcasts
  const sendTypingBroadcast = (typing) => {
    if (typingChanRef.current && activeConv) {
      typingChanRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { sender: 'pharmacist', isTyping: typing }
      });
    }
  };

  const handleInputChange = (e) => {
    setChatInput(e.target.value);
    if (!isPharmacistTyping) {
      setIsPharmacistTyping(true);
      sendTypingBroadcast(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsPharmacistTyping(false);
      sendTypingBroadcast(false);
    }, 2000);
  };

  // Update conversation status
  const handleUpdateStatus = async (id, status) => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      
      // Update local state
      setSupportConversations(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      if (activeConv && activeConv.id === id) {
        setActiveConv(prev => ({ ...prev, status }));
      }
    } catch (err) {
      console.error('[Support] Status update failed:', err);
    }
  };

  // Archive conversation
  const handleToggleArchive = async (id, currentArchiveState) => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ is_archived: !currentArchiveState })
        .eq('id', id);
      if (error) throw error;

      setSupportConversations(prev => prev.map(c => c.id === id ? { ...c, is_archived: !currentArchiveState } : c));
      if (activeConv && activeConv.id === id) {
        setActiveConv(null);
      }
    } catch (err) {
      console.error('[Support] Archive toggle failed:', err);
    }
  };

  // Format customer names nicely
  const getCleanName = (name) => {
    if (!name) return 'Customer';
    if (name.startsWith('Guest:')) {
      const match = name.match(/Guest:\s*\S+\s*\(([^)]+)\)/);
      if (match) return `${match[1]} (Guest)`;
    }
    return name;
  };

  // Filter conversations
  const filteredConvs = supportConversations.filter(c => {
    const matchSearch = 
      (c.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.customer_email || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.customer_phone || '').toLowerCase().includes(search.toLowerCase());
    
    const matchStatus = statusFilter === 'All' || c.status === statusFilter;
    const hideArchived = !c.is_archived;

    return matchSearch && matchStatus && hideArchived;
  });

  // Load related customer info panels
  const customerReservations = activeConv 
    ? reservations.filter(r => r.user_id === activeConv.user_id || r.customerName === activeConv.customer_name)
    : [];

  const customerPrescriptions = activeConv
    ? prescriptions.filter(p => p.userId === activeConv.user_id || p.customerName === activeConv.customer_name)
    : [];

  return (
    <AdminLayout>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div className="page-header-left">
          <h1>Pharmacist Customer Support</h1>
          <p>Real-time patient chat sessions, prescription requests, and consultation logs</p>
        </div>
      </div>

      <div style={{
        display: 'flex',
        height: 'calc(100vh - 170px)',
        background: 'rgba(15, 23, 42, 0.45)',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        {/* LEFT COLUMN: ACTIVE CHATS LIST */}
        <div style={{
          width: '320px',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(15, 23, 42, 0.2)'
        }}>
          {/* Search bar */}
          <div style={{ padding: 12, borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div className="filter-search" style={{ width: '100%' }}>
              <Search size={14} className="filter-search-icon" />
              <input 
                placeholder="Search customers..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Status quick filters */}
          <div style={{ 
            display: 'flex', 
            gap: 4, 
            padding: '8px 12px', 
            overflowX: 'auto',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            {['All', 'open', 'waiting_for_customer', 'resolved', 'closed'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '20px',
                  background: statusFilter === st ? 'var(--teal-accent, #00A884)' : 'rgba(255,255,255,0.03)',
                  border: 'none',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {st.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>

          {/* Conversation List items */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConvs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', opacity: 0.4 }}>
                <MessageSquare size={32} style={{ margin: '0 auto 8px auto' }} />
                <p style={{ fontSize: 12 }}>No chats found.</p>
              </div>
            ) : (
              filteredConvs.map(conv => {
                const isActive = activeConv?.id === conv.id;
                const dateStr = conv.last_message_time 
                  ? formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: true }) 
                  : '';
                const cleanName = getCleanName(conv.customer_name);
                
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConv(conv)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: isActive ? 'rgba(0, 168, 132, 0.12)' : conv.unread_count_admin > 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                        border: conv.unread_count_admin > 0 ? '2px solid var(--teal-accent, #00A884)' : '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: 'white'
                      }}>
                        {cleanName.substring(0, 2).toUpperCase()}
                      </div>
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#10b981', // green dot indicating support is online
                        border: '2px solid #0f172a'
                      }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                        <span style={{ fontWeight: conv.unread_count_admin > 0 ? 800 : 600, fontSize: '13px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cleanName}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', whiteSpace: 'nowrap' }}>
                          {dateStr}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ 
                          fontSize: '12px', 
                          color: conv.unread_count_admin > 0 ? 'white' : 'var(--text-secondary, #64748b)', 
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1
                        }}>
                          {conv.last_message || 'Attachment file'}
                        </p>
                        
                        {conv.unread_count_admin > 0 && (
                          <span style={{
                            background: 'var(--teal-accent, #00A884)',
                            color: 'white',
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '10px',
                            marginLeft: 6
                          }}>
                            {conv.unread_count_admin}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MIDDLE COLUMN: ACTIVE CHAT SCREEN */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(0, 0, 0, 0.15)'
        }}>
          {activeConv ? (
            <>
              {/* Chat Top Bar */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(15, 23, 42, 0.2)'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'white' }}>
                    {getCleanName(activeConv.customer_name)}
                  </h3>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {activeConv.customer_phone && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={11} /> {activeConv.customer_phone}
                      </span>
                    )}
                    {activeConv.customer_email && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Mail size={11} /> {activeConv.customer_email}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Status Dropdown */}
                  <select
                    value={activeConv.status}
                    onChange={e => handleUpdateStatus(activeConv.id, e.target.value)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      padding: '4px 8px',
                      fontWeight: 600
                    }}
                  >
                    <option value="open">🟢 Open</option>
                    <option value="waiting_for_customer">🟡 Waiting for Customer</option>
                    <option value="resolved">🔵 Resolved</option>
                    <option value="closed">🔴 Closed</option>
                  </select>

                  <button
                    onClick={() => handleToggleArchive(activeConv.id, activeConv.is_archived)}
                    title="Archive Chat"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '11px',
                      fontWeight: 600
                    }}
                  >
                    <Archive size={12} />
                    Archive
                  </button>
                </div>
              </div>

              {/* Chat Message window */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }} className="chat-messages-container">
                
                {chatMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', margin: 'auto', opacity: 0.3 }}>
                    <MessageSquare size={48} style={{ margin: '0 auto 12px auto' }} />
                    <p style={{ fontSize: 13 }}>No messages in this support session yet.</p>
                  </div>
                ) : (
                  chatMessages.map(msg => {
                    const isPharmacist = msg.sender_role === 'pharmacist';
                    const timeStr = msg.created_at 
                      ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';
                      
                    return (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: isPharmacist ? 'flex-end' : 'flex-start',
                          maxWidth: '70%',
                          background: isPharmacist ? 'var(--teal-accent, #00A884)' : 'rgba(255, 255, 255, 0.05)',
                          border: isPharmacist ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: isPharmacist ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          padding: '10px 14px',
                          color: 'white',
                          position: 'relative'
                        }}
                      >
                        {msg.message && (
                          <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4', wordBreak: 'break-word' }}>
                            {msg.message}
                          </p>
                        )}

                        {msg.image_url && (
                          <div style={{ marginTop: 6, borderRadius: 6, overflow: 'hidden' }}>
                            <img 
                              src={msg.image_url} 
                              alt="Attachment" 
                              style={{ maxWidth: '100%', maxHeight: '200px', display: 'block', cursor: 'pointer' }}
                              onClick={() => window.open(msg.image_url, '_blank')}
                            />
                          </div>
                        )}

                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'flex-end', 
                          gap: 4, 
                          marginTop: 4, 
                          fontSize: '9px', 
                          opacity: 0.7 
                        }}>
                          <span>{timeStr}</span>
                          {isPharmacist && (
                            msg.delivery_status === 'read' ? <CheckCheck size={11} style={{ color: '#60a5fa' }} /> : <Check size={11} />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Realtime typing indicator */}
                {isCustomerTyping && (
                  <div style={{
                    alignSelf: 'flex-start',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px 12px 12px 2px',
                    padding: '8px 12px',
                    color: '#94a3b8',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <span style={{ display: 'flex', gap: 2 }}>
                      <span className="dot" style={{ animation: 'blink 1.4s infinite both', animationDelay: '0s' }}>.</span>
                      <span className="dot" style={{ animation: 'blink 1.4s infinite both', animationDelay: '0.2s' }}>.</span>
                      <span className="dot" style={{ animation: 'blink 1.4s infinite both', animationDelay: '0.4s' }}>.</span>
                    </span>
                    <span>Customer is typing...</span>
                    <style>{`
                      @keyframes blink {
                        0% { opacity: .2; }
                        20% { opacity: 1; }
                        100% { opacity: .2; }
                      }
                    `}</style>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input panel */}
              <div style={{
                padding: '12px 16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(15, 23, 42, 0.2)'
              }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '50%',
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="Attach file"
                >
                  <Paperclip size={16} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={e => {
                    if (e.target.files?.[0]) handleSendReply();
                  }}
                />

                <input
                  type="text"
                  placeholder="Type a support reply message..."
                  value={chatInput}
                  onChange={handleInputChange}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSendReply();
                  }}
                  style={{
                    flex: 1,
                    height: '38px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '20px',
                    color: 'white',
                    padding: '0 16px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />

                <button
                  onClick={handleSendReply}
                  disabled={isSending || isUploading}
                  style={{
                    background: 'var(--teal-accent, #00A884)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    cursor: 'pointer',
                    opacity: isSending ? 0.6 : 1
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              opacity: 0.4
            }}>
              <MessageSquare size={64} style={{ marginBottom: 16 }} />
              <h3>Select a Conversation</h3>
              <p style={{ fontSize: 13 }}>Choose a client chat from the left panel to begin consulting</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: CLIENT ACTIVITY & DETAILS PANELS */}
        {activeConv && (
          <div style={{
            width: '300px',
            borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(15, 23, 42, 0.2)',
            overflowY: 'auto'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Client Summary
              </h3>
            </div>

            {/* Related Prescriptions */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 700, color: 'var(--teal-accent, #00A884)' }}>
                📁 Prescriptions ({customerPrescriptions.length})
              </h4>
              {customerPrescriptions.length === 0 ? (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>No prescriptions uploaded.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {customerPrescriptions.map(rx => (
                    <div 
                      key={rx.id}
                      onClick={() => window.open(rx.image_url || rx.file, '_blank')}
                      style={{
                        padding: 8,
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: 6,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <FileText size={16} style={{ color: '#60a5fa' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Ref: {rx.reference_id || rx.id.substring(0, 8)}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                          Status: {rx.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Related Reservations */}
            <div style={{ padding: '16px 20px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 700, color: 'var(--teal-accent, #00A884)' }}>
                🗓️ Pickup Reservations ({customerReservations.length})
              </h4>
              {customerReservations.length === 0 ? (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>No reservations booked.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {customerReservations.map(res => (
                    <div 
                      key={res.id}
                      style={{
                        padding: 8,
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: 6
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'white' }}>
                          ID: {res.reservation_id}
                        </span>
                        <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--teal-accent, #00A884)' }}>
                          ₹{res.total}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        Date: {res.date} at {res.time}
                      </div>
                      <div style={{ fontSize: '9px', color: '#10b981', marginTop: 4 }}>
                        Status: {res.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Support;
