import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import AdminLayout from '../components/AdminLayout';
import { Plus, Edit2, Trash2, Tag, BarChart2 } from 'lucide-react';
import { SkeletonList, ErrorState } from '../../components/LoadingStates';

const EMPTY_COUPON = { code: '', type: 'Percentage', value: '', expiry: '', usageLimit: '', active: true, minOrder: '' };

const Promotions = () => {
  const { coupons, addCoupon, updateCoupon, deleteCoupon, dataLoading, dataError, refetchAllData } = useAdmin();
  const [tab, setTab] = useState('coupons');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_COUPON);

  if (dataLoading) {
    return (
      <AdminLayout>
        <div className="page-header">
          <div className="page-header-left"><h1>Promotions &amp; Coupons</h1><p>Loading promotions…</p></div>
        </div>
        <SkeletonList rows={4} />
      </AdminLayout>
    );
  }

  if (dataError) {
    return (
      <AdminLayout>
        <div className="page-header">
          <div className="page-header-left"><h1>Promotions &amp; Coupons</h1></div>
        </div>
        <ErrorState message={dataError} onRetry={refetchAllData} />
      </AdminLayout>
    );
  }

  const openAdd = () => { setForm(EMPTY_COUPON); setModal('add'); };
  const openEdit = (c) => { setForm({ ...c }); setSelected(c); setModal('edit'); };
  const openDelete = (c) => { setSelected(c); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = () => {
    const data = { ...form, value: +form.value, usageLimit: +form.usageLimit, minOrder: +form.minOrder };
    if (modal === 'add') addCoupon(data);
    else if (modal === 'edit' && selected) updateCoupon(selected.id, data);
    closeModal();
  };

  const campaigns = [
    { id: 'CM1', title: 'Summer Health Drive', type: 'Homepage Banner', status: 'Active', period: 'Jun–Jul 2026', discount: '15% off Vitamins' },
    { id: 'CM2', title: 'Raksha Bandhan Offer', type: 'Festival Offer', status: 'Scheduled', period: 'Aug 2026', discount: 'Buy 2 Get 1 Free' },
    { id: 'CM3', title: 'Senior Citizens Special', type: 'Product Promotion', status: 'Active', period: 'Ongoing', discount: '25% off all orders' },
    { id: 'CM4', title: 'Monsoon Medicine Kit', type: 'Homepage Banner', status: 'Draft', period: 'Jul 2026', discount: '10% off Fever & Pain' },
  ];

  const CouponModal = () => (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal modal-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div><h2>{modal === 'add' ? 'Create Coupon' : 'Edit Coupon'}</h2><p>Configure discount coupon settings</p></div>
          <button className="modal-close" onClick={closeModal}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Coupon Code *</label>
              <input className="form-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. SAVE10" />
            </div>
            <div className="form-group">
              <label className="form-label">Discount Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option>Percentage</option>
                <option>Fixed</option>
              </select>
            </div>
          </div>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Discount Value {form.type === 'Percentage' ? '(%)' : '(₹)'} *</label>
              <input className="form-input" type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Usage Limit</label>
              <input className="form-input" type="number" value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))} placeholder="Unlimited" />
            </div>
            <div className="form-group">
              <label className="form-label">Min Order (₹)</label>
              <input className="form-input" type="number" value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Expiry Date *</label>
            <input className="form-input" type="date" value={form.expiry} onChange={e => setForm(f => ({ ...f, expiry: e.target.value }))} />
          </div>
          <label className="form-toggle" onClick={() => setForm(f => ({ ...f, active: !f.active }))}>
            <div className={`toggle-switch${form.active ? ' on' : ''}`}><div className="toggle-knob" /></div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Active</span>
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>{modal === 'add' ? '+ Create Coupon' : '💾 Save'}</button>
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Promotions & Marketing</h1>
          <p>{coupons.length} coupons · {coupons.filter(c => c.active).length} active · {campaigns.length} campaigns</p>
        </div>
        {tab === 'coupons' && <button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> Create Coupon</button>}
      </div>

      <div className="tab-bar" style={{ marginBottom: 20 }}>
        <button className={`tab-btn${tab === 'coupons' ? ' active' : ''}`} onClick={() => setTab('coupons')}><Tag size={14} /> Coupons <span className="tab-count">{coupons.length}</span></button>
        <button className={`tab-btn${tab === 'campaigns' ? ' active' : ''}`} onClick={() => setTab('campaigns')}><BarChart2 size={14} /> Campaigns <span className="tab-count">{campaigns.length}</span></button>
        <button className={`tab-btn${tab === 'analytics' ? ' active' : ''}`} onClick={() => setTab('analytics')}>📊 Analytics</button>
      </div>

      {tab === 'coupons' && (
        <div className="table-card">
          <table className="admin-table">
            <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min Order</th><th>Expiry</th><th>Usage</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id}>
                  <td><code style={{ background: 'var(--cyan-dim)', color: 'var(--cyan)', padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontSize: 13 }}>{c.code}</code></td>
                  <td className="muted">{c.type}</td>
                  <td style={{ fontWeight: 700 }}>{c.type === 'Percentage' ? `${c.value}%` : `₹${c.value}`}</td>
                  <td className="muted">₹{c.minOrder}</td>
                  <td className="muted">{c.expiry}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3 }}>
                        <div style={{ width: `${(c.used / c.usageLimit) * 100}%`, height: '100%', background: c.used >= c.usageLimit ? 'var(--red)' : 'var(--green)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{c.used}/{c.usageLimit}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${c.active ? 'badge-approved' : 'badge-cancelled'}`}>{c.active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(c)}><Edit2 size={14} /></button>
                      <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--red)' }} onClick={() => openDelete(c)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="cms-grid">
          {campaigns.map(c => (
            <div key={c.id} className="cms-card">
              <div className="cms-card-header">
                <span className="cms-card-title">{c.title}</span>
                <span className={`badge ${c.status === 'Active' ? 'badge-approved' : c.status === 'Scheduled' ? 'badge-processing' : 'badge-pending'}`}>{c.status}</span>
              </div>
              <div className="cms-card-body">
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{c.type} · {c.period}</p>
                <p style={{ fontSize: 13, color: 'var(--cyan)', fontWeight: 600 }}>🏷️ {c.discount}</p>
              </div>
              <div className="cms-card-foot">
                <button className="btn btn-ghost btn-sm"><Edit2 size={12} /> Edit</button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}><Trash2 size={12} /> Delete</button>
              </div>
            </div>
          ))}
          <div className="cms-card" style={{ cursor: 'pointer', border: '2px dashed var(--border)', alignItems: 'center', justifyContent: 'center', display: 'flex', flexDirection: 'column', gap: 8, padding: 24, minHeight: 140 }} onClick={() => alert('Campaign creation: Connect to marketing module')}>
            <Plus size={24} color="var(--text-muted)" />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>New Campaign</span>
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="grid-2">
          {[
            { label: 'Total Coupon Uses', value: coupons.reduce((s, c) => s + c.used, 0), icon: '🎟️', color: 'var(--cyan)' },
            { label: 'Active Coupons', value: coupons.filter(c => c.active).length, icon: '✅', color: 'var(--green)' },
            { label: 'Expired/Inactive', value: coupons.filter(c => !c.active).length, icon: '❌', color: 'var(--red)' },
            { label: 'Avg. Discount Rate', value: `${Math.round(coupons.filter(c => c.type === 'Percentage').reduce((s, c) => s + c.value, 0) / coupons.length)}%`, icon: '📊', color: 'var(--indigo)' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ '--card-accent': s.color }}>
              <div className="stat-card-header">
                <div className="stat-card-icon" style={{ background: `${s.color}20`, fontSize: 20 }}>{s.icon}</div>
              </div>
              <div className="stat-card-value">{s.value}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {(modal === 'add' || modal === 'edit') && <CouponModal />}
      {modal === 'delete' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div><h2>Delete Coupon</h2><p>This action cannot be undone.</p></div><button className="modal-close" onClick={closeModal}>×</button></div>
            <div className="modal-body"><p style={{ color: 'var(--text-secondary)' }}>Delete coupon <strong>{selected?.code}</strong>?</p></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { deleteCoupon(selected.id); closeModal(); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Promotions;
