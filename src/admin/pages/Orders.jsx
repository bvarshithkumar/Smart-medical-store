import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import AdminLayout from '../components/AdminLayout';
import { Search, Eye, Printer, ChevronDown } from 'lucide-react';
import { SkeletonTable, ErrorState, EmptyState } from '../../components/LoadingStates';

const STATUSES = ['All', 'Pending', 'Preparing Medicines', 'Ready For Pickup', 'Completed', 'Cancelled'];

const statusBadge = (s) => ({
  Pending: 'badge-pending',
  'Preparing Medicines': 'badge-processing',
  'Ready For Pickup': 'badge-ready',
  Completed: 'badge-completed',
  Cancelled: 'badge-cancelled'
}[s] || '');

const payBadge = (s) => ({ Paid: 'badge-paid', Pending: 'badge-pending', COD: 'badge-cod' }[s] || '');

const Orders = () => {
  const { orders, metrics, dataLoading, dataError, refetchAllData } = useAdmin();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  if (dataLoading) {
    return (
      <AdminLayout>
        <div className="page-header">
          <div className="page-header-left"><h1>Completed Sales &amp; Orders</h1><p>Loading orders…</p></div>
        </div>
        <SkeletonTable rows={8} cols={7} />
      </AdminLayout>
    );
  }

  if (dataError) {
    return (
      <AdminLayout>
        <div className="page-header">
          <div className="page-header-left"><h1>Completed Sales &amp; Orders</h1></div>
        </div>
        <ErrorState message={dataError} onRetry={refetchAllData} />
      </AdminLayout>
    );
  }

  const filtered = orders.filter(o => {
    const matchSearch = (o.reservation_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customerName || '').toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const pages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handlePrint = (o) => {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Invoice ${o.reservation_id || o.id}</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px}h2{color:#0891b2}</style></head><body><h2>Sri Venkateshwara Medical & General Stores</h2><p>Order ID: ${o.order_number || o.reservation_id || o.id} | Date: ${o.date}</p><p>Customer: ${o.customerName} | Phone: ${o.customerPhone}</p><table><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>${o.items.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>₹${i.price || 0}</td><td>₹${(i.price || 0) * i.qty}</td></tr>`).join('')}<tr><td colspan="3"><b>Total</b></td><td><b>₹${o.total}</b></td></tr></table></body></html>`);
    w.document.close(); w.print();
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Completed Sales & Orders</h1>
          <p>{orders.length} completed sales transactions</p>
        </div>
      </div>

      {/* Filter */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="filter-search">
          <Search size={14} className="filter-search-icon" />
          <input placeholder="Search by order ID or customer…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} results</span>
      </div>

      {/* Table */}
      <div className="table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order ID</th><th>Customer</th><th>Date / Time</th>
              <th>Items</th><th>Total</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(o => (
              <tr key={o.id}>
                <td style={{ color: 'var(--cyan)', fontWeight: 700 }}>{o.order_number || o.reservation_id || o.id}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{o.customerName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.customerPhone}</div>
                </td>
                <td className="muted">{o.date}<br /><span style={{ fontSize: 11 }}>{o.time}</span></td>
                <td className="muted">{o.items.length} item{o.items.length > 1 ? 's' : ''}</td>
                <td style={{ fontWeight: 700 }}>₹{o.total}</td>
                <td>
                  <span className="badge badge-completed">Completed</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={(e) => { e.stopPropagation(); console.log("Opening Order Details", o); setSelected(o); }} title="View order details"><Eye size={14} /></button>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handlePrint(o)} title="Print invoice"><Printer size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            {Array.from({ length: pages }, (_, i) => (
              <button key={i + 1} className={`page-btn${page === i + 1 ? ' active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
            <button className="page-btn" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>›</button>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => { console.log("Closing Order Details"); setSelected(null); }} style={{ opacity: 1, pointerEvents: 'auto', display: 'flex', position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh' }}>
            <div className="modal-header">
              <div>
                <h2>Order Details</h2>
                <p>ID: <b>{selected.order_number || selected.reservation_id || selected.id}</b> · <span className="badge badge-completed">Completed</span></p>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Customer</p>
                  <p style={{ fontWeight: 700 }}>{selected.customerName}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{selected.customerPhone}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Details</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Total: <strong>₹{selected.total}</strong></p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Pickup Date/Time: {selected.date} at {selected.time}</p>
                </div>
              </div>
              <div className="divider" />
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Purchased Items</p>
              <table className="admin-table">
                <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                  {selected.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>{item.qty}</td>
                      <td>₹{item.price || 0}</td>
                      <td style={{ fontWeight: 700 }}>₹{(item.price || 0) * item.qty}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>Grand Total</td>
                    <td style={{ fontWeight: 800, color: 'var(--cyan)' }}>₹{selected.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
              <button className="btn btn-ghost" onClick={() => handlePrint(selected)}><Printer size={14} /> Print Invoice</button>
              <span className="badge badge-completed" style={{ padding: '8px 12px', fontSize: 13 }}>Completed</span>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Orders;
