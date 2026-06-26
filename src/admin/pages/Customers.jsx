import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import AdminLayout from '../components/AdminLayout';
import { Search, Eye, ShoppingBag, FileText, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Customers = () => {
  const { orders, prescriptions } = useAdmin();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        console.log('Fetching profiles with role=customer...');
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'customer');
        
        if (error) {
          console.error('Error fetching customers from Supabase:', error);
        } else {
          console.log(`Successfully fetched ${data?.length || 0} customers.`);
          setCustomers(data || []);
        }
      } catch (err) {
        console.error('Unexpected error fetching customers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const getCustomerStats = (c) => {
    if (!c) {
      return { 
        ordersCount: 0, 
        totalSpent: 0, 
        lastActivity: 'Never', 
        prescriptionsCount: 0, 
        email: '', 
        address: '', 
        orders: [], 
        prescriptions: [] 
      };
    }
    
    const customerOrders = (orders || []).filter(o => o.user_id === c.id);
    const ordersCount = customerOrders.length;
    const totalSpent = customerOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    let lastActivity = 'Never';
    if (customerOrders.length > 0) {
      lastActivity = customerOrders[0].date || 'Never';
    } else if (c.created_at) {
      lastActivity = c.created_at.split('T')[0];
    }

    const customerRx = (prescriptions || []).filter(p => p.userId === c.id);
    const prescriptionsCount = customerRx.length;

    const email = c.email || (c.full_name ? `${c.full_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com` : 'customer@example.com');
    const address = c.address || 'Kachiguda, Hyderabad';

    return {
      ordersCount,
      totalSpent,
      lastActivity,
      prescriptionsCount,
      email,
      address,
      orders: customerOrders,
      prescriptions: customerRx
    };
  };

  const filtered = customers.filter(c => {
    const stats = getCustomerStats(c);
    const nameMatch = (c.full_name || '').toLowerCase().includes(search.toLowerCase());
    const phoneMatch = (c.phone || '').includes(search);
    const emailMatch = stats.email.toLowerCase().includes(search.toLowerCase());
    return nameMatch || phoneMatch || emailMatch;
  });

  const stats = getCustomerStats(selected);
  const profile = selected ? {
    customer: selected,
    orders: stats.orders,
    prescriptions: stats.prescriptions,
  } : null;

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Customer Management</h1>
          <p>
            {customers.length} registered customers · {customers.filter(c => {
              const d = new Date(); d.setMonth(d.getMonth() - 1);
              return c.created_at ? new Date(c.created_at) > d : false;
            }).length} joined this month
          </p>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="filter-search">
          <Search size={14} className="filter-search-icon" />
          <input 
            placeholder="Search by name, phone, email…" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} customers</span>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading customers...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Last Active</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const customerStats = getCustomerStats(c);
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--cyan), var(--indigo))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: 13, flexShrink: 0 }}>
                          {(c.full_name || 'C')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.full_name || 'Customer'}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{customerStats.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="muted">{c.phone || 'Not Provided'}</td>
                    <td className="muted">{customerStats.address}</td>
                    <td><span style={{ fontWeight: 700, color: 'var(--cyan)' }}>{customerStats.ordersCount}</span></td>
                    <td style={{ fontWeight: 600 }}>₹{customerStats.totalSpent?.toLocaleString?.() ?? "0"}</td>
                    <td className="muted">{customerStats.lastActivity}</td>
                    <td className="muted">{c.created_at ? c.created_at.split('T')[0] : 'Not Available'}</td>
                    <td>
                      <button 
                        className="btn btn-ghost btn-sm btn-icon" 
                        onClick={() => setSelected(c)} 
                        title="View profile"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Customer Profile Modal */}
      {selected && profile && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()} style={{ maxHeight: '88vh' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, var(--cyan), var(--indigo))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: 20 }}>
                  {(selected.full_name || 'C')[0].toUpperCase()}
                </div>
                <div>
                  <h2>{selected.full_name || 'Customer'}</h2>
                  <p>{selected.phone || 'Not Provided'} · {stats.email} · {stats.address}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="modal-body">
              {/* Summary Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 8 }}>
                {[
                  { label: 'Total Orders', value: stats.ordersCount, icon: <ShoppingBag size={20} />, color: 'var(--cyan)' },
                  { label: 'Total Spent', value: `₹${stats.totalSpent?.toLocaleString?.() ?? "0"}`, icon: '💰', color: 'var(--green)' },
                  { label: 'Prescriptions', value: stats.prescriptionsCount, icon: <FileText size={20} />, color: 'var(--purple)' },
                  { label: 'Member Since', value: selected.created_at ? selected.created_at.split('T')[0] : 'Not Available', icon: <Clock size={20} />, color: 'var(--amber)' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 20, color: s.color, marginBottom: 6 }}>{s.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="divider" />
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Order History</p>
              {profile.orders.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>No orders yet from this customer.</div>
              ) : (
                <table className="admin-table">
                  <thead><tr><th>Order ID</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
                  <tbody>
                    {profile.orders.slice(0, 5).map(o => (
                      <tr key={o.id}>
                        <td style={{ color: 'var(--cyan)', fontWeight: 600 }}>{o.id}</td>
                        <td className="muted">{o.date}</td>
                        <td>{o.items.length} item{o.items.length > 1 ? 's' : ''}</td>
                        <td style={{ fontWeight: 700 }}>₹{o.total}</td>
                        <td><span className={`badge badge-${o.status.toLowerCase().replace(/ /g, '-')}`}>{o.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="divider" />
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Activity Timeline</p>
              <div className="timeline">
                {[
                  { event: `Customer registered on ${selected.created_at ? selected.created_at.split('T')[0] : 'Not Available'}`, done: true },
                  { event: `First order placed`, done: stats.ordersCount > 0 },
                  { event: `Uploaded ${stats.prescriptionsCount} prescription(s)`, done: stats.prescriptionsCount > 0 },
                  { event: `Last active: ${stats.lastActivity}`, done: true },
                ].map((t, i, arr) => (
                  <div key={i} className="timeline-item">
                    {i < arr.length - 1 && <div className="timeline-line" />}
                    <div className={`timeline-dot${t.done ? ' done' : ''}`} />
                    <div className="timeline-content"><p style={{ opacity: t.done ? 1 : 0.4 }}>{t.event}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Customers;
