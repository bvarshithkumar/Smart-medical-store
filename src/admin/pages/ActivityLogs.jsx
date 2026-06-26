import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import AdminLayout from '../components/AdminLayout';

const CATEGORY_COLORS = {
  Product: 'log-product', Order: 'log-order', Inventory: 'log-inventory',
  Prescription: 'log-prescription', Promotion: 'log-promotion',
  CMS: 'log-cms', Settings: 'log-settings', Report: 'log-report',
};

const ActivityLogs = () => {
  const { activityLogs } = useAdmin();
  const [catFilter, setCatFilter] = useState('All');
  const [search, setSearch] = useState('');

  const categories = ['All', ...Object.keys(CATEGORY_COLORS)];

  const filtered = activityLogs.filter(log => {
    const matchCat = catFilter === 'All' || log.category === catFilter;
    const matchSearch = log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Activity Logs</h1>
          <p>Complete audit trail of all admin actions — {activityLogs.length} total entries</p>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="filter-search">
          <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Search actions or users…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} entries</span>
      </div>

      <div className="table-card">
        <table className="admin-table">
          <thead>
            <tr><th>Category</th><th>Action</th><th>User</th><th>Date</th><th>Time</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5}>
                <div className="empty-state"><div className="empty-state-icon">📋</div><h3>No logs found</h3><p>Try a different search or category filter.</p></div>
              </td></tr>
            ) : (
              filtered.map(log => (
                <tr key={log.id}>
                  <td>
                    <span className={`log-badge ${CATEGORY_COLORS[log.category] || 'log-settings'}`}>{log.category}</span>
                  </td>
                  <td style={{ color: 'var(--text-primary)' }}>{log.action}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, var(--cyan), var(--indigo))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {log.user[0]}
                      </div>
                      <span>{log.user}</span>
                    </div>
                  </td>
                  <td className="muted">{log.date}</td>
                  <td className="muted">{log.time}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default ActivityLogs;
