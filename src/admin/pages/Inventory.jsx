import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import AdminLayout from '../components/AdminLayout';
import { Search, Plus, Minus, AlertTriangle } from 'lucide-react';
import { SkeletonTable, SkeletonStatGrid, ErrorState } from '../../components/LoadingStates';

const isExpiringSoon = (dateStr) => {
  const d = new Date(dateStr);
  const diff = (d - Date.now()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 60;
};
const isExpired = (dateStr) => new Date(dateStr) < new Date();

const Inventory = () => {
  const { inventory, inventoryLogs, adjustStock, dataLoading, dataError, refetchAllData } = useAdmin();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [tab, setTab] = useState('inventory');
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('add');

  if (dataLoading) {
    return (
      <AdminLayout>
        <div className="page-header">
          <div className="page-header-left"><h1>Inventory Management</h1><p>Loading inventory…</p></div>
        </div>
        <SkeletonStatGrid cards={6} />
        <div style={{ marginTop: 20 }}><SkeletonTable rows={8} cols={6} /></div>
      </AdminLayout>
    );
  }

  if (dataError) {
    return (
      <AdminLayout>
        <div className="page-header">
          <div className="page-header-left"><h1>Inventory Management</h1></div>
        </div>
        <ErrorState message={dataError} onRetry={refetchAllData} />
      </AdminLayout>
    );
  }

  const filtered = inventory.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.supplier.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'All' || p.category === catFilter;
    return matchSearch && matchCat;
  });

  const lowStock = inventory.filter(p => p.stock > 0 && p.stock <= p.reorderLevel);
  const outOfStock = inventory.filter(p => p.stock === 0);
  const expiringSoon = inventory.filter(p => !isExpired(p.expiryDate) && isExpiringSoon(p.expiryDate));
  const expired = inventory.filter(p => isExpired(p.expiryDate));

  const rowClass = (p) => {
    if (p.stock === 0) return 'out-stock-row';
    if (p.stock <= p.reorderLevel) return 'low-stock-row';
    if (isExpiringSoon(p.expiryDate)) return 'expiry-soon-row';
    return '';
  };

  const doAdjust = () => {
    const qty = parseInt(adjustQty);
    if (!qty || !adjustModal) return;
    adjustStock(adjustModal.id, adjustType === 'add' ? qty : -qty, '');
    setAdjustModal(null);
    setAdjustQty('');
  };

  const categories = ['All', ...new Set(inventory.map(p => p.category))];

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Inventory Management</h1>
          <p>Stock monitoring, expiry tracking, and inventory logs</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="inv-summary">
        {[
          { label: 'Total Products', value: inventory.length, icon: '💊', color: 'var(--cyan)' },
          { label: 'In Stock', value: inventory.filter(p => p.stock > 10).length, icon: '✅', color: 'var(--green)' },
          { label: 'Low Stock', value: lowStock.length, icon: '⚠️', color: 'var(--amber)' },
          { label: 'Out of Stock', value: outOfStock.length, icon: '🚨', color: 'var(--red)' },
          { label: 'Expiring Soon', value: expiringSoon.length, icon: '⏰', color: 'var(--purple)' },
          { label: 'Expired', value: expired.length, icon: '❌', color: 'var(--red)' },
        ].map(c => (
          <div key={c.label} className="inv-card" style={{ borderLeft: `3px solid ${c.color}` }}>
            <div className="inv-card-icon">{c.icon}</div>
            <div>
              <div className="inv-card-value" style={{ color: c.color }}>{c.value}</div>
              <div className="inv-card-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: 16 }}>
        {[
          { key: 'inventory', label: 'All Inventory', count: inventory.length },
          { key: 'low', label: 'Low Stock', count: lowStock.length },
          { key: 'out', label: 'Out of Stock', count: outOfStock.length },
          { key: 'expiry', label: 'Expiry Alerts', count: expiringSoon.length + expired.length },
          { key: 'logs', label: 'Inventory Logs', count: inventoryLogs.length },
        ].map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label} <span className="tab-count">{t.count}</span>
          </button>
        ))}
      </div>

      {tab !== 'logs' && tab !== 'expiry' && (
        <div className="filter-bar" style={{ marginBottom: 16 }}>
          <div className="filter-search">
            <Search size={14} className="filter-search-icon" />
            <input placeholder="Search products or supplier…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      )}

      {/* Inventory Table */}
      {(tab === 'inventory' || tab === 'low' || tab === 'out') && (
        <div className="table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Product</th><th>Category</th><th>Stock</th><th>Reorder Level</th><th>Supplier</th><th>Batch</th><th>Last Updated</th><th>Adjust</th></tr>
            </thead>
            <tbody>
              {(tab === 'inventory' ? filtered : tab === 'low' ? lowStock : outOfStock).map(p => (
                <tr key={p.id} className={rowClass(p)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.brand}</div>
                  </td>
                  <td className="muted">{p.category}</td>
                  <td>
                    <span className={`badge ${p.stock === 0 ? 'badge-out-stock' : p.stock <= p.reorderLevel ? 'badge-low-stock' : 'badge-in-stock'}`}>
                      {p.stock} units
                    </span>
                  </td>
                  <td className="muted">{p.reorderLevel}</td>
                  <td className="muted">{p.supplier}</td>
                  <td className="muted">{p.batchNo}</td>
                  <td className="muted">{p.lastUpdated}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-success btn-sm btn-icon" onClick={() => { setAdjustModal(p); setAdjustType('add'); setAdjustQty(''); }} title="Add stock"><Plus size={12} /></button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => { setAdjustModal(p); setAdjustType('remove'); setAdjustQty(''); }} title="Remove stock"><Minus size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expiry Tab */}
      {tab === 'expiry' && (
        <>
          {expiringSoon.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--amber)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={16} /> Expiring in Next 60 Days ({expiringSoon.length})
              </h3>
              <div className="table-card" style={{ marginBottom: 20 }}>
                <table className="admin-table">
                  <thead><tr><th>Product</th><th>Batch</th><th>Stock</th><th>Expiry Date</th><th>Days Left</th></tr></thead>
                  <tbody>
                    {expiringSoon.map(p => {
                      const days = Math.ceil((new Date(p.expiryDate) - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <tr key={p.id} className="expiry-soon-row">
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td className="muted">{p.batchNo}</td>
                          <td>{p.stock} units</td>
                          <td className="muted">{p.expiryDate}</td>
                          <td><span className="badge badge-low-stock">⏰ {days} days</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {expired.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)', marginBottom: 10 }}>❌ Expired Medicines ({expired.length})</h3>
              <div className="table-card">
                <table className="admin-table">
                  <thead><tr><th>Product</th><th>Batch</th><th>Stock</th><th>Expired On</th></tr></thead>
                  <tbody>
                    {expired.map(p => (
                      <tr key={p.id} className="out-stock-row">
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td className="muted">{p.batchNo}</td>
                        <td>{p.stock} units</td>
                        <td style={{ color: 'var(--red)', fontWeight: 600 }}>{p.expiryDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {expiringSoon.length === 0 && expired.length === 0 && (
            <div className="empty-state"><div className="empty-state-icon">✅</div><h3>All Clear!</h3><p>No expiry alerts at this time.</p></div>
          )}
        </>
      )}

      {/* Logs Tab */}
      {tab === 'logs' && (
        <div className="table-card">
          <table className="admin-table">
            <thead><tr><th>Action</th><th>Product</th><th>Quantity</th><th>User</th><th>Date</th><th>Time</th></tr></thead>
            <tbody>
              {inventoryLogs.map(log => (
                <tr key={log.id}>
                  <td>
                    <span className={`badge ${log.action === 'Stock Added' ? 'badge-approved' : 'badge-cancelled'}`}>
                      {log.action === 'Stock Added' ? '+ ' : '- '}{log.action}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{log.product}</td>
                  <td>{log.quantity} units</td>
                  <td className="muted">{log.user}</td>
                  <td className="muted">{log.date}</td>
                  <td className="muted">{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="modal-overlay" onClick={() => setAdjustModal(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>{adjustType === 'add' ? 'Add Stock' : 'Remove Stock'}</h2><p>{adjustModal.name}</p></div>
              <button className="modal-close" onClick={() => setAdjustModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
                Current Stock: <strong>{adjustModal.stock} units</strong>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity to {adjustType === 'add' ? 'Add' : 'Remove'}</label>
                <input className="form-input" type="number" min="1" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="Enter quantity" />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                New stock will be: <strong>{adjustType === 'add' ? adjustModal.stock + (+adjustQty || 0) : Math.max(0, adjustModal.stock - (+adjustQty || 0))} units</strong>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAdjustModal(null)}>Cancel</button>
              <button className={`btn ${adjustType === 'add' ? 'btn-success' : 'btn-danger'}`} onClick={doAdjust}>
                {adjustType === 'add' ? <Plus size={14} /> : <Minus size={14} />} Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Inventory;
