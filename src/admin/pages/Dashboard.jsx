import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import AdminLayout from '../components/AdminLayout';
import { revenueData } from '../data/mockData';
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

const Dashboard = () => {
  const { metrics, orders, dataLoading, dataError, refetchAllData } = useAdmin();
  const [range, setRange] = useState('7d');
  const data = revenueData[range];
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

  const statusColor = (s) => ({
    Pending: 'badge-pending', Processing: 'badge-processing',
    'Ready for Pickup': 'badge-ready', Completed: 'badge-completed', Cancelled: 'badge-cancelled'
  }[s] || '');

  const activityFeed = [];

  const topProducts = [];

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
        <div className="chart-card">
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
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'K' : v}`} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }} formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="var(--cyan)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: 'var(--cyan)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Orders Analytics</div>
              <div className="chart-subtitle">Daily order volume</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueData['7d']}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }} />
              <Bar dataKey="orders" fill="var(--indigo)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Top Selling Products */}
        <div className="chart-card" style={{ gridColumn: 'span 1' }}>
          <div className="chart-header" style={{ marginBottom: 16 }}>
            <div>
              <div className="chart-title">Top Products</div>
              <div className="chart-subtitle">By units sold</div>
            </div>
          </div>
          {topProducts.length > 0 ? topProducts.map((p, i) => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(p.sales / 310) * 100}%`, background: 'var(--cyan)', borderRadius: 2 }} />
                </div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{p.sales}</span>
            </div>
          )) : (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No products found.
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="table-card" style={{ gridColumn: 'span 2' }}>
          <div className="table-toolbar">
            <span className="table-title">Recent Orders</span>
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
                  <td style={{ color: 'var(--cyan)', fontWeight: 600 }}>{o.id}</td>
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

      {/* Activity Feed */}
      <div className="chart-card" style={{ marginTop: 16 }}>
        <div className="chart-header" style={{ marginBottom: 16 }}>
          <div><div className="chart-title">Activity Feed</div><div className="chart-subtitle">Recent store events</div></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {activityFeed.length > 0 ? activityFeed.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < activityFeed.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 36, height: 36, background: `${a.color}15`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{a.icon}</div>
              <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{a.text}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{a.time}</span>
            </div>
          )) : (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No recent activities found.
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
