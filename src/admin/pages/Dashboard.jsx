import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import AdminLayout from '../components/AdminLayout';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, RefreshCw } from 'lucide-react';
import { SkeletonStatGrid, ErrorState } from '../../components/LoadingStates';

const fmt = (n) => n >= 100000
  ? `₹${(n / 100000).toFixed(1)}L`
  : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n}`;

const StatCard = ({ label, value, icon, color, trend, trendUp }) => (
  <div className="stat-card" style={{ '--card-accent': color }}>
    <div className="stat-card-header">
      <div className="stat-card-icon" style={{ background: `${color}20` }}>{icon}</div>
      {trend && (
        <div className={`stat-card-trend ${trendUp ? 'up' : 'down'}`}>
          {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trend}
        </div>
      )}
    </div>
    <div className="stat-card-value">{value}</div>
    <div className="stat-card-label">{label}</div>
  </div>
);

// Custom Chart Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '10px 14px',
        borderRadius: '8px',
        color: 'white',
        fontSize: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <p style={{ margin: '0 0 6px 0', fontWeight: 700, color: '#94a3b8' }}>{label}</p>
        {payload.map((p, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill }} />
            <span>{p.name}: <b>{p.name.includes('Revenue') ? fmt(p.value) : p.value}</b></span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const { metrics, orders, reservations, allReservations, products, dataLoading, dataError, refetchAllData } = useAdmin();
  const [range, setRange] = useState('7d');
  
  const recentOrders = orders.slice(0, 8);

  if (dataLoading) {
    return (
      <AdminLayout>
        <div className="page-header">
          <div className="page-header-left">
            <h1>Dashboard</h1>
            <p>Loading store data…</p>
          </div>
        </div>
        <SkeletonStatGrid cards={4} />
        <div style={{ marginTop: 16 }}><SkeletonStatGrid cards={5} /></div>
        <div style={{ marginTop: 16 }}><SkeletonStatGrid cards={4} /></div>
      </AdminLayout>
    );
  }

  if (dataError) {
    return (
      <AdminLayout>
        <div className="page-header">
          <div className="page-header-left"><h1>Dashboard</h1></div>
        </div>
        <ErrorState message={dataError} onRetry={refetchAllData} />
      </AdminLayout>
    );
  }

  // Helper to generate dynamic days range
  const getRangeDays = (daysCount) => {
    const list = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push(d);
    }
    return list;
  };

  const rangeDaysMap = { '7d': 7, '30d': 30, '90d': 90 };
  const daysCount = rangeDaysMap[range] || 7;
  const dates = getRangeDays(daysCount);

  // Compute daily sales and order volumes
  const chartData = dates.map(dt => {
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    // Completed orders on this day
    const dayOrders = orders.filter(o => o.date === dateStr && o.status === 'Completed');
    const revenue = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const completedCount = dayOrders.length;

    // Reservations on this day by status
    const dayReservations = allReservations.filter(r => r.date === dateStr);
    const pendingCount = dayReservations.filter(r => r.status === 'Pending').length;
    const cancelledCount = dayReservations.filter(r => r.status === 'Cancelled').length;

    // Total order count = completed pickup orders + pending reservations + cancelled reservations
    const totalCount = completedCount + pendingCount + cancelledCount;

    const label = dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    return {
      day: label,
      rawDate: dateStr,
      revenue: revenue,
      orders: totalCount,
      completed: completedCount,
      pending: pendingCount,
      cancelled: cancelledCount
    };
  });

  const hasCompletedOrders = orders.some(o => o.status === 'Completed');
  const hasAnyOrders = orders.length > 0 || allReservations.length > 0;

  // Compute top selling products (Top 5)
  const salesMap = {};
  orders.forEach(o => {
    if (o.status === 'Completed' && Array.isArray(o.items)) {
      o.items.forEach(item => {
        if (!item.id) return;
        if (!salesMap[item.id]) {
          salesMap[item.id] = {
            id: item.id,
            name: item.name || 'Unknown Medicine',
            unitsSold: 0,
            revenue: 0
          };
        }
        salesMap[item.id].unitsSold += item.qty || 0;
        salesMap[item.id].revenue += (item.qty || 0) * (item.price || 0);
      });
    }
  });

  const topSellingList = Object.values(salesMap)
    .map(sale => {
      const prod = products.find(p => p.id === sale.id);
      return {
        ...sale,
        image: prod?.image || '/images/cat_medicines.png',
        stock: prod?.stock ?? 0
      };
    })
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 5);

  const maxUnitsSold = topSellingList.length > 0 ? Math.max(...topSellingList.map(p => p.unitsSold)) : 1;

  const statusColor = (s) => ({
    Pending: 'badge-pending', Processing: 'badge-processing',
    'Ready for Pickup': 'badge-ready', Completed: 'badge-completed', Cancelled: 'badge-cancelled'
  }[s] || '');

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard</h1>
          <p>Welcome back, Admin — here's what's happening at your store today.</p>
        </div>
        <div className="page-header-actions">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            🟢 Live · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <StatCard label="Today's Revenue" value={fmt(metrics.todaySales)} icon="💰" color="var(--cyan)" trend={metrics.todaySales > 0 ? "+12%" : null} trendUp={metrics.todaySales > 0} />
        <StatCard label="Weekly Revenue" value={fmt(metrics.weeklySales)} icon="📈" color="var(--indigo)" trend={metrics.weeklySales > 0 ? "+8%" : null} trendUp={metrics.weeklySales > 0} />
        <StatCard label="Monthly Revenue" value={fmt(metrics.monthlySales)} icon="📊" color="var(--purple)" trend={metrics.monthlySales > 0 ? "+18%" : null} trendUp={metrics.monthlySales > 0} />
        <StatCard label="Total Revenue" value={fmt(metrics.totalRevenue)} icon="🏆" color="var(--green)" trend={metrics.totalRevenue > 0 ? "+24%" : null} trendUp={metrics.totalRevenue > 0} />
      </div>
 
      {/* Order Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        <StatCard label="Total Orders" value={metrics.totalOrders} icon="📦" color="var(--cyan)" />
        <StatCard label="Pending" value={metrics.pendingOrders} icon="⏳" color="var(--amber)" />
        <StatCard label="Processing" value={metrics.processingOrders} icon="⚙️" color="var(--indigo)" />
        <StatCard label="Completed" value={metrics.completedOrders} icon="✅" color="var(--green)" />
        <StatCard label="Cancelled" value={metrics.cancelledOrders} icon="❌" color="var(--red)" />
      </div>
 
      {/* Product & Customer Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        <StatCard label="Total Products" value={metrics.totalProducts} icon="💊" color="var(--cyan)" />
        <StatCard label="Low Stock" value={metrics.lowStock} icon="⚠️" color="var(--amber)" />
        <StatCard label="Out of Stock" value={metrics.outOfStock} icon="🚨" color="var(--red)" />
        <StatCard label="Total Customers" value={metrics.totalCustomers} icon="👥" color="var(--purple)" trend={metrics.totalCustomers > 0 ? "+3 new" : null} trendUp={metrics.totalCustomers > 0} />
        <StatCard label="Pending Rx" value={metrics.pendingRx} icon="📋" color="var(--indigo)" />
        <StatCard label="Approved Rx" value={metrics.approvedRx} icon="✅" color="var(--green)" />
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Revenue Chart */}
        <div className="chart-card" style={{ position: 'relative' }}>
          <div className="chart-header">
            <div>
              <div className="chart-title">Revenue Analytics</div>
              <div className="chart-subtitle">Sales trend over time</div>
            </div>
            <div className="chart-controls">
              {['7d', '30d', '90d'].map(r => (
                <button key={r} className={`chart-control-btn${range === r ? ' active' : ''}`} onClick={() => setRange(r)}>
                  {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>
          </div>

          {!hasCompletedOrders && (
            <div style={{
              position: 'absolute',
              top: 70, left: 0, right: 0, bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(3px)',
              borderRadius: '8px',
              zIndex: 2,
              textAlign: 'center',
              padding: '0 24px'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>💰</div>
              <h4 style={{ margin: '0 0 4px 0', color: 'white', fontSize: '14px' }}>No Completed Orders Yet</h4>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', maxWidth: '280px', lineHeight: 1.4 }}>
                Revenue analytics will appear once store pickup sales are recorded.
              </p>
            </div>
          )}

          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'K' : v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" name="Revenue" dataKey="revenue" stroke="var(--cyan)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: 'var(--cyan)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Chart */}
        <div className="chart-card" style={{ position: 'relative' }}>
          <div className="chart-header">
            <div>
              <div className="chart-title">Orders Analytics</div>
              <div className="chart-subtitle">Daily order volume</div>
            </div>
            <div className="chart-controls">
              {['7d', '30d', '90d'].map(r => (
                <button key={r} className={`chart-control-btn${range === r ? ' active' : ''}`} onClick={() => setRange(r)}>
                  {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>
          </div>

          {!hasAnyOrders && (
            <div style={{
              position: 'absolute',
              top: 70, left: 0, right: 0, bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(3px)',
              borderRadius: '8px',
              zIndex: 2,
              textAlign: 'center',
              padding: '0 24px'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
              <h4 style={{ margin: '0 0 4px 0', color: 'white', fontSize: '14px' }}>No Orders Found</h4>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', maxWidth: '280px', lineHeight: 1.4 }}>
                Orders volume chart will update automatically as customers place reservations.
              </p>
            </div>
          )}

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={32} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: 'Inter' }} />
              <Bar name="Total" dataKey="orders" fill="var(--cyan)" radius={[3, 3, 0, 0]} opacity={0.8} />
              <Bar name="Completed" dataKey="completed" fill="var(--green)" radius={[3, 3, 0, 0]} />
              <Bar name="Pending" dataKey="pending" fill="var(--amber)" radius={[3, 3, 0, 0]} />
              <Bar name="Cancelled" dataKey="cancelled" fill="var(--red)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 16 }}>
        {/* Top Selling Products */}
        <div className="chart-card" style={{ gridColumn: 'span 1' }}>
          <div className="chart-header" style={{ marginBottom: 16 }}>
            <div>
              <div className="chart-title">Top Products</div>
              <div className="chart-subtitle">Ranked by units sold</div>
            </div>
          </div>
          
          {topSellingList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {topSellingList.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', flexShrink: 0 }}>{i + 1}</span>
                  
                  <img 
                    src={p.image} 
                    alt={p.name} 
                    style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'baseline' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>
                        {p.name}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--cyan)', fontWeight: 600 }}>
                        {p.unitsSold} units
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Rev: <b>₹{p.revenue.toLocaleString()}</b></span>
                      <span>Stock: <b>{p.stock}</b></span>
                    </div>

                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(p.unitsSold / maxUnitsSold) * 100}%`, background: 'linear-gradient(90deg, #06b6d4, #0891b2)', borderRadius: '3px' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No completed order sales recorded yet.
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="table-card" style={{ gridColumn: 'span 1' }}>
          <div className="table-toolbar">
            <span className="table-title">Recent Sales Transactions</span>
            <span className="table-count">{recentOrders.length} orders</span>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length > 0 ? recentOrders.map(o => (
                <tr key={o.id}>
                  <td style={{ color: 'var(--cyan)', fontWeight: 600 }}>{o.order_number}</td>
                  <td>{o.customerName}</td>
                  <td style={{ fontWeight: 600 }}>₹{o.total}</td>
                  <td><span className={`badge ${statusColor(o.status)}`}>{o.status}</span></td>
                  <td className="muted">{o.date}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
