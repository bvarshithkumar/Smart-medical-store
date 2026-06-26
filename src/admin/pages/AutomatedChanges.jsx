import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import {
  RefreshCw, ClipboardCheck, ArrowLeftRight, CheckCircle2,
  AlertCircle, ChevronRight, Search, Clock, ShieldCheck,
  Undo2, FileJson, FileText, UserPlus, Coins, MessageSquare, ShieldAlert,
  Loader2
} from 'lucide-react';
import { parseChangeRequest, getMedicineCardDetails } from '../../pages/MyPrescriptions';
import { fetchWithTimeout } from '../../hooks/useFetchWithTimeout';
import { SkeletonTable, ErrorState, EmptyState } from '../../components/LoadingStates';


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
        maxWidth: 360,
        fontFamily: 'Inter, sans-serif'
      }}>
        <span style={{ flex: 1 }}>{t.message}</span>
        <button onClick={() => onRemove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2, opacity: 0.6, flexShrink: 0 }}>×</button>
      </div>
    ))}
  </div>
);

const AutomatedChanges = () => {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [selectedChange, setSelectedChange] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [adminNotesText, setAdminNotesText] = useState('');


  // Toast notifications
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const loadChanges = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const data = await fetchWithTimeout(async (signal) => {
        const { data, error } = await supabase
          .from('quote_change_requests')
          .select(`
            *,
            prescription: prescriptions ( * ),
            quote: prescription_quotes ( * )
          `)
          .order('created_at', { ascending: false })
          .abortSignal(signal);

        if (error) throw error;
        return data || [];
      });

      const parsedData = data.map(item => {
        let parsed = parseChangeRequest(item);
        return {
          ...parsed,
          prescription: item.prescription,
          quote: item.quote
        };
      });

      setChanges(parsedData);

      // Update selected change if it is currently open
      if (selectedChange) {
        const updated = parsedData.find(c => c.id === selectedChange.id);
        if (updated) {
          setSelectedChange(updated);
          setAdminNotesText(updated.admin_notes || '');
        }
      }
    } catch (e) {
      console.error("Error loading change requests:", e);
      setFetchError(e.message || 'Failed to load quote changes log.');
      addToast('Failed to load quote changes log: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedChange, addToast]);


  useEffect(() => {
    loadChanges();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('realtime-automated-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quote_change_requests' }, () => {
        loadChanges();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSelectChange = (item) => {
    setSelectedChange(item);
    setAdminNotesText(item.admin_notes || '');
  };

  // Actions
  const handleApproveOrReview = async (statusVal) => {
    if (!selectedChange || actionBusy) return;
    setActionBusy(true);
    try {
      // Update quote change request status
      const { error } = await supabase
        .from('quote_change_requests')
        .update({
          status: statusVal,
          admin_notes: adminNotesText.trim() || null,
          processed_at: new Date().toISOString()
        })
        .eq('id', selectedChange.id);

      if (error) {
        // Fallback JSON edit in customer_message if column does not exist
        const updatedMsg = JSON.stringify({
          __is_structured: true,
          customer_message: selectedChange.customer_message,
          status: statusVal,
          processing_type: selectedChange.processing_type,
          confidence_score: selectedChange.confidence_score,
          old_total: selectedChange.old_total,
          new_total: selectedChange.new_total,
          structured_items: selectedChange.structured_items,
          changes_summary: selectedChange.changes_summary,
          audit_timeline: [
            ...(selectedChange.audit_timeline || []),
            { time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), text: `Pharmacist notes: "${adminNotesText.trim()}" (Status: ${statusVal})` }
          ],
          original_version: selectedChange.original_version,
          new_version: selectedChange.new_version,
          processed_at: new Date().toISOString(),
          admin_notes: adminNotesText.trim() || null
        });

        const { error: fallbackErr } = await supabase
          .from('quote_change_requests')
          .update({
            status: statusVal,
            customer_message: updatedMsg
          })
          .eq('id', selectedChange.id);

        if (fallbackErr) throw fallbackErr;
      }

      addToast(`Change request marked as ${statusVal}!`, 'success');
      await loadChanges();
    } catch (err) {
      addToast('Action failed: ' + err.message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleUndo = async () => {
    if (!selectedChange || actionBusy) return;
    
    const prevMeds = selectedChange.structured_items?.previous_medicines;
    if (!prevMeds || prevMeds.length === 0) {
      alert("Cannot undo this request because it does not contain the structured history of previous medicines.");
      return;
    }

    if (!window.confirm("Are you sure you want to undo this automatic quote revision and restore the previous medicines and version?")) {
      return;
    }

    setActionBusy(true);
    try {
      const rxId = selectedChange.prescription_id;
      const originalVer = selectedChange.original_version || 1;

      // 1. Delete current medicines for this prescription
      const { error: delErr } = await supabase
        .from('prescription_medicines')
        .delete()
        .eq('prescription_id', rxId);
      if (delErr) throw delErr;

      // 2. Insert previous medicines back
      const insertRows = prevMeds.map(m => ({
        prescription_id: rxId,
        product_id: m.product_id,
        medicine_name: m.name,
        quantity: m.qty || m.quantity,
        unit_price: m.price || m.unit_price,
        total_price: m.total || m.total_price
      }));
      const { error: insErr } = await supabase
        .from('prescription_medicines')
        .insert(insertRows);
      if (insErr) throw insErr;

      // 3. Deactivate current quote and activate the previous version quote
      // Find the old quote by version number
      const { data: oldQuotes, error: oldQErr } = await supabase
        .from('prescription_quotes')
        .select('*')
        .eq('prescription_id', rxId)
        .eq('version_number', originalVer);

      if (oldQErr) throw oldQErr;

      // Deactivate V-Latest
      await supabase
        .from('prescription_quotes')
        .update({
          is_active: false,
          quote_status: 'superseded',
          status: 'Superseded'
        })
        .eq('prescription_id', rxId);

      if (oldQuotes && oldQuotes.length > 0) {
        // Activate V-Original
        const { error: actErr } = await supabase
          .from('prescription_quotes')
          .update({
            is_active: true,
            quote_status: 'active',
            status: 'Active'
          })
          .eq('id', oldQuotes[0].id);
        if (actErr) throw actErr;
      }

      // 4. Reset prescription status back to quote_sent
      await supabase
        .from('prescriptions')
        .update({ status: 'quote_sent' })
        .eq('id', rxId);

      // 5. Mark change request as Undone
      const audit = [
        ...(selectedChange.audit_timeline || []),
        { time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), text: 'Pharmacist undid automatic changes and restored previous version' }
      ];

      const { error: crErr } = await supabase
        .from('quote_change_requests')
        .update({
          status: 'undone',
          processed_at: new Date().toISOString(),
          admin_notes: 'Automatic changes undone by pharmacist.'
        })
        .eq('id', selectedChange.id);

      if (crErr) {
        // Fallback JSON update
        const fallbackMsg = JSON.stringify({
          __is_structured: true,
          customer_message: selectedChange.customer_message,
          status: 'undone',
          processing_type: selectedChange.processing_type,
          confidence_score: selectedChange.confidence_score,
          old_total: selectedChange.old_total,
          new_total: selectedChange.new_total,
          structured_items: selectedChange.structured_items,
          changes_summary: selectedChange.changes_summary,
          audit_timeline: audit,
          original_version: selectedChange.original_version,
          new_version: selectedChange.new_version,
          processed_at: new Date().toISOString(),
          admin_notes: 'Automatic changes undone by pharmacist.'
        });
        await supabase
          .from('quote_change_requests')
          .update({ status: 'undone', customer_message: fallbackMsg })
          .eq('id', selectedChange.id);
      }

      // 6. Notifications
      try {
        await supabase.from('notifications').insert({
          user_id: selectedChange.prescription?.user_id || null,
          title: 'Quote Restored to Version ' + originalVer,
          message: 'The pharmacist has undone recent automatic changes and restored your previous quote.',
          type: 'quote_generated',
          related_id: rxId
        });
      } catch (notiErr) {
        console.warn('Notification failed:', notiErr);
      }

      addToast('Automatic changes successfully undone and version restored!', 'success');
      await loadChanges();
    } catch (err) {
      console.error('[handleUndo] Error:', err);
      addToast('Undo failed: ' + err.message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  // Metrics calculations
  const today = new Date().toISOString().split('T')[0];
  const changesToday = changes.filter(c => c.created_at?.startsWith(today));
  const autoChangesToday = changesToday.filter(c => c.processing_type === 'automatic');
  
  const medicinesRemoved = changes
    .filter(c => c.processing_type === 'automatic' && c.changes_summary?.removed)
    .reduce((sum, c) => sum + c.changes_summary.removed.length, 0);

  const quantityUpdates = changes
    .filter(c => c.processing_type === 'automatic' && c.changes_summary?.updated)
    .reduce((sum, c) => sum + c.changes_summary.updated.length, 0);

  const manualReviews = changes.filter(c => c.processing_type === 'manual').length;

  const totalProcessed = changes.filter(c => c.status !== 'pending').length;
  const autoProcessed = changes.filter(c => c.processing_type === 'automatic' && c.status !== 'pending').length;
  const successRate = totalProcessed > 0 ? Math.round((autoProcessed / totalProcessed) * 100) : 100;

  // Filter logs grid
  const filtered = changes.filter(c => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.id.toLowerCase().includes(query) ||
      (c.prescription?.customer_name || '').toLowerCase().includes(query) ||
      (c.prescription?.reference_id || '').toLowerCase().includes(query) ||
      (c.quote?.quote_number || '').toLowerCase().includes(query) ||
      (c.processing_type || '').toLowerCase().includes(query) ||
      (c.status || '').toLowerCase().includes(query)
    );
  });

  return (
    <AdminLayout>
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="page-header">
        <div className="page-header-left">
          <h1>Automated Quote Changes</h1>
          <p>Review and audit customer-initiated automated changes and pending pharmacist reviews.</p>
        </div>
        <button className="btn btn-ghost" onClick={loadChanges} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Analytics widgets */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', marginBottom: 24 }}>
        <div className="stat-card" style={{ '--card-accent': 'var(--cyan)' }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'rgba(6,182,212,0.1)' }}><Clock size={16} /></div>
          </div>
          <div className="stat-card-value">{autoChangesToday.length}</div>
          <div className="stat-card-label">Auto Changes Today</div>
        </div>

        <div className="stat-card" style={{ '--card-accent': 'var(--purple)' }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'rgba(168,85,247,0.1)' }}><ArrowLeftRight size={16} /></div>
          </div>
          <div className="stat-card-value">{medicinesRemoved}</div>
          <div className="stat-card-label">Medicines Removed</div>
        </div>

        <div className="stat-card" style={{ '--card-accent': 'var(--indigo)' }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'rgba(99,102,241,0.1)' }}><UserPlus size={16} /></div>
          </div>
          <div className="stat-card-value">{quantityUpdates}</div>
          <div className="stat-card-label">Quantity Updates</div>
        </div>

        <div className="stat-card" style={{ '--card-accent': 'var(--amber)' }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.1)' }}><MessageSquare size={16} /></div>
          </div>
          <div className="stat-card-value">{manualReviews}</div>
          <div className="stat-card-label">Manual Reviews Needed</div>
        </div>

        <div className="stat-card" style={{ '--card-accent': 'var(--green)' }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'rgba(34,197,94,0.1)' }}><ShieldCheck size={16} /></div>
          </div>
          <div className="stat-card-value">{successRate}%</div>
          <div className="stat-card-label">Auto Success Rate</div>
        </div>
      </div>

      {/* Main split grid */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedChange ? '1.8fr 1.2fr' : '1fr', gap: 20, alignItems: 'flex-start' }}>
        
        {/* Logs Table Card */}
        <div className="table-card">
          <div className="table-toolbar" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span className="table-title">Quote Change Requests log</span>
            
            {/* Search filter input */}
            <div style={{ position: 'relative', width: 260 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search logs grid…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', height: 34, padding: '0 10px 0 30px', fontSize: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
          </div>

          {loading ? (
            <SkeletonTable rows={5} cols={8} />
          ) : fetchError ? (
            <ErrorState message={fetchError} onRetry={loadChanges} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No Quote Change Requests"
              message="No quote change requests were found matching the criteria."
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Customer</th>
                    <th>Quote Info</th>
                    <th>Old → New Total</th>
                    <th>Processing Type</th>
                    <th>Confidence</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => {
                    const isAuto = item.processing_type === 'automatic';
                    const diff = item.new_total - item.old_total;
                    
                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleSelectChange(item)}
                        style={{ cursor: 'pointer', background: selectedChange?.id === item.id ? 'var(--bg-elevated)' : 'transparent' }}
                      >
                        <td style={{ color: 'var(--cyan)', fontWeight: 600 }}>{item.id.substring(0,8)}</td>
                        <td>{item.prescription?.customer_name || 'Walk-in Customer'}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.quote?.quote_number || '—'}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>V{item.original_version || '1'} → V{item.new_version || '?'}</div>
                        </td>
                        <td>
                          {item.old_total != null ? (
                            <div>
                              ₹{item.old_total.toFixed(2)} → <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>₹{item.new_total.toFixed(2)}</span>
                              <div style={{ fontSize: 10, color: diff < 0 ? '#10b981' : '#f87171' }}>
                                {diff < 0 ? '-' : '+'}₹{Math.abs(diff).toFixed(2)}
                              </div>
                            </div>
                          ) : '—'}
                        </td>
                        <td>
                          <span className="badge badge-approved" style={{ textTransform: 'uppercase', fontSize: 10 }}>
                            {isAuto ? '⚡ Auto' : '👤 Manual'}
                          </span>
                        </td>
                        <td>
                          <b style={{ color: item.confidence_score >= 95 ? '#10b981' : '#f59e0b' }}>
                            {item.confidence_score}%
                          </b>
                        </td>
                        <td>
                          <span className={`badge ${{
                            processed: 'badge-ready',
                            pending: 'badge-pending',
                            reviewed: 'badge-approved',
                            undone: 'badge-rejected',
                            reviewed_approved: 'badge-approved'
                          }[item.status] || ''}`}>{item.status}</span>
                        </td>
                        <td className="muted">{new Date(item.created_at).toLocaleDateString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>


        {/* Selected Request Details Panel */}
        {selectedChange && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800 }}>Change Request Details</h3>
                <code style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {selectedChange.id}</code>
              </div>
              <button onClick={() => setSelectedChange(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>

            {/* General Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, background: 'rgba(0,0,0,0.1)', padding: 12, borderRadius: 8 }}>
              <div><b>Customer:</b> {selectedChange.prescription?.customer_name || 'Walk-in Customer'}</div>
              <div><b>Reference ID:</b> {selectedChange.prescription?.reference_id || '—'}</div>
              <div><b>Quote number:</b> {selectedChange.quote?.quote_number || '—'}</div>
              <div><b>Confidence Score:</b> <strong style={{ color: selectedChange.confidence_score >= 95 ? '#10b981' : '#f59e0b' }}>{selectedChange.confidence_score}%</strong></div>
              <div><b>Audited Status:</b> <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{selectedChange.status}</span></div>
            </div>

            {/* Changes Summary highlight */}
            {selectedChange.changes_summary && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', marginBottom: 6 }}>Modifications Summary</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                  {selectedChange.changes_summary.removed?.length > 0 && (
                    <div style={{ color: '#ef4444' }}>🗑 Removed: {selectedChange.changes_summary.removed.join(', ')}</div>
                  )}
                  {selectedChange.changes_summary.added?.length > 0 && (
                    <div style={{ color: '#10b981' }}>➕ Added: {selectedChange.changes_summary.added.join(', ')}</div>
                  )}
                  {selectedChange.changes_summary.updated?.length > 0 && (
                    <div>
                      🛠 Quantity updates:
                      <ul style={{ margin: '2px 0 0 16px', padding: 0, listStyle: 'disc' }}>
                        {selectedChange.changes_summary.updated.map((u, i) => (
                          <li key={i}>{u.name}: {u.oldQty} → <b>{u.newQty}</b></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedChange.old_total != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6, marginTop: 4, fontWeight: 'bold' }}>
                      <span>Total Difference:</span>
                      <span style={{ color: (selectedChange.new_total - selectedChange.old_total) < 0 ? '#10b981' : '#f87171' }}>
                        ₹{(selectedChange.new_total - selectedChange.old_total).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Audit timeline */}
            {selectedChange.audit_timeline && selectedChange.audit_timeline.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', marginBottom: 6 }}>Audit Timeline</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
                  {selectedChange.audit_timeline.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 10, whiteSpace: 'nowrap' }}>⏰ {step.time}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pharmacist Review Notes Form */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 12, fontWeight: 700 }}>Pharmacist Notes & Audit Details</label>
              <textarea
                className="form-textarea"
                value={adminNotesText}
                onChange={e => setAdminNotesText(e.target.value)}
                placeholder="Enter validation notes or audit trails..."
                style={{ minHeight: 60, fontSize: 12, resize: 'vertical' }}
              />
            </div>

            {/* Action Buttons Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              {selectedChange.status === 'pending' && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleApproveOrReview('reviewed')}
                  disabled={actionBusy}
                  style={{ width: '100%', background: 'var(--green)', border: 'none', fontWeight: 700 }}
                >
                  Approve Manual Request
                </button>
              )}

              {selectedChange.processing_type === 'automatic' && selectedChange.status === 'processed' && (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleApproveOrReview('reviewed_approved')}
                    disabled={actionBusy}
                    style={{ width: '100%', background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#10b981', fontWeight: 700 }}
                  >
                    Approve Automatic Revision
                  </button>

                  <button
                    className="btn btn-danger"
                    onClick={handleUndo}
                    disabled={actionBusy}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700 }}
                  >
                    <Undo2 size={14} />
                    Undo Automatic Change
                  </button>
                </>
              )}

              {selectedChange.status !== 'reviewed' && selectedChange.status !== 'reviewed_approved' && (
                <button
                  className="btn btn-secondary"
                  onClick={() => handleApproveOrReview('reviewed')}
                  disabled={actionBusy}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 600 }}
                >
                  <ClipboardCheck size={14} />
                  Mark as Reviewed
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AutomatedChanges;
