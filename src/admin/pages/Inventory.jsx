import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import AdminLayout from '../components/AdminLayout';
import { Search, Plus, Minus, AlertTriangle } from 'lucide-react';
import { SkeletonTable, SkeletonStatGrid, ErrorState } from '../../components/LoadingStates';

const getExpiryCategory = (dateStr) => {
  if (!dateStr) return 'safe';
  const expiry = new Date(dateStr);
  const now = new Date();
  if (expiry < now) return 'expired';
  
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 30) return 'expiring30';
  if (diffDays <= 90) return 'expiring90';
  return 'safe';
};

const isExpiringSoon = (dateStr) => {
  const cat = getExpiryCategory(dateStr);
  return cat === 'expiring30' || cat === 'expiring90';
};

const isExpired = (dateStr) => {
  return getExpiryCategory(dateStr) === 'expired';
};

const Inventory = () => {
  const { inventory, inventoryLogs, adjustStock, dataLoading, dataError, refetchAllData } = useAdmin();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [expiryFilter, setExpiryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  
  const [tab, setTab] = useState('inventory');
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('add'); // 'add', 'remove', 'set'
  const [adjustReason, setAdjustReason] = useState('');

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

  // Derive filter options dynamically from inventory list
  const categories = ['All', ...new Set(inventory.map(p => p.category).filter(Boolean))];
  const suppliers = ['All', ...new Set(inventory.map(p => p.supplier).filter(Boolean))];
  const brands = ['All', ...new Set(inventory.map(p => p.brand).filter(Boolean))];

  const filtered = inventory.filter(p => {
    // Search filter: Product Name, Brand, Batch Number, Supplier
    const searchLower = search.toLowerCase();
    const matchSearch = !search ||
      p.name.toLowerCase().includes(searchLower) ||
      (p.brand && p.brand.toLowerCase().includes(searchLower)) ||
      (p.batchNo && p.batchNo.toLowerCase().includes(searchLower)) ||
      (p.supplier && p.supplier.toLowerCase().includes(searchLower));

    const matchCat = catFilter === 'All' || p.category === catFilter;
    const matchSupplier = supplierFilter === 'All' || p.supplier === supplierFilter;
    const matchBrand = brandFilter === 'All' || p.brand === brandFilter;

    // Expiry category filter
    const expCat = getExpiryCategory(p.expiryDate);
    const matchExpiry = expiryFilter === 'All' ||
      (expiryFilter === 'Expired' && expCat === 'expired') ||
      (expiryFilter === 'Expiring within 30 days' && expCat === 'expiring30') ||
      (expiryFilter === 'Expiring within 90 days' && (expCat === 'expiring30' || expCat === 'expiring90')) ||
      (expiryFilter === 'Safe' && expCat === 'safe');

    // Stock level filter
    const matchStock = stockFilter === 'All' ||
      (stockFilter === 'In Stock' && p.stock > p.reorderLevel) ||
      (stockFilter === 'Low Stock' && p.stock > 0 && p.stock <= p.reorderLevel) ||
      (stockFilter === 'Out of Stock' && p.stock === 0);

    return matchSearch && matchCat && matchSupplier && matchBrand && matchExpiry && matchStock;
  });

  const lowStock = inventory.filter(p => p.stock > 0 && p.stock <= p.reorderLevel);
  const outOfStock = inventory.filter(p => p.stock === 0);
  const expiringSoon = inventory.filter(p => {
    const cat = getExpiryCategory(p.expiryDate);
    return cat === 'expiring30' || cat === 'expiring90';
  });
  const expired = inventory.filter(p => isExpired(p.expiryDate));

  const rowClass = (p) => {
    if (p.stock === 0) return 'out-stock-row';
    if (p.stock <= p.reorderLevel) return 'low-stock-row';
    if (isExpiringSoon(p.expiryDate)) return 'expiry-soon-row';
    return '';
  };

  const doAdjust = () => {
    const qty = parseInt(adjustQty);
    if ((qty === undefined || isNaN(qty)) || !adjustModal) return;
    adjustStock(adjustModal.id, qty, adjustReason, adjustType);
    setAdjustModal(null);
    setAdjustQty('');
    setAdjustReason('');
  };

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
          { label: 'In Stock', value: inventory.filter(p => p.stock > p.reorderLevel).length, icon: '✅', color: 'var(--green)' },
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
        <div className="filter-bar" style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Top Row: Search & Category */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', width: '100%' }}>
            <div className="filter-search" style={{ flex: 2, minWidth: '240px' }}>
              <Search size={14} className="filter-search-icon" />
              <input placeholder="Search product name, brand, batch or supplier…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="filter-select" style={{ flex: 1, minWidth: '130px' }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="All">All Categories</option>
              {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          {/* Bottom Row: Additional Filters */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: '100%' }}>
            <select className="filter-select" style={{ flex: 1, minWidth: '130px' }} value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}>
              <option value="All">All Suppliers</option>
              {suppliers.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select className="filter-select" style={{ flex: 1, minWidth: '130px' }} value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
              <option value="All">All Brands</option>
              {brands.filter(b => b !== 'All').map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <select className="filter-select" style={{ flex: 1, minWidth: '130px' }} value={expiryFilter} onChange={e => setExpiryFilter(e.target.value)}>
              <option value="All">All Expiry Status</option>
              <option value="Safe">Safe</option>
              <option value="Expiring within 30 days">Expiring within 30 days</option>
              <option value="Expiring within 90 days">Expiring within 90 days</option>
              <option value="Expired">Expired</option>
            </select>

            <select className="filter-select" style={{ flex: 1, minWidth: '130px' }} value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
              <option value="All">All Stock Status</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      {(tab === 'inventory' || tab === 'low' || tab === 'out') && (
        <div className="table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Reorder Level</th>
                <th>Supplier</th>
                <th>Batch</th>
                <th>Mfg / Expiry</th>
                <th>Last Updated</th>
                <th>Adjust</th>
              </tr>
            </thead>
            <tbody>
              {(tab === 'inventory' ? filtered : tab === 'low' ? lowStock : outOfStock).map(p => (
                <tr key={p.id} className={rowClass(p)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img 
                        src={p.image || '/images/cat_medicines.png'} 
                        alt={p.name} 
                        style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', background: 'rgba(255,255,255,0.05)' }} 
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.brand}</div>
                      </div>
                    </div>
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
                  <td>
                    <div style={{ fontSize: '13px' }}>Exp: {p.expiryDate}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mfg: {p.mfgDate}</div>
                  </td>
                  <td className="muted">{p.lastUpdated}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-success btn-sm btn-icon" onClick={(e) => { e.stopPropagation(); setAdjustModal(p); setAdjustType('add'); setAdjustQty(''); setAdjustReason(''); }} title="Add stock"><Plus size={12} /></button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={(e) => { e.stopPropagation(); setAdjustModal(p); setAdjustType('remove'); setAdjustQty(''); setAdjustReason(''); }} title="Remove stock"><Minus size={12} /></button>
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
                <AlertTriangle size={16} /> Expiring in Next 90 Days ({expiringSoon.length})
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
            <thead><tr><th>Action</th><th>Product</th><th>Quantity</th><th>User</th><th>Date</th><th>Time</th><th>Reason</th></tr></thead>
            <tbody>
              {inventoryLogs.map(log => (
                <tr key={log.id}>
                  <td>
                    <span className={`badge ${log.action.includes('Added') || log.action === 'Stock Added' ? 'badge-approved' : 'badge-cancelled'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{log.product}</td>
                  <td>{log.quantity} units</td>
                  <td className="muted">{log.user}</td>
                  <td className="muted">{log.date}</td>
                  <td className="muted">{log.time}</td>
                  <td className="muted">{log.reason || 'Manual Adjustment'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="modal-overlay" onClick={() => setAdjustModal(null)} style={{ opacity: 1, pointerEvents: 'auto', display: 'flex', position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>Manual Stock Adjustment</h2><p>{adjustModal.name}</p></div>
              <button className="modal-close" onClick={() => setAdjustModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                Current Stock: <strong>{adjustModal.stock} units</strong>
              </div>

              {/* Adjustment Type Selector */}
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Adjustment Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['add', 'remove', 'set'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAdjustType(type)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: adjustType === type ? 'var(--teal-accent, #00A884)' : 'rgba(15,23,42,0.4)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '11px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {type === 'add' ? '📈 Increase' : type === 'remove' ? '📉 Decrease' : '🔄 Replace/Set'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Input */}
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">
                  {adjustType === 'add' ? 'Quantity to Add' : adjustType === 'remove' ? 'Quantity to Remove' : 'Target Stock Quantity'}
                </label>
                <input 
                  className="form-input" 
                  type="number" 
                  min="0" 
                  value={adjustQty} 
                  onChange={e => setAdjustQty(e.target.value)} 
                  placeholder={adjustType === 'set' ? 'e.g. 150' : 'e.g. 20'} 
                />
              </div>

              {/* Reason Input */}
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Reason for Adjustment</label>
                <input 
                  className="form-input" 
                  type="text" 
                  value={adjustReason} 
                  onChange={e => setAdjustReason(e.target.value)} 
                  placeholder="e.g. Supplier delivery, Damaged package, Stock check" 
                />
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                New stock will be: <strong>
                  {adjustType === 'add' 
                    ? adjustModal.stock + (+adjustQty || 0) 
                    : adjustType === 'remove' 
                      ? Math.max(0, adjustModal.stock - (+adjustQty || 0)) 
                      : Math.max(0, +adjustQty || 0)
                  } units
                </strong>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAdjustModal(null)}>Cancel</button>
              <button className={`btn ${adjustType === 'add' ? 'btn-success' : adjustType === 'remove' ? 'btn-danger' : 'btn-primary'}`} onClick={doAdjust}>
                {adjustType === 'add' ? <Plus size={14} /> : <Minus size={14} />} Confirm Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Inventory;
